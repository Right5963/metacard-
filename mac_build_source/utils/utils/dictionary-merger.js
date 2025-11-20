/**
 * Dictionary Merger - Phase 10
 *
 * Danbooruタグを既存の共通辞書にマージする
 * 重複排除、バージョン管理、バックアップ機能を提供
 */

const fs = require('fs').promises;
const path = require('path');
const { fetchAllCategories, CATEGORY_MAPPING } = require('./danbooru-fetcher');
const { fetchCivitaiData } = require('./civitai-fetcher');

const DICT_PATH = path.join('C:', 'metacard', 'dictionaries');
const BACKUP_PATH = path.join(DICT_PATH, 'backups');

/**
 * Markdown辞書ファイルからタグを抽出
 * @param {string} filePath - 辞書ファイルパス
 * @returns {Promise<Object>} - {tags: string[], metadata: Object}
 */
async function parseDictionary(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        const tags = [];
        const metadata = {
            version: '1.0',
            lastUpdate: null,
            danbooruSync: null
        };

        for (const line of lines) {
            const trimmed = line.trim();

            // タグ抽出（- tag形式）
            if (trimmed.startsWith('- ') &&
                !trimmed.startsWith('- 追加日') &&
                !trimmed.startsWith('- 最終更新') &&
                !trimmed.startsWith('- バージョン') &&
                !trimmed.startsWith('- Danbooru同期')) {

                const tag = trimmed.substring(2).trim();
                const cleanTag = tag.replace(/\s*\([^)]*\)/g, '').trim();

                if (cleanTag && !cleanTag.startsWith('#') && cleanTag.length > 0) {
                    tags.push(cleanTag);
                }
            }

            // メタデータ抽出
            if (trimmed.startsWith('- バージョン:')) {
                metadata.version = trimmed.split(':')[1].trim();
            }
            if (trimmed.startsWith('- 最終更新:')) {
                metadata.lastUpdate = trimmed.split(':', 2)[1].trim();
            }
            if (trimmed.startsWith('- Danbooru同期:')) {
                metadata.danbooruSync = trimmed.split(':', 2)[1].trim();
            }
        }

        return { tags, metadata };
    } catch (error) {
        console.error(`❌ 辞書読み込みエラー (${filePath}):`, error.message);
        return { tags: [], metadata: {} };
    }
}

/**
 * Markdown辞書ファイルを生成
 * @param {string} category - カテゴリ名
 * @param {string[]} tags - タグ配列
 * @param {Object} metadata - メタデータ
 * @returns {string} - Markdown内容
 */
function generateDictionary(category, tags, metadata) {
    const categoryNames = {
        'people': '複数人・人数',
        'face': '女性の顔',
        'body': '体',
        'poseemotion': 'ポーズ・感情',
        'background': '背景',
        'clothing': '服装',
        'quality': '品質',
        'other': 'その他'
    };

    const title = categoryNames[category] || category;
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];

    let content = `# ${title}カテゴリ辞書（MetaCard統合版）\n\n`;
    content += `**MetaCard核心原則**: ${getCategoryPrinciple(category)}\n\n`;

    // タグをアルファベット順にソート
    const sortedTags = [...new Set(tags)].sort();

    // タグをセクション分けして出力
    const sections = groupTagsBySection(category, sortedTags);

    for (const [sectionName, sectionTags] of Object.entries(sections)) {
        if (sectionTags.length > 0) {
            content += `## ${sectionName}\n`;
            for (const tag of sectionTags) {
                content += `- ${tag}\n`;
            }
            content += `\n`;
        }
    }

    // メタデータ
    content += `## 更新履歴\n`;
    content += `- 追加日: ${metadata.addedDate || '2025-11-03'}\n`;
    content += `- 最終更新: ${timestamp}\n`;
    content += `- バージョン: ${incrementVersion(metadata.version)}\n`;
    content += `- Danbooru同期: ${timestamp}\n`;
    content += `- 総タグ数: ${sortedTags.length}\n`;

    return content;
}

/**
 * カテゴリの核心原則を取得
 */
function getCategoryPrinciple(category) {
    const principles = {
        'people': '人数と配置を明確に指定',
        'face': '顔の特徴と表情を明確に指定',
        'body': '体型と体のパーツを明確に指定',
        'poseemotion': 'ポーズと表情・感情を必ず1セットで扱う',
        'background': '背景と環境設定を明確に指定',
        'clothing': '服装タイプと状態を明確に指定',
        'quality': '画質と芸術性を明確に指定',
        'other': '他カテゴリに属さない特殊要素を明確に指定'
    };
    return principles[category] || 'カテゴリ要素を明確に指定';
}

/**
 * タグをセクションごとにグループ化
 */
function groupTagsBySection(category, tags) {
    // 簡易実装：既存のタグとDanbooruタグを分ける
    return {
        '既存タグ': tags.filter(tag => !tag.startsWith('danbooru_')),
        'Danbooru追加タグ': tags.filter(tag => tag.startsWith('danbooru_'))
    };
}

/**
 * バージョン番号をインクリメント
 */
function incrementVersion(version) {
    if (!version) return '1.1';
    const parts = version.split('.');
    const minor = parseInt(parts[1] || 0) + 1;
    return `${parts[0]}.${minor}`;
}

/**
 * 辞書ファイルのバックアップを作成
 */
async function backupDictionary(filename) {
    try {
        const sourcePath = path.join(DICT_PATH, filename);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupFilename = `${filename}.backup_${timestamp}`;
        const backupFilePath = path.join(BACKUP_PATH, backupFilename);

        // バックアップディレクトリ作成
        try {
            await fs.access(BACKUP_PATH);
        } catch {
            await fs.mkdir(BACKUP_PATH, { recursive: true });
        }

        // ファイルコピー
        await fs.copyFile(sourcePath, backupFilePath);
        console.log(`  💾 バックアップ作成: ${backupFilename}`);
        return true;
    } catch (error) {
        console.error(`  ❌ バックアップエラー (${filename}):`, error.message);
        return false;
    }
}

/**
 * Danbooruタグを辞書にマージ
 * @param {string} dictionaryFile - 辞書ファイル名
 * @param {string[]} newTags - 追加するタグ配列
 * @param {Object} options - オプション
 * @returns {Promise<Object>} - マージ結果
 */
async function mergeDictionary(dictionaryFile, newTags, options = {}) {
    const {
        dryRun = false,
        createBackup = true,
        maxNewTags = 100
    } = options;

    console.log(`\n📝 ${dictionaryFile}をマージ中...`);

    const filePath = path.join(DICT_PATH, dictionaryFile);

    // 既存辞書読み込み
    const { tags: existingTags, metadata } = await parseDictionary(filePath);
    console.log(`  📖 既存タグ: ${existingTags.length}個`);

    // 重複除去
    const existingSet = new Set(existingTags);
    const uniqueNewTags = newTags
        .filter(tag => !existingSet.has(tag))
        .slice(0, maxNewTags);

    console.log(`  ✨ 新規タグ: ${uniqueNewTags.length}個`);

    if (uniqueNewTags.length === 0) {
        console.log(`  ✅ マージ不要（新規タグなし）`);
        return {
            success: true,
            added: 0,
            total: existingTags.length
        };
    }

    // マージ後のタグリスト
    const mergedTags = [...existingTags, ...uniqueNewTags];

    if (dryRun) {
        console.log(`  🔍 ドライラン: ${uniqueNewTags.slice(0, 10).join(', ')}...`);
        return {
            success: true,
            added: uniqueNewTags.length,
            total: mergedTags.length,
            dryRun: true
        };
    }

    // バックアップ作成
    if (createBackup) {
        await backupDictionary(dictionaryFile);
    }

    // 新しい辞書生成
    const category = dictionaryFile.replace('.md', '');
    const newContent = generateDictionary(category, mergedTags, metadata);

    // ファイル書き込み
    await fs.writeFile(filePath, newContent, 'utf-8');
    console.log(`  ✅ マージ完了: ${mergedTags.length}タグ`);

    return {
        success: true,
        added: uniqueNewTags.length,
        total: mergedTags.length
    };
}

/**
 * すべての辞書をDanbooruタグでマージ
 */
async function mergeAllDictionaries(options = {}) {
    console.log('🚀 Danbooru辞書マージ開始\n');

    // Danbooruタグ取得
    console.log('📡 Danbooruタグ取得中...');
    const danbooruData = await fetchAllCategories(options.limitPerCategory || 500);

    // カテゴリマッピング（Danbooru → MetaCard辞書）
    const dictionaryMapping = {
        'general': ['body.md', 'poseemotion.md', 'other.md'],
        'artist': ['quality.md'],
        'character': ['face.md', 'people.md'],
        'meta': ['quality.md']
    };

    const results = {};

    // 各辞書にマージ
    for (const [danbooruCategory, data] of Object.entries(danbooruData)) {
        if (data.tags.length === 0) continue;

        const dictFiles = dictionaryMapping[danbooruCategory] || [];
        const tagNames = data.tags.map(t => t.name);

        for (const dictFile of dictFiles) {
            const result = await mergeDictionary(dictFile, tagNames, options);
            results[dictFile] = result;
        }
    }

    // サマリー出力
    console.log('\n📊 マージ結果サマリー:');
    for (const [file, result] of Object.entries(results)) {
        console.log(`  ${file}: +${result.added}タグ（合計${result.total}）`);
    }

    return results;
}

module.exports = {
    parseDictionary,
    generateDictionary,
    mergeDictionary,
    mergeAllDictionaries,
    mergeAllFromCivitai,
    backupDictionary
};

// テスト実行
if (require.main === module) {
    console.log('🧪 Dictionary Merger テスト実行\n');

    mergeAllDictionaries({
        dryRun: true,
        limitPerCategory: 100
    }).then(results => {
        console.log('\n✅ テスト完了');
    }).catch(error => {
        console.error('❌ テスト失敗:', error);
    });
}

/**
 * Civitaiデータを辞書へマージ
 */
async function mergeAllFromCivitai(options = {}) {
    console.log('🚀 Civitai辞書マージ開始\n');

    const data = await fetchCivitaiData({ limit: options.limit || 200, types: options.types || ['Checkpoint','LORA','TextualInversion'] });
    console.log(`📦 Civitai: models=${data.count}, tags=${data.tags.length}, trainedWords=${data.trainedWords.length}, loras=${data.loras.length}`);

    // 簡易分類ヘルパ
    const norm = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').trim();
    const isFace = (t) => /( hair| eyes)$/.test(t) || /ahoge|bangs|sidelocks/.test(t);
    const isClothing = (t) => /uniform|jacket|coat|pants|skirt|shirt|blouse|hoodie|sweater|thighhighs|stockings|pantyhose|dress|kimono|yukata/.test(t);
    const isBackground = (t) => /sky|beach|ocean|sea|room|bedroom|forest|city|outdoors|indoors|pool|classroom|mountain|tree|trees/.test(t);
    const isPose = (t) => /standing|sitting|lying|kneeling|squatting|crouching|leaning|bending|cowboy shot|from above|from below|front view/.test(t);
    const isBody = (t) => /breast|thigh|armpit|shoulder|cleavage|midriff|navel|stomach|leg|arm|feet|toes/.test(t);
    const isQuality = (t) => /masterpiece|best quality|highres|high res|8k|4k|detailed|extremely detailed|wallpaper|unity|cg/.test(t);

    const buckets = {
        face: new Set(),
        clothing: new Set(),
        background: new Set(),
        poseemotion: new Set(),
        body: new Set(),
        quality: new Set(),
        other: new Set()
    };

    // モデルtags
    data.tags.forEach(raw => {
        const t = norm(raw);
        if (!t) return;
        if (isQuality(t)) return; // 品質語は辞書で十分、過剰流入防止
        if (isFace(t)) buckets.face.add(t);
        else if (isClothing(t)) buckets.clothing.add(t);
        else if (isBackground(t)) buckets.background.add(t);
        else if (isPose(t)) buckets.poseemotion.add(t);
        else if (isBody(t)) buckets.body.add(t);
        else buckets.other.add(t);
    });

    // trainedWords（トリガーワード）→ 顔/服/その他に寄せる
    data.trainedWords.forEach(raw => {
        const t = norm(raw);
        if (!t) return;
        if (isFace(t)) buckets.face.add(t);
        else if (isClothing(t)) buckets.clothing.add(t);
        else buckets.other.add(t);
    });

    // LoRA名は quality に <lora:NAME> 形式で入れる
    data.loras.forEach(name => {
        const safe = String(name).trim().replace(/\s+/g, '_');
        if (safe) buckets.quality.add(`<lora:${safe}:0.5>`);
    });

    const results = {};
    // 各辞書にマージ
    const plans = [
        ['face.md', Array.from(buckets.face)],
        ['clothing.md', Array.from(buckets.clothing)],
        ['background.md', Array.from(buckets.background)],
        ['poseemotion.md', Array.from(buckets.poseemotion)],
        ['body.md', Array.from(buckets.body)],
        ['quality.md', Array.from(buckets.quality)],
        ['other.md', Array.from(buckets.other)]
    ];

    for (const [file, arr] of plans) {
        if (!arr.length) continue;
        const res = await mergeDictionary(file, arr, options);
        results[file] = res;
    }

    console.log('\n📊 Civitaiマージ結果サマリー:');
    for (const [file, res] of Object.entries(results)) {
        console.log(`  ${file}: +${res.added}タグ（合計${res.total}）`);
    }

    return results;
}
