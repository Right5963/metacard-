// プロンプト分類ツール v3.0 - メインロジック
// PNG/JPEG完全メタデータ抽出 + 8カテゴリ自動分類
console.log('🚀 classifier.js 読み込み開始');

// ========================================
// コンソールログ収集システム
// ========================================
const logBuffer = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function(...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logBuffer.push(`[${timestamp}] LOG: ${message}`);
    originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logBuffer.push(`[${timestamp}] ERROR: ${message}`);
    originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logBuffer.push(`[${timestamp}] WARN: ${message}`);
    originalConsoleWarn.apply(console, args);
};

// ログをファイルにエクスポート
async function exportConsoleLogs() {
    try {
        const logs = logBuffer.join('\n');
        const result = await window.electronAPI.saveConsoleLogs(logs);
        if (result.success) {
            alert(`✅ ログを保存しました:\n${result.file}`);
        } else {
            alert(`❌ ログ保存失敗:\n${result.error}`);
        }
    } catch (error) {
        alert(`❌ エラー: ${error.message}`);
    }
}

// グローバルに公開
window.exportConsoleLogs = exportConsoleLogs;

// ========================================
// グローバル変数
// ========================================
const textDecoder = new TextDecoder('utf-8');
// 表情辞書（expression）を保持して、poseemotionの分配に使用
let EXPRESSION_DICT = new Set();
let currentMetadata = null;
let currentImageFile = null;  // 🤖 Phase 12: AI分類用の画像ファイル保存
let WD14_LABELS = null;       // WD14ラベル→カテゴリマップ
let lastTaggerParity = null;  // パリティ表示用の直近Tagger処理情報

// ========================================
// 🎨 UI通知システム（showMessage関数 - 最優先定義）
// ========================================
/**
 * UIに通知メッセージを表示（トースト通知）
 * @param {string} message - 表示するメッセージ
 * @param {string} type - メッセージタイプ（'success'/'error'/'info'）
 */
function showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // メッセージ要素の取得または作成
    let messageEl = document.getElementById('statusMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'statusMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(messageEl);
    }

    // タイプ別の色設定（グラデーション）
    const colors = {
        success: 'linear-gradient(135deg, #48c774 0%, #3b9d5e 100%)',
        error: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
        info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    messageEl.style.background = colors[type] || colors.info;
    messageEl.textContent = message;
    messageEl.style.display = 'block';

    // 3秒後に自動的にフェードアウト
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// ========================================
// 9カテゴリ定義（ベース辞書）
// ========================================
// ========================================
// 📌 MetaCard方式統合 (C:\metacard\MetaCard_README.md準拠)
// ========================================
// poseemotion: ポーズと感情・表情を1セットで扱う (MetaCard方式)
// character_face: 髪型・目の色・髪色のみ (表情は含めない)
// ========================================

const CATEGORIES = {
    people: { icon: '👥', name: '複数人・人数', tags: ['2girls', '3girls', '1boy', '2boys', 'solo', 'couple', 'multiple_girls', 'multiple_boys'] },
    // MetaCard準拠: 顔は髪型・髪色・目の色などの外観のみ。表情は含めない。
    face: { icon: '👩', name: '女性の顔', tags: ['1girl', 'long hair', 'short hair', 'blue eyes', 'brown eyes', 'green eyes', 'grey eyes', 'purple eyes', 'yellow eyes', 'heterochromia', 'ponytail', 'twintails', 'braid', 'blonde hair', 'brown hair', 'black hair', 'red hair', 'silver hair', 'white hair', 'grey hair'] },
    body: { icon: '💃', name: '体', tags: ['large breasts', 'medium breasts', 'small breasts', 'slim', 'curvy', 'muscular', 'pregnant', 'thighs', 'armpits', 'bare shoulders', 'thick thighs'] },
    poseemotion: { icon: '🤸😊', name: 'ポーズ・感情', tags: ['standing', 'sitting', 'lying', 'kneeling', 'spread legs', 'arms up', 'hands on hips', 'squatting', 'crouching', 'leaning', 'bending', 'blush', 'smile', 'open mouth', 'closed mouth', 'happy', 'sad', 'angry', 'surprised', 'nervous', 'embarrassed', 'aroused', 'ahegao', 'looking back', 'cowboy shot'] },
    background: { icon: '🏞️', name: '背景', tags: ['outdoors', 'indoors', 'beach', 'forest', 'city', 'room', 'bedroom', 'night', 'day', 'pool', 'classroom', 'sky', 'ocean'] },
    clothing: { icon: '👗', name: '服装', tags: ['dress', 'bikini', 'uniform', 'school uniform', 'shirt', 'pants', 'skirt', 'underwear', 'nurse', 'thighhighs', 'garter straps', 'hairclip', 'jewelry', 'name tag', 'zettai ryouiki', 'jacket', 'hoodie', 'sweater'] },
    quality: { icon: '⭐', name: '品質', tags: ['masterpiece', 'best quality', 'high quality', 'highres', 'absurdres', '8k', '4k', 'detailed', 'extremely detailed', 'CG', 'unity', 'wallpaper', 'Oneiric'] },
    other: { icon: '🔧', name: 'その他', tags: ['focus line', 'pixiv', 'shoulders exposed', 'emotions'] }  // 未分類・その他タグ用
};

// ========================================
// 学習タグサニタイズ設定
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

// ========================================
// 📚 共通辞書システム（C:\metacard\dictionaries\から読み込み）
// ========================================
async function loadSharedDictionaries() {
    try {
        console.log('📚 共通辞書読み込み開始 (C:\\metacard\\dictionaries\\)...');

        const dictionaryFiles = [
            'people.md',
            'face.md',
            'body.md',
            // pose/expression は MetaCard 方式で poseemotion.md に統合
            'poseemotion.md',
            'background.md',
            'clothing.md',
            'quality.md',
            'other.md'
        ];

        for (const filename of dictionaryFiles) {
            const result = await window.electronAPI.readSharedDictionary(filename);

            if (result.success) {
                const tags = parseFlexibleDictionary(result.content);
                const categoryKey = filename.replace('.md', '');

                if (CATEGORIES[categoryKey]) {
                    // 既存タグとマージ（重複除去）
                    CATEGORIES[categoryKey].tags = [...new Set([...CATEGORIES[categoryKey].tags, ...tags])];
                    console.log(`  ✅ ${categoryKey}: ${tags.length}タグ追加 (合計: ${CATEGORIES[categoryKey].tags.length})`);
                } else {
                    console.warn(`  ⚠️ カテゴリ未定義: ${categoryKey}`);
                }
            } else {
                console.warn(`  ⚠️ ${filename} 読み込み失敗: ${result.error}`);
            }
        }

        // 追加読み込み: poseemotion.md（共有辞書でpose/expression統合運用時）
        try {
            const pe = await window.electronAPI.readSharedDictionary('poseemotion.md');
            if (pe && pe.success && typeof pe.content === 'string') {
                const peTags = parseMarkdownDictionary(pe.content);
                CATEGORIES.poseemotion.tags = [...new Set([...CATEGORIES.poseemotion.tags, ...peTags])];
                console.log(`  ✅ poseemotion: 追加${peTags.length}（合計: ${CATEGORIES.poseemotion.tags.length}）`);
            }
        } catch (e) {
            // 存在しない環境もあるため警告は出さない
        }

        console.log('✅ 共通辞書マージ完了');
    } catch (error) {
        console.error('❌ 共通辞書読み込みエラー:', error);
        console.log('⚠️ ベース辞書のみ使用します');
    }
}

// 共有辞書用の柔軟なMarkdownパーサ（- tag と素の行を許容）
function parseFlexibleDictionary(markdown) {
    if (typeof markdown !== 'string') return [];
    const tags = [];
    const lines = markdown.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('#')) continue;

        if (trimmed.startsWith('- ')) {
            const t = trimmed.substring(2).trim();
            const clean = t.replace(/\s*\([^)]*\)/g, '').trim();
            if (clean) tags.push(clean);
        } else {
            const clean = trimmed.replace(/\s*\([^)]*\)/g, '').trim();
            if (clean) tags.push(clean);
        }
    }
    return tags;
}

// ========================================
// 学習タグ（learned_tags.json）をCATEGORIESへ反映
// ========================================
async function mergeLearnedTagsIntoCategories() {
    try {
        const learnedResult = await window.electronAPI.loadLearnedTags();
        if (!learnedResult || !learnedResult.success || !learnedResult.tags) {
            return;
        }

        const { sanitized: learned, removedSummary } = sanitizeTagMap(learnedResult.tags || {});
        if (Object.keys(removedSummary).length) {
            console.log('⚠️ loadLearnedTags: 不適切タグを除外しました', removedSummary);
        }
        const pushAll = (key, tags) => {
            if (!Array.isArray(tags) || tags.length === 0) return;
            if (!CATEGORIES[key]) return;
            const merged = new Set(CATEGORIES[key].tags);
            for (const t of tags) merged.add(t);
            CATEGORIES[key].tags = [...merged];
        };

        pushAll('people', learned.people);
        pushAll('face', learned.face);
        pushAll('body', learned.body);
        pushAll('background', learned.background);
        pushAll('clothing', learned.clothing);
        pushAll('quality', learned.quality);
        pushAll('other', learned.other);

        // pose / expression は poseemotion に統合反映
        const poseTags = Array.isArray(learned.pose) ? learned.pose : [];
        const exprTags = Array.isArray(learned.expression) ? learned.expression : [];
        pushAll('poseemotion', [...poseTags, ...exprTags]);

        console.log('✅ 学習タグをCATEGORIESへ反映完了', learnedResult.metadata || {});
    } catch (e) {
        console.warn('⚠️ 学習タグのCATEGORIES反映に失敗:', e);
    }
}

/**
 * Markdownファイルからタグリストを抽出
 * @param {string} markdown - Markdown形式の辞書内容
 * @returns {string[]} - タグリスト
 */
function parseMarkdownDictionary(markdown) {
    const tags = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // リスト形式のタグ（- tag）を抽出
        if (trimmed.startsWith('- ') && !trimmed.startsWith('- 追加日') && !trimmed.startsWith('- 最終更新') && !trimmed.startsWith('- バージョン')) {
            const tag = trimmed.substring(2).trim();

            // コメントや説明文を除外（括弧内の説明を削除）
            const cleanTag = tag.replace(/\s*\([^)]*\)/g, '').trim();

            if (cleanTag && !cleanTag.startsWith('#') && cleanTag.length > 0) {
                tags.push(cleanTag);
            }
        }
    }

    return tags;
}

// ========================================
// Obsidian辞書読み込み+マージ（既存システム維持）
// ========================================
async function loadAndMergeDictionaries() {
    try {
        console.log('📚 Obsidian辞書読み込み開始...');
        const result = await window.electronAPI.loadObsidianDictionaries();

        if (result.success) {
            const { dictionaries } = result;

            // 各カテゴリの辞書をマージ（Set使用で重複除去）
            CATEGORIES.face.tags = [...new Set([...CATEGORIES.face.tags, ...dictionaries.face])];
            CATEGORIES.body.tags = [...new Set([...CATEGORIES.body.tags, ...dictionaries.body])];
            CATEGORIES.clothing.tags = [...new Set([...CATEGORIES.clothing.tags, ...dictionaries.clothing])];
            CATEGORIES.poseemotion.tags = [...new Set([...CATEGORIES.poseemotion.tags, ...dictionaries.poseemotion])];
            // expression.md（Obsidian側に分離されている場合）は poseemotion にも統合し、セットを保持
            if (Array.isArray(dictionaries.expression) && dictionaries.expression.length > 0) {
                CATEGORIES.poseemotion.tags = [...new Set([...CATEGORIES.poseemotion.tags, ...dictionaries.expression])];
                EXPRESSION_DICT = new Set(dictionaries.expression.map(t => String(t).toLowerCase()));
            }
            CATEGORIES.background.tags = [...new Set([...CATEGORIES.background.tags, ...dictionaries.background])];
            CATEGORIES.quality.tags = [...new Set([...CATEGORIES.quality.tags, ...dictionaries.quality])];

            console.log('✅ 辞書マージ完了:');
            console.log('  face:', CATEGORIES.face.tags.length, 'タグ');
            console.log('  body:', CATEGORIES.body.tags.length, 'タグ');
            console.log('  clothing:', CATEGORIES.clothing.tags.length, 'タグ');
            console.log('  poseemotion:', CATEGORIES.poseemotion.tags.length, 'タグ');
            console.log('  background:', CATEGORIES.background.tags.length, 'タグ');
            console.log('  quality:', CATEGORIES.quality.tags.length, 'タグ');
        } else {
            console.error('❌ 辞書読み込み失敗:', result.error);
            console.log('⚠️ ベース辞書のみ使用します');
        }
    } catch (error) {
        console.error('❌ 辞書読み込みエラー:', error);
        console.log('⚠️ ベース辞書のみ使用します');
    }
}

// ========================================
// 🌐 Danbooru辞書更新システム（Phase 10）
// ========================================
async function updateDictionariesFromDanbooru() {
    const updateBtn = document.getElementById('updateDictionaryBtn');
    const updateProgress = document.getElementById('updateProgress');
    const updateStatus = document.getElementById('updateStatus');
    const updateDetails = document.getElementById('updateDetails');

    try {
        // ボタン無効化・進捗表示
        updateBtn.disabled = true;
        updateBtn.textContent = '🔄 更新中...';
        updateProgress.style.display = 'block';
        updateStatus.textContent = 'Danbooruタグ取得中...';
        updateDetails.textContent = '';

        // Danbooru辞書更新実行
        const result = await window.electronAPI.updateDictionariesFromDanbooru({
            limitPerCategory: 500,
            dryRun: false,
            createBackup: true
        });

        if (result.success) {
            updateStatus.textContent = '✅ 辞書更新完了！';

            // 結果詳細表示
            let details = '';
            for (const [file, data] of Object.entries(result.results)) {
                details += `${file}: +${data.added}タグ (合計${data.total})\n`;
            }
            updateDetails.textContent = details;

            // 3秒後にリロード
            setTimeout(() => {
                updateStatus.textContent = 'ページをリロードしています...';
                location.reload();
            }, 3000);
        } else {
            throw new Error(result.error || '辞書更新に失敗しました');
        }
    } catch (error) {
        console.error('❌ Danbooru辞書更新エラー:', error);
        updateStatus.textContent = `❌ エラー: ${error.message}`;
        updateDetails.textContent = '詳細はコンソールを確認してください';

        // ボタン復元
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<span>🌐</span> Danbooru辞書更新';
    }
}

// ========================================
// Phase 11: APIキー管理イベントハンドラー
// ========================================

// APIキー設定モーダルを開く
function openApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'block';
        loadApiKeyToModal();
    }
}

// APIキー設定モーダルを閉じる
function closeApiKeyModal() {
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'none';
        // 入力欄をクリア
        const input = document.getElementById('apiKeyInput');
        if (input) {
            input.value = '';
            input.type = 'password';
        }
    }
}

// モーダルにAPIキーを読み込む
async function loadApiKeyToModal() {
    try {
        const result = await window.electronAPI.loadApiKey();

        if (result.success) {
            const input = document.getElementById('apiKeyInput');
            if (input) {
                input.value = result.apiKey || '';
            }
            updateApiKeyStatus(result.hasApiKey);
        }
    } catch (error) {
        console.error('❌ APIキー読み込みエラー:', error);
    }
}

// APIキーを保存
async function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;

    const apiKey = input.value.trim();

    if (!apiKey) {
        alert('❌ APIキーを入力してください');
        return;
    }

    // 簡易バリデーション（Gemini APIキーは通常40文字程度）
    if (apiKey.length < 30) {
        if (!confirm('⚠️ APIキーが短いようです。本当に保存しますか？')) {
            return;
        }
    }

    try {
        const result = await window.electronAPI.saveApiKey(apiKey);

        if (result.success) {
            alert('✅ APIキーを保存しました');
            updateApiKeyStatus(true);
            closeApiKeyModal();
        } else {
            alert(`❌ APIキーの保存に失敗しました: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ APIキー保存エラー:', error);
        alert(`❌ エラーが発生しました: ${error.message}`);
    }
}

// APIキーを削除
async function deleteApiKey() {
    if (!confirm('⚠️ APIキーを削除しますか？\nAI自動分類機能が使用できなくなります。')) {
        return;
    }

    try {
        const result = await window.electronAPI.deleteApiKey();

        if (result.success) {
            alert('✅ APIキーを削除しました');
            updateApiKeyStatus(false);

            // 入力欄をクリア
            const input = document.getElementById('apiKeyInput');
            if (input) {
                input.value = '';
            }
        } else {
            alert(`❌ APIキーの削除に失敗しました: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ APIキー削除エラー:', error);
        alert(`❌ エラーが発生しました: ${error.message}`);
    }
}

// APIキー表示/非表示切り替え
function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKeyInput');
    const toggleBtn = document.getElementById('toggleApiKeyVisibility');

    if (!input || !toggleBtn) return;

    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.textContent = '🙈 非表示';
    } else {
        input.type = 'password';
        toggleBtn.textContent = '👁️ 表示/非表示';
    }
}

// APIキーステータス表示を更新
function updateApiKeyStatus(hasApiKey) {
    const statusDiv = document.getElementById('apiKeyStatus');
    if (!statusDiv) return;

    if (hasApiKey) {
        statusDiv.innerHTML = `
            🔑 APIキー: <strong style="color: #4CAF50;">登録済み</strong><br>
            AI自動分類機能が利用可能です。
        `;
        statusDiv.style.background = 'rgba(76, 175, 80, 0.2)';
        statusDiv.style.color = '#aaffaa';
    } else {
        statusDiv.innerHTML = `
            🔍 APIキー: <strong style="color: #ffa500;">未登録</strong><br>
            AI自動分類を使用するには、無料のGemini APIキーを登録してください。
        `;
        statusDiv.style.background = 'rgba(255, 200, 100, 0.2)';
        statusDiv.style.color = '#ffddaa';
    }
}

// Gemini APIキー取得方法ガイドを開く
function openGeminiKeyGuide() {
    const guideWindow = window.open('https://makersuite.google.com/app/apikey', '_blank', 'width=800,height=600');

    if (guideWindow) {
        alert(`📖 Gemini APIキー取得方法

1. Google AI Studio (https://makersuite.google.com/app/apikey) にアクセス
2. 「Get API Key」ボタンをクリック
3. 「Create API key」で新しいキーを作成
4. 生成されたキーをコピーして登録画面に貼り付け

⚠️ 完全無料（月15リクエスト/分）
⚠️ クレジットカード登録不要`);
    } else {
        alert('❌ ポップアップがブロックされました。ブラウザの設定を確認してください。');
    }
}

// ========================================
// Phase 12: Gemini AI分類支援（🆓 無料枠）
// ========================================

// 🤖 AI分類実行関数
async function classifyImageWithAI() {
    try {
        console.log('🚀 AI分類開始');

        // 1️⃣ APIキー確認
        const apiKeyResult = await window.electronAPI.loadApiKey();
        if (!apiKeyResult.success || !apiKeyResult.hasApiKey) {
            alert(`❌ Gemini APIキーが未登録です

AI自動分類を使用するには、無料のGemini APIキーを登録してください。

「⚙️ APIキー登録」ボタンから登録できます。`);
            return;
        }

        // 2️⃣ 画像読み込み確認
        if (!currentImageFile) {
            alert('❌ 画像が読み込まれていません。\n\nPNG/JPEG画像をドラッグ&ドロップしてください。');
            return;
        }

        // 3️⃣ ローディング表示
        const statusDiv = document.getElementById('aiClassifyStatus');
        const classifyBtn = document.getElementById('aiClassifyBtn');

        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = `⏳ AI分類中...<br>Gemini APIで画像を解析しています（🆓 無料枠）`;
        }

        if (classifyBtn) {
            classifyBtn.disabled = true;
            classifyBtn.style.opacity = '0.5';
        }

        // 4️⃣ 抽出済みプロンプトテキスト確認（タグがあるかチェック）
        const positivePromptElement = document.getElementById('positivePrompt');
        const extractedPrompt = positivePromptElement ? positivePromptElement.textContent : '';

        let result;

        if (extractedPrompt && extractedPrompt !== '（なし）' && extractedPrompt.trim().length > 0) {
            // ✅ タグがある画像 → テキストベース分類（既存タグの分類のみ、新タグ生成なし）
            console.log('📝 テキストベース分類: 抽出済みタグを分類');
            console.log(`📋 プロンプト: ${extractedPrompt.substring(0, 100)}...`);

            // 5️⃣-A Gemini AI呼び出し（テキスト分類モード）
            result = await window.electronAPI.classifyTextWithGemini(extractedPrompt);

        } else {
            // ⚠️ タグがない画像 → 画像ベース分類（AI提案モード）
            console.log('🖼️ 画像ベース分類: AIがタグを提案');

            // 画像をBase64に変換（チャンク分割でスタックオーバーフロー回避）
            const arrayBuffer = await currentImageFile.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // 大きい画像対応：8192バイトずつ分割処理
            let binaryString = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, i + chunkSize);
                binaryString += String.fromCharCode(...chunk);
            }
            const base64String = btoa(binaryString);

            console.log(`📸 画像変換完了: ${base64String.length}文字`);

            // 5️⃣-B Gemini AI呼び出し（画像分類モード）
            result = await window.electronAPI.classifyImageWithGemini(base64String);
        }

        // 6️⃣ ローディング非表示
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        if (classifyBtn) {
            classifyBtn.disabled = false;
            classifyBtn.style.opacity = '1';
        }

        if (!result.success) {
            console.error('❌ AI分類エラー:', result.error);
            alert(`❌ AI分類に失敗しました

エラー: ${result.error}

🆓 無料枠制限:
- 15 requests/minute
- 1500 requests/day

しばらく待ってから再試行してください。`);
            return;
        }

        // 7️⃣ 結果をUIに表示
        console.log('✅ AI分類成功:', result.categories);
        const mode = extractedPrompt && extractedPrompt.trim().length > 0 ? 'ai-text' : 'ai-image';
        displayAIClassificationResults(result.categories, {
            mode,
            inputText: extractedPrompt || '',
            rawResult: result
        });

        alert(`✅ AI分類完了！

Gemini AIが8カテゴリに自動分類しました。
各カテゴリに提案されたタグを確認して、承認してください。`);

    } catch (error) {
        console.error('❌ AI分類エラー:', error);

        // エラー時のローディング非表示
        const statusDiv = document.getElementById('aiClassifyStatus');
        const classifyBtn = document.getElementById('aiClassifyBtn');

        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        if (classifyBtn) {
            classifyBtn.disabled = false;
            classifyBtn.style.opacity = '1';
        }

        alert(`❌ エラーが発生しました: ${error.message}`);
    }
}

// 🎨 AI分類結果を各カテゴリに表示
function displayAIClassificationResults(categories, meta = {}) {
    console.log('🎨 AI分類結果表示開始');

    // 9カテゴリマッピング（Gemini応答 → アプリケーションカテゴリ）
    const categoryMapping = {
        'people': 'people',
        'face': 'face',
        'body': 'body',
        'pose': 'pose',
        'background': 'background',
        'clothing': 'clothing',
        'expression': 'expression',
        'quality': 'quality',
        'other': 'other'  // ✅ 追加: その他カテゴリ
    };

    // 🚨 【Phase 14修正】AI分類前に全カテゴリの既存タグをクリア（紫タグのみ表示）
    console.log('🗑️ AI分類前: 既存タグをクリア');
    for (const appCategory of Object.values(categoryMapping)) {
        const tagContainer = document.getElementById(`${appCategory}-tags`);
        if (tagContainer) {
            tagContainer.innerHTML = '';  // 元の黒タグを全削除
            console.log(`  ${appCategory}: クリア完了`);
        }
    }

    // 各カテゴリの結果を表示
    const normalizedCategorized = {};
    for (const [geminiCategory, appCategory] of Object.entries(categoryMapping)) {
        const tags = Array.isArray(categories[geminiCategory]) ? categories[geminiCategory] : [];
        const seen = new Set();
        const deduped = [];
        tags.forEach(tag => {
            const text = String(tag || '').trim();
            if (!text) return;
            const key = text.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            deduped.push(text);
        });
        normalizedCategorized[appCategory] = deduped.map((text, idx) => ({
            text,
            originalIndex: idx,
            className: 'tag-item ai-suggested'
        }));

        if (deduped.length > 0) {
            const tagContainer = document.getElementById(`${appCategory}-tags`);

            if (tagContainer) {
                // AI提案タグを追加（背景色で識別）
                deduped.forEach(tag => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag-item ai-suggested';  // AI提案タグ用クラス
                    tagElement.textContent = tag;
                    tagElement.style.background = 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)';  // 紫グラデーション
                    tagElement.style.border = '2px solid #c084fc';
                    tagElement.style.cursor = 'pointer';

                    // クリックで削除
                    tagElement.addEventListener('click', () => {
                        tagElement.remove();
                        updateCategoryCount(appCategory);
                    });

                    tagContainer.appendChild(tagElement);
                });

                // カテゴリカウント更新
                updateCategoryCount(appCategory);

                console.log(`✅ ${appCategory}: ${deduped.length}タグ追加`);
            }
        }
    }

    const categoryCounts = {};
    Object.keys(normalizedCategorized).forEach(key => {
        categoryCounts[key] = normalizedCategorized[key].length;
    });

    window.lastClassificationSnapshot = {
        timestamp: new Date().toISOString(),
        source: meta && meta.mode ? meta.mode : 'ai',
        promptText: meta && meta.inputText ? meta.inputText : '',
        tagCount: Object.values(categoryCounts).reduce((sum, val) => sum + val, 0),
        categorized: normalizedCategorized,
        categoryCounts,
        options: { ...meta }
    };

    console.log('✅ AI分類結果表示完了');
}

// カテゴリカウント更新関数（既存の機能を利用）
function updateCategoryCount(category) {
    const tagContainer = document.getElementById(`${category}-tags`);
    const countElement = document.getElementById(`${category}-count`);

    if (tagContainer && countElement) {
        // .tag（通常）と .tag-item（AI/学習）どちらもカウント対象にする
        const count = tagContainer.querySelectorAll('.tag-item, .tag').length;
        countElement.textContent = count;
    }
}

// 🔒 トライアル版: APIキー設定UIを非表示化
async function hideApiKeyUIForTrial() {
    try {
        const licenseInfo = await window.electronAPI.getLicenseInfo();
        if (licenseInfo && licenseInfo.licenseType === 'free') {
            // Hide sidebar section containing API key settings
            const sidebarSection = document.querySelector('.sidebar-section:has(#openApiKeyModalBtn)');
            if (sidebarSection) {
                sidebarSection.style.display = 'none';
                console.log('✅ トライアル版: APIキー設定セクションを非表示化');
            }

            // Hide modal dialog
            const modal = document.getElementById('apiKeyModal');
            if (modal) {
                modal.style.display = 'none';
                console.log('✅ トライアル版: APIキーモーダルを非表示化');
            }

            console.log('✅ トライアル版: APIキー設定UIを非表示化完了');
        } else {
            console.log('✅ 有料版: APIキー設定UIを表示');
        }
    } catch (error) {
        console.warn('⚠️ LICENSE_TYPE確認エラー:', error);
        // エラー時は念のため表示（フェイルセーフ）
    }
}

// 🚀 アプリ起動時に辞書読み込み+サイドバーイベント設定
document.addEventListener('DOMContentLoaded', async () => {
    // まずJSONから設定を読み込む（存在すれば）
    try {
        if (window.electronAPI && window.electronAPI.loadApiSettings) {
            const res = await window.electronAPI.loadApiSettings();
            if (res && res.success && res.settings) {
                const s = res.settings;
                if (s.tagger) SD_API_SETTINGS.tagger = { ...SD_API_SETTINGS.tagger, ...s.tagger };
                if (s.txt2img) SD_API_SETTINGS.txt2img = { ...SD_API_SETTINGS.txt2img, ...s.txt2img };
                console.log('✅ JSONからSD API設定を読み込み:', s);

                // localStorage とも同期（後段の読み込みで上書きされないように）
                try {
                    localStorage.setItem('sd_api_tagger_settings', JSON.stringify(SD_API_SETTINGS.tagger));
                    localStorage.setItem('sd_api_txt2img_settings', JSON.stringify(SD_API_SETTINGS.txt2img));
                } catch {}
            }
        }
    } catch (e) {
        console.warn('⚠️ JSON設定読み込みエラー:', e);
    }
    // ラベル表（あれば）→ 共通辞書 → Obsidian辞書の順で読み込み
    await loadWd14Labels();
    await loadSharedDictionaries();
    await loadAndMergeDictionaries();
    // 学習タグ（learned_tags.json）も反映しておく
    await mergeLearnedTagsIntoCategories();

    // 🔒 トライアル版ではAPIキー設定UIを非表示化
    await hideApiKeyUIForTrial();

    // サイドバーボタンイベント
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    document.getElementById('yamlGenerateBtn').addEventListener('click', generateYAML);
    document.getElementById('storyPromptBtn').addEventListener('click', openStoryPrompt);

    // 🔑 Phase 11: APIキー管理ボタンイベント
    const openApiKeyModalBtn = document.getElementById('openApiKeyModalBtn');
    if (openApiKeyModalBtn) {
        openApiKeyModalBtn.addEventListener('click', openApiKeyModal);
    }

    const closeApiKeyModalBtn = document.getElementById('closeApiKeyModalBtn');
    if (closeApiKeyModalBtn) {
        closeApiKeyModalBtn.addEventListener('click', closeApiKeyModal);
    }

    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
    }

    const deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
    if (deleteApiKeyBtn) {
        deleteApiKeyBtn.addEventListener('click', deleteApiKey);
    }

    const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
    if (toggleApiKeyVisibility) {
        toggleApiKeyVisibility.addEventListener('click', () => {
            const input = document.getElementById('apiKeyInput');
            const toggleBtn = document.getElementById('toggleApiKeyVisibility');

            if (!input || !toggleBtn) return;

            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.textContent = '🙈 非表示';
            } else {
                input.type = 'password';
                toggleBtn.textContent = '👁️ 表示/非表示';
            }
        });
    }

    const getGeminiKeyBtn = document.getElementById('getGeminiKeyBtn');
    if (getGeminiKeyBtn) {
        getGeminiKeyBtn.addEventListener('click', openGeminiKeyGuide);
    }

    // 🤖 Phase 12: AI分類支援ボタンイベント（無料枠）
    const aiClassifyBtn = document.getElementById('aiClassifyBtn');
    if (aiClassifyBtn) {
        aiClassifyBtn.addEventListener('click', classifyImageWithAI);
    }

    const exportLogBtn = document.getElementById('exportClassificationLogBtn');
    if (exportLogBtn) {
        exportLogBtn.addEventListener('click', exportClassificationLog);
    }

    // 📦 セット管理UI初期化
    try { initSetUI(); } catch (e) { console.warn('set UI init', e); }

    // モーダル外クリックで閉じる
    const apiKeyModal = document.getElementById('apiKeyModal');
    if (apiKeyModal) {
        apiKeyModal.addEventListener('click', (e) => {
            if (e.target === apiKeyModal) {
                closeApiKeyModal();
            }
        });
    }

    // 🔑 起動時にAPIキーステータスを読み込む
    try {
        const result = await window.electronAPI.loadApiKey();
        if (result.success) {
            updateApiKeyStatus(result.hasApiKey);
            if (result.hasApiKey) {
                console.log('✅ Gemini APIキー: 登録済み');
            } else {
                console.log('⚠️ Gemini APIキー: 未登録');
            }
        }
    } catch (error) {
        console.error('❌ APIキーステータス読み込みエラー:', error);
    }

    // 🌐 Danbooru辞書更新ボタン（Phase 10）
    const updateDictionaryBtn = document.getElementById('updateDictionaryBtn');
    if (updateDictionaryBtn) {
        updateDictionaryBtn.addEventListener('click', updateDictionariesFromDanbooru);
    }

    const updateCivitaiBtn = document.getElementById('updateCivitaiBtn');
    if (updateCivitaiBtn) {
        updateCivitaiBtn.addEventListener('click', async () => {
            const btn = updateCivitaiBtn;
            const updateProgress = document.getElementById('updateProgress');
            const updateStatus = document.getElementById('updateStatus');
            const updateDetails = document.getElementById('updateDetails');

            try {
                btn.disabled = true; btn.textContent = '🧩 更新中...';
                if (updateProgress) updateProgress.style.display = 'block';
                if (updateStatus) updateStatus.textContent = 'Civitaiから取得中...（数十秒かかる場合があります）';
                if (updateDetails) updateDetails.textContent = '';

                const result = await window.electronAPI.updateDictionariesFromCivitai({ limit: 300 });
                if (result.success) {
                    if (updateStatus) updateStatus.textContent = '✅ Civitai辞書更新完了！';
                    let details = '';
                    for (const [file, data] of Object.entries(result.results)) {
                        details += `${file}: +${data.added}タグ (合計${data.total})\n`;
                    }
                    if (updateDetails) updateDetails.textContent = details || '追加されたタグはありません（既存と重複）';
                    setTimeout(() => location.reload(), 3000);
                } else {
                    throw new Error(result.error || '更新に失敗しました');
                }
            } catch (e) {
                if (updateStatus) updateStatus.textContent = `❌ エラー: ${e.message}`;
                if (updateDetails) updateDetails.textContent = 'ネットワークやレート制限の可能性があります。再試行してください。';
            } finally {
                btn.disabled = false; btn.innerHTML = '<span>🧩</span> Civitai辞書更新';
            }
        });
    }
});

// ========================================
// セット管理関数群
// ========================================
function getTagsByCategoryFromUI() {
    const cats = ['people','face','body','pose','expression','background','clothing','quality','other'];
    const out = {};
    for (const c of cats) {
        const el = document.getElementById(`${c}-tags`);
        if (!el) { out[c] = []; continue; }
        out[c] = Array.from(el.querySelectorAll('.tag,.tag-item')).map(n => (n.textContent||'').trim()).filter(Boolean);
    }
    return out;
}

function normalizeTag(t) {
    return String(t||'').toLowerCase().replace(/_/g,' ').replace(/\s+/g,' ').trim();
}

async function saveCurrentAsSet() {
    try {
        const name = (document.getElementById('setNameInput')?.value || '').trim() || `set_${Date.now()}`;
        const desc = (document.getElementById('setDescInput')?.value || '').trim();
        const labels = ((document.getElementById('setLabelsInput')?.value || '')).split(',').map(s=>s.trim()).filter(Boolean);
        const checked = Array.from(document.querySelectorAll('#setSaveModal .set-cat:checked')).map(i=>i.value);
        const tagsAll = getTagsByCategoryFromUI();
        const tagsByCategory = {};
        for (const c of Object.keys(tagsAll)) {
            if (checked.includes(c)) {
                const normed = Array.from(new Set(tagsAll[c].map(normalizeTag)));
                tagsByCategory[c] = normed;
            }
        }
        const cats = Object.keys(tagsByCategory);
        const preview = document.getElementById('previewImage');
        const thumb = preview && preview.src && preview.src.startsWith('data:image/') ? preview.src : '';
        const payload = { name, description: desc, labels, categories: cats, tagsByCategory, thumbnailDataUrl: thumb };
        const res = await window.electronAPI.saveSet(payload);
        if (res && res.success) {
            alert('✅ セットを保存しました');
            closeSetSaveModal();
        } else {
            alert(`❌ セット保存に失敗: ${(res && res.error) || ''}`);
        }
    } catch (e) {
        alert(`❌ セット保存エラー: ${e.message}`);
    }
}

function applySetToUI(set, mode = 'append', targetCats = null) {
    const tagsByCategory = set.tagsByCategory || {};
    const cats = (targetCats && targetCats.length)
        ? targetCats
        : (currentSetApplyTargetCats && currentSetApplyTargetCats.length ? currentSetApplyTargetCats : Object.keys(tagsByCategory));
    
    // 複数キャラモードのチェック
    const multiCharManager = window.multiCharacterManager;
    const isMultiMode = multiCharManager && multiCharManager.currentMode === 'multi';
    const currentSelectingChar = multiCharManager ? multiCharManager.currentSelectingChar : null;
    
    for (const c of cats) {
        // 複数キャラモードでキャラクターが選択されている場合
        let cont = null;
        if (isMultiMode && currentSelectingChar) {
            // キャラクター別のタグコンテナを取得
            cont = document.getElementById(`${c}-char${currentSelectingChar}-tags`);
            if (!cont) {
                console.warn(`[applySetToUI] キャラ${currentSelectingChar}の${c}タグコンテナが見つかりません`);
                // フォールバック: 通常のタグコンテナを試す
                cont = document.getElementById(`${c}-tags`);
            }
        } else {
            // 通常モードまたはキャラクターが選択されていない場合
            cont = document.getElementById(`${c}-tags`);
        }
        
        if (!cont) continue;
        if (mode === 'replace') cont.innerHTML = '';
        const existing = new Set(Array.from(cont.querySelectorAll('.tag,.tag-item')).map(n => normalizeTag(n.textContent||'')));
        const arr = tagsByCategory[c] || [];
        for (const t of arr) {
            const nrm = normalizeTag(t);
            if (existing.has(nrm)) continue;
            const el = document.createElement('span');
            el.className = 'tag';
            el.textContent = t;
            cont.appendChild(el);
        }
        updateCategoryCount(c);
        
        // 複数キャラモードの場合、MultiCharacterManagerにも通知
        if (isMultiMode && currentSelectingChar && multiCharManager.onSetSelected) {
            const tags = arr.map(t => ({ text: t, originalIndex: undefined }));
            multiCharManager.onSetSelected(c, tags, set.name || '');
        }
    }
}

async function listSetsAndRender() {
    const grid = document.getElementById('setGrid');
    if (!grid) return;
    grid.innerHTML = '読み込み中...';
    const res = await window.electronAPI.listSets();
    grid.innerHTML = '';
    if (!res || !res.success) { grid.textContent = '読み込み失敗'; return; }
    const sets = res.sets || [];
    for (const s of sets) {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;display:flex;flex-direction:column;';
        const img = document.createElement('div');
        img.style.cssText = 'height:120px;background:#f9fafb;display:flex;align-items:center;justify-content:center;';
        if (s.thumbnailPath) {
            const i = document.createElement('img');
            i.src = s.thumbnailPath;
            i.style.maxWidth = '100%'; i.style.maxHeight = '100%';
            img.appendChild(i);
        } else {
            img.textContent = 'No Thumbnail'; img.style.color = '#999';
        }
        const body = document.createElement('div'); body.style.cssText = 'padding:10px;display:flex;flex-direction:column;gap:6px;';
        const title = document.createElement('div'); title.textContent = s.name || '(no name)'; title.style.fontWeight = 'bold';
        const catsRow = document.createElement('div');
        const catsList = (s.categories||Object.keys(s.tagsByCategory||{})).join(', ');
        catsRow.textContent = `カテゴリ: ${catsList}`;
        const btnRow = document.createElement('div'); btnRow.style.cssText='display:flex;gap:6px;';
        const applyBtn = document.createElement('button'); applyBtn.textContent='適用(追加)'; applyBtn.className='btn btn-secondary';
        applyBtn.onclick = () => applySetToUI(s, 'append');
        const replaceBtn = document.createElement('button'); replaceBtn.textContent='適用(置換)'; replaceBtn.className='btn btn-secondary';
        replaceBtn.onclick = () => applySetToUI(s, 'replace');
        const delBtn = document.createElement('button'); delBtn.textContent='削除'; delBtn.className='btn';
        delBtn.onclick = async () => { if (confirm('削除しますか？')) { await window.electronAPI.deleteSet(s.id); listSetsAndRender(); } };
        btnRow.appendChild(applyBtn); btnRow.appendChild(replaceBtn); btnRow.appendChild(delBtn);
        // ensure category-limited apply uses current target cats if set
        try {
            applyBtn.onclick = () => applySetToUI(s, 'append', currentSetApplyTargetCats);
            replaceBtn.onclick = () => applySetToUI(s, 'replace', currentSetApplyTargetCats);
        } catch {}
        body.appendChild(title); body.appendChild(catsRow); body.appendChild(btnRow);
        card.appendChild(img); card.appendChild(body);
        grid.appendChild(card);
    }
}

let currentSetApplyTargetCats = null;
function openSetListModal(targetCats = null) {
    currentSetApplyTargetCats = Array.isArray(targetCats) && targetCats.length ? targetCats : null;
    if (window.categorySets && typeof window.categorySets.openCategoryModal === 'function') {
        const primaryCategory = currentSetApplyTargetCats && currentSetApplyTargetCats[0]
            ? currentSetApplyTargetCats[0]
            : 'pose';
        window.categorySets.openCategoryModal(primaryCategory);
        return;
    }

    const m = document.getElementById('setListModal');
    if (m) {
        try {
            const hint = document.getElementById('setListTargetHint');
            if (hint) {
                hint.textContent = currentSetApplyTargetCats && currentSetApplyTargetCats.length
                    ? `適用対象カテゴリ: ${currentSetApplyTargetCats.join(', ')}`
                    : '';
            }
        } catch {}
        m.style.display = 'flex';
        try {
            document.body.dataset.prevOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
        } catch {}
        listSetsAndRender();
    }
}
function closeSetListModal() { const m = document.getElementById('setListModal'); if (m) m.style.display='none'; try { document.body.style.overflow = document.body.dataset.prevOverflow || ''; } catch {} currentSetApplyTargetCats = null; }
function openSetSaveModal() { const m = document.getElementById('setSaveModal'); if (m) { document.getElementById('setNameInput').value=''; document.getElementById('setDescInput').value=''; document.getElementById('setLabelsInput').value=''; m.style.display='block'; } }
function closeSetSaveModal() { const m = document.getElementById('setSaveModal'); if (m) m.style.display='none'; }

function clearSelectedCategories() {
    const checks = Array.from(document.querySelectorAll('#setSaveModal .set-cat:checked')).map(i=>i.value);
    const cats = checks.length? checks : ['people','face','body','pose','expression','background','clothing','quality','other'];
    if (!confirm(`カテゴリ(${cats.join(', ')})をクリアしますか？`)) return;
    for (const c of cats) {
        const cont = document.getElementById(`${c}-tags`);
        if (cont) cont.innerHTML = '';
        updateCategoryCount(c);
    }
}

function initSetUI() {
    const openBtn = document.getElementById('openSetModalBtn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (window.categorySets && typeof window.categorySets.openCategoryModal === 'function') {
                window.categorySets.openCategoryModal('pose');
            } else {
                openSetListModal();
            }
        });
    }
    const closeBtn = document.getElementById('closeSetModalBtn'); if (closeBtn) closeBtn.addEventListener('click', closeSetListModal);
    const saveBtn = document.getElementById('saveSetBtn'); if (saveBtn) saveBtn.addEventListener('click', openSetSaveModal);
    const confirmSave = document.getElementById('confirmSaveSetBtn'); if (confirmSave) confirmSave.addEventListener('click', saveCurrentAsSet);
    const cancelSave = document.getElementById('cancelSaveSetBtn'); if (cancelSave) cancelSave.addEventListener('click', closeSetSaveModal);
    const clearBtn = document.getElementById('clearSelectedCatsBtn'); if (clearBtn) clearBtn.addEventListener('click', clearSelectedCategories);

    const exportBtn = document.getElementById('exportSetsBtn'); if (exportBtn) exportBtn.addEventListener('click', async () => {
        const res = await window.electronAPI.exportSets([]);
        if (res && res.success) {
            const blob = new Blob([res.json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'sets_export.json'; a.click(); URL.revokeObjectURL(url);
        } else { alert(`❌ エクスポート失敗: ${(res && res.error)||''}`); }
    });
    const importBtn = document.getElementById('importSetsBtn'); if (importBtn) importBtn.addEventListener('click', async () => {
        const text = prompt('インポートするJSONを貼り付けてください');
        if (!text) return;
        const res = await window.electronAPI.importSetsJson(text, 'rename');
        if (res && res.success) { alert(`✅ インポート: ${res.imported.length}件`); listSetsAndRender(); } else { alert(`❌ 失敗: ${(res && res.error)||''}`); }
    });

    // レガシーインポート（フォルダを選択→スキャン報告）
    const legacyBtn = document.createElement('button'); legacyBtn.className='btn btn-secondary'; legacyBtn.textContent='レガシー（フォルダ）';
    legacyBtn.onclick = async () => {
        const pick = await window.electronAPI.pickLegacyFolder();
        if (!pick || !pick.success) { alert('キャンセル'); return; }
        const scan = await window.electronAPI.scanLegacyFolder(pick.folder);
        if (scan && scan.success) {
            const lines = scan.previews.map(p => `${p.type} - ${p.file} (${p.count})`).slice(0, 20).join('\n');
            alert(`✅ スキャン: ${scan.files}件のJSON\n\nプレビュー:\n${lines}`);
        } else {
            alert(`❌ スキャン失敗: ${(scan && scan.error)||''}`);
        }
    };
    const toolbar = document.querySelector('#setListModal .modal-content > div');
    if (toolbar) {
        // 既存のレガシー取込
        toolbar.insertBefore(legacyBtn, toolbar.firstChild);
        // 追加のファイル入出力ボタン
        const impFileBtn = document.createElement('button'); impFileBtn.className='btn btn-secondary'; impFileBtn.textContent='インポート(ファイル)';
        impFileBtn.onclick = async ()=>{ const r=await window.electronAPI.importSetsFile('rename'); if(r&&r.success){ alert(`インポート: ${r.imported.length}件`); listSetsAndRender(); } else { alert(`失敗: ${(r&&r.error)||''}`);} };
        const expFileBtn = document.createElement('button'); expFileBtn.className='btn btn-secondary'; expFileBtn.textContent='エクスポート(ファイル)';
        expFileBtn.onclick = async ()=>{ const r=await window.electronAPI.exportSetsFile([]); if(!(r&&r.success)){ alert(`エクスポート失敗: ${(r&&r.error)||''}`);} };
        const expLegacyFileBtn = document.createElement('button'); expLegacyFileBtn.className='btn btn-secondary'; expLegacyFileBtn.textContent='レガシー出力(ファイル)';
        expLegacyFileBtn.onclick = async ()=>{ const r=await window.electronAPI.exportSetsLegacyFile([]); if(!(r&&r.success)){ alert(`エクスポート失敗: ${(r&&r.error)||''}`);} };
        toolbar.insertBefore(expLegacyFileBtn, toolbar.firstChild);
        toolbar.insertBefore(expFileBtn, toolbar.firstChild);
        toolbar.insertBefore(impFileBtn, toolbar.firstChild);
    }
    const createBtn = document.getElementById('createSetBtn');
    if (createBtn) createBtn.addEventListener('click', () => openNewSetForTargetCats());
}

// 簡易セット選択モーダル（カテゴリ直下メニュー）
async function quickOpenSetSelection(targetCats = []) {
    try {
        // remove existing
        const existing = document.getElementById('quickSetSelectModal');
        if (existing) existing.remove();

        const res = await window.electronAPI.listSets();
        const all = (res && res.success && Array.isArray(res.sets)) ? res.sets : [];
        const cats = Array.isArray(targetCats) && targetCats.length ? targetCats : null;

        const eligible = all.filter(s => {
            const c = Array.isArray(s.categories) && s.categories.length ? s.categories : Object.keys(s.tagsByCategory||{});
            if (!cats) return true; // no filter
            return c.some(x => cats.includes(x));
        });

        const modal = document.createElement('div');
        modal.id = 'quickSetSelectModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.maxWidth = '900px';
        const header = document.createElement('div'); header.style.marginBottom = '8px'; header.textContent = cats ? `適用対象カテゴリ: ${cats.join(', ')}` : 'セット選択';
        const toolbar = document.createElement('div'); toolbar.style.cssText='display:flex;gap:8px;margin:6px 0 10px;';
        const newBtn = document.createElement('button'); newBtn.className='btn'; newBtn.textContent='新規作成'; newBtn.onclick=()=>{ openNewSetForTargetCatsFromQuick(cats); };
        const closeBtn = document.createElement('button'); closeBtn.className='btn btn-secondary'; closeBtn.textContent='閉じる'; closeBtn.onclick=()=>modal.remove();
        toolbar.appendChild(newBtn); toolbar.appendChild(closeBtn);
        const grid = document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:12px;';

        if (!eligible.length) {
            const empty = document.createElement('div'); empty.style.gridColumn='1/-1'; empty.style.color='#6b7280'; empty.textContent='該当するセットがありません。新規作成してください。';
            grid.appendChild(empty);
        }

        const makeCard = (s) => {
            const card = document.createElement('div'); card.style.cssText='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;display:flex;flex-direction:column;';
            const img = document.createElement('div'); img.style.cssText='height:120px;background:#f9fafb;display:flex;align-items:center;justify-content:center;';
            if (s.thumbnailPath) { const i = document.createElement('img'); i.src=s.thumbnailPath; i.style.maxWidth='100%'; i.style.maxHeight='100%'; img.appendChild(i);} else { img.textContent='No Thumbnail'; img.style.color='#999'; }
            const body = document.createElement('div'); body.style.cssText='padding:10px;display:flex;flex-direction:column;gap:6px;';
            const title = document.createElement('div'); title.textContent = s.name || '(no name)'; title.style.fontWeight='bold';
            const catsRow = document.createElement('div'); const list=(s.categories||Object.keys(s.tagsByCategory||{})).join(', '); catsRow.textContent = `カテゴリ: ${list}`;
            const btnRow = document.createElement('div'); btnRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap;';
            const applyBtn = document.createElement('button'); applyBtn.className='btn btn-secondary'; applyBtn.textContent='適用(追加)'; applyBtn.onclick=()=>{ applySetToUI(s,'append',cats); };
            const replaceBtn = document.createElement('button'); replaceBtn.className='btn btn-secondary'; replaceBtn.textContent='適用(置換)'; replaceBtn.onclick=()=>{ applySetToUI(s,'replace',cats); };
            const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent='編集'; editBtn.onclick=async()=>{ try{ const newName=prompt('名前',s.name||''); if(newName===null)return; const newDesc=prompt('説明',s.description||''); if(newDesc===null)return; const newLabels=prompt('ラベル(カンマ区切り) 例: group:オリジナル,face',(Array.isArray(s.labels)?s.labels.join(','):'')); const payload={...s,name:newName.trim(),description:(newDesc||'').trim(),labels:(newLabels||'').split(',').map(t=>t.trim()).filter(Boolean)}; const r=await window.electronAPI.saveSet(payload); if(r&&r.success){ await refreshQuickList(grid,cats); } }catch(e){ alert('編集失敗: '+e.message);} };
            const thumbBtn = document.createElement('button'); thumbBtn.className='btn'; thumbBtn.textContent='画像'; thumbBtn.onclick=()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=async()=>{ const f=inp.files&&inp.files[0]; if(!f)return; const reader=new FileReader(); reader.onload=async()=>{ const payload={...s,thumbnailDataUrl:reader.result}; const r=await window.electronAPI.saveSet(payload); if(r&&r.success){ await refreshQuickList(grid,cats); } }; reader.readAsDataURL(f); }; inp.click(); };
            const delBtn = document.createElement('button'); delBtn.className='btn'; delBtn.textContent='削除'; delBtn.onclick=async()=>{ if(confirm('削除しますか？')){ await window.electronAPI.deleteSet(s.id); await refreshQuickList(grid,cats); } };
            btnRow.appendChild(applyBtn); btnRow.appendChild(replaceBtn); btnRow.appendChild(editBtn); btnRow.appendChild(thumbBtn); btnRow.appendChild(delBtn);
            body.appendChild(title); body.appendChild(catsRow); body.appendChild(btnRow);
            card.appendChild(img); card.appendChild(body);
            return card;
        };

        async function refreshQuickList(gridEl, catsFilter){ gridEl.innerHTML=''; const res2=await window.electronAPI.listSets(); const all2=(res2&&res2.success&&Array.isArray(res2.sets))?res2.sets:[]; const filtered=all2.filter(s=>{const c=Array.isArray(s.categories)&&s.categories.length?s.categories:Object.keys(s.tagsByCategory||{}); return !catsFilter||c.some(x=>catsFilter.includes(x));}); if(!filtered.length){ const empty=document.createElement('div'); empty.style.gridColumn='1/-1'; empty.style.color='#6b7280'; empty.textContent='該当するセットがありません。新規作成してください。'; gridEl.appendChild(empty); return;} filtered.forEach(s=>gridEl.appendChild(makeCard(s))); }

        eligible.forEach(s => grid.appendChild(makeCard(s)));
        content.appendChild(header); content.appendChild(toolbar); content.appendChild(grid); modal.appendChild(content);
        document.body.appendChild(modal);
    } catch (e) {
        alert('セット一覧の表示に失敗しました: '+e.message);
    }
}

function openNewSetForTargetCatsFromQuick(cats){ try{ openSetSaveModal(); const checks=document.querySelectorAll('#setSaveModal .set-cat'); if(cats&&cats.length&&checks&&checks.length){ checks.forEach(ch=>{ ch.checked=cats.includes(ch.value); }); } const nameEl=document.getElementById('setNameInput'); if(nameEl){ const base=(cats&&cats.length===1)?cats[0]:'multi'; nameEl.value=`${base}_set_${Date.now()}`; } }catch{} }

// Override: grouped set list rendering with per-card actions
listSetsAndRender = async function() {
    const grid = document.getElementById('setGrid');
    if (!grid) return;
    grid.innerHTML = 'loading...';
    try {
        const res = await window.electronAPI.listSets();
        grid.innerHTML = '';
        if (!res || !res.success) { grid.textContent = 'load failed'; return; }
        const all = res.sets || [];
        // group by labels like `group:XXX`
        const groups = new Map();
        for (const s of all) {
            const labels = Array.isArray(s.labels) ? s.labels : [];
            const gl = labels.find(l => typeof l === 'string' && l.startsWith('group:')) || '';
            const name = gl ? gl.substring(6).trim() : '未分類';
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(s);
        }
        const makeCard = (s) => {
            const card = document.createElement('div');
            card.style.cssText = 'border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;display:flex;flex-direction:column;';
            const img = document.createElement('div');
            img.style.cssText = 'height:120px;background:#f9fafb;display:flex;align-items:center;justify-content:center;';
            if (s.thumbnailPath) { const i = document.createElement('img'); i.src = s.thumbnailPath; i.style.maxWidth='100%'; i.style.maxHeight='100%'; img.appendChild(i); }
            else { img.textContent = 'No Thumbnail'; img.style.color = '#999'; }
            const body = document.createElement('div'); body.style.cssText = 'padding:10px;display:flex;flex-direction:column;gap:6px;';
            const title = document.createElement('div'); title.textContent = s.name || '(no name)'; title.style.fontWeight='bold';
            const catsRow = document.createElement('div'); const catsList = (s.categories||Object.keys(s.tagsByCategory||{})).join(', '); catsRow.textContent = `カテゴリ: ${catsList}`;
            const btnRow = document.createElement('div'); btnRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap;';
            const applyBtn = document.createElement('button'); applyBtn.textContent='適用(追加)'; applyBtn.className='btn btn-secondary';
            applyBtn.onclick = () => applySetToUI(s, 'append', currentSetApplyTargetCats);
            const replaceBtn = document.createElement('button'); replaceBtn.textContent='適用(置換)'; replaceBtn.className='btn btn-secondary';
            replaceBtn.onclick = () => applySetToUI(s, 'replace', currentSetApplyTargetCats);
            const editBtn = document.createElement('button'); editBtn.textContent='編集'; editBtn.className='btn';
            editBtn.onclick = async () => {
                const newName = prompt('名前', s.name || ''); if (newName === null) return;
                const newDesc = prompt('説明', s.description || ''); if (newDesc === null) return;
                const newLabels = prompt('ラベル(カンマ区切り) 例: group:オリジナル,face', (Array.isArray(s.labels)? s.labels.join(','):''));
                const payload = { ...s, name: newName.trim(), description: (newDesc||'').trim(), labels: (newLabels||'').split(',').map(t=>t.trim()).filter(Boolean) };
                const r = await window.electronAPI.saveSet(payload); if (r && r.success) listSetsAndRender();
            };
            const thumbBtn = document.createElement('button'); thumbBtn.textContent='画像'; thumbBtn.className='btn';
            thumbBtn.onclick = async () => {
                const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
                inp.onchange = async () => {
                    const f = inp.files && inp.files[0]; if (!f) return;
                    const reader = new FileReader(); reader.onload = async () => { const payload = { ...s, thumbnailDataUrl: reader.result }; const r = await window.electronAPI.saveSet(payload); if (r && r.success) listSetsAndRender(); }; reader.readAsDataURL(f);
                };
                inp.click();
            };
            const delBtn = document.createElement('button'); delBtn.textContent='削除'; delBtn.className='btn'; delBtn.onclick = async () => { if (confirm('削除しますか？')) { await window.electronAPI.deleteSet(s.id); listSetsAndRender(); } };
            btnRow.appendChild(applyBtn); btnRow.appendChild(replaceBtn); btnRow.appendChild(editBtn); btnRow.appendChild(thumbBtn); btnRow.appendChild(delBtn);
            body.appendChild(title); body.appendChild(catsRow); body.appendChild(btnRow);
            card.appendChild(img); card.appendChild(body);
            return card;
        };
        for (const [group, items] of groups) {
            const header = document.createElement('div'); header.style.cssText='grid-column:1/-1;font-weight:600;color:#374151;margin-top:8px;'; header.textContent = group;
            grid.appendChild(header);
            for (const s of items) grid.appendChild(makeCard(s));
        }
    } catch (e) {
        grid.textContent = 'load error';
    }
};


// ========================================
// ドラッグ&ドロップイベント
// ========================================
const dropZone = document.getElementById('dropZone');
const resultsSection = document.getElementById('resultsSection');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        alert('❌ 画像ファイルをドロップしてください');
        return;
    }

    // 最初の画像のみ処理
    await processImage(imageFiles[0]);
});

// クリックでもファイル選択可能
dropZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg';
    input.onchange = async (e) => {
        if (e.target.files.length > 0) {
            await processImage(e.target.files[0]);
        }
    };
    input.click();
});

// ========================================
// 画像処理メイン
// ========================================
async function processImage(file) {
    try {
        console.log('📄 ファイル処理開始:', file.name);

        const arrayBuffer = await file.arrayBuffer();
        let metadata = null;

        if (file.type === 'image/png') {
            metadata = extractPNGMetadata(arrayBuffer);
        } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            metadata = extractJPEGMetadata(arrayBuffer);
        } else {
            alert('❌ PNG/JPEG形式のみ対応しています');
            return;
        }

        // 🔄 新規画像のため既存分類UIを初期化（前画像の状態が残らないように）
        try {
            clearCategoryDisplays();
        } catch (e) { console.warn('⚠️ 初期化で警告:', e?.message); }

        // 🤖 Phase 12: プロンプトがない画像でもAI/学習（画像ベース）を利用可能に
        currentImageFile = file;  // AI分類用に必ず保存
        try { window.currentImageFile = file; } catch {}

        if (!metadata || (!metadata.parameters && !metadata.prompt && !metadata.description)) {
            // プロンプトなし → AI分類（画像ベース）を案内
            console.log('⚠️ プロンプト情報が見つかりませんでした');

            // 空のメタデータを作成（UI表示用）
            currentMetadata = { parameters: null, prompt: null, description: null };

            // プロンプト表示エリアに「なし」を設定
            document.getElementById('positivePrompt').textContent = '（なし）';
            document.getElementById('negativePrompt').textContent = '（なし）';
            const settingsEl = document.getElementById('settingsPrompt');
            if (settingsEl) settingsEl.textContent = '（なし）';

            // 画像プレビュー表示（ロード完了まで待つ）
            await loadPreviewImage(file);

            // 画像ごとの学習タグがあれば即時反映（緑の学習表示）
            try {
                if (window.overlayPerImageLearnedTags) {
                    await window.overlayPerImageLearnedTags();
                    console.log('🟢 学習オーバーレイを適用（プロンプト無し画像）');
                }
            } catch (e) { console.warn('⚠️ 学習オーバーレイ適用失敗:', e?.message); }

            // 学習タグもない場合は自動で分類を試みる（Taggerのみ）
            const hasTags = uiHasAnyTags();
            if (!hasTags) {
                try {
                    console.log('🔍 メタ無し → Tagger自動解析を実行');
                    await analyzeImageWithTagger(currentImageFile);
                } catch (autoErr) {
                    console.warn('⚠️ 自動分類に失敗:', autoErr?.message);
                    alert(`⚠️ プロンプト情報が見つかりませんでした\n\nこの画像にはSD生成情報が含まれていません。\n\n✅ 既に学習済みなら緑のタグが表示されます。\n✅ 未学習の場合は自動でTagger解析を試みます。失敗した場合はサイドバーの「Tagger解析」を使用してください。`);
                }
            }

            return;  // displayResults()は呼ばない（自動分類/学習表示でUI更新）
        }

        // どの場合でもプレビューを表示（ロード完了まで待つ）
        try { await loadPreviewImage(file); } catch {}

        currentMetadata = metadata;
        await displayResults(metadata);

        // 分類後に画像ごとの学習タグがあれば上書きオーバーレイ
        try {
            if (window.overlayPerImageLearnedTags) {
                await window.overlayPerImageLearnedTags();
                console.log('🟢 学習オーバーレイを適用（プロンプト有り画像）');
            }
        } catch (e) { console.warn('⚠️ 学習オーバーレイ適用失敗:', e?.message); }

    } catch (error) {
        console.error('❌ 処理エラー:', error);
        alert(`❌ エラーが発生しました: ${error.message}`);
    }
}

// ========================================
// 新規画像の分類UI初期化（タグとカウントのクリア）
// ========================================
function clearCategoryDisplays() {
    const singleCategories = ['people','face','body','pose','expression','background','clothing','quality','other'];
    for (const cat of singleCategories) {
        const countEl = document.getElementById(`${cat}-count`);
        if (countEl) countEl.textContent = '0';
        const container = document.getElementById(`${cat}-tags`);
        if (container) container.innerHTML = '';
    }

    // デュアル表示の各領域もクリア・非表示
    const dualCats = ['face','body','pose','clothing'];
    for (const cat of dualCats) {
        const dual = document.getElementById(`${cat}-dual-tags`);
        if (dual) dual.style.display = 'none';
        const single = document.getElementById(`${cat}-tags`);
        if (single) single.style.display = '';

        const c1 = document.getElementById(`${cat}-char1-tags`);
        const c2 = document.getElementById(`${cat}-char2-tags`);
        if (c1) c1.innerHTML = '';
        if (c2) c2.innerHTML = '';
    }
}

// プレビュー画像を読み込み、表示が反映されるまで待機
function loadPreviewImage(file) {
    return new Promise((resolve) => {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('previewImage');
                if (previewImg) {
                    previewImg.onload = () => resolve();
                    previewImg.onerror = () => resolve();
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                } else {
                    resolve();
                }
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
        } catch {
            resolve();
        }
    });

    // 各カテゴリのヘッダーに「セット」ボタンを注入
    try {
        const boxes = document.querySelectorAll('.category-box');
        boxes.forEach(box => {
            const header = box.querySelector('.category-header');
            if (!header) return;
            if (header.querySelector('.cat-set-btn')) return; // 2重注入防止
            const btn = document.createElement('button');
            btn.textContent = 'セット';
            btn.className = 'btn btn-secondary cat-set-btn';
            btn.style.marginLeft = '8px';
            btn.onclick = () => openSetListModal();
            header.appendChild(btn);
        });
    } catch (e) { console.warn('cat header inject', e); }
}

// いずれかのカテゴリにタグが存在するかを確認
function uiHasAnyTags() {
    const cats = ['people','face','body','pose','expression','background','clothing','quality','other'];
    for (const c of cats) {
        const el = document.getElementById(`${c}-tags`);
        if (!el) continue;
        if (el.querySelector('.tag, .tag-item')) return true;
    }
    return false;
}

// ========================================
// PNG メタデータ完全抽出（複数チャンク対応）
// ========================================
function extractPNGMetadata(arrayBuffer) {
    console.log('🔍 PNG解析開始');

    const dataView = new DataView(arrayBuffer);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];

    // PNG署名確認（警告のみ、エラーは投げない）
    let isPNG = true;
    for (let i = 0; i < 8; i++) {
        if (dataView.getUint8(i) !== signature[i]) {
            isPNG = false;
            break;
        }
    }

    if (!isPNG) {
        console.warn('⚠️ PNG署名が検出されませんでした。メタデータ抽出をスキップします。');
        return { metadata: null, prompt: null };
    }

    let offset = 8;
    const metadata = {};

    // ✅ 重要: 全チャンクを読み取る（早期return禁止）
    while (offset < dataView.byteLength - 12) {
        const chunkLength = dataView.getUint32(offset);
        const chunkType = textDecoder.decode(new Uint8Array(arrayBuffer, offset + 4, 4));

        console.log(`チャンク: ${chunkType} (${chunkLength}バイト)`);

        if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
            const chunkData = new Uint8Array(arrayBuffer, offset + 8, chunkLength);

            // キーワード抽出
            let keywordEnd = 0;
            while (keywordEnd < chunkData.length && chunkData[keywordEnd] !== 0) {
                keywordEnd++;
            }
            const keyword = textDecoder.decode(chunkData.slice(0, keywordEnd));

            let value = '';

            if (chunkType === 'tEXt') {
                // tEXt: 非圧縮
                value = textDecoder.decode(chunkData.slice(keywordEnd + 1));
            } else if (chunkType === 'iTXt') {
                // iTXt: 国際化テキスト
                const compressionFlag = chunkData[keywordEnd + 1];
                const compressionMethod = chunkData[keywordEnd + 2];

                let textStart = keywordEnd + 3;
                // 言語タグとキーワード翻訳をスキップ
                while (textStart < chunkData.length && chunkData[textStart] !== 0) textStart++;
                textStart++;
                while (textStart < chunkData.length && chunkData[textStart] !== 0) textStart++;
                textStart++;

                if (compressionFlag === 1) {
                    // 圧縮済み
                    const compressed = chunkData.slice(textStart);
                    const decompressed = pako.inflate(compressed);
                    value = textDecoder.decode(decompressed);
                } else {
                    // 非圧縮
                    value = textDecoder.decode(chunkData.slice(textStart));
                }
            } else if (chunkType === 'zTXt') {
                // zTXt: 圧縮テキスト
                const compressionMethod = chunkData[keywordEnd + 1];
                if (compressionMethod === 0) {
                    const compressed = chunkData.slice(keywordEnd + 2);
                    const decompressed = pako.inflate(compressed);
                    value = textDecoder.decode(decompressed);
                }
            }

            if (value) {
                // ✅ 重要: 複数チャンク対応 - 既存のキーがあれば連結
                if (metadata[keyword]) {
                    metadata[keyword] += '\n' + value;
                    console.log(`メタデータ追加: ${keyword} (+${value.length}文字)`);
                } else {
                    metadata[keyword] = value;
                    console.log(`メタデータ発見: ${keyword} (${value.length}文字)`);
                }
            }
        }

        // ❌ ここでreturnしない！全チャンクを読み取る
        offset += 8 + chunkLength + 4; // Length(4) + Type(4) + Data + CRC(4)
    }

    console.log('✅ PNG解析完了:', Object.keys(metadata));
    return metadata;
}

// ========================================
// JPEG メタデータ完全抽出（3段階フォールバック方式）
// ========================================
function extractJPEGMetadata(arrayBuffer) {
    console.log('🔍 JPEG解析開始 - 3段階抽出方式');

    const dataView = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // JPEG署名確認
    if (dataView.getUint8(0) !== 0xFF || dataView.getUint8(1) !== 0xD8) {
        throw new Error('JPEG形式ではありません');
    }

    const metadata = {};

    // ========================================
    // Method 1: UNICODE marker検出 + UTF-16 BE デコード
    // ========================================
    console.log('📍 Method 1: UNICODE marker検索中...');

    let offset = 2;
    while (offset < bytes.length - 4) {
        if (bytes[offset] !== 0xFF) break;

        const marker = bytes[offset + 1];

        // APP1 (0xE1) - EXIF segment
        if (marker === 0xE1) {
            const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
            const segmentData = bytes.slice(offset + 4, offset + 2 + length);

            // UNICODE marker探索: 0x55 0x4E 0x49 0x43 0x4F 0x44 0x45
            for (let i = 0; i < segmentData.length - 100; i++) {
                if (segmentData[i] === 0x55 && segmentData[i+1] === 0x4E &&
                    segmentData[i+2] === 0x49 && segmentData[i+3] === 0x43 &&
                    segmentData[i+4] === 0x4F && segmentData[i+5] === 0x44 &&
                    segmentData[i+6] === 0x45) {

                    console.log('✅ UNICODEマーカー発見 at', i);

                    let textStart = i + 8; // "UNICODE\0"の後
                    let text = '';

                    // UTF-16 BEとして読む（各文字2バイト）
                    for (let j = textStart; j < segmentData.length - 1; j += 2) {
                        const charCode = (segmentData[j] << 8) | segmentData[j + 1];
                        if (charCode === 0) break;

                        if (charCode >= 0x20 && charCode <= 0x7E) {
                            text += String.fromCharCode(charCode);
                        } else if (charCode === 0x0A || charCode === 0x0D) {
                            text += '\n';
                        }
                    }

                    if (text.length > 50) {
                        console.log('✅ Method 1成功: UTF-16 BEデコード', text.length, '文字');
                        metadata.parameters = text.trim();
                        return metadata;
                    }
                }
            }

            offset += 2 + length;
        } else if (marker === 0xDA) {
            break; // Start of Scan
        } else {
            const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
            offset += 2 + length;
        }
    }

    console.log('⚠️ Method 1失敗: UNICODEマーカー未検出');

    // ========================================
    // Method 2: パターンマッチング
    // ========================================
    console.log('📍 Method 2: パターンマッチング中...');

    const fullText = textDecoder.decode(bytes);
    const patterns = [
        /focus line[^]*?(?:Version:|$)/,
        /masterpiece[^]*?(?:Version:|$)/,
        /1girl[^]*?(?:Version:|$)/,
        /\b(?:Steps|Sampler|CFG scale|Seed):[^]*?(?:Version:|$)/
    ];

    for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match) {
            console.log('✅ Method 2成功: パターンマッチ');
            metadata.parameters = match[0].trim();
            return metadata;
        }
    }

    console.log('⚠️ Method 2失敗: パターン未検出');

    // ========================================
    // Method 3: ファイル全体"parameters"文字列検索（最も確実）
    // ========================================
    console.log('📍 Method 3: ファイル全体"parameters"検索中...');

    const searchStr = 'parameters';
    for (let i = 0; i < bytes.length - searchStr.length - 10; i++) {
        let found = true;
        for (let j = 0; j < searchStr.length; j++) {
            if (bytes[i + j] !== searchStr.charCodeAt(j)) {
                found = false;
                break;
            }
        }

        if (found) {
            console.log('✅ "parameters"発見 at', i);

            let text = '';
            let offset = i + searchStr.length;

            // スペース/改行をスキップ
            while (offset < bytes.length &&
                   (bytes[offset] === 0x20 || bytes[offset] === 0x0A ||
                    bytes[offset] === 0x0D || bytes[offset] === 0x00)) {
                offset++;
            }

            // テキスト抽出（最大5000バイト）
            for (let k = offset; k < Math.min(bytes.length, offset + 5000); k++) {
                if (bytes[k] >= 0x20 && bytes[k] <= 0x7E) {
                    text += String.fromCharCode(bytes[k]);
                } else if (bytes[k] === 0x0A || bytes[k] === 0x0D) {
                    text += '\n';
                } else if (text.length > 0 && text[text.length - 1] !== ' ') {
                    text += ' ';
                }
            }

            if (text.length > 20) {
                console.log('✅ Method 3成功: ファイル全体検索', text.length, '文字');
                metadata.parameters = text.trim();
                return metadata;
            }
        }
    }

    console.log('❌ 全メソッド失敗: メタデータ未検出');
    return metadata;
}

// ========================================
// 結果表示
// ========================================
async function displayResults(metadata) {
    // 生プロンプト取得
    const rawPrompt = metadata.parameters || metadata.prompt || metadata.description || '';

    // プロンプト分離
    const parsed = parsePrompt(rawPrompt);

    console.log('📋 分離結果:');
    console.log('  ポジティブ:', parsed.positive.substring(0, 100) + '...');
    console.log('  ネガティブ:', parsed.negative.substring(0, 100) + '...');
    console.log('  設定:', parsed.settings.substring(0, 100) + '...');

    // 分離結果を各エリアに表示
    document.getElementById('positivePrompt').textContent = parsed.positive || '（なし）';
    document.getElementById('negativePrompt').textContent = parsed.negative || '（なし）';
    document.getElementById('settingsPrompt').textContent = parsed.settings || '（なし）';

    // 🎭 ADDCOL検出（複数キャラクター判定）
    const parts = parsed.positive.split('ADDCOL');
    console.log(`🎭 ADDCOL検出: ${parts.length}部分に分割`);

    if (parts.length >= 2) {
        // 🎭 複数キャラクターモード：【キャラ1】【キャラ2】分離表示
        console.log('🎭 複数キャラクター検出 - 分離表示モード');

        const char1Prompt = parts[0].trim();
        const char2Prompt = parts[1].trim();

        console.log('🎭 キャラ1プロンプト:', char1Prompt.substring(0, 100) + '...');
        console.log('🎭 キャラ2プロンプト:', char2Prompt.substring(0, 100) + '...');

        // キャラ1とキャラ2のタグを抽出
        const char1Tags = extractTags(char1Prompt);
        const char2Tags = extractTags(char2Prompt);

        console.log('🎭 キャラ1タグ数:', char1Tags.length);
        console.log('🎭 キャラ2タグ数:', char2Tags.length);

        // 🔥 重要: それぞれのキャラを別々に分類（分離表示）
        const char1Categorized = categorizeTags(char1Tags);
        const char2Categorized = categorizeTags(char2Tags);

        console.log('🎭 キャラ1分類結果:', Object.keys(char1Categorized).map(k => `${k}:${char1Categorized[k].length}`).join(', '));
        console.log('🎭 キャラ2分類結果:', Object.keys(char2Categorized).map(k => `${k}:${char2Categorized[k].length}`).join(', '));

        // 🎨 デュアルキャラクターカテゴリ（face, body, pose, clothing）の分離表示
        const dualCategories = ['face', 'body', 'pose', 'clothing'];

        dualCategories.forEach(catKey => {
            // 通常の単一表示を非表示
            const singleTags = document.getElementById(`${catKey}-tags`);
            if (singleTags) {
                singleTags.style.display = 'none';
            }

            // デュアル表示コンテナを表示
            const dualDisplay = document.getElementById(`${catKey}-dual-tags`);
            if (dualDisplay) {
                dualDisplay.style.display = 'flex';
            }

            // 【キャラ1】タグコンテナ
            const char1Container = document.getElementById(`${catKey}-char1-tags`);
            if (char1Container) {
                char1Container.innerHTML = '';
                const char1CatTags = char1Categorized[catKey] || [];
                char1CatTags.forEach(tagObj => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag';
                    tagEl.textContent = tagObj.text;
                    tagEl.dataset.originalIndex = tagObj.originalIndex;
                    char1Container.appendChild(tagEl);
                });
                console.log(`🎭 ${catKey} キャラ1: ${char1CatTags.length}タグ表示`);
            }

            // 【キャラ2】タグコンテナ
            const char2Container = document.getElementById(`${catKey}-char2-tags`);
            if (char2Container) {
                char2Container.innerHTML = '';
                const char2CatTags = char2Categorized[catKey] || [];
                char2CatTags.forEach(tagObj => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag';
                    tagEl.textContent = tagObj.text;
                    tagEl.dataset.originalIndex = tagObj.originalIndex;
                    char2Container.appendChild(tagEl);
                });
                console.log(`🎭 ${catKey} キャラ2: ${char2CatTags.length}タグ表示`);
            }

            // カウント更新（合計）
            const countElement = document.getElementById(`${catKey}-count`);
            if (countElement) {
                const totalCount = (char1Categorized[catKey]?.length || 0) + (char2Categorized[catKey]?.length || 0);
                countElement.textContent = totalCount;
            }
        });

        // 🎨 単一表示カテゴリ（people, background, expression, quality, other）
        const singleCategories = ['people', 'background', 'expression', 'quality', 'other'];

        singleCategories.forEach(catKey => {
            let catTags = [];

            if (catKey === 'people') {
                // peopleカテゴリは2girls固定
                catTags = [{ text: '2girls', originalIndex: 0 }];
            } else {
                // その他は統合（背景・表情・品質は両キャラで共通の場合が多い）
                const char1CatTags = char1Categorized[catKey] || [];
                const char2CatTags = char2Categorized[catKey] || [];
                catTags = [...char1CatTags, ...char2CatTags];
            }

            // カウント更新
            const countElement = document.getElementById(`${catKey}-count`);
            if (countElement) {
                countElement.textContent = catTags.length;
            }

            // タグコンテナ更新
            const tagContainer = document.getElementById(`${catKey}-tags`);
            if (tagContainer) {
                tagContainer.style.display = ''; // 表示復元
                tagContainer.innerHTML = '';
                catTags.forEach(tagObj => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag';
                    tagEl.textContent = tagObj.text;
                    tagEl.dataset.originalIndex = tagObj.originalIndex;
                    tagContainer.appendChild(tagEl);
                });
            }
        });

        // 元のADDCOL構造情報を保存（プロンプト生成時に使用）
        currentMetadata._multiCharacterStructure = {
            hasADDCOL: true,
            char1Tags: char1Tags,
            char2Tags: char2Tags,
            char1Categorized: char1Categorized,
            char2Categorized: char2Categorized,
            originalPrompt: parsed.positive
        };

        console.log('🎭 分離表示完了（【キャラ1】【キャラ2】）');

    } else {
        // 👤 単一キャラクターモード
        console.log('👤 単一キャラクター - 通常表示モード');

        // 🔥 デュアル表示コンテナを非表示（重要！）
        const dualCategories = ['face', 'body', 'pose', 'clothing'];
        dualCategories.forEach(catKey => {
            // デュアル表示コンテナ非表示
            const dualDisplay = document.getElementById(`${catKey}-dual-tags`);
            if (dualDisplay) {
                dualDisplay.style.display = 'none';
            }

            // 通常の単一表示を復元
            const singleTags = document.getElementById(`${catKey}-tags`);
            if (singleTags) {
                singleTags.style.display = '';
            }
        });

        const tags = extractTags(parsed.positive);
        const categorized = await categorizeWithLearning(tags);

        // カテゴリUI更新（pre-rendered boxes）
        Object.keys(CATEGORIES).forEach(catKey => {
            let catTags = categorized[catKey] || [];

            if (catKey === 'poseemotion') {
                // poseemotion を pose / expression に分配表示
                const poseTags = [];
                const exprTags = [];
                for (const item of catTags) {
                    const text = (typeof item === 'string' ? item : item.text) || '';
                    if (EXPRESSION_DICT.has(text.toLowerCase())) exprTags.push(item);
                    else poseTags.push(item);
                }

                const poseCountEl = document.getElementById('pose-count');
                if (poseCountEl) poseCountEl.textContent = poseTags.length;
                const exprCountEl = document.getElementById('expression-count');
                if (exprCountEl) exprCountEl.textContent = exprTags.length;

                const poseContainer = document.getElementById('pose-tags');
                if (poseContainer) {
                    poseContainer.innerHTML = '';
                    poseTags.forEach(tagObj => {
                        const tagEl = document.createElement('span');
                        tagEl.className = 'tag';
                        tagEl.textContent = (typeof tagObj === 'string' ? tagObj : tagObj.text);
                        tagEl.dataset.originalIndex = tagObj.originalIndex ?? -1;
                        poseContainer.appendChild(tagEl);
                    });
                }

                const exprContainer = document.getElementById('expression-tags');
                if (exprContainer) {
                    exprContainer.innerHTML = '';
                    exprTags.forEach(tagObj => {
                        const tagEl = document.createElement('span');
                        tagEl.className = 'tag';
                        tagEl.textContent = (typeof tagObj === 'string' ? tagObj : tagObj.text);
                        tagEl.dataset.originalIndex = tagObj.originalIndex ?? -1;
                        exprContainer.appendChild(tagEl);
                    });
                }
                return; // 他のUI id は存在しないためここでスキップ
            }

            // 通常カテゴリの表示
            const countElement = document.getElementById(`${catKey}-count`);
            if (countElement) {
                countElement.textContent = catTags.length;
            }
            const tagContainer = document.getElementById(`${catKey}-tags`);
            if (tagContainer) {
                tagContainer.innerHTML = '';
                catTags.forEach(tagObj => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag';
                    tagEl.textContent = tagObj.text;
                    tagEl.dataset.originalIndex = tagObj.originalIndex;
                    tagContainer.appendChild(tagEl);
                });
            }
        });
    }

    // 結果セクション表示
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// ========================================
// 🎭 2人モード切り替え（ADDCOL検出時）
// ========================================
function switchToDualCharacterMode(char1Prompt, char2Prompt) {
    console.log('🎭 2人モード起動');

    const dualModeCategories = ['face', 'body', 'pose', 'clothing'];

    // 2人モード対応カテゴリ: 単一タグ非表示 + 2人モードUI表示
    dualModeCategories.forEach(catKey => {
        // 単一タグコンテナ非表示
        const singleTags = document.getElementById(`${catKey}-tags`);
        if (singleTags) singleTags.style.display = 'none';

        // 2人モード選択ボタン表示
        const dualSelect = document.getElementById(`${catKey}-dual-select`);
        if (dualSelect) dualSelect.style.display = 'flex';

        // 2人モードタグエリア表示
        const dualTags = document.getElementById(`${catKey}-dual-tags`);
        if (dualTags) dualTags.style.display = 'block';

        // 緑バッジ非表示
        const badge = document.querySelector(`[data-category="${catKey}"] .single-mode-badge`);
        if (badge) badge.style.display = 'none';
    });

    // 2人分のタグを表示
    displayDualCharacterTags(char1Prompt, char2Prompt);

    // ステータス更新
    const statusEl = document.getElementById('dualModeStatus');
    if (statusEl) statusEl.textContent = '2人モード: 有効';

    console.log('✅ 2人モード起動完了');
}

// ========================================
// 👤 単一モード切り替え（通常画像）
// ========================================
function switchToSingleCharacterMode() {
    console.log('👤 単一モード起動');

    const dualModeCategories = ['face', 'body', 'pose', 'clothing'];

    // 2人モード対応カテゴリ: 単一タグ表示 + 2人モードUI非表示
    dualModeCategories.forEach(catKey => {
        // 単一タグコンテナ表示
        const singleTags = document.getElementById(`${catKey}-tags`);
        if (singleTags) singleTags.style.display = 'flex';

        // 2人モード選択ボタン非表示
        const dualSelect = document.getElementById(`${catKey}-dual-select`);
        if (dualSelect) dualSelect.style.display = 'none';

        // 2人モードタグエリア非表示
        const dualTags = document.getElementById(`${catKey}-dual-tags`);
        if (dualTags) dualTags.style.display = 'none';

        // 緑バッジ表示
        const badge = document.querySelector(`[data-category="${catKey}"] .single-mode-badge`);
        if (badge) badge.style.display = 'inline-block';
    });

    // ステータス更新
    const statusEl = document.getElementById('dualModeStatus');
    if (statusEl) statusEl.textContent = '2人モード: 未選択';

    console.log('✅ 単一モード起動完了');
}

// ========================================
// 🎭 2人分のタグ表示（キャラ1/キャラ2分離）
// ========================================
function displayDualCharacterTags(char1Prompt, char2Prompt) {
    console.log('🎭 2人分タグ表示開始');

    const dualModeCategories = ['face', 'body', 'pose', 'clothing'];

    // キャラ1のタグ抽出+分類
    const char1Tags = extractTags(char1Prompt);
    const char1Categorized = categorizeTags(char1Tags);

    // キャラ2のタグ抽出+分類
    const char2Tags = extractTags(char2Prompt);
    const char2Categorized = categorizeTags(char2Tags);

    // 各カテゴリに2人分のタグを表示
    dualModeCategories.forEach(catKey => {
        const char1TagsData = char1Categorized[catKey] || [];
        const char2TagsData = char2Categorized[catKey] || [];

        // キャラ1タグ表示
        const char1Container = document.getElementById(`${catKey}-char1-tags`);
        if (char1Container) {
            char1Container.innerHTML = '';
            char1TagsData.forEach(tagObj => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tagObj.text;
                tagEl.dataset.originalIndex = tagObj.originalIndex;
                char1Container.appendChild(tagEl);
            });
        }

        // キャラ1ステータス更新
        const char1Status = document.querySelector(`#${catKey}-char1-tags`).previousElementSibling;
        if (char1Status && char1Status.classList.contains('char-status')) {
            char1Status.textContent = char1TagsData.length > 0 ? `${char1TagsData.length}タグ` : '未選択';
        }

        // キャラ2タグ表示
        const char2Container = document.getElementById(`${catKey}-char2-tags`);
        if (char2Container) {
            char2Container.innerHTML = '';
            char2TagsData.forEach(tagObj => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tagObj.text;
                tagEl.dataset.originalIndex = tagObj.originalIndex;
                char2Container.appendChild(tagEl);
            });
        }

        // キャラ2ステータス更新
        const char2Status = document.querySelector(`#${catKey}-char2-tags`).previousElementSibling;
        if (char2Status && char2Status.classList.contains('char-status')) {
            char2Status.textContent = char2TagsData.length > 0 ? `${char2TagsData.length}タグ` : '未選択';
        }
    });

    console.log('✅ 2人分タグ表示完了');
}

// ========================================
// プロンプト分離（ポジティブ/ネガティブ/設定）
// ========================================
function parsePrompt(rawPrompt) {
    let positive = rawPrompt;
    let negative = '';
    let settings = '';

    // Negative prompt分離
    const negativeMatch = rawPrompt.match(/Negative prompt:\s*(.+?)(?:Steps:|$)/s);
    if (negativeMatch) {
        negative = negativeMatch[1].trim();
        positive = rawPrompt.substring(0, rawPrompt.indexOf('Negative prompt:')).trim();
    }

    // Steps以降を設定として分離
    const stepsMatch = rawPrompt.match(/Steps:\s*(.+)/s);
    if (stepsMatch) {
        settings = 'Steps: ' + stepsMatch[1].trim();
        positive = positive.replace(/Steps:\s*.+/s, '').trim();
        negative = negative.replace(/Steps:\s*.+/s, '').trim();
    }

    return { positive, negative, settings };
}

// ========================================
// タグ抽出（ポジティブプロンプトのみ）
// ========================================
function extractTags(prompt) {
    // カンマ区切りでタグ分割
    const tags = prompt
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .filter(t => {
            // 🔥 LoRA/LyCORIS/Hypernet等のモデルタグは保持（<xxx:...>形式）
            // 括弧で囲まれた場合も対応: (<lora:...>)
            if (t.includes('<') && t.includes('>') && t.includes('lora:')) {
                return true;
            }
            if (t.includes('<') && t.includes('>') && (t.includes('lyco:') || t.includes('hypernet:'))) {
                return true;
            }

            // 🎯 Phase 8.3: 重み付きタグ(xxx:1.5)は保持
            // パターン: (tareme:1.5), (squatting:1.4), (amazing quality), etc.
            if (t.match(/^\(.+:\d*\.?\d*\)$/)) {
                return true;  // (tag:weight)形式を保持
            }
            if (t.match(/^\(.+\)$/)) {
                return true;  // (tag)形式を保持
            }

            // 設定情報（Steps:, CFG scale:等）は除外
            if (t.match(/^(Steps|CFG scale|Sampler|Seed|Size|Model|VAE|Clip skip|Hires|Denoising):/i)) {
                return false;
            }

            // ⚠️ その他のコロンを含むタグは除外（設定情報のみ）
            // 重み付きタグは上記で保持済み
            return !t.includes(':');
        });

    console.log(`📝 ${tags.length}個のタグを抽出（ポジティブのみ）`);
    return tags;
}

// ========================================
// タグ分類
// ========================================
function categorizeTags(tags) {
    const result = {};
    Object.keys(CATEGORIES).forEach(catKey => { result[catKey] = []; });

    // 正規化関数（比較用）
    const norm = (s) => String(s || '')
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // カテゴリ判定の優先順（体への偏りを抑える）
    // 背景はポーズより先に判定（tree/sky等の誤分類を防止）
    const ORDER = ['people','face','clothing','background','poseemotion','body','quality','other'];

    // 正規化辞書（長い語を優先マッチさせる）
    const dict = {};
    ORDER.forEach(key => {
        const arr = Array.from(new Set((CATEGORIES[key]?.tags || []).map(norm)))
            .filter(Boolean)
            .sort((a,b) => b.length - a.length);
        dict[key] = arr;
    });

    // 入力タグを走査
    const normalizedInput = tags.map(t => ({ raw: t, n: norm(t) }));

    for (let i = 0; i < normalizedInput.length; i++) {
        const { raw, n } = normalizedInput[i];
        let placed = false;

        // LoRA等は強制振り分け（品質扱い）
        if (n.includes('<lora:') || n.includes('<lyco:') || n.includes('<hypernet:') || /^\(lora:/i.test(n)) {
            result.quality.push({ text: raw, originalIndex: i });
            placed = true;
        }

        // ラベル表があれば最優先でカテゴリ決定
        if (WD14_LABELS && WD14_LABELS[n]) {
            const key = WD14_LABELS[n];
            if (result[key]) {
                result[key].push({ text: raw, originalIndex: i });
                placed = true;
            }
        }

        for (const key of ORDER) {
            const list = dict[key];
            // 厳密一致を基本に（部分一致は誤分類の温床になるため禁止）
            if (list.includes(n)) {
                result[key].push({ text: raw, originalIndex: i });
                placed = true;
                break;
            }
        }

        if (!placed) {
            // ヒューリスティック: 代表的な衣服/背景/ポーズ語を含む場合のフォールバック
            const clothingWords = ['uniform','jacket','coat','pants','skirt','shirt','blouse','necktie','bra','panties','stockings','thighhighs','socks','shoes','footwear','hoodie','sweater','dress','obi','tabi'];
            const backgroundWords = ['sky','night sky','moon','day','indoors','outdoors','room','bedroom','sliding door','sliding doors','shouji','tatami','lantern','forest','city','beach','ocean','sea','classroom'];
            const poseWords = ['standing','sitting','lying','kneeling','squatting','crouching','leaning','bending','cowboy shot','from above','from below','from behind','from side','front view','rear view','dutch angle','arm support','finger to mouth','index finger raised','shushing','hands on hips','hand on hip','hands up','peace sign','v sign'];

            const includesAny = (arr) => arr.some(w => n.includes(w));

            if (includesAny(clothingWords)) {
                result.clothing.push({ text: raw, originalIndex: i });
            } else if (includesAny(backgroundWords)) {
                result.background.push({ text: raw, originalIndex: i });
            } else if (includesAny(poseWords)) {
                result.poseemotion.push({ text: raw, originalIndex: i });
            } else {
                result.other.push({ text: raw, originalIndex: i });
            }
        }
    }

    // 二次整形: specific優先でgeneric除外（例: * uniform があれば uniform を除外）
    try {
        // uniform
        const hasSpecificUniform = result.clothing.some(it => /\b\w+\s+uniform\b/i.test(norm(it.text)) && norm(it.text) !== 'uniform');
        if (hasSpecificUniform) {
            result.clothing = result.clothing.filter(it => norm(it.text) !== 'uniform');
        }
        // breasts: specificがあれば generic を除外
        const breastSpecific = new Set(['small breasts','medium breasts','large breasts','huge breasts','gigantic breasts']);
        const hasSpecificBreast = result.body.some(it => breastSpecific.has(norm(it.text)));
        if (hasSpecificBreast) {
            result.body = result.body.filter(it => norm(it.text) !== 'breasts');
        }
    } catch {}

    return result;
}

// ========================================
// ユーティリティ関数
// ========================================
function copyAllTags() {
    // 🎯 Phase 8.4: 正しいADDCOL形式でプロンプト生成
    // 正しい形式: [品質タグ],[共通LoRA], 1girl,[キャラ1詳細] ADDCOL 1girl,[キャラ2詳細]

    const isDualMode = window.multiCharManager && window.multiCharManager.isDualCharacterMode;
    let parts = [];

    // 📌 ステップ1: 品質タグ (quality-tags)
    const qualityTags = collectTagsFromContainer('quality-tags');
    if (qualityTags.length > 0) {
        parts.push(...qualityTags);
    }

    // 📌 ステップ2: 全LoRAタグを抽出（全カテゴリから収集）
    const allLoraTags = extractAllLoRATags();
    if (allLoraTags.length > 0) {
        parts.push(...allLoraTags);
    }

    if (isDualMode) {
        // 📌 ステップ3: 人数タグ (people-tags)
        const peopleTags = collectTagsFromContainer('people-tags');
        if (peopleTags.length > 0) {
            parts.push(...peopleTags);
        }

        // 📌 ステップ4: キャラクター1 = 1girl + 全属性（face→body→pose→clothing→expression）
        const char1Parts = ['1girl'];
        const char1FaceTags = collectTagsFromContainer('face-char1-tags');
        const char1BodyTags = collectTagsFromContainer('body-char1-tags');
        const char1PoseTags = collectTagsFromContainer('pose-char1-tags');
        const char1ClothingTags = collectTagsFromContainer('clothing-char1-tags');
        const char1ExpressionTags = collectTagsFromContainer('expression-char1-tags');

        char1Parts.push(...char1FaceTags, ...char1BodyTags, ...char1PoseTags, ...char1ClothingTags, ...char1ExpressionTags);
        parts.push(...char1Parts);

        // 📌 ステップ5: ADDCOL区切り
        parts.push(' ADDCOL ');

        // 📌 ステップ6: キャラクター2 = 1girl + 全属性
        const char2Parts = ['1girl'];
        const char2FaceTags = collectTagsFromContainer('face-char2-tags');
        const char2BodyTags = collectTagsFromContainer('body-char2-tags');
        const char2PoseTags = collectTagsFromContainer('pose-char2-tags');
        const char2ClothingTags = collectTagsFromContainer('clothing-char2-tags');
        const char2ExpressionTags = collectTagsFromContainer('expression-char2-tags');

        char2Parts.push(...char2FaceTags, ...char2BodyTags, ...char2PoseTags, ...char2ClothingTags, ...char2ExpressionTags);
        parts.push(...char2Parts);
    } else {
        // 単一キャラモード: 通常のタグ収集
        const categoryOrder = ['face', 'body', 'pose', 'clothing', 'expression', 'other', 'background', 'people'];
        for (const category of categoryOrder) {
            const tags = collectTagsFromContainer(`${category}-tags`);
            if (tags.length > 0) {
                parts.push(...tags);
            }
        }
    }

    if (parts.length === 0) {
        alert('❌ コピーするタグがありません');
        return;
    }

    const finalPrompt = parts.join(',');

    navigator.clipboard.writeText(finalPrompt).then(() => {
        console.log('✅ 生成されたプロンプト:', finalPrompt);
        alert(`✅ プロンプト全体をコピーしました\n（${parts.length}タグ）`);
    }).catch(err => {
        console.error('❌ コピー失敗:', err);
        alert('❌ クリップボードへのコピーに失敗しました');
    });
}

// 🔧 ヘルパー関数: 全カテゴリからLoRAタグを抽出
function extractAllLoRATags() {
    const allLoras = [];
    const allCategories = ['quality', 'face-char1', 'face-char2', 'body-char1', 'body-char2',
                          'pose-char1', 'pose-char2', 'clothing-char1', 'clothing-char2',
                          'expression-char1', 'expression-char2', 'other', 'background', 'people'];

    for (const category of allCategories) {
        const tags = collectTagsFromContainer(`${category}-tags`);
        for (const tag of tags) {
            // LoRAタグパターン: <lora:xxx:weight>
            if (tag.includes('<lora:') || tag.includes('<lyco:') || tag.includes('<hypernet:')) {
                if (!allLoras.includes(tag)) {
                    allLoras.push(tag);
                }
            }
        }
    }

    return allLoras;
}

// ヘルパー関数: コンテナからタグテキストを収集
function collectTagsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const tags = [];
    const tagElements = container.querySelectorAll('.tag, .tag-item');

    tagElements.forEach(el => {
        const tagText = el.textContent.trim();
        if (tagText) {
            tags.push(tagText);
        }
    });

    return tags;
}

function reset() {
    currentMetadata = null;
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    const positivePromptEl = document.getElementById('positivePrompt');
    const negativePromptEl = document.getElementById('negativePrompt');
    const settingsPromptEl = document.getElementById('settingsPrompt');

    if (positivePromptEl) positivePromptEl.textContent = '';
    if (negativePromptEl) negativePromptEl.textContent = '';
    if (settingsPromptEl) settingsPromptEl.textContent = '';

    // 各カテゴリをクリア
    Object.keys(CATEGORIES).forEach(catKey => {
        const countElement = document.getElementById(`${catKey}-count`);
        const tagContainer = document.getElementById(`${catKey}-tags`);
        if (countElement) countElement.textContent = '0';
        if (tagContainer) tagContainer.innerHTML = '';
    });

    // プロンプト出力エリアもクリア
    const promptOutput = document.getElementById('promptOutput');
    if (promptOutput) promptOutput.innerHTML = '';
}

// ========================================
// サイドバー機能
// ========================================
function clearAll() {
    if (confirm('すべてのデータをクリアしますか？')) {
        reset();
        alert('✅ すべてのデータをクリアしました');
    }
}

function generateYAML() {
    // YAML生成モーダルを開く
    openYAMLGenerator();
}

/**
 * YAML生成モーダルを開く
 */
async function openYAMLGenerator() {
    const modal = document.getElementById('yamlGeneratorModal');
    if (!modal) {
        alert('❌ YAML生成モーダルが見つかりません');
        return;
    }
    
    modal.style.display = 'flex';
    
    // YAML生成システムのスクリプトが読み込まれるまで待つ（最大3秒）
    let retryCount = 0;
    const maxRetries = 30; // 3秒待つ（100ms × 30）
    
    const waitForSystem = () => {
        return new Promise((resolve, reject) => {
            const checkSystem = () => {
                if (window.YAMLGeneratorSystem) {
                    resolve();
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(checkSystem, 100);
                } else {
                    reject(new Error('YAMLGeneratorSystemが見つかりません。ページを再読み込みしてください。'));
                }
            };
            checkSystem();
        });
    };
    
    try {
        await waitForSystem();
        
        // YAML生成システムを初期化（セットデータを読み込む）
        await window.YAMLGeneratorSystem.initialize();
        console.log('✅ YAML生成システム初期化完了');
        
        // UIを更新（カテゴリタブとカードを表示）
        if (window.YAMLGeneratorSystem.updateUI) {
            window.YAMLGeneratorSystem.updateUI();
        }
    } catch (error) {
        console.error('❌ YAML生成システム初期化エラー:', error);
        alert(`❌ YAML生成システムの初期化に失敗しました\n\n${error.message}\n\nページを再読み込みしてください。`);
        modal.style.display = 'none';
    }
}

/**
 * YAML生成モーダルを閉じる
 */
function closeYAMLGenerator() {
    const modal = document.getElementById('yamlGeneratorModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function openStoryPrompt() {
    const modal = document.getElementById('storyPromptModal');
    modal.style.display = 'flex';
    
    // 区切り文字テンプレートを読み込む
    loadDividerTemplates();
    
    // 男性設定を初期化
    storyPromptState.globalSettings.maleCharacterSet = '';
    storyPromptState.globalSettings.maleClothingState = '';
    
    // 複数人女性モードを初期化
    storyPromptState.globalSettings.multiGirlMode = false;
    storyPromptState.globalSettings.multiGirlFaces = [];
    
    // 男性服装状態エリアを非表示
    const maleClothingStateArea = document.getElementById('storyMaleClothingStateArea');
    if (maleClothingStateArea) {
        maleClothingStateArea.style.display = 'none';
    }
    
    // 男性服装状態ドロップダウンを初期化
    const storyMaleClothingStateSelect = document.getElementById('storyMaleClothingStateSelect');
    if (storyMaleClothingStateSelect) {
        storyMaleClothingStateSelect.value = '';
    }
    
    // 複数人女性モードのチェックボックスを初期化
    const multiGirlModeCheckbox = document.getElementById('storyMultiGirlMode');
    if (multiGirlModeCheckbox) {
        multiGirlModeCheckbox.checked = false;
    }
    
    // セット選択を読み込む
    await loadStoryPromptSets();
}

function closeStoryPrompt() {
    const modal = document.getElementById('storyPromptModal');
    modal.style.display = 'none';
}

// 複数人女性モードの切り替え
function toggleMultiGirlMode() {
    const checkbox = document.getElementById('storyMultiGirlMode');
    const singleGirlArea = document.getElementById('storySingleGirlArea');
    const multiGirlArea = document.getElementById('storyMultiGirlArea');
    
    if (!checkbox || !singleGirlArea || !multiGirlArea) return;
    
    const isMultiMode = checkbox.checked;
    storyPromptState.globalSettings.multiGirlMode = isMultiMode;
    
    if (isMultiMode) {
        singleGirlArea.style.display = 'none';
        multiGirlArea.style.display = 'block';
        
        // 既存の女性の顔を最初の選択肢として追加
        const currentFace = document.getElementById('storyFaceSelect').value;
        if (currentFace && storyPromptState.globalSettings.multiGirlFaces.length === 0) {
            storyPromptState.globalSettings.multiGirlFaces = [{ 
                faceSet: currentFace, 
                clothing: '', 
                pose: '', 
                clothingState: '', 
                expression: '' 
            }];
        }
        
        // 複数人女性の顔ドロップダウンを初期化
        renderMultiGirlFaces();
    } else {
        singleGirlArea.style.display = 'block';
        multiGirlArea.style.display = 'none';
        storyPromptState.globalSettings.multiGirlFaces = [];
    }
    
    updateStoryPromptPreview();
}

// 複数人女性の顔を追加
function addMultiGirlFace() {
    if (storyPromptState.globalSettings.multiGirlFaces.length >= 5) {
        alert('⚠️ 最大5人まで追加できます');
        return;
    }
    
    storyPromptState.globalSettings.multiGirlFaces.push({ 
        faceSet: '', 
        clothing: '', 
        pose: '', 
        clothingState: '', 
        expression: '' 
    });
    renderMultiGirlFaces();
}

// 複数人女性の設定ドロップダウンを描画
function renderMultiGirlFaces() {
    const container = document.getElementById('storyMultiGirlFacesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    storyPromptState.globalSettings.multiGirlFaces.forEach((girlData, index) => {
        // 女性ごとのカードを作成
        const girlCard = document.createElement('div');
        girlCard.style.cssText = 'padding: 15px; margin-bottom: 15px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; border: 2px solid #dee2e6;';
        
        // ヘッダー（女性番号と削除ボタン）
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
        
        const title = document.createElement('h4');
        title.textContent = `👤 女性${index + 1}`;
        title.style.cssText = 'margin: 0; color: #495057; font-size: 16px; font-weight: bold;';
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '🗑️ 削除';
        removeBtn.style.cssText = 'padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;';
        removeBtn.onclick = () => {
            storyPromptState.globalSettings.multiGirlFaces.splice(index, 1);
            renderMultiGirlFaces();
            updateStoryPromptPreview();
        };
        
        header.appendChild(title);
        header.appendChild(removeBtn);
        girlCard.appendChild(header);
        
        // 各設定のドロップダウン
        const settingsGrid = document.createElement('div');
        settingsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 10px;';
        
        // 1. 顔セット
        const faceRow = createSelectRow('😊 顔', `multiGirlFace${index + 1}`, 
            Object.keys(storyPromptState.setsData.face), 
            girlData.faceSet || '',
            (value) => {
                girlData.faceSet = value;
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(faceRow);
        
        // 2. 服装
        const clothingRow = createSelectRow('👗 服装', `multiGirlClothing${index + 1}`, 
            Object.keys(storyPromptState.setsData.clothing), 
            girlData.clothing || '',
            (value) => {
                girlData.clothing = value;
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(clothingRow);
        
        // 3. ポーズ（ポーズセットから選択）
        const poseOptions = [];
        if (storyPromptState.setsData.pose && storyPromptState.setsData.pose.groups) {
            Object.values(storyPromptState.setsData.pose.groups).forEach(group => {
                if (group.sections) {
                    Object.values(group.sections).forEach(section => {
                        Object.keys(section).forEach(poseName => {
                            poseOptions.push(poseName);
                        });
                    });
                }
            });
        }
        const poseRow = createSelectRow('🤸 ポーズ', `multiGirlPose${index + 1}`, 
            poseOptions, 
            girlData.pose || '',
            (value) => {
                girlData.pose = value;
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(poseRow);
        
        // 4. 服装状態
        const clothingStateRow = createSelectRow('👔 服装状態', `multiGirlClothingState${index + 1}`, 
            Object.keys(storyPromptState.setsData.clothingState), 
            girlData.clothingState || '',
            (value) => {
                girlData.clothingState = value;
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(clothingStateRow);
        
        // 5. 表情
        const expressionRow = createSelectRow('😊 表情', `multiGirlExpression${index + 1}`, 
            Object.keys(storyPromptState.setsData.expression), 
            girlData.expression || '',
            (value) => {
                girlData.expression = value;
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(expressionRow);
        
        girlCard.appendChild(settingsGrid);
        container.appendChild(girlCard);
    });
    
    // 追加ボタンの表示/非表示
    const addBtn = document.querySelector('#storyMultiGirlArea button[onclick="addMultiGirlFace()"]');
    if (addBtn) {
        addBtn.style.display = storyPromptState.globalSettings.multiGirlFaces.length >= 5 ? 'none' : 'block';
    }
}

// 選択行を作成するヘルパー関数
function createSelectRow(labelText, selectId, options, currentValue, onChange) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.cssText = 'font-size: 13px; font-weight: bold; color: #495057;';
    
    const select = document.createElement('select');
    select.id = selectId;
    select.style.cssText = 'width: 100%; padding: 8px; border: 2px solid #dee2e6; border-radius: 6px; font-size: 13px; background: white;';
    select.innerHTML = '<option value="">選択...</option>';
    
    options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        if (optionValue === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    select.addEventListener('change', () => {
        onChange(select.value);
    });
    
    row.appendChild(label);
    row.appendChild(select);
    return row;
}

// ストーリープロンプトのグローバル状態
const storyPromptState = {
    setsData: {
        face: {},
        body: {},
        background: {},
        clothing: {},
        expression: {},
        pose: { groups: {} },
        clothingState: {}, // 服装状態セット（体カテゴリの「服装状態」グループから取得）
        maleCharacter: {}, // 男性キャラクターセット（faceカテゴリの「男性」グループから取得）
        underwear: {} // 下着セット（clothingカテゴリの「下着」グループから取得）
    },
    selectedScenes: [], // { id, poseName, poseData, individual: { background, expression, clothing, clothingState, maleClothingState, multiGirlSettings: [{ faceSet, clothing, pose, clothingState, expression }, ...] } }
    currentSceneId: null,
    globalSettings: {
        maleCharacterSet: '', // 竿役男性セット名
        maleClothingState: '', // 男性服装状態（空文字列は「通常」を意味する）
        multiGirlMode: false, // 複数人女性モード
        multiGirlFaces: [] // 複数人女性の設定配列（最大5人）: [{ faceSet: '', clothing: '', pose: '', clothingState: '', expression: '' }, ...]
    },
    dividerTemplates: [] // 区切り文字テンプレート
};

// デフォルトの区切り文字テンプレート
const DEFAULT_DIVIDER_TEMPLATES = [
    '【通常パート】',
    '【本番】',
    '【前戯】',
    '【後戯】',
    '【導入】',
    '【クライマックス】',
    '【エンディング】'
];

// 区切り文字テンプレートの読み込み
function loadDividerTemplates() {
    try {
        const saved = localStorage.getItem('storyDividerTemplates');
        if (saved) {
            storyPromptState.dividerTemplates = JSON.parse(saved);
        } else {
            storyPromptState.dividerTemplates = [...DEFAULT_DIVIDER_TEMPLATES];
            saveDividerTemplates();
        }
    } catch (error) {
        console.error('区切り文字テンプレート読み込みエラー:', error);
        storyPromptState.dividerTemplates = [...DEFAULT_DIVIDER_TEMPLATES];
    }
}

// 区切り文字テンプレートの保存
function saveDividerTemplates() {
    try {
        localStorage.setItem('storyDividerTemplates', JSON.stringify(storyPromptState.dividerTemplates));
    } catch (error) {
        console.error('区切り文字テンプレート保存エラー:', error);
    }
}

async function loadStoryPromptSets() {
    console.log('📚 セットデータ読み込み開始');
    const categories = ['face', 'body', 'background', 'clothing', 'expression', 'pose'];
    
    for (const category of categories) {
        try {
            const result = await window.electronAPI.loadCategorySets(category);
            
            if (result && result.success && result.groups) {
                if (category === 'pose') {
                    // ポーズは階層構造を保持
                    storyPromptState.setsData.pose = { groups: result.groups };
                    console.log(`✅ ${category}: グループ数 ${Object.keys(result.groups).length}`);
                } else {
                    // 他のカテゴリはフラット化
                    let count = 0;
                    Object.entries(result.groups).forEach(([groupName, groupData]) => {
                        if (groupData.sections) {
                            Object.values(groupData.sections).forEach(sets => {
                                Object.entries(sets).forEach(([setName, setData]) => {
                                    // 体カテゴリの「服装状態」グループは別途保存
                                    if (category === 'body' && groupName === '服装状態') {
                                        storyPromptState.setsData.clothingState[setName] = setData;
                                    }
                                    // faceカテゴリの「男性」グループは別途保存
                                    else if (category === 'face' && groupName === '男性') {
                                        storyPromptState.setsData.maleCharacter[setName] = setData;
                                    }
                                    // 服装カテゴリの「下着」グループは別途保存
                                    else if (category === 'clothing' && groupName === '下着') {
                                        storyPromptState.setsData.underwear[setName] = setData;
                                        // 通常の服装セットにも追加（既存の動作を維持）
                                        storyPromptState.setsData[category][setName] = setData;
                                    } else {
                                        storyPromptState.setsData[category][setName] = setData;
                                    }
                                    count++;
                                });
                            });
                        }
                    });
                    console.log(`✅ ${category}: ${count}セット読み込み完了`);
                    if (category === 'body' && storyPromptState.setsData.clothingState) {
                        const clothingStateCount = Object.keys(storyPromptState.setsData.clothingState).length;
                        console.log(`✅ 服装状態: ${clothingStateCount}セット読み込み完了`);
                    }
                    if (category === 'face' && storyPromptState.setsData.maleCharacter) {
                        const maleCharacterCount = Object.keys(storyPromptState.setsData.maleCharacter).length;
                        console.log(`✅ 男性キャラクター: ${maleCharacterCount}セット読み込み完了`);
                    }
                    if (category === 'clothing' && storyPromptState.setsData.underwear) {
                        const underwearCount = Object.keys(storyPromptState.setsData.underwear).length;
                        console.log(`✅ 下着: ${underwearCount}セット読み込み完了`);
                    }
                }
            } else {
                console.warn(`⚠️ ${category}: データなし`);
            }
        } catch (error) {
            console.error(`❌ ${category} 読み込みエラー:`, error);
        }
    }
    
    // ドロップダウンを初期化
    populateStorySelects();
    
    // 複数人女性モードがONの場合、複数人女性の顔ドロップダウンを描画
    if (storyPromptState.globalSettings.multiGirlMode) {
        renderMultiGirlFaces();
    }
    
    // イベントリスナーを設定
    setupStoryEventListeners();
}

function populateStorySelects() {
    // 共通設定のドロップダウン
    ['face', 'body', 'background', 'clothing'].forEach(category => {
        const select = document.getElementById(`story${category.charAt(0).toUpperCase() + category.slice(1)}Select`);
        if (select) {
            select.innerHTML = '<option value="">選択...</option>';
            Object.keys(storyPromptState.setsData[category]).forEach(setName => {
                const option = document.createElement('option');
                option.value = setName;
                option.textContent = setName;
                select.appendChild(option);
            });
        }
    });
    
    // 個別設定のドロップダウン
    const sceneBgSelect = document.getElementById('sceneBackgroundSelect');
    if (sceneBgSelect) {
        sceneBgSelect.innerHTML = '<option value="">共通設定を使用</option>';
        Object.keys(storyPromptState.setsData.background).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneBgSelect.appendChild(option);
        });
    }
    
    const sceneExpSelect = document.getElementById('sceneExpressionSelect');
    if (sceneExpSelect) {
        sceneExpSelect.innerHTML = '<option value="">選択...</option>';
        Object.keys(storyPromptState.setsData.expression).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneExpSelect.appendChild(option);
        });
    }
    
    const sceneClothingSelect = document.getElementById('sceneClothingSelect');
    if (sceneClothingSelect) {
        sceneClothingSelect.innerHTML = '<option value="">共通設定を使用</option>';
        Object.keys(storyPromptState.setsData.clothing).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneClothingSelect.appendChild(option);
        });
    }
    
    // 服装状態ドロップダウン（体カテゴリの「服装状態」グループから取得）
    const sceneClothingStateSelect = document.getElementById('sceneClothingStateSelect');
    if (sceneClothingStateSelect) {
        sceneClothingStateSelect.innerHTML = '<option value="">通常</option>';
        Object.keys(storyPromptState.setsData.clothingState).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneClothingStateSelect.appendChild(option);
        });
        console.log(`✅ 服装状態ドロップダウン: ${Object.keys(storyPromptState.setsData.clothingState).length}セット`);
    }

    // 下着セットドロップダウン（服装カテゴリの「下着」セクションから取得）
    const sceneUnderwearSelect = document.getElementById('sceneUnderwearSelect');
    if (sceneUnderwearSelect) {
        sceneUnderwearSelect.innerHTML = '<option value="">選択なし</option>';
        Object.keys(storyPromptState.setsData.underwear).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneUnderwearSelect.appendChild(option);
        });
        console.log(`✅ 下着セットドロップダウン: ${Object.keys(storyPromptState.setsData.underwear).length}セット`);
    }

    // 竿役男性ドロップダウン（faceカテゴリの「男性」グループから取得）
    const storyMaleCharacterSelect = document.getElementById('storyMaleCharacterSelect');
    if (storyMaleCharacterSelect) {
        storyMaleCharacterSelect.innerHTML = '<option value="">選択なし（一人用）</option>';
        Object.keys(storyPromptState.setsData.maleCharacter).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            storyMaleCharacterSelect.appendChild(option);
        });
        console.log(`✅ 竿役男性ドロップダウン: ${Object.keys(storyPromptState.setsData.maleCharacter).length}セット`);
    }
    
    // 個別設定の竿役男性ドロップダウン
    const sceneMaleCharacterSelect = document.getElementById('sceneMaleCharacterSelect');
    if (sceneMaleCharacterSelect) {
        sceneMaleCharacterSelect.innerHTML = '<option value="">共通設定を使用</option><option value="none">なし（一人用）</option>';
        Object.keys(storyPromptState.setsData.maleCharacter).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneMaleCharacterSelect.appendChild(option);
        });
        console.log(`✅ 個別設定竿役男性ドロップダウン: ${Object.keys(storyPromptState.setsData.maleCharacter).length}セット`);
    }
    
    // 共通設定の男性服装状態ドロップダウン（体カテゴリの「服装状態」グループから取得）
    const storyMaleClothingStateSelect = document.getElementById('storyMaleClothingStateSelect');
    if (storyMaleClothingStateSelect) {
        storyMaleClothingStateSelect.innerHTML = '<option value="">通常</option>';
        Object.keys(storyPromptState.setsData.clothingState).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            storyMaleClothingStateSelect.appendChild(option);
        });
        console.log(`✅ 共通設定男性服装状態ドロップダウン: ${Object.keys(storyPromptState.setsData.clothingState).length}セット`);
    }
    
    // 個別設定の男性服装状態ドロップダウン（体カテゴリの「服装状態」グループから取得）
    const sceneMaleClothingStateSelect = document.getElementById('sceneMaleClothingStateSelect');
    if (sceneMaleClothingStateSelect) {
        sceneMaleClothingStateSelect.innerHTML = '<option value="">通常</option>';
        Object.keys(storyPromptState.setsData.clothingState).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            sceneMaleClothingStateSelect.appendChild(option);
        });
        console.log(`✅ 個別設定男性服装状態ドロップダウン: ${Object.keys(storyPromptState.setsData.clothingState).length}セット`);
    }
}

function isUnderwearRelatedState(clothingStateName) {
    if (!clothingStateName) return false;
    const clothingStateSet = storyPromptState.setsData.clothingState[clothingStateName];
    if (!clothingStateSet) return false;

    // セット名に下着関連キーワードが含まれるか
    const keywords = ['下着', 'ブラ', 'パンツ', 'ランジェリー', 'ネグリジェ', '脱ぎかけ', '脱ぎ', 'bra', 'panties', 'underwear', 'lingerie'];
    if (keywords.some(keyword => clothingStateName.includes(keyword))) {
        return true;
    }

    // タグに下着関連タグが含まれるか
    if (clothingStateSet.tags) {
        const underwearTags = ['underwear', 'bra', 'panties', 'lingerie', 'bra pull', 'panty pull', 'bra_visible', 'panty_visible'];
        if (clothingStateSet.tags.some(tag => {
            const lowerTag = String(tag || '').toLowerCase();
            return underwearTags.some(ut => lowerTag.includes(ut));
        })) {
            return true;
        }
    }

    return false;
}

function setupStoryEventListeners() {
    // 共通設定の変更
    ['storyFaceSelect', 'storyBodySelect', 'storyBackgroundSelect', 'storyClothingSelect'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.addEventListener('change', updateStoryPromptPreview);
    });
    
    // 共通設定の男性服装状態変更時の処理
    const storyMaleClothingStateSelect = document.getElementById('storyMaleClothingStateSelect');
    if (storyMaleClothingStateSelect) {
        storyMaleClothingStateSelect.addEventListener('change', () => {
            storyPromptState.globalSettings.maleClothingState = storyMaleClothingStateSelect.value || '';
            updateStoryPromptPreview();
        });
    }
    
    // 竿役男性選択時の処理
    const storyMaleCharacterSelect = document.getElementById('storyMaleCharacterSelect');
    if (storyMaleCharacterSelect) {
        storyMaleCharacterSelect.addEventListener('change', () => {
            const maleCharacterSet = storyMaleCharacterSelect.value;
            storyPromptState.globalSettings.maleCharacterSet = maleCharacterSet;
            
            // 男性が選択されている場合のみ男性服装状態エリアを表示
            const maleClothingStateArea = document.getElementById('storyMaleClothingStateArea');
            if (maleClothingStateArea) {
                maleClothingStateArea.style.display = maleCharacterSet ? 'block' : 'none';
            }
            
            updateStoryPromptPreview();
        });
    }
    
    // ポーズグループ変更
    const groupSelect = document.getElementById('storyPoseGroupSelect');
    if (groupSelect) {
        groupSelect.addEventListener('change', () => {
            updatePoseSections();
        });
    }
    
    // ポーズセクション変更
    const sectionSelect = document.getElementById('storyPoseSectionSelect');
    if (sectionSelect) {
        sectionSelect.addEventListener('change', () => {
            renderPoseCards();
        });
    }
    
        // 個別設定の変更
    ['sceneBackgroundSelect', 'sceneExpressionSelect', 'sceneClothingSelect', 'sceneClothingStateSelect', 'sceneUnderwearSelect', 'sceneMaleCharacterSelect', 'sceneMaleClothingStateSelect'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.addEventListener('change', () => {
            updateCurrentSceneIndividualSettings();
            updateStoryPromptPreview();
        });
    });

    // 服装状態変更時の下着セット表示制御
    const sceneClothingStateSelect = document.getElementById('sceneClothingStateSelect');
    if (sceneClothingStateSelect) {
        sceneClothingStateSelect.addEventListener('change', () => {
            const clothingState = sceneClothingStateSelect.value;
            const underwearArea = document.getElementById('sceneUnderwearArea');
            if (underwearArea) {
                const shouldShow = isUnderwearRelatedState(clothingState);
                underwearArea.style.display = shouldShow ? 'block' : 'none';
                if (!shouldShow) {
                    // 下着セット選択をリセット
                    const sceneUnderwearSelect = document.getElementById('sceneUnderwearSelect');
                    if (sceneUnderwearSelect) sceneUnderwearSelect.value = '';
                    // 設定も更新
                    updateCurrentSceneIndividualSettings();
                }
            }
        });
    }
    
    // ストーリーメモの変更
    const sceneStoryMemoInput = document.getElementById('sceneStoryMemoInput');
    if (sceneStoryMemoInput) {
        sceneStoryMemoInput.addEventListener('input', () => {
            updateCurrentSceneIndividualSettings();
        });
    }
    
    // 個別設定の男性キャラクター選択時の処理
    const sceneMaleCharacterSelect = document.getElementById('sceneMaleCharacterSelect');
    if (sceneMaleCharacterSelect) {
        sceneMaleCharacterSelect.addEventListener('change', () => {
            const maleCharacterSet = sceneMaleCharacterSelect.value;
            const sceneMaleClothingStateArea = document.getElementById('sceneMaleClothingStateArea');
            
            // 個別設定で男性が選択されている場合のみ男性服装状態エリアを表示
            if (sceneMaleClothingStateArea) {
                sceneMaleClothingStateArea.style.display = (maleCharacterSet && maleCharacterSet !== 'none') ? 'block' : 'none';
            }
            
            updateCurrentSceneIndividualSettings();
            updateStoryPromptPreview();
        });
    }
    
    // 初期化
    updatePoseSections();
}

function updatePoseSections() {
    const groupSelect = document.getElementById('storyPoseGroupSelect');
    const sectionSelect = document.getElementById('storyPoseSectionSelect');
    if (!groupSelect || !sectionSelect) return;
    
    const selectedGroup = groupSelect.value;
    sectionSelect.innerHTML = '<option value="">選択...</option>';
    
    if (storyPromptState.setsData.pose.groups[selectedGroup]) {
        const sections = storyPromptState.setsData.pose.groups[selectedGroup].sections || {};
        Object.keys(sections).forEach(sectionName => {
            const option = document.createElement('option');
            option.value = sectionName;
            option.textContent = sectionName;
            sectionSelect.appendChild(option);
        });
    }
}

function renderPoseCards() {
    console.log('🎴 ポーズカード描画開始');
    const cardsArea = document.getElementById('storyPoseCardsArea');
    if (!cardsArea) {
        console.error('❌ カード表示エリアが見つかりません');
        return;
    }
    
    const groupSelect = document.getElementById('storyPoseGroupSelect');
    const sectionSelect = document.getElementById('storyPoseSectionSelect');
    
    if (!groupSelect || !sectionSelect) {
        console.error('❌ グループ/セクション選択が見つかりません');
        return;
    }
    
    const selectedGroup = groupSelect.value;
    const selectedSection = sectionSelect.value;
    
    console.log('📂 選択中:', { selectedGroup, selectedSection });
    
    if (!selectedSection) {
        cardsArea.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">ポーズセクションを選択してください</div>';
        return;
    }
    
    const poses = storyPromptState.setsData.pose.groups[selectedGroup]?.sections[selectedSection] || {};
    
    console.log('🎭 ポーズ数:', Object.keys(poses).length);
    console.log('📦 ポーズデータサンプル:', Object.entries(poses).slice(0, 1));
    
    if (Object.keys(poses).length === 0) {
        cardsArea.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">このセクションにはポーズがありません</div>';
        return;
    }
    
    cardsArea.innerHTML = '';
    
    Object.entries(poses).forEach(([poseName, poseData]) => {
        const card = document.createElement('div');
        card.style.cssText = 'border: 3px solid #e0e0e0; border-radius: 12px; padding: 12px; cursor: pointer; background: white; transition: all 0.3s; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
        card.onmouseenter = () => {
            card.style.borderColor = '#667eea';
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
        };
        card.onmouseleave = () => {
            card.style.borderColor = '#e0e0e0';
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        };
        
        // サムネイル
        const img = document.createElement('img');
        
        if (poseData.image) {
            // 画像パスを構築（2つの形式に対応）
            let imagePath;
            const baseDir = 'C:/Claude Code/tool/prompt-classifier-v3/data/sets/images';
            
            if (poseData.image.includes('/') || poseData.image.includes('\\')) {
                // 新形式: pose/default/日常グラビアポーズ/___________1762656355317.jpg
                // → data/sets/images/pose/default/日常グラビアポーズ/___________1762656355317.jpg
                imagePath = `${baseDir}/${poseData.image}`.replace(/\\/g, '/');
            } else {
                // 旧形式: img_xxx.jpg
                // → data/sets/images/thumbnails/img_xxx.jpg
                imagePath = `${baseDir}/thumbnails/${poseData.image}`;
            }
            
            const fullPath = `file:///${imagePath}`.replace(/\\/g, '/');
            console.log(`🖼️ [${poseName}] パス: ${fullPath}`);
            img.src = fullPath;
        } else {
            console.log(`⚠️ [${poseName}] 画像なし`);
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="140"><rect width="150" height="140" fill="%23f5f7fa"/><text x="75" y="60" text-anchor="middle" fill="%23999" font-size="12" font-weight="bold">No Image</text><text x="75" y="80" text-anchor="middle" fill="%23bbb" font-size="10">' + encodeURIComponent(poseName.substring(0, 20)) + '</text></svg>';
        }
        
        img.style.cssText = 'width: 100%; height: 140px; object-fit: cover; border-radius: 8px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);';
        
        img.onerror = () => {
            console.error(`❌ [${poseName}] 画像読み込み失敗: ${poseData.image}`);
            // エラー時はポーズ名を表示
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="140"><rect width="150" height="140" fill="%23ffe0e0"/><text x="75" y="60" text-anchor="middle" fill="%23d63031" font-size="12" font-weight="bold">画像なし</text><text x="75" y="80" text-anchor="middle" fill="%23999" font-size="10">' + encodeURIComponent(poseName.substring(0, 20)) + '</text></svg>';
        };
        
        img.onload = () => {
            console.log(`✅ [${poseName}] 読み込み成功`);
        };
        
        card.appendChild(img);
        
        // タイトル
        const title = document.createElement('div');
        title.textContent = poseName;
        title.style.cssText = 'margin-top: 10px; font-size: 13px; font-weight: bold; text-align: center; color: #2d3436; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 5px; background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); border-radius: 6px;';
        card.appendChild(title);
        
        // クリックイベント
        card.onclick = () => {
            addScene(poseName, poseData);
        };
        
        cardsArea.appendChild(card);
    });
}

function addScene(poseName, poseData) {
    console.log('🎬 シーン追加:', poseName, poseData);
    const sceneId = Date.now();
    
    // 複数人女性モードの場合、共通設定をコピーして個別設定を初期化
    let multiGirlSettings = [];
    if (storyPromptState.globalSettings.multiGirlMode && storyPromptState.globalSettings.multiGirlFaces.length > 0) {
        multiGirlSettings = storyPromptState.globalSettings.multiGirlFaces.map(girl => ({
            faceSet: girl.faceSet || '',
            clothing: girl.clothing || '',
            pose: girl.pose || '',
            clothingState: girl.clothingState || '',
            expression: girl.expression || ''
        }));
    }
    
    // ページ番号を自動設定（既存シーンの最大ページ番号+1、なければ1）
    const existingScenes = storyPromptState.selectedScenes.filter(s => s.type !== 'divider');
    const maxPageNumber = existingScenes.length > 0 
        ? Math.max(...existingScenes.map(s => s.pageNumber || 0))
        : 0;
    const pageNumber = maxPageNumber + 1;
    
    storyPromptState.selectedScenes.push({
        id: sceneId,
        poseName,
        poseData,
        pageNumber: pageNumber, // ページ番号を追加
        storyMemo: '', // ストーリーメモ（参考用）
        individual: {
            background: '',
            expression: '',
            clothing: '',
            clothingState: '', // 空文字列は「通常」を意味する
            maleCharacterSet: '', // 空文字列は「共通設定を使用」を意味する
            maleClothingState: '', // 空文字列は「通常」を意味する
            multiGirlSettings: multiGirlSettings // 複数人女性モードの場合の各女性ごとの個別設定
        }
    });
    
    console.log('📋 現在のシーン数:', storyPromptState.selectedScenes.length);
    renderScenesList();
    selectScene(sceneId);
    updateStoryPromptPreview();
}

function renderScenesList() {
    const listArea = document.getElementById('storyScenesListArea');
    if (!listArea) return;
    
    if (storyPromptState.selectedScenes.length === 0) {
        listArea.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">ポーズを選択してください</div>';
        return;
    }
    
    listArea.innerHTML = '';
    
    let sceneIndex = 0; // 実際のシーン番号（区切り文字はカウントしない）
    
    storyPromptState.selectedScenes.forEach((scene, index) => {
        // 区切り文字の場合
        if (scene.type === 'divider') {
            const dividerCard = document.createElement('div');
            dividerCard.style.cssText = 'padding: 12px; margin-bottom: 10px; background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%); border-radius: 8px; border: 2px solid #6c5ce7; cursor: pointer; box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);';
            
            dividerCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 5px;">
                    <strong style="flex: 1; color: white; font-size: 16px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">📌 ${scene.dividerText || '【区切り】'}</strong>
                    <div style="display: flex; gap: 3px;">
                        <button onclick="editSceneDivider(${scene.id}); event.stopPropagation();" style="background: rgba(255,255,255,0.3); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="編集">✏️</button>
                        <button onclick="moveSceneUp(${scene.id}); event.stopPropagation();" ${index === 0 ? 'disabled' : ''} style="background: rgba(255,255,255,0.3); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="上へ">↑</button>
                        <button onclick="moveSceneDown(${scene.id}); event.stopPropagation();" ${index === storyPromptState.selectedScenes.length - 1 ? 'disabled' : ''} style="background: rgba(255,255,255,0.3); color: white; border: 1px solid rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="下へ">↓</button>
                        <button onclick="removeScene(${scene.id}); event.stopPropagation();" style="background: rgba(220, 53, 69, 0.8); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
                    </div>
                </div>
            `;
            
            dividerCard.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    editSceneDivider(scene.id);
                }
            };
            
            listArea.appendChild(dividerCard);
        } else {
            // 通常のシーン
            sceneIndex++;
            const sceneCard = document.createElement('div');
            sceneCard.style.cssText = 'padding: 10px; margin-bottom: 8px; background: white; border-radius: 6px; border: 2px solid #ddd; cursor: pointer;';
            
            if (scene.id === storyPromptState.currentSceneId) {
                sceneCard.style.borderColor = '#ffc107';
                sceneCard.style.background = '#fff3cd';
            }
            
            // ストーリーメモを表示（最大50文字で切り詰め）
            const storyMemoDisplay = scene.storyMemo ? (scene.storyMemo.length > 50 ? scene.storyMemo.substring(0, 50) + '...' : scene.storyMemo) : '';
            
            sceneCard.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 5px;">
                        <strong style="flex: 1;">シーン${sceneIndex}: ${scene.poseName}</strong>
                        <div style="display: flex; gap: 3px;">
                            <button onclick="moveSceneUp(${scene.id}); event.stopPropagation();" ${index === 0 ? 'disabled' : ''} style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="上へ">↑</button>
                            <button onclick="moveSceneDown(${scene.id}); event.stopPropagation();" ${index === storyPromptState.selectedScenes.length - 1 ? 'disabled' : ''} style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;" title="下へ">↓</button>
                            <button onclick="removeScene(${scene.id}); event.stopPropagation();" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
                        </div>
                    </div>
                    ${storyMemoDisplay ? `<div style="font-size: 11px; color: #666; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; margin-top: 4px;">📝 ${storyMemoDisplay}</div>` : ''}
                </div>
            `;
            
            sceneCard.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    selectScene(scene.id);
                }
            };
            
            listArea.appendChild(sceneCard);
        }
    });
}

function selectScene(sceneId) {
    const scene = storyPromptState.selectedScenes.find(s => s.id === sceneId);
    
    // 区切り文字の場合は選択できない
    if (scene && scene.type === 'divider') {
        return;
    }
    
    storyPromptState.currentSceneId = sceneId;
    
    if (scene) {
        document.getElementById('currentSceneName').textContent = scene.poseName;
        document.getElementById('sceneBackgroundSelect').value = scene.individual.background || '';
        document.getElementById('sceneExpressionSelect').value = scene.individual.expression || '';
        document.getElementById('sceneClothingSelect').value = scene.individual.clothing || '';
        document.getElementById('sceneClothingStateSelect').value = scene.individual.clothingState || '';

        // 下着セット選択を復元
        const sceneUnderwearSelect = document.getElementById('sceneUnderwearSelect');
        const sceneUnderwearArea = document.getElementById('sceneUnderwearArea');
        if (sceneUnderwearSelect) {
            sceneUnderwearSelect.value = scene.individual.underwear || '';

            // 服装状態に応じて下着セットエリアの表示/非表示を制御
            const clothingState = scene.individual.clothingState || '';
            if (sceneUnderwearArea) {
                const shouldShow = isUnderwearRelatedState(clothingState);
                sceneUnderwearArea.style.display = shouldShow ? 'block' : 'none';
            }
        }

        // 個別設定の男性キャラクター
        const sceneMaleCharacterSelect = document.getElementById('sceneMaleCharacterSelect');
        const sceneMaleClothingStateSelect = document.getElementById('sceneMaleClothingStateSelect');
        const sceneMaleClothingStateArea = document.getElementById('sceneMaleClothingStateArea');
        
        if (sceneMaleCharacterSelect) {
            sceneMaleCharacterSelect.value = scene.individual.maleCharacterSet || '';
            
            // 個別設定で男性が選択されている場合のみ男性服装状態エリアを表示
            if (sceneMaleClothingStateArea) {
                const maleCharacterSet = scene.individual.maleCharacterSet || '';
                sceneMaleClothingStateArea.style.display = (maleCharacterSet && maleCharacterSet !== 'none') ? 'block' : 'none';
            }
        }
        
        if (sceneMaleClothingStateSelect) {
            sceneMaleClothingStateSelect.value = scene.individual.maleClothingState || '';
        }
        
        // ストーリーメモを設定
        const sceneStoryMemoInput = document.getElementById('sceneStoryMemoInput');
        if (sceneStoryMemoInput) {
            sceneStoryMemoInput.value = scene.storyMemo || '';
        }
        
        // 複数人女性モードの場合の個別設定UIを表示
        const sceneMultiGirlSettingsArea = document.getElementById('sceneMultiGirlSettingsArea');
        const sceneMultiGirlSettingsContainer = document.getElementById('sceneMultiGirlSettingsContainer');
        
        if (storyPromptState.globalSettings.multiGirlMode && sceneMultiGirlSettingsArea && sceneMultiGirlSettingsContainer) {
            sceneMultiGirlSettingsArea.style.display = 'block';
            renderSceneMultiGirlSettings(scene);
        } else if (sceneMultiGirlSettingsArea) {
            sceneMultiGirlSettingsArea.style.display = 'none';
        }
        
        document.getElementById('storyIndividualSettings').style.display = 'block';
    }
    
    renderScenesList();
}

// シーンごとの複数人女性個別設定UIを描画
function renderSceneMultiGirlSettings(scene) {
    const container = document.getElementById('sceneMultiGirlSettingsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // シーンの個別設定がなければ、共通設定をコピーして初期化
    if (!scene.individual.multiGirlSettings || scene.individual.multiGirlSettings.length === 0) {
        if (storyPromptState.globalSettings.multiGirlFaces.length > 0) {
            scene.individual.multiGirlSettings = storyPromptState.globalSettings.multiGirlFaces.map(girl => ({
                faceSet: girl.faceSet || '',
                clothing: girl.clothing || '',
                pose: girl.pose || '',
                clothingState: girl.clothingState || '',
                expression: girl.expression || ''
            }));
        } else {
            scene.individual.multiGirlSettings = [];
        }
    }
    
    const multiGirlSettings = scene.individual.multiGirlSettings || [];
    
    multiGirlSettings.forEach((girlData, index) => {
        // 女性ごとのカードを作成
        const girlCard = document.createElement('div');
        girlCard.style.cssText = 'padding: 12px; margin-bottom: 12px; background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%); border-radius: 8px; border: 2px solid #dee2e6;';
        
        // ヘッダー（女性番号）
        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 10px;';
        
        const title = document.createElement('h6');
        title.textContent = `👤 女性${index + 1}`;
        title.style.cssText = 'margin: 0; color: #495057; font-size: 14px; font-weight: bold;';
        
        header.appendChild(title);
        girlCard.appendChild(header);
        
        // 各設定のドロップダウン
        const settingsGrid = document.createElement('div');
        settingsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 8px;';
        
        // 1. 服装
        const clothingRow = createSceneSelectRow('👗 服装', `sceneMultiGirlClothing${scene.id}_${index}`, 
            Object.keys(storyPromptState.setsData.clothing), 
            girlData.clothing || '',
            (value) => {
                girlData.clothing = value;
                updateCurrentSceneIndividualSettings();
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(clothingRow);
        
        // 2. ポーズ（ポーズセットから選択）
        const poseOptions = [];
        if (storyPromptState.setsData.pose && storyPromptState.setsData.pose.groups) {
            Object.values(storyPromptState.setsData.pose.groups).forEach(group => {
                if (group.sections) {
                    Object.values(group.sections).forEach(section => {
                        Object.keys(section).forEach(poseName => {
                            poseOptions.push(poseName);
                        });
                    });
                }
            });
        }
        const poseRow = createSceneSelectRow('🤸 ポーズ', `sceneMultiGirlPose${scene.id}_${index}`, 
            poseOptions, 
            girlData.pose || '',
            (value) => {
                girlData.pose = value;
                updateCurrentSceneIndividualSettings();
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(poseRow);
        
        // 3. 服装状態
        const clothingStateRow = createSceneSelectRow('👔 服装状態', `sceneMultiGirlClothingState${scene.id}_${index}`, 
            Object.keys(storyPromptState.setsData.clothingState), 
            girlData.clothingState || '',
            (value) => {
                girlData.clothingState = value;
                updateCurrentSceneIndividualSettings();
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(clothingStateRow);
        
        // 4. 表情
        const expressionRow = createSceneSelectRow('😊 表情', `sceneMultiGirlExpression${scene.id}_${index}`, 
            Object.keys(storyPromptState.setsData.expression), 
            girlData.expression || '',
            (value) => {
                girlData.expression = value;
                updateCurrentSceneIndividualSettings();
                updateStoryPromptPreview();
            });
        settingsGrid.appendChild(expressionRow);
        
        girlCard.appendChild(settingsGrid);
        container.appendChild(girlCard);
    });
}

// シーン個別設定用の選択行を作成するヘルパー関数
function createSceneSelectRow(labelText, selectId, options, currentValue, onChange) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.cssText = 'font-size: 12px; font-weight: bold; color: #495057;';
    
    const select = document.createElement('select');
    select.id = selectId;
    select.style.cssText = 'width: 100%; padding: 6px; border: 2px solid #dee2e6; border-radius: 5px; font-size: 12px; background: white;';
    select.innerHTML = '<option value="">共通設定を使用</option>';
    
    options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        if (optionValue === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    select.addEventListener('change', () => {
        onChange(select.value);
    });
    
    row.appendChild(label);
    row.appendChild(select);
    return row;
}

function removeScene(sceneId) {
    storyPromptState.selectedScenes = storyPromptState.selectedScenes.filter(s => s.id !== sceneId);
    if (storyPromptState.currentSceneId === sceneId) {
        storyPromptState.currentSceneId = null;
        document.getElementById('storyIndividualSettings').style.display = 'none';
    }
    renderScenesList();
    updateStoryPromptPreview();
}

function moveSceneUp(sceneId) {
    const index = storyPromptState.selectedScenes.findIndex(s => s.id === sceneId);
    if (index > 0) {
        [storyPromptState.selectedScenes[index - 1], storyPromptState.selectedScenes[index]] = 
        [storyPromptState.selectedScenes[index], storyPromptState.selectedScenes[index - 1]];
        renderScenesList();
        updateStoryPromptPreview();
    }
}

function moveSceneDown(sceneId) {
    const index = storyPromptState.selectedScenes.findIndex(s => s.id === sceneId);
    if (index < storyPromptState.selectedScenes.length - 1) {
        [storyPromptState.selectedScenes[index], storyPromptState.selectedScenes[index + 1]] = 
        [storyPromptState.selectedScenes[index + 1], storyPromptState.selectedScenes[index]];
        renderScenesList();
        updateStoryPromptPreview();
    }
}

// 区切り文字を追加
function addSceneDivider() {
    // テンプレート選択モーダルを表示
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';
    
    let templateOptions = '';
    storyPromptState.dividerTemplates.forEach((template, index) => {
        templateOptions += `<button onclick="selectDividerTemplate('${template.replace(/'/g, "\\'")}'); event.stopPropagation();" style="width: 100%; padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; text-align: left;">${template}</button>`;
    });
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">📌 区切り文字を選択</h3>
            <div style="margin-bottom: 20px;">
                ${templateOptions}
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 2px solid #dfe6e9; padding-top: 20px;">
                <button onclick="manageDividerTemplates(); event.stopPropagation();" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">📝 管理</button>
                <button onclick="editSceneDividerNew(); event.stopPropagation();" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">✏️ 新規作成</button>
                <button onclick="document.getElementById('selectDividerModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
            </div>
        </div>
    `;
    modal.id = 'selectDividerModal';
    document.body.appendChild(modal);
}

function selectDividerTemplate(templateText) {
    const dividerId = Date.now();
    const divider = {
        id: dividerId,
        type: 'divider',
        dividerText: templateText
    };
    
    storyPromptState.selectedScenes.push(divider);
    document.getElementById('selectDividerModal').remove();
    renderScenesList();
    updateStoryPromptPreview();
}

function editSceneDividerNew() {
    document.getElementById('selectDividerModal').remove();
    const dividerId = Date.now();
    const divider = {
        id: dividerId,
        type: 'divider',
        dividerText: '【新規区切り】'
    };
    
    storyPromptState.selectedScenes.push(divider);
    renderScenesList();
    updateStoryPromptPreview();
    
    setTimeout(() => editSceneDivider(dividerId), 100);
}

// 区切り文字テンプレートの管理
function manageDividerTemplates() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30001; display: flex; align-items: center; justify-content: center;';
    
    let templateList = '';
    storyPromptState.dividerTemplates.forEach((template, index) => {
        templateList += `
            <div style="display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                <span style="flex: 1; font-size: 14px; font-weight: bold;">${template}</span>
                <button onclick="editDividerTemplate(${index}); event.stopPropagation();" style="padding: 6px 12px; background: #0984e3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">編集</button>
                <button onclick="deleteDividerTemplate(${index}); event.stopPropagation();" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">削除</button>
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">📝 区切り文字テンプレート管理</h3>
            <div style="margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
                ${templateList || '<div style="text-align: center; color: #999; padding: 20px;">テンプレートがありません</div>'}
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 2px solid #dfe6e9; padding-top: 20px;">
                <button onclick="addNewDividerTemplate(); event.stopPropagation();" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">➕ 追加</button>
                <button onclick="document.getElementById('manageDividerModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">閉じる</button>
            </div>
        </div>
    `;
    modal.id = 'manageDividerModal';
    document.body.appendChild(modal);
}

function addNewDividerTemplate() {
    const text = prompt('新しい区切り文字テンプレートを入力してください:', '【新規】');
    if (text && text.trim()) {
        storyPromptState.dividerTemplates.push(text.trim());
        saveDividerTemplates();
        document.getElementById('manageDividerModal').remove();
        manageDividerTemplates(); // 再表示
    }
}

function editDividerTemplate(index) {
    const currentText = storyPromptState.dividerTemplates[index];
    const newText = prompt('区切り文字テンプレートを編集してください:', currentText);
    if (newText && newText.trim()) {
        storyPromptState.dividerTemplates[index] = newText.trim();
        saveDividerTemplates();
        document.getElementById('manageDividerModal').remove();
        manageDividerTemplates(); // 再表示
    }
}

function deleteDividerTemplate(index) {
    if (confirm(`「${storyPromptState.dividerTemplates[index]}」を削除しますか？`)) {
        storyPromptState.dividerTemplates.splice(index, 1);
        saveDividerTemplates();
        document.getElementById('manageDividerModal').remove();
        manageDividerTemplates(); // 再表示
    }
}

// 区切り文字を編集
function editSceneDivider(dividerId) {
    const divider = storyPromptState.selectedScenes.find(s => s.id === dividerId && s.type === 'divider');
    if (!divider) return;
    
    // カスタム入力モーダルを作成
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">📌 区切り文字を編集</h3>
            <input type="text" id="dividerTextInput" value="${divider.dividerText || ''}" placeholder="例: 【通常パート】、【本番】、【前戯】" style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 15px;">
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; cursor: pointer;">
                <input type="checkbox" id="saveToTemplateCheckbox" style="width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 14px; color: #2d3436;">テンプレートにも保存する</span>
            </label>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="document.getElementById('editDividerModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
                <button onclick="confirmEditDivider(${dividerId})" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">保存</button>
            </div>
        </div>
    `;
    modal.id = 'editDividerModal';
    document.body.appendChild(modal);
    
    // 入力欄にフォーカス
    setTimeout(() => {
        const input = document.getElementById('dividerTextInput');
        input.focus();
        input.select();
    }, 100);
}

function confirmEditDivider(dividerId) {
    const input = document.getElementById('dividerTextInput');
    const checkbox = document.getElementById('saveToTemplateCheckbox');
    const dividerText = input.value.trim() || '【区切り】';
    const saveToTemplate = checkbox ? checkbox.checked : false;
    
    const divider = storyPromptState.selectedScenes.find(s => s.id === dividerId && s.type === 'divider');
    if (divider) {
        divider.dividerText = dividerText;
    }
    
    // テンプレートに保存する場合
    if (saveToTemplate && dividerText && !storyPromptState.dividerTemplates.includes(dividerText)) {
        storyPromptState.dividerTemplates.push(dividerText);
        saveDividerTemplates();
    }
    
    document.getElementById('editDividerModal').remove();
    renderScenesList();
    updateStoryPromptPreview();
}

// ========================================
// AIストーリー生成機能
// ========================================

function showAIStoryGenerator() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">🤖 AIストーリー生成</h3>
            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">自然言語でエロシーンの流れを指示してください。AIが適切なポーズと区切りを自動選択します。</p>

            <!-- テンプレート管理UI -->
            <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                <label style="font-size: 13px; font-weight: bold; color: #2d3436; display: block; margin-bottom: 8px;">📋 指示テンプレート</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select id="storyInstructionTemplateSelect" style="flex: 1; padding: 8px; font-size: 13px; border: 2px solid #dfe6e9; border-radius: 6px; background: white;">
                        <option value="">-- テンプレートを選択 --</option>
                    </select>
                    <button onclick="loadSelectedTemplate()" style="padding: 8px 16px; background: #0984e3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; white-space: nowrap;">読込</button>
                    <button onclick="saveCurrentAsTemplate()" style="padding: 8px 16px; background: #00b894; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; white-space: nowrap;">保存</button>
                    <button onclick="deleteSelectedTemplate()" style="padding: 8px 16px; background: #d63031; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; white-space: nowrap;">削除</button>
                </div>
            </div>

            <div style="margin-bottom: 10px;">
                <label style="font-size: 13px; font-weight: bold; color: #2d3436; display: block; margin-bottom: 5px;">📝 ストーリー指示</label>
                <textarea id="aiStoryPromptInput" placeholder="例：学校で制服を着た女の子が座っているシーンから始めて、その後エロシーンに移行する物語を作って。前戯から本番まで自然な流れで。&#10;&#10;ページ数も指定できます：例「全8ページで」「10ページ程度で」など" style="width: 100%; min-height: 120px; padding: 12px; font-size: 14px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 10px; font-family: inherit; resize: vertical;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="font-size: 13px; font-weight: bold; color: #2d3436; display: block; margin-bottom: 5px;">📄 ページ数（オプション）</label>
                <input type="number" id="aiStoryPageCountInput" min="1" placeholder="例: 8（空欄の場合は自動）" style="width: 100%; padding: 8px; font-size: 13px; border: 2px solid #dfe6e9; border-radius: 6px; background: white;">
                <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">※ 指定しない場合は、ストーリーの流れに応じて自動でページ数を決定します</p>
            </div>
            <div style="margin-bottom: 15px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: white; font-weight: bold;">
                    <input type="checkbox" id="aiStoryAutoModeCheckbox" style="width: 18px; height: 18px; cursor: pointer;">
                    <span>🤖 お任せモード（トレンド分析）</span>
                </label>
                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 11px; line-height: 1.4;">
                    ✓ FANZA同人エロ漫画の現在のトレンドを分析<br>
                    ✓ 売上ランキング上位のパターンを参考<br>
                    ✓ 人気ジャンル・シチュエーションを自動選択<br>
                    ✓ ストーリー指示が空欄でも生成可能
                </p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 2px solid #dfe6e9; padding-top: 20px;">
                <button onclick="document.getElementById('aiStoryGeneratorModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
                <button onclick="generateStoryWithAI()" style="padding: 10px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">生成</button>
            </div>
        </div>
    `;
    modal.id = 'aiStoryGeneratorModal';
    document.body.appendChild(modal);

    // テンプレートをロード
    loadStoryInstructionTemplates();

    // テキストエリアにフォーカス
    setTimeout(() => {
        const input = document.getElementById('aiStoryPromptInput');
        if (input) input.focus();
    }, 100);
}

// ストーリー指示テンプレート管理
let storyInstructionTemplates = [];

async function loadStoryInstructionTemplates() {
    try {
        const result = await window.electronAPI.loadStoryInstructionTemplates();
        if (result.success) {
            storyInstructionTemplates = result.templates || [];
            console.log('✅ ストーリー指示テンプレート読み込み成功:', storyInstructionTemplates.length, '件');

            // ドロップダウンに反映
            const select = document.getElementById('storyInstructionTemplateSelect');
            if (select) {
                select.innerHTML = '<option value="">-- テンプレートを選択 --</option>';
                storyInstructionTemplates.forEach((template, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = template.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('❌ ストーリー指示テンプレート読み込みエラー:', error);
    }
}

function loadSelectedTemplate() {
    const select = document.getElementById('storyInstructionTemplateSelect');
    const index = parseInt(select.value);

    if (isNaN(index) || index < 0 || index >= storyInstructionTemplates.length) {
        showCustomAlert('テンプレートを選択してください。');
        return;
    }

    const template = storyInstructionTemplates[index];

    // 入力欄に反映
    const promptInput = document.getElementById('aiStoryPromptInput');
    const pageCountInput = document.getElementById('aiStoryPageCountInput');
    const autoModeCheckbox = document.getElementById('aiStoryAutoModeCheckbox');

    if (promptInput) promptInput.value = template.instruction || '';
    if (pageCountInput && template.pageCount) pageCountInput.value = template.pageCount;
    if (autoModeCheckbox) autoModeCheckbox.checked = template.autoMode || false;

    console.log('✅ テンプレート読み込み:', template.name);
}

function saveCurrentAsTemplate() {
    const promptInput = document.getElementById('aiStoryPromptInput');
    const pageCountInput = document.getElementById('aiStoryPageCountInput');
    const autoModeCheckbox = document.getElementById('aiStoryAutoModeCheckbox');

    const instruction = promptInput ? promptInput.value.trim() : '';
    if (!instruction) {
        showCustomAlert('ストーリー指示を入力してください。');
        return;
    }

    // テンプレート名入力ダイアログを表示
    showTemplateNameDialog((templateName) => {
        if (!templateName || !templateName.trim()) {
            return;
        }

        const newTemplate = {
            id: Date.now().toString(),
            name: templateName.trim(),
            instruction: instruction,
            pageCount: pageCountInput && pageCountInput.value ? parseInt(pageCountInput.value) : null,
            autoMode: autoModeCheckbox ? autoModeCheckbox.checked : false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        storyInstructionTemplates.push(newTemplate);

        window.electronAPI.saveStoryInstructionTemplates(storyInstructionTemplates)
            .then(result => {
                if (result.success) {
                    console.log('✅ テンプレート保存成功:', newTemplate.name);
                    showCustomAlert(`テンプレート「${newTemplate.name}」を保存しました。`);
                    loadStoryInstructionTemplates(); // ドロップダウンを更新
                }
            })
            .catch(error => {
                console.error('❌ テンプレート保存エラー:', error);
                showCustomAlert('テンプレートの保存に失敗しました。');
            });
    });
}

function deleteSelectedTemplate() {
    const select = document.getElementById('storyInstructionTemplateSelect');
    const index = parseInt(select.value);

    if (isNaN(index) || index < 0 || index >= storyInstructionTemplates.length) {
        showCustomAlert('削除するテンプレートを選択してください。');
        return;
    }

    const template = storyInstructionTemplates[index];

    // 確認ダイアログを表示
    showCustomConfirm(`テンプレート「${template.name}」を削除しますか？`, (confirmed) => {
        if (!confirmed) {
            return;
        }

        storyInstructionTemplates.splice(index, 1);

        window.electronAPI.saveStoryInstructionTemplates(storyInstructionTemplates)
            .then(result => {
                if (result.success) {
                    console.log('✅ テンプレート削除成功:', template.name);
                    showCustomAlert(`テンプレート「${template.name}」を削除しました。`);
                    loadStoryInstructionTemplates(); // ドロップダウンを更新
                }
            })
            .catch(error => {
                console.error('❌ テンプレート削除エラー:', error);
                showCustomAlert('テンプレートの削除に失敗しました。');
            });
    });
}

// カスタムダイアログ関数
function showTemplateNameDialog(callback) {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 40000; display: flex; align-items: center; justify-content: center;';

    dialog.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 15px 0; color: #2d3436;">📋 テンプレート名を入力</h3>
            <input type="text" id="templateNameInput" placeholder="例: 学校エロシーン8ページ" style="width: 100%; padding: 10px; font-size: 14px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="templateNameCancel" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
                <button id="templateNameOK" style="padding: 10px 20px; background: #00b894; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">保存</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const input = document.getElementById('templateNameInput');
    const okBtn = document.getElementById('templateNameOK');
    const cancelBtn = document.getElementById('templateNameCancel');

    input.focus();

    okBtn.onclick = () => {
        const value = input.value;
        dialog.remove();
        callback(value);
    };

    cancelBtn.onclick = () => {
        dialog.remove();
        callback(null);
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            okBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });
}

function showCustomConfirm(message, callback) {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 40000; display: flex; align-items: center; justify-content: center;';

    dialog.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 15px 0; color: #2d3436;">❓ 確認</h3>
            <p style="margin: 0 0 20px 0; color: #636e72; font-size: 14px;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="confirmCancel" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
                <button id="confirmOK" style="padding: 10px 20px; background: #d63031; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">削除</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const okBtn = document.getElementById('confirmOK');
    const cancelBtn = document.getElementById('confirmCancel');

    okBtn.onclick = () => {
        dialog.remove();
        callback(true);
    };

    cancelBtn.onclick = () => {
        dialog.remove();
        callback(false);
    };
}

function showCustomAlert(message) {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 40000; display: flex; align-items: center; justify-content: center;';

    dialog.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 15px 0; color: #2d3436;">ℹ️ お知らせ</h3>
            <p style="margin: 0 0 20px 0; color: #636e72; font-size: 14px;">${message}</p>
            <div style="display: flex; justify-content: flex-end;">
                <button id="alertOK" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">OK</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const okBtn = document.getElementById('alertOK');
    okBtn.onclick = () => {
        dialog.remove();
    };

    okBtn.focus();
}

function showSNSPostGenerator() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">📱 SNS投稿用AI生成</h3>
            <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">SNS投稿用の単発イラストをAIが自動生成します。ポーズ、表情、服装、背景、服装状態などを自動で考えてくれます。</p>
            
            <div style="margin-bottom: 15px;">
                <label style="font-size: 13px; font-weight: bold; color: #2d3436; display: block; margin-bottom: 5px;">📱 SNSプラットフォーム</label>
                <select id="snsPlatformSelect" style="width: 100%; padding: 8px; font-size: 13px; border: 2px solid #dfe6e9; border-radius: 6px; background: white;">
                    <option value="twitter">X（Twitter）</option>
                    <option value="pixiv">Pixiv</option>
                    <option value="patreon">Patreon</option>
                </select>
                <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">※ X（Twitter）はエロ禁止です。下着や水着などの露出程度まで</p>
            </div>
            
            <div style="margin-bottom: 15px; padding: 12px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); border-radius: 8px;">
                <label id="snsR18Label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: white; font-weight: bold; user-select: none;">
                    <input type="checkbox" id="snsR18Checkbox" style="width: 18px; height: 18px; cursor: pointer; pointer-events: auto;">
                    <span>🔞 18禁指定あり</span>
                </label>
                <p id="snsR18Description" style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 11px; line-height: 1.4;">
                    ✓ Pixiv/Patreonで18禁指定ありの場合、全裸・乳首・マンコ可<br>
                    ✓ 18禁指定なしの場合は、下着・水着程度まで<br>
                    ✓ X（Twitter）では18禁指定は無効（下着・水着程度まで）
                </p>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="font-size: 13px; font-weight: bold; color: #2d3436; display: block; margin-bottom: 5px;">📝 追加指示（オプション）</label>
                <textarea id="snsPostPromptInput" placeholder="例：学校の制服を着た女の子、水着で海辺、メイド服でお茶会、など" style="width: 100%; min-height: 100px; padding: 12px; font-size: 14px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 10px; font-family: inherit; resize: vertical;"></textarea>
                <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">※ 空欄でも生成可能です。共通設定を使用して自動生成されます</p>
            </div>
            
            <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 2px solid #dee2e6;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #2d3436; font-weight: bold;">
                    <input type="checkbox" id="snsUseCommonSettingsCheckbox" checked style="width: 18px; height: 18px; cursor: pointer;">
                    <span>⚙️ 共通設定を使用</span>
                </label>
                <p style="margin: 8px 0 0 0; color: #666; font-size: 11px; line-height: 1.4;">
                    現在の共通設定（女性の顔、体、背景、服装、竿役男性）をそのまま使用します
                </p>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 2px solid #dfe6e9; padding-top: 20px;">
                <button onclick="document.getElementById('snsPostGeneratorModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
                <button onclick="generateSNSPostWithAI()" style="padding: 10px 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">生成</button>
            </div>
        </div>
    `;
    modal.id = 'snsPostGeneratorModal';
    document.body.appendChild(modal);
    
    // DOM要素が確実に存在するまで少し待つ
    setTimeout(() => {
        // SNSプラットフォーム変更時に18禁指定の説明を更新
        const snsPlatformSelect = document.getElementById('snsPlatformSelect');
        const r18Checkbox = document.getElementById('snsR18Checkbox');
        const r18Label = document.getElementById('snsR18Label');
        const r18Description = document.getElementById('snsR18Description');
        
        if (!snsPlatformSelect || !r18Checkbox || !r18Description) {
            console.error('SNS投稿用モーダルの要素が見つかりません');
            return;
        }
        
        function updateR18Description() {
            const platform = snsPlatformSelect.value;
            if (platform === 'twitter') {
                r18Description.innerHTML = '✓ X（Twitter）では18禁指定は無効です<br>✓ 下着・水着程度まで（乳首・マンコ不可）';
                r18Checkbox.disabled = true;
                r18Checkbox.checked = false;
                if (r18Label) {
                    r18Label.style.cursor = 'not-allowed';
                    r18Label.style.opacity = '0.6';
                }
            } else {
                r18Description.innerHTML = '✓ Pixiv/Patreonで18禁指定ありの場合、全裸・乳首・マンコ可<br>✓ 18禁指定なしの場合は、下着・水着程度まで';
                r18Checkbox.disabled = false;
                if (r18Label) {
                    r18Label.style.cursor = 'pointer';
                    r18Label.style.opacity = '1';
                }
            }
        }
        
        // チェックボックスのクリックイベントを明示的に有効化
        r18Checkbox.addEventListener('change', function(e) {
            if (this.disabled) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
        
        // labelのクリックイベントも処理
        if (r18Label) {
            r18Label.addEventListener('click', function(e) {
                if (r18Checkbox.disabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            });
        }
        
        snsPlatformSelect.addEventListener('change', updateR18Description);
        updateR18Description();
    }, 50);
    
    // テキストエリアにフォーカス
    setTimeout(() => {
        const input = document.getElementById('snsPostPromptInput');
        if (input) input.focus();
    }, 100);
}

async function generateStoryWithAI() {
    const input = document.getElementById('aiStoryPromptInput');
    const pageCountInput = document.getElementById('aiStoryPageCountInput');
    const autoModeCheckbox = document.getElementById('aiStoryAutoModeCheckbox');
    const userPrompt = input ? input.value.trim() : '';
    const pageCount = pageCountInput && pageCountInput.value ? parseInt(pageCountInput.value, 10) : null;
    const autoMode = autoModeCheckbox ? autoModeCheckbox.checked : false;
    
    // お任せモードの場合は指示が空欄でもOK
    if (!autoMode && !userPrompt) {
        alert('指示を入力してください');
        return;
    }
    
    // お任せモードの場合のプロンプト構築
    let finalPrompt = '';
    if (autoMode) {
        finalPrompt = `【お任せモード：トレンド分析による自動生成】
        
以下の要件に基づいて、既存のポーズセットを組み合わせてストーリーを自動生成してください：

1. 一般的なデータベースサイトで確認できるトレンドを参考にしてください
2. 日間ランキング上位の作品のパターン（ジャンル、シチュエーション、展開、タグなど）を分析して参考にしてください
3. 人気の高いジャンル・シチュエーションを選択してください：
   - ジャンル：学校設定、関係性、複数人、制服、コスプレ、家族関係、複数プレイなど
   - シチュエーション：学校、教室、保健室、会議室、電車内、野外、温泉・銭湯・お風呂など
   - 人気タグ：オーラル、接触、大きい、ラブラブ、耳、手、ASMR、声、制服、学校設定、関係性、自己、など
4. 読者に人気の高い展開パターンを取り入れてください（段階的なエスカレート、クライマックスの盛り上がりなど）
5. **重要：既存のポーズセットから選択するだけです。新しいポーズを作成する必要はありません**

${userPrompt ? `\n【追加指示】\n${userPrompt}` : ''}`;
    } else {
        finalPrompt = userPrompt;
    }
    
    // ページ数が指定されている場合はプロンプトに追加
    if (pageCount && pageCount > 0) {
        finalPrompt += `\n\n【ページ数指定】全${pageCount}ページで構成してください。`;
    }
    
    // モーダルを閉じる
    const modal = document.getElementById('aiStoryGeneratorModal');
    if (modal) modal.remove();
    
    // ローディング表示
    const loadingModal = document.createElement('div');
    loadingModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30001; display: flex; align-items: center; justify-content: center;';
    loadingModal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #2d3436; margin-bottom: 15px;">🤖 AI生成中...</div>
            <div style="color: #666; font-size: 14px;">Gemini AIがストーリーを生成しています</div>
        </div>
    `;
    loadingModal.id = 'aiStoryLoadingModal';
    document.body.appendChild(loadingModal);
    
    try {
        // ポーズセットデータを取得
        const poseSets = storyPromptState.setsData.pose;
        if (!poseSets || !poseSets.groups) {
            throw new Error('ポーズセットデータが読み込まれていません');
        }
        
        console.log('🚀 AIストーリー生成開始:', finalPrompt);
        console.log('📊 ポーズセット数:', Object.keys(poseSets.groups).length);
        if (pageCount) {
            console.log('📄 ページ数指定:', pageCount);
        }
        
        // 個別設定のセットデータを取得（タグ情報も含める）
        const clothingSetsWithTags = {};
        Object.entries(storyPromptState.setsData.clothing || {}).forEach(([name, data]) => {
            clothingSetsWithTags[name] = {
                name: name,
                tags: data.tags || []
            };
        });
        
        const individualSettingsData = {
            background: Object.keys(storyPromptState.setsData.background || {}),
            expression: Object.keys(storyPromptState.setsData.expression || {}),
            clothing: Object.keys(storyPromptState.setsData.clothing || {}),
            clothingWithTags: clothingSetsWithTags, // タグ情報を含む服装セットデータ
            clothingState: Object.keys(storyPromptState.setsData.clothingState || {}),
            maleCharacter: Object.keys(storyPromptState.setsData.maleCharacter || {}),
            // 複数人女性モードの設定を追加
            multiGirlMode: storyPromptState.globalSettings.multiGirlMode,
            multiGirlFaces: storyPromptState.globalSettings.multiGirlFaces.filter(girl => girl && girl.faceSet)
        };
        
        console.log('⚙️ 個別設定オプション:', {
            background: individualSettingsData.background.length,
            expression: individualSettingsData.expression.length,
            clothing: individualSettingsData.clothing.length,
            clothingState: individualSettingsData.clothingState.length,
            maleCharacter: individualSettingsData.maleCharacter.length,
            multiGirlMode: individualSettingsData.multiGirlMode,
            multiGirlFacesCount: individualSettingsData.multiGirlFaces.length
        });
        
        // 🔍 Phase 2: 欠落ポーズ検出開始
        await window.electronAPI.detectMissingPosesStart();
        console.log('🔍 欠落ポーズ検出開始');

        // Gemini AIにストーリー生成を依頼（個別設定データも渡す）
        // リトライ機能：安全フィルターでブロックされた場合、最大3回まで再試行
        let result;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            result = await window.electronAPI.generateStoryWithGemini(finalPrompt, poseSets, individualSettingsData);
            
            if (result.success) {
                break; // 成功したらループを抜ける
            }
            
            // 安全フィルターでブロックされた場合のみリトライ
            const isSafetyError = result.error && (
                result.error.includes('PROHIBITED_CONTENT') ||
                result.error.includes('安全フィルター') ||
                result.error.includes('コンテンツポリシー') ||
                result.error.includes('SAFETY')
            );
            
            if (!isSafetyError || retryCount >= maxRetries - 1) {
                break; // 安全フィルター以外のエラー、または最大リトライ回数に達したらループを抜ける
            }
            
            retryCount++;
            console.log(`⚠️ 安全フィルターでブロックされました。リトライ ${retryCount}/${maxRetries}...`);
            
            // ローディング表示を更新
            if (loadingModal) {
                loadingModal.innerHTML = `
                    <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #2d3436; margin-bottom: 15px;">🤖 AI生成中...</div>
                        <div style="color: #666; font-size: 14px;">Gemini AIがストーリーを生成しています</div>
                        <div style="color: #f39c12; font-size: 12px; margin-top: 10px;">リトライ ${retryCount}/${maxRetries}...</div>
                    </div>
                `;
            }
            
            // 1秒待ってから再試行
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // ローディング非表示
        if (loadingModal) loadingModal.remove();
        
        if (!result.success) {
            let errorMessage = result.error || 'ストーリー生成に失敗しました';
            
            // より詳細なエラーメッセージを表示
            if (errorMessage.includes('PROHIBITED_CONTENT') || errorMessage.includes('安全フィルター') || errorMessage.includes('コンテンツポリシー')) {
                errorMessage = `❌ エラー: ${errorMessage}\n\n【対処方法】\n1. プロンプトの内容をより技術的な表現に変更してください\n2. 露骨な表現を避け、ポーズ名やセクション名などの技術的な用語に焦点を当ててください\n3. お任せモードを使用する場合は、追加指示を簡潔にしてください\n4. 何度か試すと成功する場合があります（${retryCount}回試行しました）`;
            }
            
            alert(errorMessage);
            return;
        }
        
        console.log('✅ AIストーリー生成成功:', result.items.length, 'アイテム');
        console.log('📝 説明:', result.explanation);
        
        // 既存のシーンをクリア（オプション：確認ダイアログ）
        if (storyPromptState.selectedScenes.length > 0) {
            if (!confirm('既存のシーンを削除して、AI生成のシーンに置き換えますか？')) {
                return;
            }
        }
        
        // シーンをクリア
        storyPromptState.selectedScenes = [];
        
        // AI生成のアイテムを順番に追加
        for (const item of result.items) {
            if (item.type === 'scene') {
                // ポーズデータを取得
                const poseData = poseSets.groups[item.group]?.sections[item.section]?.[item.poseName];
                if (!poseData) {
                    console.warn(`⚠️ ポーズが見つかりません: ${item.group}/${item.section}/${item.poseName}`);
                    continue;
                }
                
                // シーンを追加（ページ番号、ストーリーメモ、個別設定も設定）
                const sceneId = Date.now();
                
                // 複数人女性モードの場合、共通設定をコピーして個別設定を初期化
                let multiGirlSettings = [];
                if (storyPromptState.globalSettings.multiGirlMode && storyPromptState.globalSettings.multiGirlFaces.length > 0) {
                    // AI生成の個別設定があればそれを使用、なければ共通設定を使用
                    if (item.individual?.multiGirlSettings && Array.isArray(item.individual.multiGirlSettings) && item.individual.multiGirlSettings.length > 0) {
                        multiGirlSettings = item.individual.multiGirlSettings.map(girl => ({
                            faceSet: girl.faceSet || '',
                            clothing: girl.clothing || '',
                            pose: girl.pose || '',
                            clothingState: girl.clothingState || '',
                            expression: girl.expression || ''
                        }));
                    } else {
                        // 共通設定をコピー
                        multiGirlSettings = storyPromptState.globalSettings.multiGirlFaces.map(girl => ({
                            faceSet: girl.faceSet || '',
                            clothing: girl.clothing || '',
                            pose: girl.pose || '',
                            clothingState: girl.clothingState || '',
                            expression: girl.expression || ''
                        }));
                    }
                }
                
                const newScene = {
                    id: sceneId,
                    poseName: item.poseName,
                    poseData: poseData,
                    pageNumber: item.pageNumber || storyPromptState.selectedScenes.filter(s => s.type !== 'divider').length + 1,
                    storyMemo: item.storyMemo || '', // AI生成のストーリーメモ
                    individual: {
                        background: item.individual?.background || '',
                        expression: item.individual?.expression || '',
                        clothing: item.individual?.clothing || '',
                        clothingState: item.individual?.clothingState || '',
                        maleCharacterSet: item.individual?.maleCharacterSet || '',
                        maleClothingState: item.individual?.maleClothingState || '',
                        multiGirlSettings: multiGirlSettings
                    }
                };
                storyPromptState.selectedScenes.push(newScene);
            } else if (item.type === 'divider') {
                // 区切りを追加
                const dividerId = Date.now();
                const divider = {
                    id: dividerId,
                    type: 'divider',
                    dividerText: item.text || '【区切り】'
                };
                storyPromptState.selectedScenes.push(divider);
            }
        }
        
        // UI更新
        renderScenesList();
        updateStoryPromptPreview();

        // 🔍 Phase 2: 欠落ポーズ検出停止とモーダル表示
        await window.electronAPI.detectMissingPosesStop();
        console.log('🔍 欠落ポーズ検出停止');

        const missingPosesResult = await window.electronAPI.getMissingPoses();
        if (missingPosesResult.success && missingPosesResult.missingPoses.length > 0) {
            console.log(`⚠️ ${missingPosesResult.missingPoses.length}個の欠落ポーズを検出`);

            // 通知モーダルを表示
            showMissingPoseNotificationModal(missingPosesResult);
        } else {
            console.log('✅ 欠落ポーズなし');
        }

        // 成功メッセージ
        alert(`✅ AIストーリー生成完了！\n\n${result.explanation || ''}\n\n${result.items.length}個のアイテムを追加しました。`);
        
    } catch (error) {
        console.error('❌ AIストーリー生成エラー:', error);
        if (loadingModal) loadingModal.remove();
        alert(`❌ エラーが発生しました: ${error.message}`);
    }
}

// ========================================
// Phase 2: 欠落ポーズ登録システム - Modal制御
// ========================================

let currentMissingPoses = [];
let currentPoseIndex = 0;

/**
 * 欠落ポーズ通知モーダルを表示
 */
function showMissingPoseNotificationModal(missingPosesResult) {
    const modal = document.getElementById('missing-pose-notification-modal');
    if (!modal) {
        console.error('❌ 通知モーダルが見つかりません');
        return;
    }

    // 欠落ポーズデータを保存
    currentMissingPoses = missingPosesResult.missingPoses || [];
    currentPoseIndex = 0;

    // カウント更新
    const countEl = document.getElementById('missing-pose-count');
    if (countEl) {
        countEl.textContent = currentMissingPoses.length;
    }

    // サマリー生成
    const summaryEl = document.getElementById('missing-pose-summary');
    if (summaryEl && missingPosesResult.byGroup) {
        let summaryHTML = '';
        Object.entries(missingPosesResult.byGroup).forEach(([group, sections]) => {
            summaryHTML += `<div class="missing-pose-group">`;
            summaryHTML += `<div class="missing-pose-group-title">📁 ${group}</div>`;
            summaryHTML += `<ul class="missing-pose-list">`;
            Object.entries(sections).forEach(([section, poses]) => {
                poses.forEach(poseName => {
                    summaryHTML += `<li class="missing-pose-item">${section} → ${poseName}</li>`;
                });
            });
            summaryHTML += `</ul></div>`;
        });
        summaryEl.innerHTML = summaryHTML;
    }

    // ボタンイベント設定
    const startBtn = document.getElementById('start-registration-btn');
    const skipBtn = document.getElementById('skip-registration-btn');

    if (startBtn) {
        startBtn.onclick = () => {
            modal.style.display = 'none';
            showMissingPoseRegistrationModal(0);
        };
    }

    if (skipBtn) {
        skipBtn.onclick = () => {
            modal.style.display = 'none';
            currentMissingPoses = [];
        };
    }

    // モーダル表示
    modal.style.display = 'flex';
}

/**
 * 欠落ポーズ登録モーダルを表示
 */
async function showMissingPoseRegistrationModal(index) {
    if (index < 0 || index >= currentMissingPoses.length) {
        console.log('✅ 全ポーズの確認完了');
        alert('✅ 全ポーズの確認が完了しました！');
        return;
    }

    const modal = document.getElementById('missing-pose-modal');
    if (!modal) {
        console.error('❌ 登録モーダルが見つかりません');
        return;
    }

    currentPoseIndex = index;
    const poseData = currentMissingPoses[index];

    // プログレス更新
    const progressText = document.getElementById('pose-modal-progress');
    if (progressText) {
        progressText.textContent = `(${index + 1}/${currentMissingPoses.length})`;
    }

    const progressBar = document.getElementById('pose-progress-bar');
    if (progressBar) {
        const percentage = ((index + 1) / currentMissingPoses.length) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    // ポーズ情報表示
    const nameEl = document.getElementById('pose-name-display');
    const categoryEl = document.getElementById('pose-category-display');
    const sectionEl = document.getElementById('pose-section-display');

    if (nameEl) nameEl.textContent = poseData.name;
    if (categoryEl) categoryEl.textContent = poseData.group;
    if (sectionEl) sectionEl.textContent = poseData.section;

    // AIプロンプト提案を取得
    showLoadingOverlay('AIがプロンプトを生成中...');

    try {
        const suggestion = await window.electronAPI.suggestPosePrompt({
            group: poseData.group,
            section: poseData.section,
            name: poseData.name
        });

        hideLoadingOverlay();

        if (suggestion.success) {
            const promptTextarea = document.getElementById('pose-prompt-textarea');
            const explanationText = document.getElementById('pose-explanation-text');
            const confidenceBar = document.getElementById('pose-confidence-bar');
            const confidenceValue = document.getElementById('pose-confidence-value');

            if (promptTextarea) {
                promptTextarea.value = suggestion.prompt;
                promptTextarea.readOnly = false; // 編集可能にする
            }

            if (explanationText) {
                explanationText.textContent = suggestion.explanation || 'AI提案のプロンプトです';
            }

            if (confidenceBar && confidenceValue) {
                const confidence = Math.round((suggestion.confidence || 0.85) * 100);
                confidenceBar.style.width = `${confidence}%`;
                confidenceValue.textContent = `${confidence}%`;
            }
        } else {
            alert(`❌ プロンプト提案生成エラー: ${suggestion.error}`);
        }
    } catch (error) {
        hideLoadingOverlay();
        alert(`❌ エラー: ${error.message}`);
    }

    // ボタンイベント設定
    setupModalButtons();

    // モーダル表示
    modal.style.display = 'flex';
}

/**
 * モーダルボタンのイベント設定
 */
function setupModalButtons() {
    const modal = document.getElementById('missing-pose-modal');
    const closeBtn = document.getElementById('pose-modal-close');
    const registerBtn = document.getElementById('pose-register-btn');
    const editBtn = document.getElementById('pose-edit-btn');
    const skipBtn = document.getElementById('pose-skip-btn');
    const prevBtn = document.getElementById('pose-prev-btn');
    const nextBtn = document.getElementById('pose-next-btn');
    const cancelBtn = document.getElementById('pose-cancel-btn');

    // 閉じるボタン
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // このまま登録
    if (registerBtn) {
        registerBtn.onclick = async () => {
            await registerCurrentPose();
        };
    }

    // 編集
    if (editBtn) {
        editBtn.onclick = () => {
            const textarea = document.getElementById('pose-prompt-textarea');
            if (textarea) {
                textarea.readOnly = false;
                textarea.focus();
            }
        };
    }

    // スキップ
    if (skipBtn) {
        skipBtn.onclick = () => {
            showMissingPoseRegistrationModal(currentPoseIndex + 1);
        };
    }

    // 前へ
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentPoseIndex > 0) {
                showMissingPoseRegistrationModal(currentPoseIndex - 1);
            }
        };
    }

    // 次へ
    if (nextBtn) {
        nextBtn.onclick = () => {
            showMissingPoseRegistrationModal(currentPoseIndex + 1);
        };
    }

    // キャンセル
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (confirm('登録作業をキャンセルしますか？')) {
                modal.style.display = 'none';
                currentMissingPoses = [];
            }
        };
    }
}

/**
 * 現在のポーズを登録
 */
async function registerCurrentPose() {
    const poseData = currentMissingPoses[currentPoseIndex];
    const textarea = document.getElementById('pose-prompt-textarea');

    if (!textarea || !textarea.value.trim()) {
        alert('❌ プロンプトが入力されていません');
        return;
    }

    showLoadingOverlay('ポーズを登録中...');

    try {
        const result = await window.electronAPI.registerPose({
            group: poseData.group,
            section: poseData.section,
            name: poseData.name,
            prompt: textarea.value.trim()
        });

        hideLoadingOverlay();

        if (result.success) {
            console.log(`✅ ポーズ登録成功: ${poseData.name}`);
            // 次のポーズへ
            showMissingPoseRegistrationModal(currentPoseIndex + 1);
        } else {
            alert(`❌ 登録エラー: ${result.error}`);
        }
    } catch (error) {
        hideLoadingOverlay();
        alert(`❌ エラー: ${error.message}`);
    }
}

/**
 * ローディングオーバーレイ表示
 */
function showLoadingOverlay(message) {
    const overlay = document.getElementById('pose-loading-overlay');
    const text = document.getElementById('pose-loading-text');

    if (overlay) {
        if (text) text.textContent = message;
        overlay.style.display = 'flex';
    }
}

/**
 * ローディングオーバーレイ非表示
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('pose-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

async function generateSNSPostWithAI() {
    const platformSelect = document.getElementById('snsPlatformSelect');
    const r18Checkbox = document.getElementById('snsR18Checkbox');
    const promptInput = document.getElementById('snsPostPromptInput');
    const useCommonSettingsCheckbox = document.getElementById('snsUseCommonSettingsCheckbox');
    
    const snsPlatform = platformSelect ? platformSelect.value : 'twitter';
    const isR18 = r18Checkbox ? r18Checkbox.checked : false;
    const userPrompt = promptInput ? promptInput.value.trim() : '';
    const useCommonSettings = useCommonSettingsCheckbox ? useCommonSettingsCheckbox.checked : true;
    
    // X（Twitter）の場合は18禁指定を無効化
    const effectiveIsR18 = (snsPlatform === 'twitter') ? false : isR18;
    
    // モーダルを閉じる
    const modal = document.getElementById('snsPostGeneratorModal');
    if (modal) modal.remove();
    
    // ローディング表示
    const loadingModal = document.createElement('div');
    loadingModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30001; display: flex; align-items: center; justify-content: center;';
    loadingModal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
            <div style="font-size: 18px; font-weight: bold; color: #2d3436; margin-bottom: 15px;">📱 SNS投稿用AI生成中...</div>
            <div style="color: #666; font-size: 14px;">Gemini AIがプロンプトを生成しています</div>
        </div>
    `;
    loadingModal.id = 'snsPostLoadingModal';
    document.body.appendChild(loadingModal);
    
    try {
        // ポーズセットデータを取得
        const poseSets = storyPromptState.setsData.pose;
        if (!poseSets || !poseSets.groups) {
            throw new Error('ポーズセットデータが読み込まれていません');
        }
        
        // 個別設定のセットデータを取得（服装セットのタグ情報も含める）
        const clothingSetsWithTags = {};
        Object.entries(storyPromptState.setsData.clothing || {}).forEach(([name, data]) => {
            clothingSetsWithTags[name] = {
                name: name,
                tags: data.tags || []
            };
        });
        
        const individualSettingsData = {
            background: Object.keys(storyPromptState.setsData.background || {}),
            expression: Object.keys(storyPromptState.setsData.expression || {}),
            clothing: Object.keys(storyPromptState.setsData.clothing || {}),
            clothingWithTags: clothingSetsWithTags, // タグ情報を含む服装セットデータ
            clothingState: Object.keys(storyPromptState.setsData.clothingState || {}),
            maleCharacter: Object.keys(storyPromptState.setsData.maleCharacter || {})
        };
        
        // 共通設定を取得
        const commonSettings = {
            face: document.getElementById('storyFaceSelect')?.value || '',
            body: document.getElementById('storyBodySelect')?.value || '',
            background: document.getElementById('storyBackgroundSelect')?.value || '',
            clothing: document.getElementById('storyClothingSelect')?.value || '',
            maleCharacter: document.getElementById('storyMaleCharacterSelect')?.value || ''
        };
        
        console.log('🚀 SNS投稿用AI生成開始:', {
            snsPlatform,
            isR18: effectiveIsR18,
            userPrompt: userPrompt.substring(0, 50) + '...',
            useCommonSettings
        });
        
        // Gemini AIにSNS投稿用プロンプト生成を依頼
        let result;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            result = await window.electronAPI.generateSNSPostWithGemini(
                userPrompt,
                snsPlatform,
                effectiveIsR18,
                poseSets,
                individualSettingsData,
                commonSettings,
                useCommonSettings
            );
            
            if (result.success) {
                break;
            }
            
            const isSafetyError = result.error && (
                result.error.includes('PROHIBITED_CONTENT') ||
                result.error.includes('安全フィルター') ||
                result.error.includes('コンテンツポリシー') ||
                result.error.includes('SAFETY')
            );
            
            if (!isSafetyError || retryCount >= maxRetries - 1) {
                break;
            }
            
            retryCount++;
            console.log(`⚠️ 安全フィルターでブロックされました。リトライ ${retryCount}/${maxRetries}...`);
            
            if (loadingModal) {
                loadingModal.innerHTML = `
                    <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #2d3436; margin-bottom: 15px;">📱 SNS投稿用AI生成中...</div>
                        <div style="color: #666; font-size: 14px;">Gemini AIがプロンプトを生成しています</div>
                        <div style="color: #f39c12; font-size: 12px; margin-top: 10px;">リトライ ${retryCount}/${maxRetries}...</div>
                    </div>
                `;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (loadingModal) loadingModal.remove();
        
        if (!result.success) {
            let errorMessage = result.error || 'SNS投稿用プロンプト生成に失敗しました';
            
            if (errorMessage.includes('PROHIBITED_CONTENT') || errorMessage.includes('安全フィルター') || errorMessage.includes('コンテンツポリシー')) {
                errorMessage = `❌ エラー: ${errorMessage}\n\n【対処方法】\n1. プロンプトの内容をより技術的な表現に変更してください\n2. 露骨な表現を避け、ポーズ名やセクション名などの技術的な用語に焦点を当ててください\n3. 何度か試すと成功する場合があります（${retryCount}回試行しました）`;
            }
            
            alert(errorMessage);
            return;
        }
        
        console.log('✅ SNS投稿用AI生成成功:', result);
        
        // 生成結果をプレビューエリアに表示
        showSNSPostPreview(result);
        
    } catch (error) {
        console.error('❌ SNS投稿用AI生成エラー:', error);
        if (loadingModal) loadingModal.remove();
        alert(`❌ エラーが発生しました: ${error.message}`);
    }
}

function showSNSPostPreview(result) {
    // プロンプトを生成（既存のセットから選択した情報を組み合わせる）
    const commonFace = document.getElementById('storyFaceSelect')?.value || '';
    const commonBody = document.getElementById('storyBodySelect')?.value || '';
    const commonBackground = document.getElementById('storyBackgroundSelect')?.value || '';
    const commonClothing = document.getElementById('storyClothingSelect')?.value || '';
    
    // 複数人女性モードのチェック
    const isMultiGirlMode = storyPromptState.globalSettings.multiGirlMode;
    const multiGirlFaces = storyPromptState.globalSettings.multiGirlFaces.filter(girl => girl && girl.faceSet); // 顔が選択されている女性のみ
    
    let generatedPrompt = '';
    
    if (isMultiGirlMode && multiGirlFaces.length > 0) {
        // 複数人女性モード: updateStoryPromptPreviewと同じ仕組み
        const parts = [];
        
        // ステップ0: 人数タグを先頭に追加
        const characterCount = multiGirlFaces.length;
        const peopleTag = `(${characterCount}girls:1.6),multiple girls`;
        parts.push(peopleTag);
        
        // ステップ1: 共通設定（体・背景のみ）
        if (commonBody && storyPromptState.setsData.body[commonBody]) {
            parts.push(...storyPromptState.setsData.body[commonBody].tags);
        }
        
        // 背景（個別 > 共通）
        const bgToUse = result.background || commonBackground;
        if (bgToUse && storyPromptState.setsData.background[bgToUse]) {
            parts.push(...storyPromptState.setsData.background[bgToUse].tags);
        }
        
        // ステップ2: 各女性のプロンプトを生成（共通設定を使用）
        const characterParts = [];
        multiGirlFaces.forEach((girlData, idx) => {
            const charParts = [];
            const seenTags = new Set(); // 重複チェック用
            
            // 1girlを追加（重複チェック）
            if (!seenTags.has('1girl')) {
                charParts.push('1girl');
                seenTags.add('1girl');
            }
            
            // 女性の顔セットのタグを追加（共通設定から取得）
            const faceSetName = girlData.faceSet;
            if (faceSetName && storyPromptState.setsData.face[faceSetName]) {
                const faceSet = storyPromptState.setsData.face[faceSetName];
                if (faceSet.tags && faceSet.tags.length > 0) {
                    faceSet.tags.forEach(tag => {
                        const normalizedTag = String(tag || '').trim();
                        const lowerTag = normalizedTag.toLowerCase();
                        if (normalizedTag && !seenTags.has(lowerTag)) {
                            charParts.push(normalizedTag);
                            seenTags.add(lowerTag);
                        }
                    });
                }
            }
            
            // 服装（共通設定 > SNS投稿用の個別設定）
            const clothingToUse = girlData.clothing || result.clothing || commonClothing;
            if (clothingToUse && storyPromptState.setsData.clothing[clothingToUse]) {
                const clothingSet = storyPromptState.setsData.clothing[clothingToUse];
                if (clothingSet.tags && clothingSet.tags.length > 0) {
                    clothingSet.tags.forEach(tag => {
                        const normalizedTag = String(tag || '').trim();
                        const lowerTag = normalizedTag.toLowerCase();
                        if (normalizedTag && !seenTags.has(lowerTag)) {
                            charParts.push(normalizedTag);
                            seenTags.add(lowerTag);
                        }
                    });
                }
            }
            
            // ポーズ（SNS投稿用のポーズを使用）
            const poseSets = storyPromptState.setsData.pose;
            const poseData = poseSets?.groups?.[result.group]?.sections?.[result.section]?.[result.poseName];
            if (poseData && poseData.tags) {
                poseData.tags.forEach(tag => {
                    const normalizedTag = String(tag || '').trim();
                    const lowerTag = normalizedTag.toLowerCase();
                    if (normalizedTag && !seenTags.has(lowerTag)) {
                        charParts.push(normalizedTag);
                        seenTags.add(lowerTag);
                    }
                });
            }
            
            // 表情（SNS投稿用の個別設定 > 共通設定）
            const expressionToUse = result.expression || girlData.expression;
            if (expressionToUse && storyPromptState.setsData.expression[expressionToUse]) {
                const expressionSet = storyPromptState.setsData.expression[expressionToUse];
                if (expressionSet.tags && expressionSet.tags.length > 0) {
                    expressionSet.tags.forEach(tag => {
                        const normalizedTag = String(tag || '').trim();
                        const lowerTag = normalizedTag.toLowerCase();
                        if (normalizedTag && !seenTags.has(lowerTag)) {
                            charParts.push(normalizedTag);
                            seenTags.add(lowerTag);
                        }
                    });
                }
            }
            
            // 服装状態（SNS投稿用の個別設定 > 共通設定）
            const clothingStateToUse = result.clothingState || girlData.clothingState;
            if (clothingStateToUse && storyPromptState.setsData.clothingState[clothingStateToUse]) {
                const clothingStateSet = storyPromptState.setsData.clothingState[clothingStateToUse];
                if (clothingStateSet.tags && clothingStateSet.tags.length > 0) {
                    clothingStateSet.tags.forEach(tag => {
                        const normalizedTag = String(tag || '').trim();
                        const lowerTag = normalizedTag.toLowerCase();
                        if (normalizedTag && !seenTags.has(lowerTag)) {
                            charParts.push(normalizedTag);
                            seenTags.add(lowerTag);
                        }
                    });
                }
            }
            
            characterParts.push(charParts);
        });
        
        // 各女性のプロンプトをADDCOLで結合
        const allParts = [...parts];
        characterParts.forEach((charParts, idx) => {
            if (idx > 0) {
                allParts.push('ADDCOL');
            }
            allParts.push(...charParts);
        });
        
        generatedPrompt = allParts.join(', ');
    } else {
        // 通常モード（1人または複数人女性モードがOFF）
        let promptParts = [];
        
        // 共通設定（顔・体は常に適用）
        if (commonFace && storyPromptState.setsData.face[commonFace]) {
            promptParts.push(...storyPromptState.setsData.face[commonFace].tags);
        }
        if (commonBody && storyPromptState.setsData.body[commonBody]) {
            promptParts.push(...storyPromptState.setsData.body[commonBody].tags);
        }
        
        // ポーズ
        const poseSets = storyPromptState.setsData.pose;
        const poseData = poseSets?.groups?.[result.group]?.sections?.[result.section]?.[result.poseName];
        if (poseData && poseData.tags) {
            promptParts.push(...poseData.tags);
        }
        
        // 背景（個別 > 共通）
        const bgToUse = result.background || commonBackground;
        if (bgToUse && storyPromptState.setsData.background[bgToUse]) {
            promptParts.push(...storyPromptState.setsData.background[bgToUse].tags);
        }
        
        // 表情（個別のみ）
        if (result.expression && storyPromptState.setsData.expression[result.expression]) {
            promptParts.push(...storyPromptState.setsData.expression[result.expression].tags);
        }
        
        // 服装（個別 > 共通）
        const clothingToUse = result.clothing || commonClothing;
        if (clothingToUse && storyPromptState.setsData.clothing[clothingToUse]) {
            promptParts.push(...storyPromptState.setsData.clothing[clothingToUse].tags);
        }
        
        // 服装状態
        if (result.clothingState && storyPromptState.setsData.clothingState[result.clothingState]) {
            const clothingStateSet = storyPromptState.setsData.clothingState[result.clothingState];
            if (clothingStateSet.tags && clothingStateSet.tags.length > 0) {
                promptParts.push(...clothingStateSet.tags);
            }
        }
        
        generatedPrompt = promptParts.join(', ');
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30002; display: flex; align-items: center; justify-content: center;';
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">📱 SNS投稿用プロンプト生成完了</h3>
            
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 2px solid #dee2e6;">
                <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 16px;">生成された設定</h4>
                <div style="font-size: 13px; color: #666; line-height: 1.8;">
                    <div><strong>ポーズ:</strong> ${result.poseName || '未設定'}</div>
                    <div><strong>表情:</strong> ${result.expression || '未設定'}</div>
                    <div><strong>背景:</strong> ${result.background || '未設定'}</div>
                    <div><strong>服装:</strong> ${result.clothing || '未設定'}</div>
                    <div><strong>服装状態:</strong> ${result.clothingState || '未設定'}</div>
                    ${result.explanation ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;"><strong>説明:</strong> ${result.explanation}</div>` : ''}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-size: 13px; font-weight: bold; color: #2d3436; display: block; margin-bottom: 5px;">📄 生成されたプロンプト</label>
                <textarea id="snsPostPreviewTextarea" readonly style="width: 100%; min-height: 200px; padding: 12px; font-size: 13px; border: 2px solid #dfe6e9; border-radius: 8px; background: #f8f9fa; font-family: monospace; resize: vertical;">${generatedPrompt}</textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 2px solid #dfe6e9; padding-top: 20px;">
                <button onclick="document.getElementById('snsPostPreviewModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">閉じる</button>
                <button onclick="copySNSPostPrompt()" style="padding: 10px 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">📋 コピー</button>
                <button onclick="addSNSPostToStory()" style="padding: 10px 20px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">📝 ストーリーに追加</button>
            </div>
        </div>
    `;
    modal.id = 'snsPostPreviewModal';
    
    // 生成結果をグローバル変数に保存（コピーとストーリー追加用）
    window.currentSNSPostResult = result;
    
    document.body.appendChild(modal);
}

function copySNSPostPrompt() {
    const textarea = document.getElementById('snsPostPreviewTextarea');
    if (!textarea || !textarea.value) {
        alert('コピーするプロンプトがありません');
        return;
    }
    
    window.focus();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textarea.value).then(() => {
            alert('✅ プロンプトをクリップボードにコピーしました');
        }).catch((error) => {
            console.error('クリップボードコピーエラー:', error);
            // フォールバック
            textarea.select();
            document.execCommand('copy');
            alert('✅ プロンプトをクリップボードにコピーしました');
        });
    } else {
        textarea.select();
        document.execCommand('copy');
        alert('✅ プロンプトをクリップボードにコピーしました');
    }
}

function addSNSPostToStory() {
    // 重複実行防止
    if (window.isAddingSNSPostToStory) {
        console.log('⚠️ 既にストーリーに追加処理中です');
        return;
    }
    
    if (!window.currentSNSPostResult) {
        alert('ストーリーに追加するデータがありません');
        return;
    }
    
    // 実行中フラグを設定
    window.isAddingSNSPostToStory = true;
    
    try {
        const result = window.currentSNSPostResult;
        const poseSets = storyPromptState.setsData.pose;
        
        // ポーズデータを取得
        const poseData = poseSets.groups[result.group]?.sections[result.section]?.[result.poseName];
        if (!poseData) {
            alert(`⚠️ ポーズが見つかりません: ${result.group}/${result.section}/${result.poseName}`);
            return;
        }
        
        // シーンを追加
        const sceneId = Date.now();
        const existingScenes = storyPromptState.selectedScenes.filter(s => s.type !== 'divider');
        const maxPageNumber = existingScenes.length > 0 
            ? Math.max(...existingScenes.map(s => s.pageNumber || 0))
            : 0;
        const pageNumber = maxPageNumber + 1;
        
        const newScene = {
            id: sceneId,
            poseName: result.poseName,
            poseData: poseData,
            pageNumber: pageNumber,
            storyMemo: result.explanation || '',
            individual: {
                background: result.background || '',
                expression: result.expression || '',
                clothing: result.clothing || '',
                clothingState: result.clothingState || '',
                maleCharacterSet: '',
                maleClothingState: '',
                multiGirlSettings: []
            }
        };
        
        storyPromptState.selectedScenes.push(newScene);
        
        // UI更新
        renderScenesList();
        selectScene(sceneId);
        updateStoryPromptPreview();
        
        // プレビューモーダルを閉じる
        const previewModal = document.getElementById('snsPostPreviewModal');
        if (previewModal) previewModal.remove();
        
        // 結果をクリア（重複追加を防ぐ）
        window.currentSNSPostResult = null;
        
        alert('✅ ストーリーに追加しました');
    } finally {
        // 実行中フラグを解除
        window.isAddingSNSPostToStory = false;
    }
}

// お気に入り機能
async function saveStoryToFavorites() {
    if (storyPromptState.selectedScenes.length === 0) {
        alert('保存するシーンがありません');
        return;
    }
    
    // カスタム入力モーダルを作成
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 20px 0; color: #2d3436;">⭐ お気に入りに保存</h3>
            <input type="text" id="storyNameInput" placeholder="ストーリー名を入力..." style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="document.getElementById('saveStoryModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
                <button onclick="confirmSaveStory()" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">保存</button>
            </div>
        </div>
    `;
    modal.id = 'saveStoryModal';
    document.body.appendChild(modal);
    
    // 入力欄にフォーカス
    setTimeout(() => document.getElementById('storyNameInput').focus(), 100);
    
    // Enterキーで保存
    document.getElementById('storyNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmSaveStory();
    });
}

async function confirmSaveStory() {
    const storyName = document.getElementById('storyNameInput').value.trim();
    if (!storyName) {
        alert('ストーリー名を入力してください');
        return;
    }
    
    document.getElementById('saveStoryModal').remove();
    
    const storyData = {
        name: storyName,
        timestamp: new Date().toISOString(),
        globalSettings: {
            face: document.getElementById('storyFaceSelect').value,
            body: document.getElementById('storyBodySelect').value,
            background: document.getElementById('storyBackgroundSelect').value,
            clothing: document.getElementById('storyClothingSelect').value,
            maleCharacterSet: storyPromptState.globalSettings.maleCharacterSet || '',
            maleClothingState: storyPromptState.globalSettings.maleClothingState || '',
            multiGirlMode: storyPromptState.globalSettings.multiGirlMode || false,
            multiGirlFaces: storyPromptState.globalSettings.multiGirlFaces || []
        },
        scenes: storyPromptState.selectedScenes
    };
    
    try {
        const result = await window.electronAPI.loadStoryFavorites();
        const favorites = result.success ? result.favorites : [];
        favorites.push(storyData);
        
        const saveResult = await window.electronAPI.saveStoryFavorites(favorites);
        
        if (saveResult.success) {
            alert(`✅ 「${storyName}」をお気に入りに保存しました\n\n保存先: story_favorites.json`);
        } else {
            alert(`❌ 保存に失敗しました: ${saveResult.error}`);
        }
    } catch (error) {
        console.error('保存エラー:', error);
        alert(`❌ 保存に失敗しました: ${error.message}`);
    }
}

async function loadStoryFromFavorites() {
    try {
        const result = await window.electronAPI.loadStoryFavorites();
        
        if (!result.success) {
            alert(`❌ 読み込みに失敗しました: ${result.error}`);
            return;
        }
        
        const favorites = result.favorites;
        
        if (favorites.length === 0) {
            alert('お気に入りが登録されていません');
            return;
        }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    favorites.forEach((story, index) => {
        const date = new Date(story.timestamp).toLocaleString('ja-JP');
        html += `
            <div style="padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; background: white;">
                <strong>${story.name}</strong><br>
                <small>${date} - ${story.scenes.length}シーン</small><br>
                <button onclick="applyFavoriteStory(${index}); document.getElementById('favoritesModal').style.display='none';" style="margin-top: 5px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">読み込み</button>
                <button onclick="deleteFavoriteStory(${index})" style="margin-top: 5px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">削除</button>
            </div>
        `;
    });
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.id = 'favoritesModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 20000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; max-width: 600px; width: 90%;">
            <h3>📁 お気に入り一覧</h3>
            ${html}
            <button onclick="document.getElementById('favoritesModal').remove()" style="margin-top: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">閉じる</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    } catch (error) {
        console.error('読み込みエラー:', error);
        alert(`❌ 読み込みに失敗しました: ${error.message}`);
    }
}

async function applyFavoriteStory(index) {
    try {
        const result = await window.electronAPI.loadStoryFavorites();
        const favorites = result.favorites;
        const story = favorites[index];
    
    if (!story) return;
    
    // 共通設定を適用
    document.getElementById('storyFaceSelect').value = story.globalSettings.face || '';
    document.getElementById('storyBodySelect').value = story.globalSettings.body || '';
    document.getElementById('storyBackgroundSelect').value = story.globalSettings.background || '';
    document.getElementById('storyClothingSelect').value = story.globalSettings.clothing || '';
    
    // 男性設定を適用
    const maleCharacterSet = story.globalSettings.maleCharacterSet || '';
    const maleClothingState = story.globalSettings.maleClothingState || '';
    
    storyPromptState.globalSettings.maleCharacterSet = maleCharacterSet;
    storyPromptState.globalSettings.maleClothingState = maleClothingState;
    
    const storyMaleCharacterSelect = document.getElementById('storyMaleCharacterSelect');
    if (storyMaleCharacterSelect) {
        storyMaleCharacterSelect.value = maleCharacterSet;
    }
    
    // 男性服装状態エリアの表示/非表示
    const maleClothingStateArea = document.getElementById('storyMaleClothingStateArea');
    if (maleClothingStateArea) {
        maleClothingStateArea.style.display = maleCharacterSet ? 'block' : 'none';
    }
    
    // 男性服装状態ドロップダウンの値を設定
    const storyMaleClothingStateSelect = document.getElementById('storyMaleClothingStateSelect');
    if (storyMaleClothingStateSelect) {
        storyMaleClothingStateSelect.value = maleClothingState || '';
    }
    
    // 複数人女性モードを適用
    const multiGirlMode = story.globalSettings.multiGirlMode || false;
    let multiGirlFaces = story.globalSettings.multiGirlFaces || [];
    
    // 古い形式（文字列の配列）から新しい形式（オブジェクトの配列）に変換
    if (multiGirlFaces.length > 0 && typeof multiGirlFaces[0] === 'string') {
        multiGirlFaces = multiGirlFaces.map(faceSet => ({
            faceSet: faceSet,
            clothing: '',
            pose: '',
            clothingState: '',
            expression: ''
        }));
    }
    
    storyPromptState.globalSettings.multiGirlMode = multiGirlMode;
    storyPromptState.globalSettings.multiGirlFaces = multiGirlFaces;
    
    const multiGirlModeCheckbox = document.getElementById('storyMultiGirlMode');
    if (multiGirlModeCheckbox) {
        multiGirlModeCheckbox.checked = multiGirlMode;
    }
    
    // 複数人女性モードのUIを更新
    const singleGirlArea = document.getElementById('storySingleGirlArea');
    const multiGirlArea = document.getElementById('storyMultiGirlArea');
    if (singleGirlArea && multiGirlArea) {
        if (multiGirlMode) {
            singleGirlArea.style.display = 'none';
            multiGirlArea.style.display = 'block';
            renderMultiGirlFaces();
        } else {
            singleGirlArea.style.display = 'block';
            multiGirlArea.style.display = 'none';
        }
    }
    
    // シーンを復元
    storyPromptState.selectedScenes = story.scenes;
    storyPromptState.currentSceneId = null;
    document.getElementById('storyIndividualSettings').style.display = 'none';
    
    renderScenesList();
    updateStoryPromptPreview();
    
    alert(`✅ 「${story.name}」を読み込みました`);
    } catch (error) {
        console.error('適用エラー:', error);
        alert(`❌ 読み込みに失敗しました: ${error.message}`);
    }
}

async function deleteFavoriteStory(index) {
    if (!confirm('このお気に入りを削除しますか？')) return;
    
    try {
        const result = await window.electronAPI.loadStoryFavorites();
        const favorites = result.favorites;
        favorites.splice(index, 1);
        
        await window.electronAPI.saveStoryFavorites(favorites);
        
        document.getElementById('favoritesModal').remove();
        loadStoryFromFavorites();
    } catch (error) {
        console.error('削除エラー:', error);
        alert(`❌ 削除に失敗しました: ${error.message}`);
    }
}

async function copyStoryPromptToClipboard() {
    try {
        const preview = document.getElementById('storyPreview');
        if (!preview || !preview.value) {
            alert('コピーするプロンプトがありません');
            return;
        }
        
        // プレビュー表示用のテキストを実際に使える形式に変換
        let previewText = preview.value;
        
        // シーン間の区切り（---）で分割
        const scenes = previewText.split(/\n\n---\n\n/);
        
        // 各シーンを処理
        const processedScenes = scenes.map(sceneText => {
            try {
                // 【P1 | シーン1: ...】のような見出し行を削除（ページ番号付き）
                sceneText = sceneText.replace(/【P\d+\s*\|\s*シーン\d+:.*?】\s*\n*/g, '');
                // 【シーン1: ...】のような見出し行を削除（ページ番号なし）
                sceneText = sceneText.replace(/【シーン\d+:.*?】\s*\n*/g, '');
                
                // ストーリーメモを削除（📝で始まる行とその後の改行）
                sceneText = sceneText.replace(/📝\s*[^\n\r]*[\n\r]*/g, '');
                
                // 区切り文字（【通常パート】など）を削除
                sceneText = sceneText.replace(/【[^】]+】\s*\n*/g, '');
                
                // BREAKの前後の改行を削除してカンマ区切りに
                sceneText = sceneText.replace(/[\n\r]*[\n\r]*BREAK[\n\r]*[\n\r]*/g, ',BREAK,');
                
                // 残りの改行を削除してカンマ区切りに変換
                sceneText = sceneText.replace(/[\n\r]/g, '');
                
                // 連続する空白を1つに
                sceneText = sceneText.replace(/\s+/g, ' ');
                
                // 連続するカンマを1つに
                sceneText = sceneText.replace(/,\s*,/g, ',');
                
                // 前後の空白を削除
                sceneText = sceneText.trim();
                
                return sceneText;
            } catch (error) {
                console.error('シーン処理エラー:', error, sceneText);
                return '';
            }
        }).filter(scene => scene && scene.length > 0); // 空のシーンを除外
        
        if (processedScenes.length === 0) {
            alert('コピーできるプロンプトがありません');
            return;
        }
        
        // シーンごとに改行で結合（1シーン = 1ページ）
        const copyText = processedScenes.join('\n');
        
        if (!copyText || copyText.trim().length === 0) {
            alert('コピーできるプロンプトがありません');
            return;
        }
        
        // フォーカスを確保してからクリップボードにコピー
        try {
            // まず、windowにフォーカスを当てる
            window.focus();
            
            // クリップボードAPIを試行
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(copyText);
                alert(`✅ プロンプトをクリップボードにコピーしました（${processedScenes.length}シーン、改行区切り）`);
            } else {
                // フォールバック：一時的なテキストエリアを使用
                const textarea = document.createElement('textarea');
                textarea.value = copyText;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    if (successful) {
                        alert(`✅ プロンプトをクリップボードにコピーしました（${processedScenes.length}シーン、改行区切り）`);
                    } else {
                        throw new Error('execCommand failed');
                    }
                } catch (execError) {
                    document.body.removeChild(textarea);
                    throw execError;
                }
            }
        } catch (error) {
            console.error('クリップボードコピーエラー:', error);
            // 最後の手段：テキストエリアを表示してユーザーに手動コピーを促す
            const textarea = document.createElement('textarea');
            textarea.value = copyText;
            textarea.style.position = 'fixed';
            textarea.style.left = '50%';
            textarea.style.top = '50%';
            textarea.style.transform = 'translate(-50%, -50%)';
            textarea.style.width = '80%';
            textarea.style.height = '60%';
            textarea.style.zIndex = '99999';
            textarea.style.padding = '20px';
            textarea.style.fontSize = '14px';
            textarea.style.border = '2px solid #007bff';
            textarea.style.borderRadius = '8px';
            textarea.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '閉じる';
            closeBtn.style.position = 'fixed';
            closeBtn.style.left = '50%';
            closeBtn.style.top = 'calc(50% + 35%)';
            closeBtn.style.transform = 'translateX(-50%)';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.marginTop = '10px';
            closeBtn.style.background = '#007bff';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '5px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.zIndex = '100000';
            closeBtn.onclick = () => {
                document.body.removeChild(textarea);
                document.body.removeChild(closeBtn);
            };
            document.body.appendChild(closeBtn);
            
            alert('⚠️ 自動コピーに失敗しました。テキストエリアが表示されましたので、Ctrl+Cで手動コピーしてください。');
        }
    } catch (error) {
        console.error('copyStoryPromptToClipboard エラー:', error);
        alert(`❌ コピー処理でエラーが発生しました: ${error.message || '不明なエラー'}`);
    }
}

function updateCurrentSceneIndividualSettings() {
    if (!storyPromptState.currentSceneId) return;
    
    const scene = storyPromptState.selectedScenes.find(s => s.id === storyPromptState.currentSceneId);
    if (scene) {
        scene.individual.background = document.getElementById('sceneBackgroundSelect').value;
        scene.individual.expression = document.getElementById('sceneExpressionSelect').value;
        scene.individual.clothing = document.getElementById('sceneClothingSelect').value;
        scene.individual.clothingState = document.getElementById('sceneClothingStateSelect').value;

        // 下着セットの保存
        const sceneUnderwearSelect = document.getElementById('sceneUnderwearSelect');
        if (sceneUnderwearSelect) {
            scene.individual.underwear = sceneUnderwearSelect.value || '';
        }

        // 個別設定の男性キャラクターと男性服装状態
        const sceneMaleCharacterSelect = document.getElementById('sceneMaleCharacterSelect');
        const sceneMaleClothingStateSelect = document.getElementById('sceneMaleClothingStateSelect');
        
        if (sceneMaleCharacterSelect) {
            scene.individual.maleCharacterSet = sceneMaleCharacterSelect.value || '';
        }
        
        if (sceneMaleClothingStateSelect) {
            scene.individual.maleClothingState = sceneMaleClothingStateSelect.value || '';
        }
        
        // ストーリーメモを保存
        const sceneStoryMemoInput = document.getElementById('sceneStoryMemoInput');
        if (sceneStoryMemoInput) {
            scene.storyMemo = sceneStoryMemoInput.value.trim();
        }
        
        // 複数人女性モードの場合の個別設定を保存
        if (storyPromptState.globalSettings.multiGirlMode && scene.individual.multiGirlSettings) {
            scene.individual.multiGirlSettings.forEach((girlData, index) => {
                const clothingSelect = document.getElementById(`sceneMultiGirlClothing${scene.id}_${index}`);
                const poseSelect = document.getElementById(`sceneMultiGirlPose${scene.id}_${index}`);
                const clothingStateSelect = document.getElementById(`sceneMultiGirlClothingState${scene.id}_${index}`);
                const expressionSelect = document.getElementById(`sceneMultiGirlExpression${scene.id}_${index}`);
                
                if (clothingSelect) girlData.clothing = clothingSelect.value || '';
                if (poseSelect) girlData.pose = poseSelect.value || '';
                if (clothingStateSelect) girlData.clothingState = clothingStateSelect.value || '';
                if (expressionSelect) girlData.expression = expressionSelect.value || '';
            });
        }
    }
}

function updateStoryPromptPreview() {
    console.log('📝 プレビュー更新開始');
    const preview = document.getElementById('storyPreview');
    if (!preview) {
        console.error('❌ プレビュー要素が見つかりません');
        return;
    }
    
    // 共通設定
    const commonFace = document.getElementById('storyFaceSelect').value;
    const commonBody = document.getElementById('storyBodySelect').value;
    const commonBackground = document.getElementById('storyBackgroundSelect').value;
    const commonClothing = document.getElementById('storyClothingSelect').value;
    
    // 複数人女性モードのチェック
    const isMultiGirlMode = storyPromptState.globalSettings.multiGirlMode;
    const multiGirlFaces = storyPromptState.globalSettings.multiGirlFaces.filter(girl => girl && girl.faceSet); // 顔が選択されている女性のみ
    
    console.log('🌐 共通設定:', { commonFace, commonBody, commonBackground, commonClothing });
    console.log('👥 複数人女性モード:', isMultiGirlMode, '人数:', multiGirlFaces.length);
    console.log('🎬 シーン数:', storyPromptState.selectedScenes.length);
    
    if (storyPromptState.selectedScenes.length === 0) {
        preview.value = 'ポーズを選択してシーンを作成してください';
        console.log('⚠️ シーンが0件のためメッセージ表示');
        return;
    }
    
    // 複数人女性モードの場合のバリデーション
    if (isMultiGirlMode && multiGirlFaces.length === 0) {
        preview.value = '⚠️ 複数人女性モードが有効ですが、女性の顔が選択されていません';
        return;
    }
    
    let allPrompts = [];
    let sceneIndex = 0; // 実際のシーン番号（区切り文字はカウントしない）
    
    storyPromptState.selectedScenes.forEach((scene, index) => {
        // 区切り文字の場合
        if (scene.type === 'divider') {
            allPrompts.push(`\n${scene.dividerText || '【区切り】'}\n`);
            return;
        }
        
        // 通常のシーン
        sceneIndex++;
        let scenePrompt = `【シーン${sceneIndex}: ${scene.poseName}】\n\n`;
        
        if (isMultiGirlMode && multiGirlFaces.length > 0) {
            // 複数人女性モード: generateDualPromptと同じ仕組み
            const parts = [];
            
            // シーンの個別設定があればそれを使用、なければ共通設定を使用
            const sceneMultiGirlSettings = scene.individual.multiGirlSettings || [];
            const girlsToUse = (sceneMultiGirlSettings.length > 0) ? sceneMultiGirlSettings : multiGirlFaces;
            
            // ステップ0: 人数タグを先頭に追加
            const characterCount = girlsToUse.length;
            const peopleTag = `(${characterCount}girls:1.6),multiple girls`;
            parts.push(peopleTag);
            
            // ステップ1: 共通設定（体・背景のみ）
            if (commonBody && storyPromptState.setsData.body[commonBody]) {
                parts.push(...storyPromptState.setsData.body[commonBody].tags);
            }
            
            // 背景（個別 > 共通）
            const bgToUse = scene.individual.background || commonBackground;
            if (bgToUse && storyPromptState.setsData.background[bgToUse]) {
                parts.push(...storyPromptState.setsData.background[bgToUse].tags);
            }
            
            // ステップ2: 各女性のプロンプトを生成（シーンの個別設定 > 共通設定）
            const characterParts = [];
            girlsToUse.forEach((girlData, idx) => {
                // シーンの個別設定があればそれを使用、なければ共通設定を使用
                const effectiveGirlData = sceneMultiGirlSettings[idx] || girlData;
                const charParts = [];
                const seenTags = new Set(); // 重複チェック用
                
                // 1girlを追加（重複チェック）
                if (!seenTags.has('1girl')) {
                    charParts.push('1girl');
                    seenTags.add('1girl');
                }
                
                // 女性の顔セットのタグを追加（共通設定から取得）
                const faceSetName = effectiveGirlData.faceSet || girlData.faceSet;
                if (faceSetName && storyPromptState.setsData.face[faceSetName]) {
                    const faceSet = storyPromptState.setsData.face[faceSetName];
                    if (faceSet.tags && faceSet.tags.length > 0) {
                        faceSet.tags.forEach(tag => {
                            const normalizedTag = String(tag || '').trim();
                            const lowerTag = normalizedTag.toLowerCase();
                            if (normalizedTag && !seenTags.has(lowerTag)) {
                                charParts.push(normalizedTag);
                                seenTags.add(lowerTag);
                            }
                        });
                    }
                }
                
                // 服装（シーンの個別設定 > 共通設定）
                const clothingToUse = effectiveGirlData.clothing || girlData.clothing;
                if (clothingToUse && storyPromptState.setsData.clothing[clothingToUse]) {
                    const clothingSet = storyPromptState.setsData.clothing[clothingToUse];
                    if (clothingSet.tags && clothingSet.tags.length > 0) {
                        clothingSet.tags.forEach(tag => {
                            const normalizedTag = String(tag || '').trim();
                            const lowerTag = normalizedTag.toLowerCase();
                            if (normalizedTag && !seenTags.has(lowerTag)) {
                                charParts.push(normalizedTag);
                                seenTags.add(lowerTag);
                            }
                        });
                    }
                }
                
                // ポーズ（シーンの個別設定 > 共通設定）
                const poseToUse = effectiveGirlData.pose || girlData.pose;
                if (poseToUse) {
                    // ポーズセットから該当するポーズを検索
                    let poseData = null;
                    if (storyPromptState.setsData.pose && storyPromptState.setsData.pose.groups) {
                        Object.values(storyPromptState.setsData.pose.groups).forEach(group => {
                            if (group.sections) {
                                Object.values(group.sections).forEach(section => {
                                    if (section[poseToUse]) {
                                        poseData = section[poseToUse];
                                    }
                                });
                            }
                        });
                    }
                    
                    if (poseData && poseData.tags && poseData.tags.length > 0) {
                        poseData.tags.forEach(tag => {
                            const normalizedTag = String(tag || '').trim();
                            const lowerTag = normalizedTag.toLowerCase();
                            if (normalizedTag && !seenTags.has(lowerTag)) {
                                charParts.push(normalizedTag);
                                seenTags.add(lowerTag);
                            }
                        });
                    }
                }
                
                // 服装状態（シーンの個別設定 > 共通設定）
                const clothingStateToUse = effectiveGirlData.clothingState || girlData.clothingState;
                if (clothingStateToUse && storyPromptState.setsData.clothingState[clothingStateToUse]) {
                    const clothingStateSet = storyPromptState.setsData.clothingState[clothingStateToUse];
                    if (clothingStateSet.tags && clothingStateSet.tags.length > 0) {
                        clothingStateSet.tags.forEach(tag => {
                            const normalizedTag = String(tag || '').trim();
                            const lowerTag = normalizedTag.toLowerCase();
                            if (normalizedTag && !seenTags.has(lowerTag)) {
                                charParts.push(normalizedTag);
                                seenTags.add(lowerTag);
                            }
                        });
                    }
                }
                
                // 表情（シーンの個別設定 > 共通設定）
                const expressionToUse = effectiveGirlData.expression || girlData.expression;
                if (expressionToUse && storyPromptState.setsData.expression[expressionToUse]) {
                    const expressionSet = storyPromptState.setsData.expression[expressionToUse];
                    if (expressionSet.tags && expressionSet.tags.length > 0) {
                        expressionSet.tags.forEach(tag => {
                            const normalizedTag = String(tag || '').trim();
                            const lowerTag = normalizedTag.toLowerCase();
                            if (normalizedTag && !seenTags.has(lowerTag)) {
                                charParts.push(normalizedTag);
                                seenTags.add(lowerTag);
                            }
                        });
                    }
                }
                
                characterParts.push(charParts);
            });
            
            // ステップ3: 共通タグ + 各女性のプロンプトをADDCOLで結合
            if (parts.length > 0) {
                scenePrompt += parts.join(', ') + ', ';
            }
            
            // 各女性のプロンプトをADDCOLで結合
            characterParts.forEach((charParts, idx) => {
                if (idx > 0) {
                    scenePrompt += ' ADDCOL ';
                }
                scenePrompt += charParts.join(', ');
            });
            
        } else {
            // 通常モード（1人または複数人女性モードがOFF）
            // 共通設定（顔・体は常に適用）
            if (commonFace && storyPromptState.setsData.face[commonFace]) {
                scenePrompt += storyPromptState.setsData.face[commonFace].tags.join(', ') + ', ';
            }
            if (commonBody && storyPromptState.setsData.body[commonBody]) {
                scenePrompt += storyPromptState.setsData.body[commonBody].tags.join(', ') + ', ';
            }
            
            // ポーズ
            if (scene.poseData && scene.poseData.tags) {
                scenePrompt += scene.poseData.tags.join(', ') + ', ';
            }
            
            // 背景（個別 > 共通）
            const bgToUse = scene.individual.background || commonBackground;
            if (bgToUse && storyPromptState.setsData.background[bgToUse]) {
                scenePrompt += storyPromptState.setsData.background[bgToUse].tags.join(', ') + ', ';
            }
            
            // 表情（個別のみ）
            if (scene.individual.expression && storyPromptState.setsData.expression[scene.individual.expression]) {
                scenePrompt += storyPromptState.setsData.expression[scene.individual.expression].tags.join(', ') + ', ';
            }
            
            // 服装（個別 > 共通）
            const clothingToUse = scene.individual.clothing || commonClothing;
            if (clothingToUse && storyPromptState.setsData.clothing[clothingToUse]) {
                scenePrompt += storyPromptState.setsData.clothing[clothingToUse].tags.join(', ') + ', ';
            }
            
            // 服装状態（体カテゴリの「服装状態」グループから選択されたセットのタグを使用）
            // 空文字列の場合は「通常」を意味し、何も追加しない
            if (scene.individual.clothingState && storyPromptState.setsData.clothingState[scene.individual.clothingState]) {
                const clothingStateSet = storyPromptState.setsData.clothingState[scene.individual.clothingState];
                if (clothingStateSet.tags && clothingStateSet.tags.length > 0) {
                    scenePrompt += clothingStateSet.tags.join(', ') + ', ';
                }
            }

            // 下着セット（服装カテゴリの「下着」セクションから選択されたセットのタグを使用）
            if (scene.individual.underwear && storyPromptState.setsData.underwear[scene.individual.underwear]) {
                const underwearSet = storyPromptState.setsData.underwear[scene.individual.underwear];
                if (underwearSet.tags && underwearSet.tags.length > 0) {
                    scenePrompt += underwearSet.tags.join(', ') + ', ';
                }
            }

            // 女性プロンプトをクリーンアップ（末尾のカンマを削除）
            scenePrompt = scenePrompt.replace(/, $/, '');
            
            // 男性が選択されている場合、BREAKを挿入して男性プロンプトを追加
            // 優先順位: 個別設定 > 共通設定
            let maleCharacterSet = '';
            let maleClothingState = '';
            
            if (scene.individual.maleCharacterSet === 'none') {
                // 個別設定で「なし」が選択されている場合 → 男性を表示しない
                maleCharacterSet = '';
            } else if (scene.individual.maleCharacterSet) {
                // 個別設定で男性が選択されている場合 → その男性を使用
                maleCharacterSet = scene.individual.maleCharacterSet;
                maleClothingState = scene.individual.maleClothingState || '';
            } else {
                // 個別設定が空（共通設定を使用）の場合 → 共通設定の男性を使用
                maleCharacterSet = storyPromptState.globalSettings.maleCharacterSet;
                maleClothingState = storyPromptState.globalSettings.maleClothingState || '';
            }
            
            if (maleCharacterSet && storyPromptState.setsData.maleCharacter[maleCharacterSet]) {
                scenePrompt += '\n\nBREAK\n\n';
                
                // 男性キャラクターのタグ
                const maleSet = storyPromptState.setsData.maleCharacter[maleCharacterSet];
                if (maleSet.tags && maleSet.tags.length > 0) {
                    scenePrompt += maleSet.tags.join(', ');
                }
                
                // 男性服装状態（体カテゴリの「服装状態」グループから選択されたセットのタグを使用）
                // 空文字列の場合は「通常」を意味し、何も追加しない
                if (maleClothingState && storyPromptState.setsData.clothingState[maleClothingState]) {
                    const maleClothingStateSet = storyPromptState.setsData.clothingState[maleClothingState];
                    if (maleClothingStateSet.tags && maleClothingStateSet.tags.length > 0) {
                        scenePrompt += ', ' + maleClothingStateSet.tags.join(', ');
                    }
                }
            }
        }
        
        allPrompts.push(scenePrompt);
    });
    
    preview.value = allPrompts.join('\n\n---\n\n');
}

// ========================================
// カテゴリ操作関数
// ========================================
async function saveCategoryAsSet(category) {
    console.log('🔧 saveCategoryAsSet 呼び出し:', category);
    const displayName = (CATEGORIES[category] && CATEGORIES[category].name) || category;
    const tagContainer = document.getElementById(`${category}-tags`);

    console.log('📊 デバッグ情報:', {
        category,
        displayName,
        tagContainerExists: !!tagContainer,
        tagContainerChildrenCount: tagContainer ? tagContainer.children.length : 0
    });

    if (!tagContainer || tagContainer.children.length === 0) {
        console.warn(`⚠️ ${displayName}カテゴリにタグがありません`);
        alert(`❌ ${displayName}カテゴリにタグがありません`);
        return;
    }

    const tagsByCategory = getTagsByCategoryFromUI();
    const selectedTags = (tagsByCategory[category] || [])
        .map(tag => String(tag || '').trim())
        .filter(Boolean);

    console.log('🏷️ 取得したタグ:', {
        category,
        selectedTagsCount: selectedTags.length,
        selectedTags: selectedTags.slice(0, 10)
    });

    if (!selectedTags.length) {
        console.warn(`⚠️ ${displayName}カテゴリに保存できるタグがありません`);
        alert(`❌ ${displayName}カテゴリに保存できるタグがありません`);
        return;
    }

    if (window.categorySets && typeof window.categorySets.openCreateModalFromClassifier === 'function') {
        try {
            await window.categorySets.openCreateModalFromClassifier({
                category,
                tags: selectedTags,
                suggestedName: `${category}_set_${Date.now()}`,
                sectionHint: '基本セット'
            });
            return;
        } catch (error) {
            console.error('openCreateModalFromClassifier error:', error);
            alert(`❌ ${displayName}セット保存UIの起動に失敗しました`);
            return;
        }
    }

    // フォールバック: 従来の汎用セット保存モーダル
    try {
        openSetSaveModal();
        const checks = document.querySelectorAll('#setSaveModal .set-cat');
        checks.forEach(ch => { ch.checked = (ch.value === category); });
        const nameEl = document.getElementById('setNameInput');
        if (nameEl) nameEl.value = `${category}_set_${Date.now()}`;
        const descEl = document.getElementById('setDescInput');
        if (descEl) descEl.value = `${displayName}カテゴリのセット`;
    } catch (e) {
        alert('❌ セット保存UIの起動に失敗しました');
    }
}

function clearCategory(category) {
    if (confirm(`${category}カテゴリをクリアしますか？`)) {
        const countElement = document.getElementById(`${category}-count`);
        const tagContainer = document.getElementById(`${category}-tags`);

        if (countElement) countElement.textContent = '0';
        if (tagContainer) tagContainer.innerHTML = '';

        console.log(`✅ ${category}カテゴリをクリアしました`);
    }
}

// ========================================
// プロンプト生成機能
// ========================================
function generatePrompt() {
    console.log('🎯 プロンプト生成実行');

    const allTags = [];
    const categoryOrder = ['people', 'face', 'body', 'clothing', 'pose', 'expression', 'background', 'quality', 'other'];

    // 各カテゴリからタグをoriginalIndexと共に収集
    categoryOrder.forEach(catKey => {
        const tagContainer = document.getElementById(`${catKey}-tags`);
        if (tagContainer) {
            Array.from(tagContainer.children).forEach((el, index) => {
                const text = el.textContent;
                const originalIndex = parseInt(el.dataset.originalIndex, 10);

                // 🔥 Phase 14.1修正: AI分類タグ（originalIndexなし）も含める
                if (!isNaN(originalIndex)) {
                    // 元の画像から抽出したタグ（originalIndexあり）
                    allTags.push({ text, originalIndex, category: catKey });
                } else {
                    // AI分類タグ（originalIndexなし）は後ろに配置
                    allTags.push({ text, originalIndex: 999999 + index, category: catKey });
                }
            });
            console.log(`  ${catKey}: ${tagContainer.children.length}タグ`);
        }
    });

    if (allTags.length === 0) {
        alert('❌ タグが分類されていません。まず画像をドロップしてください。');
        return;
    }

    // 🔥 originalIndexでソートして元の順序を復元
    allTags.sort((a, b) => a.originalIndex - b.originalIndex);

    // textのみ抽出してカンマ区切りでプロンプト生成
    const generatedPrompt = allTags.map(tag => tag.text).join(', ');
    console.log(`✅ ${allTags.length}タグからプロンプト生成完了（originalIndex順）`);

    // 出力エリアに表示
    const output = document.getElementById('promptOutput');
    output.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h3 style="margin-top: 0; color: #667eea;">🎨 生成されたプロンプト</h3>
            <textarea id="generatedPrompt"
                      style="width: 100%; height: 120px; padding: 12px;
                             border: 2px solid #667eea; border-radius: 8px;
                             font-family: monospace; font-size: 14px; resize: vertical;"></textarea>
            <button onclick="copyPromptToClipboard()"
                    style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                           color: white; border: none; padding: 10px 20px;
                           border-radius: 8px; font-weight: bold; margin-top: 10px;
                           cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                📋 コピー
            </button>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                合計 ${allTags.length} タグ
            </div>
        </div>
    `;

    // textareaに値を直接設定（LoRAタグ等の特殊文字保護）
    const textarea = document.getElementById('generatedPrompt');
    textarea.value = generatedPrompt;

    // スクロール
    output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyPromptToClipboard() {
    const textarea = document.getElementById('generatedPrompt');
    if (!textarea) {
        alert('❌ プロンプトが生成されていません');
        return;
    }

    textarea.select();
    textarea.setSelectionRange(0, 99999); // モバイル対応

    try {
        document.execCommand('copy');
        alert('✅ プロンプトをクリップボードにコピーしました');
        console.log('✅ コピー成功');
    } catch (err) {
        console.error('コピーエラー:', err);
        alert('❌ コピーに失敗しました');
    }
}

// ========================================
// 🎭 2人統合プロンプト生成（ADDCOL形式）
// ========================================
function generateDualPrompt() {
    console.log('🎯 2人統合プロンプト生成実行');

    // 📌 正しいADDCOL形式: (2girls:1.6),multiple girls, [品質],[LoRA], 1girl,[キャラ1] ADDCOL 1girl,[キャラ2]
    const parts = [];

    // ステップ0: 人数タグを先頭に追加（(2girls:1.6),multiple girls, の形式）
    // キャラクター数を動的に判定
    let characterCount = 0;
    const dualModeCategories = ['face', 'body', 'poseemotion', 'clothing'];
    
    // char1, char2, char3... のタグコンテナが存在するか確認
    for (let i = 1; i <= 5; i++) {
        let hasTags = false;
        for (const catKey of dualModeCategories) {
            const tags = collectTagsFromContainer(`${catKey}-char${i}-tags`);
            if (tags.length > 0) {
                hasTags = true;
                break;
            }
        }
        if (hasTags) {
            characterCount = i;
        } else {
            break;
        }
    }
    
    if (characterCount === 0) {
        alert('❌ キャラクターのタグが見つかりません');
        return;
    }
    
    // 人数タグを先頭に追加: (2girls:1.6),multiple girls,
    const peopleTag = `(${characterCount}girls:1.6),multiple girls`;
    parts.push(peopleTag);

    // ステップ1: 品質タグ
    const qualityTags = collectTagsFromContainer('quality-tags');
    if (qualityTags.length > 0) {
        parts.push(...qualityTags);
    }

    // ステップ2: 全LoRAタグ（全カテゴリから収集・重複排除）
    const allLoraTags = extractAllLoRATags();
    if (allLoraTags.length > 0) {
        parts.push(...allLoraTags);
    }

    // ステップ3以降: 各キャラクターのプロンプトを生成
    const characterParts = [];
    for (let i = 1; i <= characterCount; i++) {
        const charParts = [];
        const seenTags = new Set(); // 重複チェック用
        
        // 各カテゴリからタグを収集
        dualModeCategories.forEach(catKey => {
            const tags = collectTagsFromContainer(`${catKey}-char${i}-tags`);
            if (tags.length > 0) {
                tags.forEach(tag => {
                    const normalizedTag = tag.trim();
                    const lowerTag = normalizedTag.toLowerCase();
                    // 重複を避ける（大文字小文字を区別しない）
                    if (!seenTags.has(lowerTag)) {
                        charParts.push(normalizedTag);
                        seenTags.add(lowerTag);
                    }
                });
            }
        });

        // 1girlが既に含まれているかチェック（大文字小文字を区別しない）
        const has1girl = seenTags.has('1girl');
        
        // 1girlが含まれていない場合のみ先頭に追加
        if (!has1girl) {
            charParts.unshift('1girl');
        }

        if (charParts.length === 0) {
            alert(`❌ キャラ${i}のタグが不足しています`);
            return;
        }
        
        characterParts.push(charParts);
    }

    // ステップ4: 各キャラクターのプロンプトをADDCOLで結合
    for (let i = 0; i < characterParts.length; i++) {
        if (i > 0) {
            parts.push('ADDCOL');
        }
        parts.push(...characterParts[i]);
    }

    // 最終プロンプト生成（カンマ区切り、ADDCOLの前後にスペース）
    const dualPrompt = parts.map(p => p === 'ADDCOL' ? ' ADDCOL ' : p).join(',').replace(',ADDCOL,', ' ADDCOL ');

    // 出力エリアに表示
    const output = document.getElementById('promptOutput');
    
    // キャラクター別のタグ数を計算
    const characterTagCounts = characterParts.map((charParts, idx) => 
        `${idx + 1}: ${charParts.length - 1}タグ`
    ).join(' | ');
    
    output.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h3 style="margin-top: 0; color: #a855f7;">✨ ${characterCount}人統合プロンプト（ADDCOL形式）</h3>
            <textarea id="generatedPrompt"
                      style="width: 100%; height: 150px; padding: 12px;
                             border: 2px solid #a855f7; border-radius: 8px;
                             font-family: monospace; font-size: 14px; resize: vertical;"></textarea>
            <button onclick="copyPromptToClipboard()"
                    style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                           color: white; border: none; padding: 10px 20px;
                           border-radius: 8px; font-weight: bold; margin-top: 10px;
                           cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                📋 コピー
            </button>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                キャラ ${characterTagCounts}
            </div>
        </div>
    `;

    const textarea = document.getElementById('generatedPrompt');
    textarea.value = dualPrompt;
    output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========================================
// 💾 プロンプト出力（ファイル保存）
// ========================================
function outputPromptToFile() {
    const textarea = document.getElementById('generatedPrompt');
    if (!textarea || !textarea.value) {
        alert('❌ 生成されたプロンプトがありません。先にプロンプトを生成してください。');
        return;
    }

    const prompt = textarea.value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `prompt_${timestamp}.txt`;

    // ファイルダウンロード
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✅ プロンプトを ${filename} に出力しました`);
    alert(`✅ プロンプトを ${filename} に出力しました`);
}

// ========================================
// Phase 13: Hybrid Classification System
// コンテンツ検出 → 辞書/AI自動切り替え
// ========================================

/**
 * 🔞 大人向けコンテンツ検出関数
 * @param {string} promptText - プロンプトテキスト
 * @returns {boolean} - 大人向けコンテンツの場合true
 */
function detectAdultContent(promptText) {
    if (!promptText || typeof promptText !== 'string') {
        return false;
    }

    // 🔞 大人向けキーワードリスト（英語）
    const adultKeywords = [
        'nipples', 'nude', 'naked', 'sex', 'pussy', 'penis', 'explicit',
        'porn', 'xxx', 'nsfw', 'hentai', 'vagina', 'anus', 'erection',
        'fellatio', 'cunnilingus', 'ejaculation', 'orgasm', 'masturbation',
        'penetration', 'intercourse', 'censored', 'uncensored',
        'mosaic censoring', 'bar censor', 'completely nude', 'topless',
        'spread legs', 'spread pussy', 'breast grab', 'nipple tweak',
        'cum', 'semen', 'pussy juice', 'sweat', 'saliva drip'
    ];

    const lowerPrompt = promptText.toLowerCase();

    // キーワードマッチング
    const hasAdultKeyword = adultKeywords.some(keyword =>
        lowerPrompt.includes(keyword)
    );

    if (hasAdultKeyword) {
        console.log('🔞 大人向けコンテンツ検出: 辞書分類モードを使用');
    }

    return hasAdultKeyword;
}

/**
 * 🧠 スマート分類関数（Hybrid System）
 * 大人向けコンテンツ → 辞書のみ
 * 通常コンテンツ → AI優先（失敗時は辞書フォールバック）
 *
 * @param {Array<string>} tags - タグ配列
 * @param {string} promptText - 元のプロンプトテキスト（コンテンツ検出用）
 * @returns {Promise<Object>} - カテゴリ分類結果
 */
async function smartClassifyTags(tags, promptText = '', options = {}) {
    const isAdultContent = detectAdultContent(promptText);

    const forceDictionary = options && (options.forceDictionary || options.source === 'tagger');
    if (isAdultContent || forceDictionary) {
        // 🔞 大人向けコンテンツ → 辞書分類のみ
        console.log('📚 辞書分類を実行（adult or forced）');
        return await categorizeWithLearning(tags);
    } else {
        // ✅ 通常コンテンツ → AI優先、失敗時は辞書フォールバック
        console.log('🤖 通常コンテンツ: AI分類を試行');

        try {
            // 1️⃣ APIキー確認
            const apiKeyResult = await window.electronAPI.loadApiKey();

            if (!apiKeyResult.success || !apiKeyResult.hasApiKey) {
                console.log('⚠️ APIキー未登録 → 辞書分類にフォールバック');
                return await categorizeWithLearning(tags);
            }

            // 2️⃣ AI分類実行（テキストベース）
            const result = await window.electronAPI.classifyTextWithGemini(promptText);

            if (result.success && result.categories) {
                console.log('✅ AI分類成功');

                // AI分類結果をcategorizeTags()と同じ形式に変換
                const convertedCategories = {};
                Object.keys(CATEGORIES).forEach(catKey => {
                    convertedCategories[catKey] = [];
                });

                // AIの結果を変換（配列形式 → オブジェクト形式）
                Object.keys(result.categories).forEach(catKey => {
                    if (CATEGORIES[catKey]) {
                        const aiTags = result.categories[catKey];
                        convertedCategories[catKey] = aiTags.map((tag, idx) => ({
                            text: tag,
                            originalIndex: idx
                        }));
                    }
                });

                // 後処理: LoRAは常にqualityへ、表情はexpressionへ、背景語はbackgroundへ
                const moveTo = (fromKey, toKey, predicate) => {
                    const from = convertedCategories[fromKey] || [];
                    const keep = [];
                    for (const item of from) {
                        const text = String(item.text || '');
                        if (predicate(text)) {
                            (convertedCategories[toKey] ||= []).push(item);
                        } else {
                            keep.push(item);
                        }
                    }
                    convertedCategories[fromKey] = keep;
                };

                // LoRA
                const isLora = (t) => /<\s*(lora|lyco|hypernet)\s*:/i.test(t) || /^\(lora:/i.test(t);
                for (const k of Object.keys(convertedCategories)) {
                    if (k === 'quality') continue;
                    moveTo(k, 'quality', isLora);
                }

                // 表情: EXPRESSION_DICT に入っているものは expression へ寄せる
                const isExpr = (t) => EXPRESSION_DICT && EXPRESSION_DICT.has(String(t).toLowerCase());
                moveTo('face', 'expression', isExpr);
                moveTo('pose', 'expression', isExpr);

                // 背景語の強制移動（よくある語）
                const BG = new Set(['tree','trees','sky','beach','ocean','sea','room','bedroom','forest','city','outdoors','indoors','night','day','pool','classroom','background']);
                const isBg = (t) => BG.has(String(t).toLowerCase());
                moveTo('pose', 'background', isBg);

                // 重要: グローバル学習タグの自動混入は行わない
                // 学習は per-image オーバーレイ（learn-all.js）で明示適用する

                return convertedCategories;

            } else {
                console.log('⚠️ AI分類失敗 → 辞書分類にフォールバック');
                console.log('エラー詳細:', result.error);
                return await categorizeWithLearning(tags);
            }

        } catch (error) {
            console.error('❌ AI分類エラー:', error);
            console.log('📚 辞書分類にフォールバック');
            return await categorizeWithLearning(tags);
        }
    }
}

// categorizeTags() 実行前に学習タグをCATEGORIESへ反映してから分類する
async function categorizeWithLearning(tags) {
    try {
        await mergeLearnedTagsIntoCategories();
    } catch (e) {
        console.warn('⚠️ 学習タグの適用に失敗（分類継続）:', e);
    }
    const base = categorizeTags(tags) || {};
    // UI互換のため、poseemotion を pose / expression に分配
    if (base.poseemotion) {
        const poseTags = [];
        const exprTags = [];
        for (const item of base.poseemotion) {
            const text = (typeof item === 'string' ? item : item.text) || '';
            if (EXPRESSION_DICT.has(text.toLowerCase())) exprTags.push(item);
            else poseTags.push(item);
        }
        base.pose = poseTags;
        base.expression = exprTags;
    }
    return base;
}

// MultiCharacterManager用にグローバル公開
window.categorizeTags = categorizeTags;
window.detectAdultContent = detectAdultContent; // 🆕 Phase 13
window.smartClassifyTags = smartClassifyTags;   // 🆕 Phase 13
window.saveCategoryAsSet = saveCategoryAsSet;   // セット保存ボタン用
console.log('✅ saveCategoryAsSet グローバル公開完了:', typeof window.saveCategoryAsSet);

// ========================================
// Phase 13.1: SD WebUIポート設定機能
// ========================================

/**
 * 💾 保存されたポート番号を読み込む
 * @returns {number} - ポート番号（デフォルト: 8500）
 */
function loadSavedPort() {
    try {
        const savedPort = localStorage.getItem('sdWebuiPort');
        console.log('🔍 localStorage確認:', { savedPort, type: typeof savedPort });

        if (savedPort) {
            const port = parseInt(savedPort, 10);
            console.log('🔍 パース結果:', { port, isValid: port >= 1 && port <= 65535 });

            if (port >= 1 && port <= 65535) {
                console.log(`✅ 保存されたポート番号を読み込み: ${port}`);
                return port;
            } else {
                console.warn('⚠️ 無効なポート番号:', port);
            }
        } else {
            console.log('⚠️ localStorageにsdWebuiPortが保存されていません');
        }
    } catch (error) {
        console.error('⚠️ ポート番号読み込みエラー:', error);
    }
    console.log('✅ デフォルトポート番号を使用: 8500');
    return 8500; // デフォルト
}

/**
 * 💾 ポート番号を保存
 * @param {number} port - ポート番号
 */
function savePort(port) {
    try {
        if (port >= 1 && port <= 65535) {
            localStorage.setItem('sdWebuiPort', port.toString());
            console.log(`✅ ポート番号を保存: ${port}`);
            updatePortDisplay(port);
            return true;
        } else {
            console.error('❌ 無効なポート番号:', port);
            return false;
        }
    } catch (error) {
        console.error('❌ ポート番号保存エラー:', error);
        return false;
    }
}

/**
 * 🔄 ポート表示を更新
 * @param {number} port - ポート番号
 */
function updatePortDisplay(port) {
    const display = document.getElementById('currentPortDisplay');
    if (display) {
        display.textContent = port;
    }
}

/**
 * 🔌 SD WebUIポート設定モーダルの初期化
 */
function initPortSettingModal() {
    const openPortModalBtn = document.getElementById('openPortSettingModalBtn');
    const portModal = document.getElementById('portSettingModal');
    const closePortModalBtn = document.getElementById('closePortModalBtn');
    const savePortBtn = document.getElementById('savePortBtn');
    const resetPortBtn = document.getElementById('resetPortBtn');
    const portInput = document.getElementById('portInput');

    if (!openPortModalBtn || !portModal) {
        console.warn('⚠️ ポート設定モーダル要素が見つかりません');
        return;
    }

    // 初期表示を更新
    const currentPort = loadSavedPort();
    updatePortDisplay(currentPort);

    // モーダルを開く
    openPortModalBtn.addEventListener('click', () => {
        const currentPort = loadSavedPort();
        portInput.value = currentPort;
        portModal.style.display = 'block';
    });

    // モーダルを閉じる
    if (closePortModalBtn) {
        closePortModalBtn.addEventListener('click', () => {
            portModal.style.display = 'none';
        });
    }

    // ポート番号を保存
    if (savePortBtn && portInput) {
        savePortBtn.addEventListener('click', () => {
            const port = parseInt(portInput.value, 10);

            if (isNaN(port) || port < 1 || port > 65535) {
                alert('❌ 無効なポート番号です。1〜65535の範囲で入力してください。');
                return;
            }

            if (savePort(port)) {
                alert(`✅ ポート番号を保存しました: ${port}\n\nSD WebUIが http://127.0.0.1:${port} で起動していることを確認してください。`);
                portModal.style.display = 'none';
            } else {
                alert('❌ ポート番号の保存に失敗しました。');
            }
        });
    }

    // デフォルトに戻す
    if (resetPortBtn) {
        resetPortBtn.addEventListener('click', () => {
            if (confirm('⚠️ ポート番号をデフォルト(8500)に戻しますか？')) {
                if (savePort(8500)) {
                    portInput.value = 8500;
                    alert('✅ ポート番号をデフォルト(8500)に戻しました。');
                }
            }
        });
    }

    // モーダル外クリックで閉じる
    window.addEventListener('click', (event) => {
        if (event.target === portModal) {
            portModal.style.display = 'none';
        }
    });

    console.log('✅ SD WebUIポート設定モーダル初期化完了');
}

// Phase 13.1: ページ読み込み時にポート設定モーダルを初期化
document.addEventListener('DOMContentLoaded', () => {
    initPortSettingModal();
});

// グローバル公開（他のモジュールから使用可能に）
window.loadSavedPort = loadSavedPort;
window.savePort = savePort;

// ======== 🎨 SD WebUI Reforge API統合システム (Phase 14) ========

// ========================================
// 🎛️ SD API設定システム (Phase 14.1)
// ========================================
const SD_API_SETTINGS = {
    tagger: {
        model: 'wd14-vit.v2',
        threshold: 0.35,
        compatMode: false // WD14互換モード（後処理を最小限に）
    },
    txt2img: {
        width: 512,
        height: 512,
        steps: 20,
        sampler_name: 'DPM++ 2M',
        cfg_scale: 7,
        restore_faces: false
    }
};

/**
 * タグを分類してUIに表示
 * @param {string} promptText - カンマ区切りのタグ文字列
 */
async function classifyAndDisplay(promptText, options = {}) {
    console.log('🎯 タグ分類・表示開始');

    try {
        // タグを配列に変換
        const tags = promptText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        console.log(`📋 分類対象タグ数: ${tags.length}`);

        // smartClassifyTags()でAI分類または辞書分類
        const categorizedTags = await smartClassifyTags(tags, promptText, options);

        // カテゴリマッピング（Geminiカテゴリ名 → アプリ内カテゴリID）
        const categoryMapping = {
            'other': 'other',
            'people': 'people',
            'face': 'face',
            'body': 'body',
            'pose': 'pose',
            'background': 'background',
            'clothing': 'clothing',
            'expression': 'expression',
            'quality': 'quality'
        };

        // 既存タグをクリア（Tagger抽出タグのみ表示）
        console.log('🗑️ 既存タグをクリア');
        for (const appCategory of Object.values(categoryMapping)) {
            const tagContainer = document.getElementById(`${appCategory}-tags`);
            if (tagContainer) {
                tagContainer.innerHTML = '';
                console.log(`  ${appCategory}: クリア完了`);
            }
        }

        // 各カテゴリの結果を表示
        for (const [geminiCategory, appCategory] of Object.entries(categoryMapping)) {
            const categoryTags = categorizedTags[geminiCategory] || [];

            if (categoryTags.length > 0) {
                const tagContainer = document.getElementById(`${appCategory}-tags`);

                if (tagContainer) {
                    // Tagger抽出タグを追加（青緑グラデーション）
                    categoryTags.forEach(tagObj => {
                        const tagText = typeof tagObj === 'string' ? tagObj : tagObj.text;

                        const tagElement = document.createElement('div');
                        tagElement.className = 'tag-item tagger-extracted';
                        tagElement.textContent = tagText;
                        tagElement.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';  // 青緑グラデーション
                        tagElement.style.border = '2px solid #22d3ee';
                        tagElement.style.cursor = 'pointer';

                        // クリックで削除
                        tagElement.addEventListener('click', () => {
                            tagElement.remove();
                            updateCategoryCount(appCategory);
                        });

                        tagContainer.appendChild(tagElement);
                    });

                    // カテゴリカウント更新
                    updateCategoryCount(appCategory);

                    console.log(`✅ ${appCategory}: ${categoryTags.length}タグ追加`);
                }
            }
        }

        const normalizedCategorized = {};
        Object.entries(categorizedTags || {}).forEach(([key, list]) => {
            normalizedCategorized[key] = (list || []).map(item => {
                if (typeof item === 'string') {
                    return { text: item, originalIndex: null };
                }
                return {
                    text: item && typeof item.text !== 'undefined' ? item.text : String(item),
                    originalIndex: item && typeof item.originalIndex !== 'undefined' ? item.originalIndex : null
                };
            });
        });

        const categoryCounts = {};
        Object.keys(normalizedCategorized).forEach(key => {
            categoryCounts[key] = normalizedCategorized[key].length;
        });

        window.lastClassificationSnapshot = {
            timestamp: new Date().toISOString(),
            source: options && options.source ? options.source : 'manual',
            promptText,
            tagCount: tags.length,
            categorized: normalizedCategorized,
            categoryCounts,
            options: { ...options }
        };

        console.log('✅ タグ分類・表示完了');
        showMessage('✅ タグを分類して表示しました', 'success');

    } catch (error) {
        console.error('❌ タグ分類・表示エラー:', error);
        showMessage(`❌ タグ表示エラー: ${error.message}`, 'error');
    }
}

/**
 * Tagger APIで画像解析
 * @param {File} imageFile - 解析する画像ファイル
 * @returns {Promise<Object>} - {success, tags, rating}
 */
async function analyzeImageWithTagger(imageFile) {
    console.log('🔍 Tagger API: 画像解析開始', imageFile.name);
    showMessage('🔄 Tagger APIで画像を解析中...', 'info');

    try {
        const port = loadSavedPort();
        const TAGGER_API_URL = `http://127.0.0.1:${port}/tagger/v1/interrogate`;

        // 画像をbase64エンコード
        const base64Image = await fileToBase64(imageFile);

        // Tagger APIリクエスト（互換/ローカル閾値に応じて閾値を分担）
        const globalThr = SD_API_SETTINGS?.tagger?.threshold ?? 0.35;
        const applyLocalThreshold = !SD_API_SETTINGS?.tagger?.compatMode; // 互換ONならTagger側で閾値適用
        const requestData = {
            image: base64Image,
            model: SD_API_SETTINGS.tagger.model,
            threshold: applyLocalThreshold ? 0.0 : globalThr,
            queue: '',
            name_in_queue: ''
        };

        const response = await fetch(TAGGER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const tags = result.caption?.tag || {};
        let rawArray = Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, score]) => ({ tag, score }));

        // パリティ: Raw
        const parity = { raw: rawArray.slice(0, 300) };

        // 閾値適用（カテゴリ別に対応）
        const thrByCat = (SD_API_SETTINGS?.tagger?.thresholds) || {};
        const norm = (s) => String(s||'').toLowerCase().replace(/_/g,' ').trim();
        const catOf = (t) => {
            const n = norm(t);
            if (WD14_LABELS && WD14_LABELS[n]) return WD14_LABELS[n];
            return null;
        };
        const thresholded = applyLocalThreshold
            ? rawArray.filter(it => {
                const cat = catOf(it.tag);
                const thr = (cat && typeof thrByCat[cat] === 'number') ? thrByCat[cat] : globalThr;
                return Number(it.score||0) >= thr;
              })
            : rawArray.slice();
        parity.thresholded = thresholded.slice(0, 300);

        // 🔧 WD14/DeepDanbooruタグのノイズを整理（互換モードでは最小）
        const cleaned = cleanTaggerTags(thresholded);
        parity.cleaned = cleaned.slice(0, 300);

        console.log(`✅ Tagger API成功: ${cleaned.length}個のタグ検出（閾値・整形後）`);
        showMessage(`✅ ${cleaned.length}個のタグを検出しました`, 'success');

        // タグを9カテゴリに分類してUIに追加
        const promptText = cleaned.map(t => t.tag).join(', ');
        await classifyAndDisplay(promptText, { source: 'tagger' });

        // 分類スナップショット
        try {
            const cats = ['people','face','body','pose','expression','background','clothing','quality','other'];
            const snap = {};
            for (const c of cats) {
                const el = document.getElementById(`${c}-tags`);
                if (!el) continue;
                snap[c] = Array.from(el.querySelectorAll('.tag,.tag-item')).map(n => n.textContent.trim()).filter(Boolean);
            }
            parity.categorized = snap;
        } catch {}

        lastTaggerParity = parity;
        try { window.lastTaggerParity = parity; } catch {}
        renderTaggerParity(parity);

        return { success: true, tags: cleaned, rating: result.caption?.rating };
    } catch (error) {
        console.error('❌ Tagger API Error:', error);
        showMessage(`❌ Tagger API エラー: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// ========================================
// Tagger出力のクリーンアップ（SD向け）
// ========================================
function cleanTaggerTags(items) {
    if (!Array.isArray(items)) return [];
    // 互換モード：最小限のクリーンアップのみ（WD14の出力に近づける）
    if (SD_API_SETTINGS?.tagger?.compatMode) {
        const simpleBlacklist = new Set(['signature','watermark','text','logo','username','translated']);
        const out = [];
        const seen = new Set();
        for (const it of items) {
            let tag = String(it.tag || '').trim();
            const score = Number(it.score || 0);
            if (!tag) continue;
            // LoRAや括弧重みは除外
            if (tag.toLowerCase().includes('<lora:') || /^\(.*\)$/.test(tag)) continue;
            if (simpleBlacklist.has(tag.toLowerCase())) continue;
            const key = tag.toLowerCase();
            if (!seen.has(key)) { seen.add(key); out.push({ tag, score }); }
        }
        // スコア降順で返す（過剰整形しない）
        return out.sort((a,b) => b.score - a.score);
    }

    const blacklist = new Set([
        'artist name','signature','watermark','text','logo','username',
        'copyright','translated','rating','official art',
        'caption','commentary','manga','comic','parody',
        'newest','character:','the pose',':d','presenting',
        'depth of field','blurry','blurry background'
    ]);

    // NSFW / 過剰露出系（Tagger誤検出のノイズになりやすいものを除外）
    const nsfw = new Set([
        'nipples','naked','nude','pussy','groin','cameltoe','ass','ass visible through thighs',
        'panties','underwear','lingerie','bra','cleavage','breasts','huge breasts','large breasts',
        'see-through','underwear only','skindentation'
    ]);

    // 品質系（SDでは品質は別管理するため、Taggerからは無視）
    const quality = new Set([
        'masterpiece','best quality','high quality','ultra quality','amazing quality',
        'highres','very highres','ultra highres','absurdres','8k','4k','extremely detailed',
        'oneiric','cg','unity','wallpaper'
    ]);

    // 非ASCII（例: 一様分布）を除外
    const isAscii = (s) => /^[\x00-\x7F]+$/.test(s);

    // 正規化＋重複統合（高スコア優先）
    const byTag = new Map();
    for (const it of items) {
        let tag = String(it.tag || '').trim().toLowerCase();
        // アンダースコアはスペースに正規化
        tag = tag.replace(/_/g, ' ');
        const score = Number(it.score || 0);
        if (!tag || !isAscii(tag)) continue;
        if (blacklist.has(tag)) continue;
        if (quality.has(tag)) continue; // Tagger由来の品質語は無視
        if (nsfw.has(tag)) continue;
        if (tag.startsWith('<lora') || tag.includes('lora:')) continue; // Tagger経由ではLoRAを採用しない
        if (/^\(.+\)$/.test(tag)) continue; // 重み表現 (xxx) は除外
        // よくあるノイズ除去
        if (tag === 'bad anatomy' || tag === 'lowres') continue;
        if (byTag.has(tag)) {
            if (score > byTag.get(tag).score) byTag.set(tag, { tag, score });
        } else {
            byTag.set(tag, { tag, score });
        }
    }

    // グループ選択（相反タグから一つ選ぶ）
    const pickOne = (candidates) => {
        let best = null;
        for (const key of candidates) {
            const it = byTag.get(key);
            if (it && (!best || it.score > best.score)) best = it;
        }
        // 採用外は削除
        for (const key of candidates) {
            if (!best || key !== best.tag) byTag.delete(key);
        }
        if (best) byTag.set(best.tag, best);
    };

    // 目の色
    pickOne(['blue eyes','brown eyes','green eyes','grey eyes','gray eyes','red eyes','white eyes','purple eyes','yellow eyes']);
    // 髪色
    pickOne(['white hair','blonde hair','brown hair','black hair','red hair','silver hair','grey hair','gray hair','blue hair','green hair']);
    // 髪長
    pickOne(['short hair','medium hair','long hair']);
    // 背景（simple を優先的に残し、他は最大1つ）
    const bgCandidates = ['simple background','white background','black background','blue background','grey background','gray background'];
    if (byTag.has('simple background')) {
        for (const k of bgCandidates) if (k !== 'simple background') byTag.delete(k);
    } else {
        pickOne(bgCandidates);
    }

    // 胸サイズ: small/large/specific があるなら generic 'breasts' を除外
    const breastSpecific = ['small breasts','large breasts','medium breasts'];
    const hasSpecific = breastSpecific.some(k => byTag.has(k));
    if (hasSpecific) byTag.delete('breasts');

    // ボトムス競合（pants/shorts/skirt）→ 1つ
    pickOne(['pants','shorts','skirt']);

    // 同義正規化（gray→grey）
    if (byTag.has('gray eyes') && !byTag.has('grey eyes')) {
        const it = byTag.get('gray eyes'); byTag.delete('gray eyes'); byTag.set('grey eyes', { tag: 'grey eyes', score: it.score });
    }
    if (byTag.has('gray hair') && !byTag.has('grey hair')) {
        const it = byTag.get('gray hair'); byTag.delete('gray hair'); byTag.set('grey hair', { tag: 'grey hair', score: it.score });
    }
    if (byTag.has('school uniform')) {
        // uniform 下位の重複ノイズを軽減（color background等は残す）
        // ここでは何もしないが、将来は学園別制服優先などの優先度を導入可能
    }

    // より具体的な "* uniform" があれば generic 'uniform' を落とす
    const hasSpecificUniform = Array.from(byTag.keys()).some(k => k !== 'uniform' && / uniform$/.test(k));
    if (hasSpecificUniform) byTag.delete('uniform');

    // 最初のクリーン結果
    let cleaned = Array.from(byTag.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 64); // 過剰な長文化を防ぐ

    // クリーニングで削りすぎた場合は緩和版にフォールバック
    if (cleaned.length < 6) {
        const relaxed = new Map();
        for (const it of items) {
            let tag = String(it.tag || '').trim().toLowerCase();
            const score = Number(it.score || 0);
            if (!tag || !isAscii(tag)) continue;
            if (blacklist.has(tag)) continue;
            // 極力残す（グルーピングは行わない）
            const prev = relaxed.get(tag);
            if (!prev || score > prev.score) relaxed.set(tag, { tag, score });
        }

        // uniform の具体化があれば generic を除外
        const hasSpec = Array.from(relaxed.keys()).some(k => k !== 'uniform' && / uniform$/.test(k));
        if (hasSpec) relaxed.delete('uniform');

        cleaned = Array.from(relaxed.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 64);

        // 人物の最低限の補強
        const tagsSet = new Set(cleaned.map(x => x.tag));
        if (!tagsSet.has('1girl') && tagsSet.has('solo')) {
            cleaned.unshift({ tag: '1girl', score: 1.0 });
        }
    }

    return cleaned;
}

// Taggerパリティ表示
function renderTaggerParity(p) {
    try {
        const panel = document.getElementById('taggerParityPanel');
        if (!panel) return;
        const fmt = (arr) => Array.isArray(arr) ? arr.map(it => (it.tag?`${it.tag} (${(it.score||0).toFixed(2)})`:String(it))).join(', ') : '';
        const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
        setText('parityRaw', fmt(p.raw||[]));
        setText('parityThresholded', fmt(p.thresholded||[]));
        setText('parityCleaned', fmt(p.cleaned||[]));
        const cat = p.categorized||{};
        const catText = Object.keys(cat).map(k => `${k}: ${cat[k].join(', ')}`).join('\n');
        setText('parityCategorized', catText);
        panel.style.display = 'block';
    } catch {}
}

/**
 * txt2img APIで画像生成
 * @returns {Promise<Object>} - {success, image, info, time}
 */
async function generateImageWithAPI() {
    console.log('🎨 txt2img API: 画像生成開始');
    showMessage('🔄 SD WebUI Reforgeで画像を生成中...', 'info');

    try {
        const port = loadSavedPort();
        const TXT2IMG_API_URL = `http://127.0.0.1:${port}/sdapi/v1/txt2img`;

        const prompt = generatePromptFromCategories();
        const negativePrompt = generateNegativePrompt();

        if (!prompt || prompt.trim() === '') {
            showMessage('❌ プロンプトが空です。タグを追加してください', 'error');
            return { success: false, error: 'Empty prompt' };
        }

        console.log('📝 生成プロンプト:', prompt);
        console.log('🚫 ネガティブプロンプト:', negativePrompt);

        // 画像生成リクエスト（設定値使用）
        const requestData = {
            prompt: prompt,
            negative_prompt: negativePrompt || 'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers',
            steps: SD_API_SETTINGS.txt2img.steps,
            sampler_name: SD_API_SETTINGS.txt2img.sampler_name,
            cfg_scale: SD_API_SETTINGS.txt2img.cfg_scale,
            width: SD_API_SETTINGS.txt2img.width,
            height: SD_API_SETTINGS.txt2img.height,
            seed: -1,
            batch_size: 1,
            n_iter: 1,
            restore_faces: SD_API_SETTINGS.txt2img.restore_faces
        };

        // ✨ Checkpoint指定がある場合のみ override_settings を追加
        if (SD_API_SETTINGS.txt2img.sd_model_checkpoint && SD_API_SETTINGS.txt2img.sd_model_checkpoint.trim() !== '') {
            requestData.override_settings = {
                sd_model_checkpoint: SD_API_SETTINGS.txt2img.sd_model_checkpoint
            };
            console.log('🎨 Checkpoint指定:', SD_API_SETTINGS.txt2img.sd_model_checkpoint);
        }

        const startTime = Date.now();
        const response = await fetch(TXT2IMG_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            let detail = '';
            try { detail = await response.text(); } catch {}
            const trimmed = detail ? ` - ${detail.substring(0, 300)}` : '';
            throw new Error(`API Error: ${response.status} ${response.statusText}${trimmed}`);
        }

        const result = await response.json();
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        if (result.images && result.images.length > 0) {
            const imageBase64 = result.images[0];
            displayGeneratedImage(imageBase64, result.info);
            console.log(`✅ txt2img API成功: 画像生成完了 (${elapsedTime}秒)`);
            showMessage(`✅ 画像生成完了 (${elapsedTime}秒)`, 'success');
            return { success: true, image: imageBase64, info: result.info, time: elapsedTime };
        } else {
            throw new Error('No images in response');
        }
    } catch (error) {
        console.error('❌ txt2img API Error:', error);
        showMessage(`❌ 画像生成エラー: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * ファイルをbase64に変換
 * @param {File} file - 変換するファイル
 * @returns {Promise<string>} - base64エンコードされた文字列
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 9カテゴリからプロンプト生成
 * @returns {string} - 生成されたプロンプト
 */
function generatePromptFromCategories() {
    const parts = [];
    const seen = new Set();
    // ✅ 修正: 正しいカテゴリ名を使用（9カテゴリ完全対応）
    const categoryOrder = ['people', 'face', 'body', 'pose', 'clothing', 'expression', 'background', 'quality', 'other'];

    for (const category of categoryOrder) {
        const container = document.getElementById(`${category}-tags`);
        if (container) {
            // ✅ 修正: .tag-item クラスを使用（Tagger抽出タグとAI分類タグの両方に対応）
            const tags = Array.from(container.querySelectorAll('.tag-item, .tag'))
                .map(tag => tag.textContent.trim())
                .filter(text => text.length > 0);
            for (const t of tags) {
                const key = t.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    parts.push(t);
                }
            }
        }
    }

    return parts.join(', ');
}

/**
 * ネガティブプロンプト生成
 * @returns {string} - ネガティブプロンプト
 */
function generateNegativePrompt() {
    // デフォルトのネガティブプロンプト
    return 'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry';
}

/**
 * 生成画像を表示
 * @param {string} base64Image - base64エンコードされた画像
 * @param {string} infoJson - 生成情報のJSON文字列
 */
function displayGeneratedImage(base64Image, infoJson) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); display: flex; flex-direction: column;
        align-items: center; justify-content: center; z-index: 10000; padding: 20px;
    `;

    const img = document.createElement('img');
    img.src = `data:image/png;base64,${base64Image}`;
    img.style.cssText = `
        max-width: 90%; max-height: 80vh; border-radius: 10px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;

    const info = document.createElement('div');
    info.style.cssText = `
        color: white; margin-top: 20px; padding: 15px;
        background: rgba(255,255,255,0.1); border-radius: 10px;
        max-width: 80%; font-size: 14px; max-height: 150px; overflow-y: auto;
    `;

    try {
        const infoData = JSON.parse(infoJson);
        info.innerHTML = `
            <strong>生成情報:</strong><br>
            Seed: ${infoData.seed || 'N/A'}<br>
            Sampler: ${infoData.sampler_name || 'N/A'}<br>
            Steps: ${infoData.steps || 'N/A'}<br>
            CFG Scale: ${infoData.cfg_scale || 'N/A'}
        `;
    } catch (e) {
        info.textContent = '生成情報: 解析エラー';
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 閉じる';
    closeBtn.style.cssText = `
        margin-top: 20px; padding: 10px 30px; background: #764ba2;
        color: white; border: none; border-radius: 25px; cursor: pointer;
        font-size: 16px; font-weight: bold;
    `;
    closeBtn.onclick = () => modal.remove();

    modal.appendChild(img);
    modal.appendChild(info);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

/**
 * 現在のUIに表示されているタグをカテゴリ別にスナップショット化
 */
function snapshotCurrentUITags() {
    const categories = ['people', 'face', 'body', 'pose', 'expression', 'background', 'clothing', 'quality', 'other'];
    const snapshot = {};
    categories.forEach(cat => {
        const container = document.getElementById(`${cat}-tags`);
        if (!container) {
            snapshot[cat] = [];
            return;
        }
        const items = Array.from(container.querySelectorAll('.tag, .tag-item'));
        snapshot[cat] = items.map(el => ({
            text: (el.textContent || '').trim(),
            className: el.className || ''
        }));
    });
    return snapshot;
}

/**
 * UIスナップショットのみから分類ログを組み立てる（最終分類情報が無い場合のフォールバック）
 */
function buildSnapshotFromUITags(uiSnapshot) {
    const categorized = {};
    let idxCounter = 0;
    Object.entries(uiSnapshot || {}).forEach(([cat, items]) => {
        categorized[cat] = (items || []).map(item => ({
            text: item.text,
            originalIndex: idxCounter++,
            className: item.className || ''
        }));
    });

    const allTexts = [];
    Object.values(categorized).forEach(arr => {
        arr.forEach(entry => {
            if (entry && entry.text) allTexts.push(entry.text);
        });
    });

    const categoryCounts = {};
    Object.keys(categorized).forEach(key => {
        categoryCounts[key] = (categorized[key] || []).length;
    });

    return {
        timestamp: new Date().toISOString(),
        source: 'ui-fallback',
        promptText: allTexts.join(', '),
        tagCount: allTexts.length,
        categorized,
        categoryCounts,
        options: { note: 'exportClassificationLog fallback - lastClassificationSnapshot was null' }
    };
}

/**
 * 分類状態をJSONファイルとして保存
 */
async function exportClassificationLog() {
    if (!window.electronAPI || typeof window.electronAPI.saveDebugJson !== 'function') {
        alert('❌ ログ出力機能が利用できません (saveDebugJson 未対応)');
        return;
    }
    try {
        const learned = (window.electronAPI.loadLearnedTags)
            ? await window.electronAPI.loadLearnedTags()
            : null;
        const uiSnapshot = snapshotCurrentUITags();
        const lastClassification = window.lastClassificationSnapshot
            ? JSON.parse(JSON.stringify(window.lastClassificationSnapshot))
            : buildSnapshotFromUITags(uiSnapshot);

        const payload = {
            timestamp: new Date().toISOString(),
            lastClassification,
            lastTaggerParity: window.lastTaggerParity
                ? JSON.parse(JSON.stringify(window.lastTaggerParity))
                : null,
            uiTags: uiSnapshot,
            currentPromptData: window.currentPromptData
                ? JSON.parse(JSON.stringify(window.currentPromptData))
                : null,
            sdApiSettings: JSON.parse(JSON.stringify(SD_API_SETTINGS)),
            learnedTags: learned && learned.success ? learned : null
        };

        const res = await window.electronAPI.saveDebugJson(payload);
        if (res && res.success) {
            console.log('✅ 分類ログを保存しました:', res.file);
            showMessage(`✅ ログを出力しました:\n${res.file}`, 'success');
        } else {
            const message = (res && res.error) || '不明なエラー';
            console.warn('❌ ログ出力失敗:', message);
            showMessage(`❌ ログ出力に失敗しました: ${message}`, 'error');
        }
    } catch (error) {
        console.error('❌ ログ出力処理で例外:', error);
        showMessage(`❌ ログ出力エラー: ${error.message}`, 'error');
    }
}

async function sanitizeLearnedDictionaryManual() {
    if (!window.electronAPI || typeof window.electronAPI.sanitizeLearnedDictionary !== 'function') {
        alert('❌ Electron APIが利用できないため、辞書サニタイズ機能は使用できません。');
        return;
    }

    showMessage('🧼 学習辞書をサニタイズ中...', 'info');

    try {
        const result = await window.electronAPI.sanitizeLearnedDictionary();

        if (!result || !result.success) {
            const errorMsg = (result && result.error) ? result.error : '不明なエラー';
            showMessage(`❌ 辞書サニタイズに失敗しました: ${errorMsg}`, 'error');
            alert(`❌ 辞書サニタイズに失敗しました\n\n${errorMsg}`);
            return;
        }

        try {
            await mergeLearnedTagsIntoCategories();
        } catch (e) {
            console.warn('⚠️ サニタイズ後の辞書マージに失敗:', e);
        }

        const removedSummary = result.removedSummary || {};
        const removedText = Object.keys(removedSummary).length
            ? Object.entries(removedSummary).map(([cat, count]) => `・${cat}: ${count}件`).join('\n')
            : '（除外されたタグはありません）';

        const message = [
            '✅ 学習辞書をクリーンアップしました',
            '',
            `タグ総数: ${result.beforeCount} → ${result.afterCount}`,
            `バックアップ: ${result.backup}`,
            '',
            '除外したタグ内訳:',
            removedText
        ].join('\n');

        showMessage('✅ 学習辞書をクリーンアップしました', 'success');
        alert(message);

        console.log('✅ 辞書サニタイズ完了:', result);
    } catch (error) {
        console.error('❌ 辞書サニタイズ実行エラー:', error);
        showMessage(`❌ 辞書サニタイズでエラー: ${error.message}`, 'error');
        alert(`❌ 辞書サニタイズでエラーが発生しました\n\n${error.message}`);
    }
}

/**
 * ドロップされた画像をTagger解析（ドラッグ&ドロップ連携）
 */
function analyzePulledImageWithTagger() {
    console.log('🔍 Tagger解析: ドロップ画像チェック');

    if (!currentImageFile) {
        showMessage('❌ 画像がドロップされていません。先に画像をドラッグ&ドロップしてください', 'error');
        console.warn('⚠️ currentImageFile が null');
        return;
    }

    console.log('✅ ドロップ画像検出:', currentImageFile.name);
    analyzeImageWithTagger(currentImageFile);
}

// ========================================
// 🎛️ SD API設定管理（Phase 14.2）
// ========================================

/**
 * Tagger設定を更新＋localStorage保存
 * @param {Object} settings - { model, threshold }
 */
function updateTaggerSettings(settings) {
    if (settings.model) SD_API_SETTINGS.tagger.model = settings.model;
    if (settings.threshold !== undefined) SD_API_SETTINGS.tagger.threshold = settings.threshold;
    if (settings.compatMode !== undefined) SD_API_SETTINGS.tagger.compatMode = !!settings.compatMode;

    // localStorageに保存
    localStorage.setItem('sd_api_tagger_settings', JSON.stringify(SD_API_SETTINGS.tagger));

    console.log('✅ Tagger設定更新:', SD_API_SETTINGS.tagger);
    showMessage('✅ Tagger設定を更新しました', 'success');
}

/**
 * txt2img設定を更新＋localStorage保存
 * @param {Object} settings - { width, height, steps, sampler_name, cfg_scale, restore_faces }
 */
function updateTxt2ImgSettings(settings) {
    if (settings.width) SD_API_SETTINGS.txt2img.width = settings.width;
    if (settings.height) SD_API_SETTINGS.txt2img.height = settings.height;
    if (settings.steps) SD_API_SETTINGS.txt2img.steps = settings.steps;
    if (settings.sampler_name) SD_API_SETTINGS.txt2img.sampler_name = settings.sampler_name;
    if (settings.cfg_scale !== undefined) SD_API_SETTINGS.txt2img.cfg_scale = settings.cfg_scale;
    if (settings.restore_faces !== undefined) SD_API_SETTINGS.txt2img.restore_faces = settings.restore_faces;
    if (settings.sd_model_checkpoint !== undefined) SD_API_SETTINGS.txt2img.sd_model_checkpoint = settings.sd_model_checkpoint;

    // localStorageに保存
    localStorage.setItem('sd_api_txt2img_settings', JSON.stringify(SD_API_SETTINGS.txt2img));

    console.log('✅ txt2img設定更新:', SD_API_SETTINGS.txt2img);
    showMessage('✅ 画像生成設定を更新しました', 'success');
}

/**
 * 現在の設定を取得
 * @returns {Object} - { tagger, txt2img }
 */
function getApiSettings() {
    return JSON.parse(JSON.stringify(SD_API_SETTINGS));
}

/**
 * localStorageから設定を読み込み（起動時実行）
 */
function loadApiSettingsFromStorage() {
    try {
        // Tagger設定読み込み
        const savedTaggerSettings = localStorage.getItem('sd_api_tagger_settings');
        if (savedTaggerSettings) {
            const taggerSettings = JSON.parse(savedTaggerSettings);
            SD_API_SETTINGS.tagger = { ...SD_API_SETTINGS.tagger, ...taggerSettings };
            console.log('✅ Tagger設定をlocalStorageから読み込み:', SD_API_SETTINGS.tagger);
        }

        // txt2img設定読み込み
        const savedTxt2ImgSettings = localStorage.getItem('sd_api_txt2img_settings');
        if (savedTxt2ImgSettings) {
            const txt2imgSettings = JSON.parse(savedTxt2ImgSettings);
            SD_API_SETTINGS.txt2img = { ...SD_API_SETTINGS.txt2img, ...txt2imgSettings };
            console.log('✅ txt2img設定をlocalStorageから読み込み:', SD_API_SETTINGS.txt2img);
        }
    } catch (error) {
        console.error('❌ localStorage読み込みエラー:', error);
    }
}

// グローバル関数として登録
window.analyzeImageWithTagger = analyzeImageWithTagger;
window.generateImageWithAPI = generateImageWithAPI;
window.analyzePulledImageWithTagger = analyzePulledImageWithTagger;
window.fileToBase64 = fileToBase64;
window.updateTaggerSettings = updateTaggerSettings;
window.updateTxt2ImgSettings = updateTxt2ImgSettings;
window.getApiSettings = getApiSettings;
window.showMessage = showMessage;  // ← NEW: グローバル登録
window.lastClassificationSnapshot = null;

// ページ読み込み時にlocalStorageから設定復元
document.addEventListener('DOMContentLoaded', () => {
    loadApiSettingsFromStorage();
    console.log('✅ SD WebUI Reforge API統合完了 (Phase 14.3 - localStorage対応)');

    // ✅ UI改善: サイドバー折りたたみ機能の初期化
    initializeSidebarCollapse();

    // ✅ UI改善: 抽出されたプロンプト表示の折りたたみ機能の初期化
    initializePromptSectionCollapse();
});

// ========================================
// ✅ UI改善: サイドバー折りたたみ機能
// ========================================
/**
 * サイドバーセクションの折りたたみ機能を初期化
 */
function initializeSidebarCollapse() {
    // 全てのサイドバーセクションのh4要素を取得
    const sectionHeaders = document.querySelectorAll('.sidebar-section h4');

    sectionHeaders.forEach(header => {
        // クリックイベントを追加
        header.addEventListener('click', function() {
            const section = this.parentElement;

            // collapsed クラスをトグル
            section.classList.toggle('collapsed');

            // 状態をlocalStorageに保存（セクションのテキストをキーとして使用）
            const sectionTitle = this.textContent.trim();
            const isCollapsed = section.classList.contains('collapsed');
            localStorage.setItem(`sidebar_${sectionTitle}_collapsed`, isCollapsed);

            console.log(`📂 サイドバーセクション "${sectionTitle}" を${isCollapsed ? '折りたたみ' : '展開'}しました`);
        });
    });

    // ページ読み込み時にlocalStorageから状態を復元
    document.querySelectorAll('.sidebar-section').forEach(section => {
        const header = section.querySelector('h4');
        if (header) {
            const sectionTitle = header.textContent.trim();
            const savedState = localStorage.getItem(`sidebar_${sectionTitle}_collapsed`);

            if (savedState === 'true') {
                section.classList.add('collapsed');
            } else if (savedState === 'false') {
                section.classList.remove('collapsed');
            }
            // savedState === null の場合はHTMLのデフォルト状態を維持
        }
    });

    console.log('✅ サイドバー折りたたみ機能を初期化しました');
}

// ========================================
// ✅ UI改善: 抽出されたプロンプト表示の折りたたみ機能
// ========================================
/**
 * 抽出されたプロンプト表示（Negative, Settings）の折りたたみ機能を初期化
 */
function initializePromptSectionCollapse() {
    // 折りたたみ可能なプロンプトセクションを取得（.prompt-section.collapsed）
    const collapsibleSections = document.querySelectorAll('.prompt-section.collapsed strong');

    collapsibleSections.forEach(header => {
        // クリックイベントを追加
        header.addEventListener('click', function() {
            const section = this.parentElement; // .prompt-section
            const content = section.querySelector('.prompt-section-content');
            const indicator = this.querySelector('.collapse-indicator');

            // collapsed クラスをトグル
            section.classList.toggle('collapsed');

            // アニメーション適用
            if (section.classList.contains('collapsed')) {
                // 折りたたみ
                content.style.maxHeight = '0';
                content.style.opacity = '0';
                indicator.textContent = '►'; // 右向き
            } else {
                // 展開
                content.style.maxHeight = '1000px';
                content.style.opacity = '1';
                indicator.textContent = '▼'; // 下向き
            }

            // 状態をlocalStorageに保存
            const sectionTitle = this.querySelector('span').textContent.trim();
            const isCollapsed = section.classList.contains('collapsed');
            localStorage.setItem(`prompt_section_${sectionTitle}_collapsed`, isCollapsed);

            console.log(`📂 プロンプトセクション "${sectionTitle}" を${isCollapsed ? '折りたたみ' : '展開'}しました`);
        });
    });

    // ページ読み込み時にlocalStorageから状態を復元
    document.querySelectorAll('.prompt-section').forEach(section => {
        const header = section.querySelector('strong span');
        if (header) {
            const sectionTitle = header.textContent.trim();
            const savedState = localStorage.getItem(`prompt_section_${sectionTitle}_collapsed`);
            const content = section.querySelector('.prompt-section-content');
            const indicator = section.querySelector('.collapse-indicator');

            if (savedState === 'true' && !section.classList.contains('collapsed')) {
                section.classList.add('collapsed');
                if (content) {
                    content.style.maxHeight = '0';
                    content.style.opacity = '0';
                }
                if (indicator) indicator.textContent = '►';
            } else if (savedState === 'false' && section.classList.contains('collapsed')) {
                section.classList.remove('collapsed');
                if (content) {
                    content.style.maxHeight = '1000px';
                    content.style.opacity = '1';
                }
                if (indicator) indicator.textContent = '▼';
            }
        }
    });

    console.log('✅ 抽出されたプロンプト表示の折りたたみ機能を初期化しました');
}

// =============================================================================
// Phase 15.2: AI Learning Dictionary System
// =============================================================================

/**
 * 📚 AI提案タグを辞書に学習する関数
 * AI分類で提案された紫タグ（.ai-suggested）を抽出し、
 * 対応する辞書ファイルに追加する
 */
async function learnAITagsToDictionary() {
    console.log('📚 AIタグの辞書学習を開始します...');

    try {
        // 1. すべてのAI提案タグ（.ai-suggested）を取得
        const aiTags = document.querySelectorAll('.tag-item.ai-suggested');

        if (aiTags.length === 0) {
            alert('⚠️ AI提案タグが見つかりません。\n\nまず「✨ AI自動分類」を実行してください。');
            console.warn('⚠️ AI提案タグが0件です');
            return;
        }

        console.log(`🔍 ${aiTags.length}個のAI提案タグを検出しました`);

        // 2. カテゴリごとにタグをグループ化
        const tagsByCategory = {};

        aiTags.forEach(tagElement => {
            // タグのテキストを取得
            const tagText = tagElement.textContent.trim();

            // 親要素からカテゴリを特定
            const tagContainer = tagElement.closest('.tag-container');
            if (!tagContainer) return;

            const containerId = tagContainer.id; // 例: "face-tags"
            const category = containerId.replace('-tags', ''); // "face"

            if (!tagsByCategory[category]) {
                tagsByCategory[category] = [];
            }

            tagsByCategory[category].push(tagText);
        });

        console.log('📂 カテゴリ別タグ分類:', tagsByCategory);

        // 3. フィルタリングと辞書追加
        const { sanitized, removedSummary } = sanitizeTagMap(tagsByCategory);
        if (Object.keys(removedSummary).length > 0) {
            console.log('⚠️ サニタイズで除外されたタグ:', removedSummary);
        }

        let totalAdded = 0;
        const results = [];

        for (const [category, tags] of Object.entries(sanitized)) {
            if (tags.length === 0) continue;

            console.log(`💾 "${category}"カテゴリの${tags.length}個のタグを辞書に追加中...`);

            try {
                // IPC経由でmain.jsに送信
                const result = await window.electronAPI.appendToDictionary(category, tags);

                if (result.success) {
                    totalAdded += result.addedCount || tags.length;
                    results.push(`✅ ${category}: ${result.addedCount || tags.length}個追加`);
                    console.log(`✅ ${category}カテゴリ: ${result.addedCount || tags.length}個のタグを辞書に追加しました`);
                } else {
                    results.push(`❌ ${category}: ${result.error || '失敗'}`);
                    console.error(`❌ ${category}カテゴリ追加失敗:`, result.error);
                }
            } catch (error) {
                results.push(`❌ ${category}: ${error.message}`);
                console.error(`❌ ${category}カテゴリ追加エラー:`, error);
            }
        }

        // 4. Phase 15.3: 学習タグをJSONファイルにも保存（恒久的保存）
        console.log('💾 学習タグをJSONファイルに保存中...');
        try {
            const jsonResult = await window.electronAPI.saveLearnedTags(sanitized);
            if (jsonResult.success) {
                console.log(`✅ JSONファイル保存成功: 合計${jsonResult.totalTags}個のタグ`);
            } else {
                console.warn('⚠️ JSONファイル保存失敗:', jsonResult.error);
            }
        } catch (jsonError) {
            console.error('❌ JSONファイル保存エラー:', jsonError);
        }

        // 5. 結果を表示
        const message = [
            `📚 辞書学習が完了しました！`,
            ``,
            `合計 ${totalAdded}個のタグを追加:`,
            ...results,
            ...(Object.keys(removedSummary).length
                ? [
                    ``,
                    `⚠️ 以下のカテゴリでは不適切なタグを除外しました:`,
                    ...Object.entries(removedSummary).map(([category, count]) => ` - ${category}: ${count}件除外`)
                ]
                : []),
            ``,
            `✅ 恒久的保存: learned_tags.json に保存完了`,
            `次回の通常分類でこれらのタグが活用されます。`
        ].join('\n');

        alert(message);
        console.log('✅ 辞書学習完了:', { totalAdded, results });

    } catch (error) {
        console.error('❌ 辞書学習エラー:', error);
        alert(`❌ 辞書学習に失敗しました\n\n${error.message}`);
    }
}

console.log('✅ SD WebUI Reforge API統合完了 (Phase 14)');

console.log('✅ Prompt Classifier v3.0 初期化完了（Hybrid System有効）');
// ========================================
// WD14ラベル表の読み込み（ある場合）
// ========================================
async function loadWd14Labels() {
    try {
        if (!window.electronAPI || !window.electronAPI.loadCalibrationFile) return;
        const res = await window.electronAPI.loadCalibrationFile('calibration/wd14_labels.json');
        if (res && res.success && res.content) {
            const json = JSON.parse(res.content);
            WD14_LABELS = {};
            Object.keys(json).forEach(cat => {
                const arr = Array.isArray(json[cat]) ? json[cat] : [];
                for (const t of arr) {
                    WD14_LABELS[String(t).toLowerCase()] = cat;
                }
            });
            console.log('✅ WD14ラベル表読み込み:', Object.keys(WD14_LABELS).length, 'tags');
        }
    } catch (e) {
        console.warn('⚠️ WD14ラベル読み込み失敗:', e.message);
    }
}

// ========================================
// ライセンス管理システム
// ========================================

let licenseInfoCache = null;

// ライセンス情報を読み込む
async function loadLicenseInfo() {
    try {
        if (!window.electronAPI || !window.electronAPI.getLicenseInfo) {
            console.warn('⚠️ ライセンスAPIが利用できません');
            return null;
        }
        
        const result = await window.electronAPI.getLicenseInfo();
        if (result.success) {
            licenseInfoCache = result.licenseInfo;
            return result.licenseInfo;
        } else {
            console.error('❌ ライセンス情報取得失敗:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ ライセンス情報読み込みエラー:', error);
        return null;
    }
}

// ライセンス情報を表示エリアに更新
async function updateLicenseStatus() {
    try {
        const licenseInfo = await loadLicenseInfo();
        if (!licenseInfo) {
            document.getElementById('licenseTypeDisplay').textContent = 'エラー';
            return;
        }

        const licenseType = licenseInfo.licenseType || 'free';
        const typeNames = {
            'free': '無料版',
            'trial': '体験版',
            'onetime': '買い切り版',
            'subscription': 'サブスクリプション版'
        };
        
        document.getElementById('licenseTypeDisplay').textContent = typeNames[licenseType] || '不明';
        
        const expiryDisplay = document.getElementById('licenseExpiryDisplay');
        if (licenseType === 'trial' && licenseInfo.expiresAt) {
            const expiresAt = new Date(licenseInfo.expiresAt);
            const now = new Date();
            const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                expiryDisplay.textContent = `残り日数: ${diffDays}日`;
            } else {
                expiryDisplay.textContent = '期限切れ';
            }
        } else if (licenseType === 'subscription' && licenseInfo.expiresAt) {
            const expiresAt = new Date(licenseInfo.expiresAt);
            expiryDisplay.textContent = `有効期限: ${expiresAt.toLocaleDateString('ja-JP')}`;
        } else {
            expiryDisplay.textContent = '';
        }
    } catch (error) {
        console.error('❌ ライセンス状態更新エラー:', error);
    }
}

// ライセンスモーダルを表示
async // ガイドライン表示関数
async function showUserGuide() {
    try {
        const content = await window.electronAPI.readGuideFile('USER_GUIDE.md');
        document.getElementById('guideModalTitle').textContent = '📚 ユーザーガイド';
        document.getElementById('guideModalContent').textContent = content;
        document.getElementById('guideModal').style.display = 'block';
    } catch (error) {
        console.error('ガイドライン読み込みエラー:', error);
        alert('ガイドラインの読み込みに失敗しました');
    }
}

async function showQuickStart() {
    try {
        const content = await window.electronAPI.readGuideFile('QUICK_START.md');
        document.getElementById('guideModalTitle').textContent = '🚀 クイックスタート';
        document.getElementById('guideModalContent').textContent = content;
        document.getElementById('guideModal').style.display = 'block';
    } catch (error) {
        console.error('ガイドライン読み込みエラー:', error);
        alert('ガイドラインの読み込みに失敗しました');
    }
}

function closeGuideModal() {
    document.getElementById('guideModal').style.display = 'none';
}

async function showLicenseModal() {
    const modal = document.getElementById('licenseModal');
    if (!modal) return;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // ライセンス情報を読み込んで表示
    try {
        await updateLicenseModalContent();
    } catch (error) {
        console.error('❌ ライセンスモーダル表示エラー:', error);
        alert('ライセンス情報の読み込みに失敗しました');
    }
}

// ライセンスモーダルを閉じる
function closeLicenseModal() {
    const modal = document.getElementById('licenseModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ライセンスモーダルの内容を更新
async function updateLicenseModalContent() {
    try {
        const licenseInfo = await loadLicenseInfo();
        if (!licenseInfo) {
            document.getElementById('licenseTypeInfo').textContent = 'エラー';
            return;
        }

        const licenseType = licenseInfo.licenseType || 'free';
        const typeNames = {
            'free': '無料版',
            'trial': '体験版',
            'onetime': '買い切り版',
            'subscription': 'サブスクリプション版'
        };
        
        document.getElementById('licenseTypeInfo').textContent = typeNames[licenseType] || '不明';
        
        // 有効期限情報
        const expiryInfo = document.getElementById('licenseExpiryInfo');
        if (licenseType === 'trial' && licenseInfo.expiresAt) {
            const expiresAt = new Date(licenseInfo.expiresAt);
            const now = new Date();
            const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                expiryInfo.innerHTML = `試用期間: 残り<strong>${diffDays}日</strong>（${expiresAt.toLocaleDateString('ja-JP')}まで）`;
            } else {
                expiryInfo.innerHTML = `試用期間: <strong style="color: #ff6b6b;">期限切れ</strong>`;
            }
        } else if (licenseType === 'subscription' && licenseInfo.expiresAt) {
            const expiresAt = new Date(licenseInfo.expiresAt);
            expiryInfo.innerHTML = `有効期限: <strong>${expiresAt.toLocaleDateString('ja-JP')}</strong>`;
        } else if (licenseType === 'onetime') {
            expiryInfo.innerHTML = `有効期限: <strong>無期限</strong>`;
        } else {
            expiryInfo.innerHTML = '';
        }

        // 体験版情報
        const trialInfo = document.getElementById('licenseTrialInfo');
        if (licenseType === 'trial') {
            trialInfo.innerHTML = `体験版では各カテゴリ<strong>3個まで</strong>セットを登録できます。`;
        } else {
            trialInfo.innerHTML = '';
        }

        // 定期認証情報
        const verificationInfo = document.getElementById('licenseVerificationInfo');
        if (licenseType === 'subscription' && licenseInfo.lastVerifiedAt) {
            const lastVerified = new Date(licenseInfo.lastVerifiedAt);
            verificationInfo.innerHTML = `最終認証: ${lastVerified.toLocaleString('ja-JP')}`;
        } else {
            verificationInfo.innerHTML = '';
        }

        // 体験版セクションの表示/非表示
        const trialSection = document.getElementById('trialSection');
        if (licenseType === 'free') {
            trialSection.style.display = 'block';
        } else {
            trialSection.style.display = 'none';
        }

        // 定期認証セクションの表示/非表示
        const verificationSection = document.getElementById('verificationSection');
        if (licenseType === 'subscription') {
            try {
                const validation = await window.electronAPI.validateLicense();
                if (validation && !validation.valid && validation.status === 'verification_required') {
                    verificationSection.style.display = 'block';
                } else {
                    verificationSection.style.display = 'none';
                }
            } catch (error) {
                // 配布版では認証は不要なので、エラー時は非表示にする
                console.warn('⚠️ ライセンス検証エラー（無視）:', error);
                verificationSection.style.display = 'none';
            }
        } else {
            verificationSection.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ ライセンスモーダル更新エラー:', error);
    }
}

// パスコードでライセンスを認証
async function verifyLicensePasscode() {
    const passcodeInput = document.getElementById('licensePasscodeInput');
    const resultDiv = document.getElementById('licenseVerifyResult');
    
    if (!passcodeInput || !resultDiv) return;
    
    const passcode = passcodeInput.value.trim().toUpperCase();
    if (!passcode) {
        resultDiv.style.display = 'block';
        resultDiv.style.background = 'rgba(255, 107, 107, 0.2)';
        resultDiv.style.color = '#ff6b6b';
        resultDiv.innerHTML = '❌ パスコードを入力してください';
        return;
    }

    try {
        resultDiv.style.display = 'block';
        resultDiv.style.background = 'rgba(102, 126, 234, 0.2)';
        resultDiv.style.color = '#667eea';
        resultDiv.innerHTML = '⏳ 認証中...';

        const result = await window.electronAPI.verifyLicense('passcode', { passcode });
        
        if (result.success) {
            resultDiv.style.background = 'rgba(76, 175, 80, 0.2)';
            resultDiv.style.color = '#4CAF50';
            resultDiv.innerHTML = `✅ ${result.message || '認証が完了しました'}`;
            passcodeInput.value = '';
            
            // ライセンス情報を更新
            await updateLicenseModalContent();
            await updateLicenseStatus();
            
            // 3秒後に結果を非表示
            setTimeout(() => {
                resultDiv.style.display = 'none';
            }, 3000);
        } else {
            resultDiv.style.background = 'rgba(255, 107, 107, 0.2)';
            resultDiv.style.color = '#ff6b6b';
            resultDiv.innerHTML = `❌ ${result.error || '認証に失敗しました'}`;
        }
    } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.style.background = 'rgba(255, 107, 107, 0.2)';
        resultDiv.style.color = '#ff6b6b';
        resultDiv.innerHTML = `❌ エラー: ${error.message}`;
    }
}

// 体験版を有効化
async function activateTrialLicense() {
    try {
        const result = await window.electronAPI.activateTrial();
        
        if (result.success) {
            alert(`✅ ${result.message || '体験版が有効化されました'}`);
            await updateLicenseModalContent();
            await updateLicenseStatus();
        } else {
            alert(`❌ ${result.error || '体験版の有効化に失敗しました'}`);
        }
    } catch (error) {
        alert(`❌ エラー: ${error.message}`);
    }
}

// 定期認証を完了
async function completeLicenseVerification() {
    try {
        const result = await window.electronAPI.completeVerification();
        
        if (result.success) {
            alert(`✅ ${result.message || '認証が完了しました'}`);
            await updateLicenseModalContent();
            await updateLicenseStatus();
        } else {
            alert(`❌ ${result.error || '認証の完了に失敗しました'}`);
        }
    } catch (error) {
        alert(`❌ エラー: ${error.message}`);
    }
}

// モーダル外クリックで閉じる
document.addEventListener('click', (e) => {
    const licenseModal = document.getElementById('licenseModal');
    if (licenseModal && e.target === licenseModal) {
        closeLicenseModal();
    }
});

// 起動時にライセンス状態を更新と定期認証チェック（配布版のみ）
document.addEventListener('DOMContentLoaded', async () => {
    // 開発環境ではライセンス管理UIを非表示にしてスキップ
    try {
        // Electron APIが利用可能かチェック
        if (!window.electronAPI || !window.electronAPI.isPackaged) {
            // 開発環境: ライセンス管理UIを非表示
            const licenseSection = document.getElementById('licenseManagementSection');
            if (licenseSection) {
                licenseSection.style.display = 'none';
            }
            console.log('🔧 開発環境: ライセンス管理をスキップします');
            return;
        }
        
        // 配布版の場合のみ実行
        const isPackaged = await window.electronAPI.isPackaged();
        if (!isPackaged) {
            // 開発環境: ライセンス管理UIを非表示
            const licenseSection = document.getElementById('licenseManagementSection');
            if (licenseSection) {
                licenseSection.style.display = 'none';
            }
            console.log('🔧 開発環境: ライセンス管理をスキップします');
            return;
        }
        
        // 配布版: ライセンス管理UIを表示
        const licenseSection = document.getElementById('licenseManagementSection');
        if (licenseSection) {
            licenseSection.style.display = 'block';
        }
    } catch (error) {
        // 開発環境ではisPackagedが存在しない可能性があるので、エラーは無視してスキップ
        const licenseSection = document.getElementById('licenseManagementSection');
        if (licenseSection) {
            licenseSection.style.display = 'none';
        }
        console.log('🔧 開発環境: ライセンス管理をスキップします');
        return;
    }
    
    // 少し遅延させてからライセンス情報を読み込む（他の初期化が完了してから）
    setTimeout(async () => {
        await updateLicenseStatus();
        
        // 定期認証が必要かチェック
        try {
            if (window.electronAPI && window.electronAPI.validateLicense) {
                const validation = await window.electronAPI.validateLicense();
                if (!validation.valid) {
                    if (validation.status === 'verification_required') {
                        // 定期認証が必要な場合、モーダルを表示
                        if (confirm('定期認証が必要です。ライセンス管理画面を開きますか？')) {
                            await showLicenseModal();
                        }
                    } else if (validation.status === 'trial_expired' || validation.status === 'subscription_expired') {
                        // 有効期限切れの場合、アラートを表示
                        alert(`⚠️ ${validation.message}\n\nライセンス管理画面で更新してください。`);
                        await showLicenseModal();
                    }
                }
            }
        } catch (error) {
            console.error('❌ ライセンス検証エラー:', error);
        }
    }, 1000);
});

console.log('🏁 classifier.js 読み込み完了');

