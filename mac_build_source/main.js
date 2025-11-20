const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs'); // 🔑 APIキー管理用（同期メソッド）
const setManager = require('./utils/set-manager');
const storyManager = require('./utils/story-manager');
const { DEFAULT_GROUP } = setManager;
const { getLicenseManager } = require('./utils/license-manager');
const apiKeyManager = require('./utils/api-key-manager'); // 🔑 APIキー管理モジュール
// ========================================
// 学習タグサニタイズ設定（rendererと同一ルール）
// ========================================
const GLOBAL_FORBIDDEN_PATTERNS = [
    /<[^>]+>/,
    /lora:/i,
    /lyco:/i,
    /hypernet:/i,
    /fingering/i,
    /penetration/i,
    /masturb/i,
    /pussy/i,
    /penis/i,
    /cock/i,
    /sex/i,
    /nsfw/i,
    /vaginal/i,
    /anal/i,
    /cum/i,
    /ejaculat/i,
    /groin/i,
    /assisted_exposure/i,
    /nipples?/i,
    /areola/i,
    /handjob/i,
    /blowjob/i
];

const CATEGORY_WHITELISTS = {
    people: /^(?:\d+\s*(?:girl|girls|boy|boys|other|others)|solo|multiple|couple|group|family|families|hetero|yuri|yaoi)$/i
};

const CATEGORY_FORBIDDEN_PATTERNS = {
    pose: [/fingering/i, /handjob/i],
    body: [/assisted_exposure/i, /fingering/i, /penetration/i],
    clothing: [/assisted_exposure/i, /fingering/i, /penetration/i],
    quality: [/assisted_exposure/i]
};

function sanitizeTagList(tags, category) {
    const cleaned = [];
    const seen = new Set();

    (Array.isArray(tags) ? tags : []).forEach(tag => {
        if (!tag) return;
        const text = String(tag).trim();
        if (!text) return;

        const normalized = text.toLowerCase();
        if (seen.has(normalized)) return;

        if (GLOBAL_FORBIDDEN_PATTERNS.some(pattern => pattern.test(normalized))) return;
        if (CATEGORY_FORBIDDEN_PATTERNS[category] && CATEGORY_FORBIDDEN_PATTERNS[category].some(pattern => pattern.test(normalized))) return;
        if (CATEGORY_WHITELISTS[category] && !CATEGORY_WHITELISTS[category].test(normalized)) return;

        seen.add(normalized);
        cleaned.push(text);
    });

    return cleaned;
}

function sanitizeTagMap(map) {
    const sanitized = {};
    const removedSummary = {};

    Object.entries(map || {}).forEach(([category, tags]) => {
        const before = Array.isArray(tags) ? tags.length : 0;
        const afterList = sanitizeTagList(tags, category);
        sanitized[category] = afterList;
        const after = afterList.length;
        if (before > after) {
            removedSummary[category] = before - after;
        }
    });

    return { sanitized, removedSummary };
}

function sanitizeImagesMap(images) {
    if (!images || typeof images !== 'object') return {};
    const sanitizedImages = {};
    Object.entries(images).forEach(([imageHash, categories]) => {
        const newCategories = {};
        Object.entries(categories || {}).forEach(([category, tags]) => {
            const cleaned = sanitizeTagList(tags, category);
            if (cleaned.length > 0) {
                newCategories[category] = cleaned;
            }
        });
        if (Object.keys(newCategories).length > 0) {
            sanitizedImages[imageHash] = newCategories;
        }
    });
    return sanitizedImages;
}

function countTags(map) {
    return Object.values(map || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
}

function createBackup(filePath) {
    const backupPath = `${filePath}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    fsSync.copyFileSync(filePath, backupPath);
    return backupPath;
}

function ensureConfigFile() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fsSync.existsSync(configPath)) {
            return;
        }

        const distPath = path.join(__dirname, 'config.dist.json');
        if (!fsSync.existsSync(distPath)) {
            console.warn('⚠️ config.dist.json が見つからないため、config.json を自動生成できません');
            return;
        }

        fsSync.copyFileSync(distPath, configPath);
        console.log('🆕 config.json が存在しなかったため、config.dist.json から自動生成しました');
    } catch (error) {
        console.warn('⚠️ config.json 自動生成に失敗:', error.message);
    }
}

// 🔧 GPU Process Error対策（Windows環境）
app.disableHardwareAcceleration();

// 🔍 Remote Debugging有効化（Electron MCP Server専用ポート）
// ⚠️ halilural/electron-mcp-server は Port 9222 を要求（npx経由の公式版）
// 開発環境のみリモートデバッグを有効化
if (!app.isPackaged) {
    app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

let mainWindow;
let hasReloaded = false; // 🔄 1回だけリロードするフラグ

function createWindow() {
    ensureConfigFile();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    // 🔄 起動時に1回だけ強制リロード（キャッシュクリア）
    mainWindow.webContents.on('did-finish-load', () => {
        if (!hasReloaded) {
            hasReloaded = true;
            mainWindow.webContents.session.clearCache();
            mainWindow.webContents.reloadIgnoringCache();
        }
    });

    // 開発者ツール自動起動（開発環境のみ）
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    // 🔒 Trial版: DevTools無効化（本番環境のみ）
    if (app.isPackaged) {
        // F12やコンテキストメニューからDevToolsを開こうとした際に即座に閉じる
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools();
            console.warn('⚠️ DevToolsへのアクセスが試みられましたが、Trial版では無効化されています');
        });

        // DevToolsショートカット無効化（Ctrl+Shift+I, F12等）
        mainWindow.webContents.on('before-input-event', (event, input) => {
            // F12キー
            if (input.key === 'F12') {
                event.preventDefault();
            }
            // Ctrl+Shift+I (Windows/Linux), Cmd+Option+I (Mac)
            if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
                event.preventDefault();
            }
            // Ctrl+Shift+J (Windows/Linux), Cmd+Option+J (Mac) - Console
            if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'j') {
                event.preventDefault();
            }
            // Ctrl+Shift+C (Windows/Linux), Cmd+Option+C (Mac) - Element Inspector
            if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'c') {
                event.preventDefault();
            }
        });

        // コンテキストメニュー（右クリック）も無効化
        mainWindow.webContents.on('context-menu', (event) => {
            event.preventDefault();
        });

        console.log('🔒 Trial版: DevToolsが無効化されました');
    }

    // 🚪 ×ボタンで確実に終了する処理
    mainWindow.on('closed', () => {
        console.log('🚪 ウィンドウが閉じられました');
        mainWindow = null;
    });
}

// サンプルセットを初期化（配布版の初回起動時のみ）
// 開発版では実行されない（app.isPackagedでチェック）
function initializeSampleSets() {
    if (!app.isPackaged) {
        return; // 開発環境では何もしない
    }
    
    try {
        console.log('📦 サンプルセットの初期化を開始します...');
        
        // 配布版専用: サンプルセットをuserDataにコピー
        // ソース: resources/app/data/sets/sample_sets/ (配布版の__dirname/data/sets/sample_sets)
        const sampleSetsDir = path.join(__dirname, 'data', 'sets', 'sample_sets');
        
        if (!fsSync.existsSync(sampleSetsDir)) {
            console.error(`❌ サンプルセットディレクトリが見つかりません: ${sampleSetsDir}`);
            return;
        }
        
        console.log(`✅ サンプルセットディレクトリを検出: ${sampleSetsDir}`);
        
        // set-manager.jsのパスを確実に初期化
        // ensureBaseDirectories()は内部でinitializePaths()を呼ぶが、明示的に初期化を保証
        console.log('📁 セットディレクトリを作成中...');
        setManager.ensureBaseDirectories();
        
        // パスが正しく初期化されているか確認
        const dataDir = setManager.getDataDir();
        const targetSetsDir = setManager.getSetsBaseDir();
        console.log(`✅ データディレクトリ: ${dataDir}`);
        console.log(`✅ ターゲットディレクトリ: ${targetSetsDir}`);
        
        // パスが正しく設定されているか確認
        if (!targetSetsDir || targetSetsDir === 'undefined' || !dataDir || dataDir === 'undefined') {
            console.error(`❌ パスが正しく初期化されていません`);
            console.error(`   dataDir: ${dataDir}`);
            console.error(`   targetSetsDir: ${targetSetsDir}`);
            return;
        }
        
        // ディレクトリが作成されたか確認
        if (!fsSync.existsSync(targetSetsDir)) {
            console.error(`❌ ターゲットディレクトリの作成に失敗しました: ${targetSetsDir}`);
            // フォールバック: 直接作成を試みる
            fsSync.mkdirSync(targetSetsDir, { recursive: true });
            if (!fsSync.existsSync(targetSetsDir)) {
                console.error(`❌ フォールバックでもディレクトリの作成に失敗しました`);
                return;
            }
            console.log(`✅ フォールバックでディレクトリを作成しました`);
        }
        
        // 既にセットファイルが存在する場合はスキップ
        const poseSetFile = path.join(targetSetsDir, 'pose_sets.json');
        if (fsSync.existsSync(poseSetFile)) {
            console.log('📦 セットデータが既に存在するため、サンプルセットのコピーをスキップします');
            return;
        }
    
        // サンプルセットを直接ファイルに書き込む（userData/data/setsに保存）
        const categories = ['pose', 'face', 'body', 'clothing', 'background', 'expression', 'quality', 'other'];
        let successCount = 0;
        let failCount = 0;
        
        categories.forEach(category => {
            const sourceFile = path.join(sampleSetsDir, `${category}_sets.json`);
            
            if (!fsSync.existsSync(sourceFile)) {
                console.warn(`⚠️ サンプルセットファイルが見つかりません: ${sourceFile}`);
                failCount++;
                return;
            }
            
            try {
                // サンプルセットファイルを読み込む
                const sampleData = JSON.parse(fsSync.readFileSync(sourceFile, 'utf-8'));
                
                // userData/data/setsに直接書き込む
                const targetFile = path.join(targetSetsDir, `${category}_sets.json`);
                
                // 既存のファイルがある場合はマージ、ない場合はそのままコピー
                let existingData = { version: '3.0.0', groups: {} };
                if (fsSync.existsSync(targetFile)) {
                    try {
                        existingData = JSON.parse(fsSync.readFileSync(targetFile, 'utf-8'));
                    } catch (e) {
                        console.warn(`⚠️ 既存ファイルの読み込みに失敗しました: ${targetFile}`, e.message);
                    }
                }
                
                // サンプルデータをマージ（既存のセットは保持）
                const mergedGroups = { ...existingData.groups };
                Object.keys(sampleData.groups || {}).forEach(groupName => {
                    if (!mergedGroups[groupName]) {
                        mergedGroups[groupName] = { sections: {} };
                    }
                    const mergedSections = { ...mergedGroups[groupName].sections };
                    Object.keys(sampleData.groups[groupName].sections || {}).forEach(sectionName => {
                        if (!mergedSections[sectionName]) {
                            mergedSections[sectionName] = {};
                        }
                        // サンプルセットを追加（既存のセットと重複しないように）
                        Object.keys(sampleData.groups[groupName].sections[sectionName]).forEach(setName => {
                            if (!mergedSections[sectionName][setName]) {
                                mergedSections[sectionName][setName] = sampleData.groups[groupName].sections[sectionName][setName];
                            }
                        });
                    });
                    mergedGroups[groupName].sections = mergedSections;
                });
                
                // マージしたデータを保存
                const finalData = {
                    version: '3.0.0',
                    groups: mergedGroups
                };
                
                fsSync.writeFileSync(targetFile, JSON.stringify(finalData, null, 2), 'utf-8');
                console.log(`✅ サンプルセットを登録しました: ${category}_sets.json`);
                successCount++;
            } catch (error) {
                console.error(`❌ サンプルセットファイルの処理に失敗しました: ${category}`, error.message);
                console.error(error.stack);
                failCount++;
            }
        });
        
        console.log(`✅ サンプルセットの登録が完了しました (成功: ${successCount}, 失敗: ${failCount})`);
    } catch (error) {
        console.error(`❌ サンプルセットの初期化に失敗しました:`, error.message);
        console.error(error.stack);
    }
}

// ライセンス管理の初期化と起動時検証（配布版のみ）
app.whenReady().then(() => {
    // 開発環境ではライセンス管理をスキップ
    if (!app.isPackaged) {
        console.log('🔧 開発環境: ライセンス管理をスキップします');
        createWindow();
        return;
    }
    
    // ライセンス管理を初期化
    const licenseManager = getLicenseManager();
    
    // 配布版ではset-manager.jsのパスを確実に初期化（フォルダ作成も含む）
    // 標準フォルダ: app.getPath('userData')/data/sets
    console.log('📁 セット選択フォルダを作成中（標準）...');
    try {
        setManager.ensureBaseDirectories();
        const setsDir = setManager.getSetsBaseDir();
        console.log(`✅ セット選択フォルダ: ${setsDir}`);
        
        // フォルダが実際に作成されたか確認
        if (!fsSync.existsSync(setsDir)) {
            console.error(`❌ セット選択フォルダの作成に失敗しました: ${setsDir}`);
            // フォールバック: 直接作成
            fsSync.mkdirSync(setsDir, { recursive: true });
            console.log(`✅ フォールバックでセット選択フォルダを作成しました: ${setsDir}`);
        }
    } catch (error) {
        console.error('❌ セット選択フォルダの作成エラー:', error.message);
        console.error(error.stack);
    }
    
    // 配布版の場合はサンプルセットを初期化
    initializeSampleSets();
    
    // ビルド時のライセンスタイプを環境変数から取得（配布用パッケージの場合）
    const buildLicenseType = process.env.LICENSE_TYPE || 'trial';
    if (buildLicenseType && buildLicenseType !== 'free') {
        // 配布用パッケージの場合、初回起動時に指定されたライセンスタイプを設定
        const licenseInfo = licenseManager.getLicenseInfo();
        if (licenseInfo.licenseType === 'free') {
            console.log(`📦 配布用パッケージ検出: ${buildLicenseType}版`);

            // Trial版の場合、自動的にTrialライセンスを作成（念のための二重チェック）
            if (buildLicenseType === 'trial') {
                console.log('🎫 Trial版初回起動検出: 7日間の試用期間を開始します');
                const trialLicense = licenseManager.createTrialLicense();
                licenseManager.licenseData = trialLicense;
                licenseManager.saveLicense();
                console.log('✅ Trial版ライセンス作成完了（app起動時）');
            }
        }
    }
    
    // ライセンスの検証
    const validation = licenseManager.validateLicense();
    if (!validation.valid) {
        // Trial期間終了時はパスコード入力を促す
        const result = dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Trial期間終了',
            message: 'Trial期間（7日間）が終了しました。\n\n製品版をご購入いただいた場合は、「パスコード入力」ボタンからライセンスキーを入力してください。',
            buttons: ['パスコード入力', '終了']
        });

        if (result === 1) {
            // 「終了」ボタンが押された
            app.quit();
            return;
        }

        // 「パスコード入力」ボタンが押された場合はウィンドウを開く
        // フロントエンドでパスコード入力UIを表示
    }

    console.log('✅ ライセンス検証成功:', validation.message);
    createWindow();
});

// 🚪 全ウィンドウが閉じられたら確実に終了
app.on('window-all-closed', () => {
    console.log('🚪 全ウィンドウが閉じられました - アプリを終了します');
    app.quit();  // Macでも強制終了
});

// 🚪 アプリ終了前のクリーンアップ
app.on('before-quit', (event) => {
    console.log('🚪 アプリを終了します...');
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

//  calibrationファイル読み込みハンドラー
ipcMain.handle('load-calibration-file', async (event, relPath) => {
    try {
        const filePath = path.join(__dirname, relPath);
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// 🔍 PNG/JPEGファイル読み込みハンドラー
ipcMain.handle('read-image-file', async (event, filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        return {
            success: true,
            data: buffer,
            arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        };
    } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 📚 辞書読み込みハンドラー
ipcMain.handle('load-obsidian-dictionaries', async () => {
    try {
        const dictionaryPath = path.join(__dirname, 'dictionaries');

        const dictionaries = {
            face: [],
            body: [],
            clothing: [],
            pose: [],
            background: [],
            expression: [],
            quality: []
        };

        // 辞書ファイルマッピング（シンプルな英語名）
        const fileMapping = {
            'face.md': 'face',
            'body.md': 'body',
            'clothing.md': 'clothing',
            'pose.md': 'poseemotion',  // 🔧 修正: フロントエンドはposeemotionを期待
            'background.md': 'background',
            'expression.md': 'expression',
            'quality.md': 'quality'
        };

        // 各辞書ファイルを読み込み
        for (const [filename, category] of Object.entries(fileMapping)) {
            const filePath = path.join(dictionaryPath, filename);
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                // マークダウンから "- tag" 形式を抽出
                const lines = content.split('\n');
                const tags = lines
                    .filter(line => line.trim().startsWith('- '))
                    .map(line => line.trim().substring(2).trim())
                    .filter(tag => tag.length > 0);
                dictionaries[category] = tags;
                console.log(`✅ ${filename}: ${tags.length}タグ読み込み`);
            } catch (err) {
                console.error(`❌ ${filename} 読み込みエラー:`, err.message);
            }
        }

        return { success: true, dictionaries };
    } catch (error) {
        console.error('辞書読み込み全体エラー:', error);
        return { success: false, error: error.message };
    }
});

// ========================================
// 📚 共通辞書システム（C:\metacard\dictionaries\）
// ========================================

// 📖 共通辞書読み込みハンドラー
ipcMain.handle('read-shared-dictionary', async (event, filename) => {
    try {
        const sharedDictPath = path.join('C:', 'metacard', 'dictionaries', filename);
        console.log(`📖 共通辞書読み込み: ${sharedDictPath}`);

        // ファイル存在確認
        try {
            await fs.access(sharedDictPath);
        } catch (err) {
            return {
                success: false,
                error: `辞書ファイルが見つかりません: ${filename}`
            };
        }

        const content = await fs.readFile(sharedDictPath, 'utf-8');
        console.log(`✅ ${filename}: ${content.length}文字読み込み`);

        return {
            success: true,
            content: content,
            filename: filename
        };
    } catch (error) {
        console.error(`❌ 共通辞書読み込みエラー (${filename}):`, error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 💾 共通辞書書き込みハンドラー
ipcMain.handle('write-shared-dictionary', async (event, filename, content) => {
    try {
        const sharedDictPath = path.join('C:', 'metacard', 'dictionaries', filename);
        console.log(`💾 共通辞書書き込み: ${sharedDictPath}`);

        // ディレクトリ存在確認・作成
        const dirPath = path.join('C:', 'metacard', 'dictionaries');
        try {
            await fs.access(dirPath);
        } catch (err) {
            console.log(`📁 ディレクトリ作成: ${dirPath}`);
            await fs.mkdir(dirPath, { recursive: true });
        }

        // ファイル書き込み
        await fs.writeFile(sharedDictPath, content, 'utf-8');
        console.log(`✅ ${filename}: ${content.length}文字書き込み完了`);

        return {
            success: true,
            filename: filename,
            bytesWritten: content.length
        };
    } catch (error) {
        console.error(`❌ 共通辞書書き込みエラー (${filename}):`, error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 🌐 Danbooru辞書更新ハンドラー
ipcMain.handle('update-dictionaries-from-danbooru', async (event, options) => {
    try {
        console.log('🚀 Danbooru辞書更新開始...');

        // dictionary-merger.jsをrequire
        const { mergeAllDictionaries } = require(path.join(__dirname, 'utils', 'dictionary-merger.js'));

        // 進捗報告用コールバック
        const reportProgress = (message, details) => {
            event.sender.send('dictionary-update-progress', { message, details });
        };

        // マージ実行
        const results = await mergeAllDictionaries({
            limitPerCategory: options.limitPerCategory || 500,
            dryRun: options.dryRun || false,
            createBackup: options.createBackup !== false
        });

        console.log('✅ Danbooru辞書更新完了');

        return {
            success: true,
            results: results
        };
    } catch (error) {
        console.error('❌ Danbooru辞書更新エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 🌐 Civitai辞書更新ハンドラー
ipcMain.handle('update-dictionaries-from-civitai', async (event, options) => {
    try {
        console.log('🚀 Civitai辞書更新開始...');

        const { mergeAllFromCivitai } = require(path.join(__dirname, 'utils', 'dictionary-merger.js'));

        const results = await mergeAllFromCivitai({
            limit: (options && options.limit) || 200,
            types: (options && options.types) || ['Checkpoint','LORA','TextualInversion'],
            dryRun: options && options.dryRun,
            createBackup: options ? options.createBackup !== false : true
        });

        console.log('✅ Civitai辞書更新完了');
        return { success: true, results };
    } catch (error) {
        console.error('❌ Civitai辞書更新エラー:', error);
        return { success: false, error: error.message };
    }
});

// ========================================
// Phase 11: APIキー管理（配布対応）
// ========================================

// APIキー保存（api-key-managerモジュールを使用）
ipcMain.handle('save-api-key', async (event, apiKey) => {
    return apiKeyManager.saveApiKey(apiKey);
});

// APIキー読み込み（api-key-managerモジュールを使用）
// 優先順位: config.json → 埋め込みキー（フォールバック）
ipcMain.handle('load-api-key', async (event) => {
    return apiKeyManager.loadApiKey();
});

// ==============================
// SD API設定 保存/読込（JSON）
// ==============================

ipcMain.handle('save-api-settings', async (event, settings) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        let config = {};
        if (fsSync.existsSync(configPath)) {
            try {
                config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8')) || {};
            } catch {}
        }

        config.sdApi = config.sdApi || {};
        if (settings && typeof settings === 'object') {
            if (settings.tagger) config.sdApi.tagger = settings.tagger;
            if (settings.txt2img) config.sdApi.txt2img = settings.txt2img;
        }

        fsSync.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-api-settings', async () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (!fsSync.existsSync(configPath)) {
            return { success: true, settings: {} };
        }
        const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8')) || {};
        return { success: true, settings: config.sdApi || {} };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==============================
// デバッグ書き出し（JSON）
// ==============================
ipcMain.handle('save-debug-json', async (event, payload) => {
    try {
        const dir = path.join(__dirname, 'calibration', 'debug');
        if (!fsSync.existsSync(dir)) {
            fsSync.mkdirSync(dir, { recursive: true });
        }
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const file = path.join(dir, `parity_${ts}.json`);
        fsSync.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8');
        return { success: true, file };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// コンソールログをテキストファイルに保存
ipcMain.handle('save-console-logs', async (event, logs) => {
    try {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const file = path.join(__dirname, `console-log_${ts}.txt`);
        fsSync.writeFileSync(file, logs, 'utf-8');
        console.log('✅ コンソールログ保存:', file);
        return { success: true, file };
    } catch (e) {
        console.error('❌ ログ保存エラー:', e);
        return { success: false, error: e.message };
    }
});

// APIキー削除
ipcMain.handle('delete-api-key', async (event) => {
    try {
        // 配布版ではuserDataから読み込み、開発版では__dirnameから読み込み
        const configPath = app.isPackaged 
            ? path.join(app.getPath('userData'), 'config.json')
            : path.join(__dirname, 'config.json');

        if (fsSync.existsSync(configPath)) {
            const configData = fsSync.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData);

            // APIキーのみ削除
            config.geminiApiKey = '';

            fsSync.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }

        console.log('✅ Gemini APIキー削除完了');

        return {
            success: true,
            message: 'APIキーを削除しました'
        };
    } catch (error) {
        console.error('❌ APIキー削除エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ========================================
// Phase 12: Gemini AI分類支援（無料枠）
// ========================================

const geminiImageClassifier = require('./ai/gemini-image-classifier');
const geminiTextClassifier = require('./ai/gemini-text-classifier');
const geminiStoryGenerator = require('./ai/gemini-story-generator');
const geminiSNSGenerator = require('./ai/gemini-sns-generator');
const geminiBase = require('./ai/gemini-base');  // ✅ 追加: トライアル版APIキー初期化用
const setStore = require(path.join(__dirname, 'utils', 'set-store.js'));

// Gemini AI画像分類
ipcMain.handle('classify-image-with-gemini', async (event, base64Image) => {
    try {
        console.log('🚀 Gemini AI分類リクエスト受信');

        // ✅ トライアル版: APIキーを復号化して初期化
        const apiKey = decryptGeminiApiKey();
        if (apiKey) {
            geminiBase.initializeWithKey(apiKey);
        }

        // 画像分類実行（自動初期化）
        const result = await geminiImageClassifier.classifyImage(base64Image);

        if (result.success) {
            console.log('✅ Gemini AI分類成功');
            return {
                success: true,
                categories: result.categories,
                rawResponse: result.rawResponse
            };
        } else {
            console.error('❌ Gemini AI分類失敗:', result.error);
            return {
                success: false,
                error: result.error
            };
        }
    } catch (error) {
        console.error('❌ Gemini AI分類エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Gemini AIテキストプロンプト分類
ipcMain.handle('classify-text-with-gemini', async (event, promptText) => {
    try {
        console.log('🚀 Gemini AIテキスト分類リクエスト受信');
        console.log('📝 プロンプト:', promptText.substring(0, 100) + '...');

        // ✅ トライアル版: APIキーを復号化して初期化
        const apiKey = decryptGeminiApiKey();
        if (apiKey) {
            geminiBase.initializeWithKey(apiKey);
        }

        // テキスト分類実行（自動初期化）
        const result = await geminiTextClassifier.classifyText(promptText);

        if (result.success) {
            console.log('✅ Gemini AIテキスト分類成功');
            console.log('📊 分類結果:', result.categories);
            return {
                success: true,
                categories: result.categories,
                rawResponse: result.rawResponse
            };
        } else {
            console.error('❌ Gemini AIテキスト分類失敗:', result.error);
            return {
                success: false,
                error: result.error
            };
        }
    } catch (error) {
        console.error('❌ Gemini AIテキスト分類エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Gemini AIストーリー生成（ポーズ選択＋区切り文字＋個別設定）
ipcMain.handle('generate-story-with-gemini', async (event, userPrompt, poseSets, individualSettingsData) => {
    try {
        console.log('🚀 Gemini AIストーリー生成リクエスト受信');
        console.log('📝 ユーザー指示:', userPrompt.substring(0, 100) + '...');
        if (individualSettingsData) {
            console.log('⚙️ 個別設定データ:', {
                background: individualSettingsData.background?.length || 0,
                expression: individualSettingsData.expression?.length || 0,
                clothing: individualSettingsData.clothing?.length || 0,
                clothingState: individualSettingsData.clothingState?.length || 0,
                maleCharacter: individualSettingsData.maleCharacter?.length || 0
            });
        }

        // ✅ トライアル版: APIキーを復号化して初期化
        const apiKey = decryptGeminiApiKey();
        if (apiKey) {
            geminiBase.initializeWithKey(apiKey);
        }

        // ストーリー生成実行（個別設定データも渡す）
        const result = await geminiStoryGenerator.generateStory(userPrompt, poseSets, individualSettingsData);

        if (result.success) {
            console.log('✅ Gemini AIストーリー生成成功');
            console.log('📊 生成アイテム数:', result.items.length);
            return {
                success: true,
                items: result.items,
                explanation: result.explanation,
                rawResponse: result.rawResponse
            };
        } else {
            console.error('❌ Gemini AIストーリー生成失敗:', result.error);
            return {
                success: false,
                error: result.error
            };
        }
    } catch (error) {
        console.error('❌ Gemini AIストーリー生成エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// SNS投稿用AI生成（Phase 17）
ipcMain.handle('generate-sns-post-with-gemini', async (event, userPrompt, snsPlatform, isR18, poseSets, individualSettingsData, commonSettings, useCommonSettings) => {
    try {
        console.log('🚀 Gemini AI SNS投稿用プロンプト生成リクエスト受信');
        console.log('📝 ユーザー指示:', userPrompt.substring(0, 100) + '...');
        console.log('📱 SNSプラットフォーム:', snsPlatform);
        console.log('🔞 18禁指定:', isR18);
        console.log('⚙️ 共通設定を使用:', useCommonSettings);

        // ✅ トライアル版: APIキーを復号化して初期化
        const apiKey = decryptGeminiApiKey();
        if (apiKey) {
            geminiBase.initializeWithKey(apiKey);
        }

        // SNS投稿用プロンプト生成実行
        const result = await geminiSNSGenerator.generateSNSPost(userPrompt, snsPlatform, isR18, poseSets, individualSettingsData, commonSettings, useCommonSettings);

        if (result.success) {
            console.log('✅ Gemini AI SNS投稿用プロンプト生成成功');
            return {
                success: true,
                poseName: result.poseName,
                group: result.group,
                section: result.section,
                expression: result.expression,
                background: result.background,
                clothing: result.clothing,
                clothingState: result.clothingState,
                explanation: result.explanation
            };
        } else {
            console.error('❌ Gemini AI SNS投稿用プロンプト生成失敗:', result.error);
            return {
                success: false,
                error: result.error
            };
        }
    } catch (error) {
        console.error('❌ Gemini AI SNS投稿用プロンプト生成エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// =============================================================================
// Phase 15.2: AI Learning Dictionary System
// =============================================================================

/**
 * 📚 辞書ファイルにタグを追加するIPCハンドラ
 * @param {string} category - カテゴリ名 (face, body, pose, etc.)
 * @param {string[]} tags - 追加するタグの配列
 */
ipcMain.handle('append-to-dictionary', async (event, category, tags) => {
    try {
        console.log(`📚 辞書追加リクエスト: ${category}, タグ数: ${tags.length}`);

        const sanitizedInput = sanitizeTagList(tags, category);
        if (!sanitizedInput.length) {
            console.log(`ℹ️ ${category}: サニタイズ後に追加可能なタグがありません`);
            return {
                success: true,
                addedCount: 0,
                message: '追加可能なタグがありません（サニタイズ済み）'
            };
        }

        // カテゴリから辞書ファイル名へのマッピング
        const categoryToDictionary = {
            'people': 'people.md',
            'face': 'face.md',
            'body': 'body.md',
            'pose': 'poseemotion.md',      // pose と expression は同じファイル
            'expression': 'poseemotion.md',
            'background': 'background.md',
            'clothing': 'clothing.md',
            'quality': 'quality.md',
            'other': 'other.md'
        };

        const dictionaryFileName = categoryToDictionary[category];

        if (!dictionaryFileName) {
            throw new Error(`未知のカテゴリ: ${category}`);
        }

        const dictionaryPath = path.join('C:', 'metacard', 'dictionaries', dictionaryFileName);
        // 事前にファイルを用意（無ければ作成）
        try {
            if (!fsSync.existsSync(dictionaryPath)) {
                const dir = path.dirname(dictionaryPath);
                if (!fsSync.existsSync(dir)) {
                    fsSync.mkdirSync(dir, { recursive: true });
                }
                const title = dictionaryFileName.replace('.md', '');
                const header = `# ${title} カテゴリ辞書\n\n`;
                fsSync.writeFileSync(dictionaryPath, header, 'utf-8');
            }
        } catch (e) {
            console.warn('辞書ファイル作成に失敗:', e.message);
        }

        // 辞書ファイルが存在しない場合はエラー
        if (!fsSync.existsSync(dictionaryPath)) {
            throw new Error(`辞書ファイルが見つかりません: ${dictionaryPath}`);
        }

        // 既存の辞書内容を読み込み
        const existingContent = fsSync.readFileSync(dictionaryPath, 'utf-8');
        const existingTagsNormalized = new Set(
            existingContent.split('\n')
                .map(line => line.trim())
                .filter(line => line && line.startsWith('- '))
                .map(line => line.substring(2).trim())
                .map(tag => tag.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase())
        );

        // 新規タグ（正規化で重複排除）
        const newTags = (sanitizedInput || [])
            .map(t => String(t).trim())
            .filter(t => t.length > 0)
            .filter(t => !existingTagsNormalized.has(t.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase()));

        if (newTags.length === 0) {
            console.log(`ℹ️ ${category}: すべてのタグが既に登録済み（重複0件）`);
            return {
                success: true,
                addedCount: 0,
                message: 'すべてのタグが既に登録されています'
            };
        }

        // 新規タグを末尾に追加（改行を確保）
        const tagsToAppend = '\n' + newTags.map(t => `- ${t}`).join('\n') + '\n';
        fsSync.appendFileSync(dictionaryPath, tagsToAppend, 'utf-8');

        console.log(`✅ ${category}辞書に${newTags.length}個のタグを追加しました`);
        console.log(`📝 追加タグ: ${newTags.slice(0, 5).join(', ')}${newTags.length > 5 ? '...' : ''}`);

        return {
            success: true,
            addedCount: newTags.length,
            message: `${newTags.length}個のタグを辞書に追加しました`
        };

    } catch (error) {
        console.error(`❌ 辞書追加エラー (${category}):`, error);
        return {
            success: false,
            error: error.message
        };
    }
});

// =============================================================================
// Phase 15.3: 恒久的学習タグ保存システム（JSON形式）
// =============================================================================

/**
 * 💾 学習済みタグをJSONファイルに保存
 * @param {Object} learnedTags - カテゴリ別のタグオブジェクト
 */
ipcMain.handle('save-learned-tags', async (event, learnedTags) => {
    try {
        const learnedTagsPath = path.join('C:', 'metacard', 'dictionaries', 'learned_tags.json');
        console.log('💾 学習タグ保存開始:', learnedTagsPath);

        // ディレクトリ存在確認
        const dirPath = path.dirname(learnedTagsPath);
        if (!fsSync.existsSync(dirPath)) {
            fsSync.mkdirSync(dirPath, { recursive: true });
        }

        // 既存の学習タグを読み込み
        let existingData = { tags: {}, metadata: { lastUpdated: null, totalTags: 0 } };
        if (fsSync.existsSync(learnedTagsPath)) {
            try {
                const content = fsSync.readFileSync(learnedTagsPath, 'utf-8');
                existingData = JSON.parse(content);
            } catch (err) {
                console.warn('⚠️ 既存ファイル読み込み失敗、新規作成します');
            }
        }

        // 既存データをサニタイズ
        const existingSanitized = sanitizeTagMap(existingData.tags || {});
        if (Object.keys(existingSanitized.removedSummary).length) {
            console.log('⚠️ 既存学習タグから不適切タグを削除:', existingSanitized.removedSummary);
        }
        existingData.tags = existingSanitized.sanitized;
        existingData.images = sanitizeImagesMap(existingData.images || {});

        // 受け取ったタグもサニタイズ
        const incomingSanitized = sanitizeTagMap(learnedTags || {});
        if (Object.keys(incomingSanitized.removedSummary).length) {
            console.log('⚠️ 追加リクエストタグから不適切タグを削除:', incomingSanitized.removedSummary);
        }

        // 新規タグをマージ（重複排除）
        Object.keys(incomingSanitized.sanitized).forEach(category => {
            if (!existingData.tags[category]) {
                existingData.tags[category] = [];
            }

            const existingSet = new Set(existingData.tags[category]);
            const newTags = incomingSanitized.sanitized[category].filter(tag => !existingSet.has(tag));

            if (newTags.length > 0) {
                existingData.tags[category].push(...newTags);
                console.log(`  ${category}: +${newTags.length}個追加`);
            }
        });

        // 学習画像タグは保持する場合も再サニタイズ
        existingData.images = sanitizeImagesMap(existingData.images || {});

        // メタデータ更新
        existingData.metadata = {
            lastUpdated: new Date().toISOString(),
            totalTags: Object.values(existingData.tags).reduce((sum, arr) => sum + arr.length, 0)
        };

        // JSON保存
        fsSync.writeFileSync(learnedTagsPath, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log(`✅ 学習タグ保存完了: 合計${existingData.metadata.totalTags}個`);

        return {
            success: true,
            totalTags: existingData.metadata.totalTags,
            filePath: learnedTagsPath
        };
    } catch (error) {
        console.error('❌ 学習タグ保存エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('sanitize-learned-tags', async () => {
    try {
        const learnedTagsPath = path.join('C:', 'metacard', 'dictionaries', 'learned_tags.json');
        if (!fsSync.existsSync(learnedTagsPath)) {
            return { success: false, error: 'learned_tags.json が存在しません' };
        }

        const raw = fsSync.readFileSync(learnedTagsPath, 'utf-8');
        let parsed = JSON.parse(raw);
        const hasRoot = parsed && typeof parsed === 'object' && parsed.tags;
        const tagsRoot = hasRoot ? parsed.tags : parsed;
        const beforeCount = countTags(tagsRoot);

        const { sanitized, removedSummary } = sanitizeTagMap(tagsRoot);
        const afterCount = countTags(sanitized);

        const imagesBefore = parsed && parsed.images ? Object.keys(parsed.images).length : 0;
        const sanitizedImages = sanitizeImagesMap(parsed && parsed.images ? parsed.images : {});
        const imagesAfter = Object.keys(sanitizedImages).length;

        const backupPath = createBackup(learnedTagsPath);

        if (hasRoot) {
            parsed.tags = sanitized;
            parsed.images = sanitizedImages;
            parsed.metadata = parsed.metadata || {};
            parsed.metadata.lastUpdated = new Date().toISOString();
            parsed.metadata.totalTags = afterCount;
        } else {
            parsed = sanitized;
        }

        fsSync.writeFileSync(learnedTagsPath, JSON.stringify(parsed, null, 2), 'utf-8');

        return {
            success: true,
            backup: backupPath,
            beforeCount,
            afterCount,
            removedSummary,
            imagesBefore,
            imagesAfter
        };
    } catch (error) {
        console.error('❌ 学習タグサニタイズエラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ストーリープロンプト ライブラリ
ipcMain.handle('story-list', async () => {
    try {
        const stories = storyManager.listStories();
        return { success: true, stories };
    } catch (error) {
        console.error('story-list error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('story-load', async (event, storyId) => {
    try {
        const story = storyManager.loadStory(storyId);
        return { success: true, story };
    } catch (error) {
        console.error('story-load error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('story-save', async (event, storyPayload) => {
    try {
        const result = storyManager.saveStory(storyPayload);
        return { success: true, story: result.summary };
    } catch (error) {
        console.error('story-save error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('story-delete', async (event, storyId) => {
    try {
        const result = storyManager.deleteStory(storyId);
        return { success: true, ...result };
    } catch (error) {
        console.error('story-delete error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 📖 学習済みタグをJSONファイルから読み込み
 */
ipcMain.handle('load-learned-tags', async (event) => {
    try {
        const learnedTagsPath = path.join('C:', 'metacard', 'dictionaries', 'learned_tags.json');

        if (!fsSync.existsSync(learnedTagsPath)) {
            console.log('ℹ️ 学習タグファイルが存在しません（初回起動）');
            return {
                success: true,
                tags: {},
                metadata: { lastUpdated: null, totalTags: 0 }
            };
        }

        const content = fsSync.readFileSync(learnedTagsPath, 'utf-8');
        const data = JSON.parse(content);

        const sanitized = sanitizeTagMap(data.tags || {});
        const sanitizedImages = sanitizeImagesMap(data.images || {});
        if (Object.keys(sanitized.removedSummary).length) {
            console.log('⚠️ 読み込み時に不適切タグを除去:', sanitized.removedSummary);
        }
        const metadata = data.metadata || { lastUpdated: null, totalTags: 0 };
        metadata.totalTags = Object.values(sanitized.sanitized).reduce((sum, arr) => sum + arr.length, 0);
        metadata.lastUpdated = metadata.lastUpdated || new Date().toISOString();

        console.log('✅ 学習タグ読み込み完了:', metadata);

        return {
            success: true,
            tags: sanitized.sanitized,
            metadata,
            images: sanitizedImages
        };
    } catch (error) {
        console.error('❌ 学習タグ読み込みエラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 画像ごとの学習タグ 保存
ipcMain.handle('save-image-learned-tags', async (event, imageHash, learnedTags) => {
    try {
        const learnedTagsPath = path.join('C:', 'metacard', 'dictionaries', 'learned_tags.json');

        const dirPath = path.dirname(learnedTagsPath);
        if (!fsSync.existsSync(dirPath)) {
            fsSync.mkdirSync(dirPath, { recursive: true });
        }

        let existingData = { tags: {}, images: {}, metadata: { lastUpdated: null, totalTags: 0 } };
        if (fsSync.existsSync(learnedTagsPath)) {
            try {
                const content = fsSync.readFileSync(learnedTagsPath, 'utf-8');
                existingData = JSON.parse(content);
            } catch {}
        }

        if (!existingData.images) existingData.images = {};
        if (!existingData.images[imageHash]) existingData.images[imageHash] = {};

        const incomingSanitized = sanitizeTagMap(learnedTags || {});

        Object.keys(incomingSanitized.sanitized || {}).forEach(category => {
            if (!existingData.images[imageHash][category]) existingData.images[imageHash][category] = [];
            const existingSet = new Set((existingData.images[imageHash][category] || []).map(t => String(t).toLowerCase()));
            const toAdd = (incomingSanitized.sanitized[category] || [])
                .map(t => String(t).trim())
                .filter(t => t.length > 0 && !existingSet.has(t.toLowerCase()));
            if (toAdd.length) {
                existingData.images[imageHash][category].push(...toAdd);
            }
        });

        existingData.images[imageHash] = sanitizeImagesMap({ [imageHash]: existingData.images[imageHash] })[imageHash] || {};

        existingData.metadata = existingData.metadata || {};
        existingData.metadata.lastUpdated = new Date().toISOString();

        fsSync.writeFileSync(learnedTagsPath, JSON.stringify(existingData, null, 2), 'utf-8');
        return { success: true, imageHash, categories: Object.keys(learnedTags || {}) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 画像ごとの学習タグ 取得
ipcMain.handle('load-image-learned-tags', async (event, imageHash) => {
    try {
        const learnedTagsPath = path.join('C:', 'metacard', 'dictionaries', 'learned_tags.json');
        if (!fsSync.existsSync(learnedTagsPath)) {
            return { success: true, tags: {} };
        }
        const content = fsSync.readFileSync(learnedTagsPath, 'utf-8');
        const data = JSON.parse(content);
        const tags = (data.images && data.images[imageHash]) ? data.images[imageHash] : {};
        const sanitized = sanitizeImagesMap({ [imageHash]: tags })[imageHash] || {};
        return { success: true, tags: sanitized };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==============================
// Legacy Import (Folder)
// ==============================
function scanJsonFilesRecursively(dir, maxDepth = 3, acc = []) {
    try {
        const items = fsSync.readdirSync(dir, { withFileTypes: true });
        for (const it of items) {
            const full = path.join(dir, it.name);
            if (it.isDirectory() && maxDepth > 0) {
                scanJsonFilesRecursively(full, maxDepth - 1, acc);
            } else if (it.isFile() && it.name.toLowerCase().endsWith('.json')) {
                acc.push(full);
            }
        }
    } catch {}
    return acc;
}

ipcMain.handle('legacy-pick-folder', async () => {
    try {
        const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (res.canceled || !res.filePaths || !res.filePaths[0]) {
            return { success: false, error: 'canceled' };
        }
        return { success: true, folder: res.filePaths[0] };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('legacy-scan-folder', async (event, folder) => {
    try {
        if (!folder || !fsSync.existsSync(folder)) return { success: false, error: 'folder not found' };
        const files = scanJsonFilesRecursively(folder, 3, []);
        const previews = [];
        for (const f of files.slice(0, 50)) { // limit preview
            try {
                const txt = fsSync.readFileSync(f, 'utf-8');
                const json = JSON.parse(txt);
                // Heuristics: detect sets array or objects with tags
                if (Array.isArray(json.sets)) {
                    previews.push({ file: f, type: 'sets-array', count: json.sets.length });
                } else if (Array.isArray(json)) {
                    const sample = json[0];
                    if (sample && (sample.tags || sample.tagsByCategory)) {
                        previews.push({ file: f, type: 'array-of-sets', count: json.length });
                    }
                } else if (json && (json.tags || json.tagsByCategory)) {
                    previews.push({ file: f, type: 'single-set', count: 1 });
                } else {
                    previews.push({ file: f, type: 'unknown', count: 0 });
                }
            } catch (e) {
                previews.push({ file: f, type: 'invalid-json', count: 0 });
            }
        }
        return { success: true, files: files.length, previews };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==============================
// Set Store IPC
// ==============================
ipcMain.handle('sets-list', async () => {
    try {
        const data = setStore.loadAll();
        return { success: true, sets: data.sets || [], version: data.version };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('sets-save', async (event, payload) => {
    try {
        const incoming = payload || {};
        let id = incoming.id || setStore.uuid();
        if (incoming.thumbnailDataUrl) {
            const rel = setStore.saveThumbnail(incoming.thumbnailDataUrl, id);
            incoming.thumbnailPath = rel;
        }
        incoming.id = id;
        const rec = setStore.upsertSet(incoming);
        return { success: true, set: rec };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('sets-delete', async (event, id) => {
    try {
        const ok = setStore.deleteSet(id);
        return { success: ok };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('sets-get', async (event, id) => {
    try {
        const data = setStore.loadAll();
        const rec = (data.sets || []).find(s => s.id === id) || null;
        return { success: true, set: rec };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('sets-export', async (event, ids) => {
    try {
        const data = setStore.loadAll();
        const all = data.sets || [];
        const picked = Array.isArray(ids) && ids.length ? all.filter(s => ids.includes(s.id)) : all;
        const payload = { version: '1.0', exportedAt: new Date().toISOString(), sets: picked };
        return { success: true, json: JSON.stringify(payload, null, 2) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Export to file (our JSON format)
ipcMain.handle('sets-export-file', async (event, ids) => {
    try {
        const data = setStore.loadAll();
        const all = data.sets || [];
        const picked = Array.isArray(ids) && ids.length ? all.filter(s => ids.includes(s.id)) : all;
        const payload = { version: '1.0', exportedAt: new Date().toISOString(), sets: picked };
        const res = await dialog.showSaveDialog({
            title: 'エクスポート (JSON)',
            defaultPath: 'sets_export.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        if (res.canceled || !res.filePath) return { success: false, error: 'canceled' };
        fsSync.writeFileSync(res.filePath, JSON.stringify(payload, null, 2), 'utf-8');
        return { success: true, file: res.filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Export in legacy CategoryManager localStorage format (promptSets)
ipcMain.handle('sets-export-legacy', async (event, ids) => {
    try {
        const data = setStore.loadAll();
        const all = data.sets || [];
        const picked = Array.isArray(ids) && ids.length ? all.filter(s => ids.includes(s.id)) : all;
        const out = {};
        for (const s of picked) {
            const cats = (Array.isArray(s.categories) && s.categories.length) ? s.categories : Object.keys(s.tagsByCategory || {});
            for (const c of cats) {
                if (!out[c]) out[c] = {};
                const tags = (s.tagsByCategory && Array.isArray(s.tagsByCategory[c])) ? s.tagsByCategory[c] : [];
                const key = s.name && s.name.trim() ? s.name.trim() : s.id;
                out[c][key] = { tags: tags, migratedFrom: 'prompt-classifier-v3', sourceId: s.id };
            }
        }
        return { success: true, json: JSON.stringify(out, null, 2) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Export legacy format to file
ipcMain.handle('sets-export-legacy-file', async (event, ids) => {
    try {
        const data = setStore.loadAll();
        const all = data.sets || [];
        const picked = Array.isArray(ids) && ids.length ? all.filter(s => ids.includes(s.id)) : all;
        const out = {};
        for (const s of picked) {
            const cats = (Array.isArray(s.categories) && s.categories.length) ? s.categories : Object.keys(s.tagsByCategory || {});
            for (const c of cats) {
                if (!out[c]) out[c] = {};
                const tags = (s.tagsByCategory && Array.isArray(s.tagsByCategory[c])) ? s.tagsByCategory[c] : [];
                const key = s.name && s.name.trim() ? s.name.trim() : s.id;
                out[c][key] = { tags, migratedFrom: 'prompt-classifier-v3', sourceId: s.id };
            }
        }
        const res = await dialog.showSaveDialog({
            title: 'レガシー出力 (promptSets)',
            defaultPath: 'promptSets_legacy.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        if (res.canceled || !res.filePath) return { success: false, error: 'canceled' };
        fsSync.writeFileSync(res.filePath, JSON.stringify(out, null, 2), 'utf-8');
        return { success: true, file: res.filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('sets-import-json', async (event, jsonText, strategy = 'rename') => {
    try {
        const incoming = JSON.parse(jsonText);
        const data = setStore.loadAll();
        const existing = data.sets || [];
        const idMap = new Map(existing.map(s => [s.id, true]));
        const nameByCat = new Map(); // key: cat|name to detect duplicates when no id
        for (const s of existing) {
            const cats = Array.isArray(s.categories) ? s.categories : Object.keys(s.tagsByCategory||{});
            for (const c of cats) nameByCat.set(`${c}|${s.name||s.id}`, true);
        }
        const imported = [];

        // Case A: our format {version, sets:[]}
        if (incoming && (Array.isArray(incoming.sets))) {
            for (const s of incoming.sets) {
                const rec = { ...s };
                if (idMap.has(rec.id)) {
                    if (strategy === 'overwrite') {
                        // keep id
                    } else if (strategy === 'skip') {
                        continue;
                    } else {
                        rec.id = setStore.uuid();
                    }
                }
                const saved = setStore.upsertSet(rec);
                imported.push(saved.id);
            }
            return { success: true, imported };
        }

        // Case B: legacy CategoryManager format: { category: { setName: {tags: []} } }
        const legacyCats = Object.keys(incoming || {}).filter(k => incoming[k] && typeof incoming[k] === 'object');
        if (legacyCats.length) {
            for (const c of legacyCats) {
                const setsObj = incoming[c];
                if (!setsObj || typeof setsObj !== 'object') continue;
                for (const setName of Object.keys(setsObj)) {
                    const entry = setsObj[setName];
                    const tags = (entry && Array.isArray(entry.tags)) ? entry.tags : [];
                    const catKey = `${c}|${setName}`;
                    const rec = {
                        name: setName,
                        description: '',
                        labels: [],
                        categories: [c],
                        tagsByCategory: { [c]: tags }
                    };
                    if (nameByCat.has(catKey) && strategy === 'skip') continue;
                    if (nameByCat.has(catKey) && strategy === 'rename') rec.name = `${setName}_${Date.now()}`;
                    const saved = setStore.upsertSet(rec);
                    imported.push(saved.id);
                }
            }
            return { success: true, imported };
        }

        return { success: false, error: 'Unsupported JSON format' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Import from file (auto-detect our/legacy formats)
ipcMain.handle('sets-import-file', async (event, strategy = 'rename') => {
    try {
        const res = await dialog.showOpenDialog({
            title: 'インポート (JSON ファイル)',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (res.canceled || !res.filePaths || !res.filePaths[0]) return { success: false, error: 'canceled' };
        const txt = fsSync.readFileSync(res.filePaths[0], 'utf-8');
        const r = await ipcMain.handle('sets-import-json')({} , txt, strategy);
        // 上の呼び出しは通常のipcではないため、直接関数化しても良いが、ここでは再実装
        // 代替: 直接処理
        try {
            const incoming = JSON.parse(txt);
            const data = setStore.loadAll();
            const existing = data.sets || [];
            const idMap = new Map(existing.map(s => [s.id, true]));
            const nameByCat = new Map();
            for (const s of existing) {
                const cats = Array.isArray(s.categories) ? s.categories : Object.keys(s.tagsByCategory||{});
                for (const c of cats) nameByCat.set(`${c}|${s.name||s.id}`, true);
            }
            const imported = [];
            if (incoming && Array.isArray(incoming.sets)) {
                for (const s of incoming.sets) {
                    const rec = { ...s };
                    if (idMap.has(rec.id)) {
                        if (strategy === 'overwrite') {
                        } else if (strategy === 'skip') {
                            continue;
                        } else { rec.id = setStore.uuid(); }
                    }
                    const saved = setStore.upsertSet(rec);
                    imported.push(saved.id);
                }
                return { success: true, imported };
            }
            const legacyCats = Object.keys(incoming || {}).filter(k => incoming[k] && typeof incoming[k] === 'object');
            if (legacyCats.length) {
                for (const c of legacyCats) {
                    const setsObj = incoming[c];
                    if (!setsObj || typeof setsObj !== 'object') continue;
                    for (const setName of Object.keys(setsObj)) {
                        const entry = setsObj[setName];
                        const tags = (entry && Array.isArray(entry.tags)) ? entry.tags : [];
                        const catKey = `${c}|${setName}`;
                        const rec = { name: setName, description: '', labels: [], categories: [c], tagsByCategory: { [c]: tags } };
                        if (nameByCat.has(catKey) && strategy === 'skip') continue;
                        if (nameByCat.has(catKey) && strategy === 'rename') rec.name = `${setName}_${Date.now()}`;
                        const saved = setStore.upsertSet(rec);
                        imported.push(saved.id);
                    }
                }
                return { success: true, imported };
            }
            return { success: false, error: 'Unsupported JSON format' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ==========================================
// Phase 15: セット選択UI & データ移行システム
// ==========================================
setManager.ensureBaseDirectories();

// カテゴリ別セット読み込み
ipcMain.handle('load-category-sets', async (event, category) => {
    try {
        // 配布版ではパスを確実に初期化（set-manager.jsのパス解決を保証）
        if (app.isPackaged) {
            setManager.ensureBaseDirectories();
        }
        
        const categoryData = setManager.loadCategory(category);
        return {
            success: true,
            groups: categoryData.groups,
            sections: categoryData.sections,
            sets: categoryData.sections,
            basePath: setManager.getSetsBaseDir()
        };
    } catch (error) {
        console.error(`load-category-sets エラー [${category}]:`, error);
        console.error(error.stack);
        return { 
            success: false, 
            error: error.message,
            groups: {},
            sections: {},
            sets: {},
            basePath: setManager.getSetsBaseDir()
        };
    }
});

ipcMain.handle('get-sets-base-dir', async () => {
    return setManager.getSetsBaseDir();
});

// ストーリープロンプトのお気に入り管理
const STORY_FAVORITES_PATH = path.join(app.getPath('userData'), 'story_favorites.json');

ipcMain.handle('save-story-favorites', async (event, favorites) => {
    try {
        fsSync.writeFileSync(STORY_FAVORITES_PATH, JSON.stringify(favorites, null, 2), 'utf-8');
        console.log('✅ お気に入り保存成功:', STORY_FAVORITES_PATH);
        return { success: true };
    } catch (error) {
        console.error('❌ お気に入り保存エラー:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-story-favorites', async () => {
    try {
        if (fsSync.existsSync(STORY_FAVORITES_PATH)) {
            const data = fsSync.readFileSync(STORY_FAVORITES_PATH, 'utf-8');
            console.log('✅ お気に入り読み込み成功');
            return { success: true, favorites: JSON.parse(data) };
        }
        console.log('⚠️ お気に入りファイルなし（新規作成）');
        return { success: true, favorites: [] };
    } catch (error) {
        console.error('❌ お気に入り読み込みエラー:', error);
        return { success: false, error: error.message, favorites: [] };
    }
});

// ストーリー指示テンプレート管理
const STORY_INSTRUCTION_TEMPLATES_PATH = path.join(app.getPath('userData'), 'story_instruction_templates.json');

ipcMain.handle('save-story-instruction-templates', async (event, templates) => {
    try {
        fsSync.writeFileSync(STORY_INSTRUCTION_TEMPLATES_PATH, JSON.stringify(templates, null, 2), 'utf-8');
        console.log('✅ ストーリー指示テンプレート保存成功:', STORY_INSTRUCTION_TEMPLATES_PATH);
        return { success: true };
    } catch (error) {
        console.error('❌ ストーリー指示テンプレート保存エラー:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-story-instruction-templates', async () => {
    try {
        if (fsSync.existsSync(STORY_INSTRUCTION_TEMPLATES_PATH)) {
            const data = fsSync.readFileSync(STORY_INSTRUCTION_TEMPLATES_PATH, 'utf-8');
            console.log('✅ ストーリー指示テンプレート読み込み成功');
            return { success: true, templates: JSON.parse(data) };
        }
        console.log('⚠️ ストーリー指示テンプレートファイルなし（新規作成）');
        return { success: true, templates: [] };
    } catch (error) {
        console.error('❌ ストーリー指示テンプレート読み込みエラー:', error);
        return { success: false, error: error.message, templates: [] };
    }
});

// ========================================
// 📄 YAML生成システム IPCハンドラー
// ========================================

// ファイル選択ダイアログ
ipcMain.handle('select-text-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    return result.filePaths[0] || null;
});

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.filePaths[0] || null;
});

// テキストファイル読み込み
ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        console.error('❌ ファイル読み込みエラー:', error);
        return { success: false, error: error.message };
    }
});

// ガイドラインファイル読み込み
ipcMain.handle('read-guide-file', async (event, filename) => {
    try {
        // 配布版ではextraFilesでコピーされたdocs/から読み込む
        const guidePath = app.isPackaged
            ? path.join(__dirname, 'docs', filename)
            : path.join(__dirname, 'docs', filename);
        
        if (!fsSync.existsSync(guidePath)) {
            throw new Error(`ガイドラインファイルが見つかりません: ${filename}`);
        }
        
        const content = fsSync.readFileSync(guidePath, 'utf-8');
        return content;
    } catch (error) {
        console.error('❌ ガイドライン読み込みエラー:', error);
        throw error;
    }
});

// フォルダ内のtxtファイル一覧取得
ipcMain.handle('list-text-files', async (event, folderPath) => {
    try {
        const files = await fs.promises.readdir(folderPath);
        const txtFiles = files.filter(f => f.endsWith('.txt'));
        return { success: true, files: txtFiles };
    } catch (error) {
        console.error('❌ ファイル一覧取得エラー:', error);
        return { success: false, error: error.message, files: [] };
    }
});

// YAMLファイル保存
ipcMain.handle('save-yaml-file', async (event, filePath, content) => {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('❌ YAMLファイル保存エラー:', error);
        return { success: false, error: error.message };
    }
});

// テキストファイル保存
ipcMain.handle('save-text-file', async (event, filePath, content) => {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('❌ テキストファイル保存エラー:', error);
        return { success: false, error: error.message };
    }
});

// ファイル保存ダイアログ
ipcMain.handle('show-save-dialog', async (event, defaultPath, filters) => {
    const result = await dialog.showSaveDialog({
        defaultPath,
        filters
    });
    return result.filePath || null;
});

// YAML生成システムのお気に入り保存
const YAML_FAVORITES_PATH = path.join(app.getPath('userData'), 'yaml_favorites.json');

ipcMain.handle('save-yaml-favorites', async (event, favorites) => {
    try {
        fsSync.writeFileSync(YAML_FAVORITES_PATH, JSON.stringify(favorites, null, 2), 'utf-8');
        console.log('✅ YAMLお気に入り保存成功:', YAML_FAVORITES_PATH);
        return { success: true };
    } catch (error) {
        console.error('❌ YAMLお気に入り保存エラー:', error);
        return { success: false, error: error.message };
    }
});

// YAML生成システムのお気に入り読み込み
ipcMain.handle('load-yaml-favorites', async () => {
    try {
        if (fsSync.existsSync(YAML_FAVORITES_PATH)) {
            const data = fsSync.readFileSync(YAML_FAVORITES_PATH, 'utf-8');
            console.log('✅ YAMLお気に入り読み込み成功');
            return { success: true, favorites: JSON.parse(data) };
        }
        console.log('⚠️ YAMLお気に入りファイルなし（新規作成）');
        return { success: true, favorites: [] };
    } catch (error) {
        console.error('❌ YAMLお気に入り読み込みエラー:', error);
        return { success: false, error: error.message, favorites: [] };
    }
});

// 辞書ファイル読み込み（YAML生成システム用）
ipcMain.handle('read-dictionary-file', async (event, filename) => {
    try {
        const dictionaryPath = path.join(__dirname, 'dictionaries', filename);
        if (fsSync.existsSync(dictionaryPath)) {
            const content = fsSync.readFileSync(dictionaryPath, 'utf-8');
            return { success: true, content };
        }
        return { success: false, error: 'ファイルが見つかりません' };
    } catch (error) {
        console.error(`❌ 辞書ファイル読み込みエラー (${filename}):`, error);
        return { success: false, error: error.message };
    }
});

// カテゴリ別セット保存
ipcMain.handle('save-category-set', async (event, category, group, section, setName, tags, image, metadata) => {
    try {
        // ライセンスチェック（set-manager.js内で実行されるが、エラーメッセージを改善）
        setManager.saveCategorySet(category, group, section, setName, tags, image, metadata);
        return { 
            success: true,
            message: `セット「${setName}」を保存しました`
        };
    } catch (error) {
        console.error('save-category-set エラー:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// カテゴリ別セット削除
ipcMain.handle('delete-category-set', async (event, category, group, section, setName) => {
    try {
        setManager.deleteCategorySet(category, group, section, setName);
        return {
            success: true,
            message: `セット「${setName}」を削除しました`
        };
    } catch (error) {
        console.error('delete-category-set エラー:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// セクション削除
ipcMain.handle('delete-category-section', async (event, category, group, section) => {
    try {
        setManager.deleteCategorySection(category, group, section);
        return {
            success: true,
            message: `セクション「${section}」を削除しました`
        };
    } catch (error) {
        console.error('delete-category-section エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// セクション名称変更
ipcMain.handle('rename-category-section', async (event, category, group, oldSection, newSection) => {
    try {
        const result = setManager.renameCategorySection(category, group, oldSection, newSection);
        return {
            success: true,
            message: `セクション名を「${result.oldSection}」から「${result.newSection}」に変更しました`
        };
    } catch (error) {
        console.error('rename-category-section エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// グループ名称変更
ipcMain.handle('rename-category-group', async (event, category, oldGroup, newGroup) => {
    try {
        const result = setManager.renameCategoryGroup(category, oldGroup, newGroup);
        return {
            success: true,
            message: `グループ名を「${result.oldGroup}」から「${result.newGroup}」に変更しました`
        };
    } catch (error) {
        console.error('rename-category-group エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// グループ削除
ipcMain.handle('delete-category-group', async (event, category, group) => {
    try {
        const result = setManager.deleteCategoryGroup(category, group);
        return {
            success: true,
            message: `グループ「${result.deletedGroup}」を削除しました`
        };
    } catch (error) {
        console.error('delete-category-group エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// JSONインポート（参考アプリのlocalStorageデータから）
ipcMain.handle('import-sets-from-json', async (event) => {
    try {
        // ファイル選択ダイアログ
        const result = await dialog.showOpenDialog({
            title: 'セットデータをインポート',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        
        if (result.canceled || !result.filePaths || !result.filePaths[0]) {
            return { 
                success: false, 
                error: 'キャンセルされました' 
            };
        }
        
        const jsonPath = result.filePaths[0];
        const rawData = JSON.parse(fsSync.readFileSync(jsonPath, 'utf-8'));
        setManager.ensureBaseDirectories();

        // データ正規化と保存
        let importedCount = 0;
        const categoryMapping = {
            'poseemotion': 'pose',
            'people': 'body',
            'other': 'other'
        };
        
        // rawData構造を分析
        if (rawData.rawData) {
            // export-sets-from-reference.jsで作成したフォーマット
            const raw = rawData.rawData;
            
            // カテゴリ別customSets処理
            for (const key of Object.keys(raw)) {
                if (key.startsWith('customSets_')) {
                    const category = key.replace('customSets_', '');
                    const targetCategory = categoryMapping[category] || category;
                    
                    if (raw[key] && typeof raw[key] === 'object') {
                        const sections = raw[key];
                        const categoryData = setManager.loadCategory(targetCategory);
                        const groups = categoryData.groups;
                        if (!groups[DEFAULT_GROUP]) {
                            groups[DEFAULT_GROUP] = { sections: {} };
                        }
                        const existing = groups[DEFAULT_GROUP].sections;

                        // セクション別にマージ
                        for (const section of Object.keys(sections)) {
                            if (!existing[section]) existing[section] = {};
                            
                            const sets = sections[section];
                            for (const setName of Object.keys(sets)) {
                                const setData = sets[setName];
                                existing[section][setName] = {
                                    tags: Array.isArray(setData) ? setData : (setData.tags || []),
                                    tagsCount: Array.isArray(setData) ? setData.length : (setData.tags ? setData.tags.length : 0),
                                    image: setData.image || '',
                                    importedAt: new Date().toISOString()
                                };
                                importedCount++;
                            }
                        }
                        groups[DEFAULT_GROUP].sections = existing;
                        setManager.writeCategory(targetCategory, groups);
                    }
                }
            }
            
            // 他のlocalStorageキー処理（savedSets, customPoseSets等）
            if (raw.customPoseSets && typeof raw.customPoseSets === 'object') {
                const poseData = setManager.loadCategory('pose');
                const poseGroups = poseData.groups;
                if (!poseGroups[DEFAULT_GROUP]) poseGroups[DEFAULT_GROUP] = { sections: {} };
                const existing = poseGroups[DEFAULT_GROUP].sections;
                
                for (const section of Object.keys(raw.customPoseSets)) {
                    if (!existing[section]) existing[section] = {};
                    const sets = raw.customPoseSets[section];
                    for (const setName of Object.keys(sets)) {
                        const tags = sets[setName];
                        existing[section][setName] = {
                            tags: Array.isArray(tags) ? tags : [],
                            tagsCount: Array.isArray(tags) ? tags.length : 0,
                            image: '',
                            importedAt: new Date().toISOString()
                        };
                        importedCount++;
                    }
                }
                poseGroups[DEFAULT_GROUP].sections = existing;
                setManager.writeCategory('pose', poseGroups);
            }
            
            if (raw.obsidianClothingSets && typeof raw.obsidianClothingSets === 'object') {
                const clothingData = setManager.loadCategory('clothing');
                const clothingGroups = clothingData.groups;
                if (!clothingGroups[DEFAULT_GROUP]) clothingGroups[DEFAULT_GROUP] = { sections: {} };
                const existing = clothingGroups[DEFAULT_GROUP].sections;
                
                for (const section of Object.keys(raw.obsidianClothingSets)) {
                    if (!existing[section]) existing[section] = {};
                    const sets = raw.obsidianClothingSets[section];
                    for (const setName of Object.keys(sets)) {
                        const tags = sets[setName];
                        existing[section][setName] = {
                            tags: Array.isArray(tags) ? tags : [],
                            tagsCount: Array.isArray(tags) ? tags.length : 0,
                            image: '',
                            importedAt: new Date().toISOString()
                        };
                        importedCount++;
                    }
                }
                clothingGroups[DEFAULT_GROUP].sections = existing;
                setManager.writeCategory('clothing', clothingGroups);
            }
        }
        setManager.rebuildIndex();
        
        return { 
            success: true, 
            imported: importedCount,
            message: `${importedCount}個のセットをインポートしました`
        };
    } catch (error) {
        console.error('import-sets-from-json エラー:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// 全セットエクスポート
ipcMain.handle('export-all-sets', async (event) => {
    try {
        // 保存先選択ダイアログ
        const result = await dialog.showSaveDialog({
            title: 'セットデータをエクスポート',
            defaultPath: 'metacard-sets-export.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (result.canceled || !result.filePath) {
            return { 
                success: false, 
                error: 'キャンセルされました' 
            };
        }
        
        // 全カテゴリのJSONを統合
        const categories = setManager.DEFAULT_CATEGORIES;
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            exportedFrom: 'prompt-classifier-v3',
            categories: {}
        };
        
        let totalSets = 0;
        for (const category of categories) {
            const categoryData = setManager.loadCategory(category);
            exportData.categories[category] = { groups: categoryData.groups };
            Object.values(categoryData.groups || {}).forEach(groupData => {
                const sections = groupData && groupData.sections ? groupData.sections : {};
                Object.values(sections).forEach(sets => {
                    totalSets += Object.keys(sets).length;
                });
            });
        }
        
        // エクスポート
        fsSync.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
        
        return { 
            success: true,
            file: result.filePath,
            totalSets: totalSets,
            message: `${totalSets}個のセットをエクスポートしました`
        };
    } catch (error) {
        console.error('export-all-sets エラー:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// セット画像保存
ipcMain.handle('save-set-image', async (event, category, group, section, setName, imageData) => {
    try {
        const saved = setManager.saveSetImage(category, group, section, setName, imageData);
        return { 
            success: true,
            fileName: saved.fileName,
            path: saved.filePath
        };
    } catch (error) {
        console.error('save-set-image エラー:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// セット画像読み込み
ipcMain.handle('load-set-image', async (event, fileName) => {
    try {
        return { 
            success: true,
            dataUrl: setManager.loadSetImage(fileName)
        };
    } catch (error) {
        console.error('load-set-image エラー:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// セット画像削除
ipcMain.handle('remove-set-image', async (event, category, group, section, setName) => {
    try {
        setManager.removeSetImage(category, group, section, setName);
        return {
            success: true,
            message: '登録画像を削除しました'
        };
    } catch (error) {
        console.error('remove-set-image エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ========================================
// ライセンス管理 IPC ハンドラー
// ========================================

// ライセンス情報を取得
ipcMain.handle('license-get-info', async () => {
    try {
        const licenseManager = getLicenseManager();
        return {
            success: true,
            licenseInfo: licenseManager.getLicenseInfo()
        };
    } catch (error) {
        console.error('license-get-info エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ライセンス検証（パスコード認証など）
ipcMain.handle('license-verify', async (event, method, data) => {
    try {
        const licenseManager = getLicenseManager();
        
        if (method === 'passcode') {
            const result = licenseManager.verifyPasscode(data.passcode);
            return result;
        } else if (method === 'discord') {
            // Discord認証は後で実装
            return {
                success: false,
                error: 'Discord認証はまだ実装されていません'
            };
        } else {
            return {
                success: false,
                error: '不明な認証方法です'
            };
        }
    } catch (error) {
        console.error('license-verify エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// セット登録数制限をチェック
ipcMain.handle('license-check-set-limit', async (event, category) => {
    try {
        const licenseManager = getLicenseManager();
        const currentCount = setManager.countCategorySets(category);
        const limitCheck = licenseManager.checkSetLimit(category, currentCount);
        return {
            success: true,
            ...limitCheck
        };
    } catch (error) {
        console.error('license-check-set-limit エラー:', error);
        return {
            success: false,
            error: error.message,
            allowed: true  // エラー時は許可（開発環境など）
        };
    }
});

// 体験版を有効化
ipcMain.handle('license-activate-trial', async () => {
    try {
        const licenseManager = getLicenseManager();
        const result = licenseManager.activateTrial();
        return result;
    } catch (error) {
        console.error('license-activate-trial エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ライセンスの状態を検証
ipcMain.handle('license-validate', async () => {
    try {
        const licenseManager = getLicenseManager();
        const validation = licenseManager.validateLicense();
        return validation;
    } catch (error) {
        console.error('license-validate エラー:', error);
        return {
            valid: false,
            status: 'error',
            message: error.message
        };
    }
});

// 認証を完了（定期認証用）
ipcMain.handle('license-complete-verification', async () => {
    try {
        const licenseManager = getLicenseManager();
        licenseManager.completeVerification();
        return {
            success: true,
            message: '認証が完了しました'
        };
    } catch (error) {
        console.error('license-complete-verification エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// アプリケーション状態
ipcMain.handle('app-is-packaged', async () => {
    return app.isPackaged;
});

// ========================================
// Phase 2: 欠落ポーズ登録システム IPC ハンドラー
// ========================================

const missingPoseDetector = require('./ai/pose-registration/missing-pose-detector');
const geminiPromptSuggester = require('./ai/pose-registration/gemini-prompt-suggester');
const poseRegistry = require('./ai/pose-registration/pose-registry');

// 1. 欠落ポーズ検出開始
ipcMain.handle('detect-missing-poses-start', async () => {
    try {
        missingPoseDetector.startDetection();
        return { success: true };
    } catch (error) {
        console.error('❌ detect-missing-poses-start エラー:', error);
        return { success: false, error: error.message };
    }
});

// 2. 欠落ポーズ検出停止
ipcMain.handle('detect-missing-poses-stop', async () => {
    try {
        missingPoseDetector.stopDetection();
        return { success: true };
    } catch (error) {
        console.error('❌ detect-missing-poses-stop エラー:', error);
        return { success: false, error: error.message };
    }
});

// 3. 欠落ポーズ取得
ipcMain.handle('get-missing-poses', async () => {
    try {
        const missingPoses = missingPoseDetector.getMissingPoses();
        const statistics = missingPoseDetector.getStatistics();
        const byGroup = missingPoseDetector.getMissingPosesByGroup();

        return {
            success: true,
            missingPoses: missingPoses,
            statistics: statistics,
            byGroup: byGroup
        };
    } catch (error) {
        console.error('❌ get-missing-poses エラー:', error);
        return { success: false, error: error.message };
    }
});

// 4. AIプロンプト提案生成
ipcMain.handle('suggest-pose-prompt', async (event, poseData) => {
    try {
        // poseData: { group, section, name }
        const suggestion = await geminiPromptSuggester.generatePromptSuggestion(poseData);

        return {
            success: true,
            suggestion: suggestion
        };
    } catch (error) {
        console.error('❌ suggest-pose-prompt エラー:', error);
        return { success: false, error: error.message };
    }
});

// 5. ポーズ登録（単一）
ipcMain.handle('register-pose', async (event, poseData) => {
    try {
        // poseData: { group, section, name, tags, prompt }
        const result = await poseRegistry.registerPose(poseData);

        return result;
    } catch (error) {
        console.error('❌ register-pose エラー:', error);
        return { success: false, error: error.message };
    }
});

// 6. ポーズ一括登録
ipcMain.handle('batch-register-poses', async (event, posesArray) => {
    try {
        const result = await poseRegistry.batchRegister(posesArray);

        return result;
    } catch (error) {
        console.error('❌ batch-register-poses エラー:', error);
        return { success: false, error: error.message };
    }
});
