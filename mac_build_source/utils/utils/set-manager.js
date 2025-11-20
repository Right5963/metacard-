const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PROJECT_ROOT = path.join(__dirname, '..');

// データディレクトリのパスを取得（配布版ではuserDataを使用）
// 実行時に毎回appを取得することで、配布版でも確実に動作する
const getDataDir = () => {
    try {
        const { app } = require('electron');
        if (app && app.isPackaged) {
            return path.join(app.getPath('userData'), 'data');
        }
    } catch (e) {
        // Electronが利用できない環境（テストなど）
    }
    return path.join(PROJECT_ROOT, 'data');
};

// 実行時に決定（モジュール読み込み時ではなく、関数呼び出し時に評価）
let DATA_DIR = null;
let SETS_DIR = null;
let IMAGES_DIR = null;
let INDEX_FILE = null;

const initializePaths = () => {
    if (!DATA_DIR) {
        DATA_DIR = getDataDir();
        SETS_DIR = path.join(DATA_DIR, 'sets');
        IMAGES_DIR = path.join(SETS_DIR, 'images');
        INDEX_FILE = path.join(SETS_DIR, 'index.json');
    }
};

const CATEGORY_SUFFIX = '_sets.json';
const DEFAULT_CATEGORIES = [
    'pose',
    'face',
    'body',
    'clothing',
    'background',
    'expression',
    'quality',
    'other',
    'people'
];
const DEFAULT_GROUP = 'default';

const ensureDirectorySync = (targetPath) => {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
};

const ensureBaseDirectories = () => {
    initializePaths();
    ensureDirectorySync(DATA_DIR);
    ensureDirectorySync(SETS_DIR);
    ensureDirectorySync(path.join(SETS_DIR, 'images'));
};

const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const text = fs.readFileSync(filePath, 'utf-8');
    if (!text.trim()) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`JSON parse error: ${filePath}: ${error.message}`);
    }
};

const writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const getCategoryFilePath = (category) => {
    initializePaths();
    return path.join(SETS_DIR, `${category}${CATEGORY_SUFFIX}`);
};

const sanitizeSetName = (name) => String(name || '').replace(/[^a-zA-Z0-9-_]/g, '_');

const normalizeGroupKey = (group) => {
    const key = String(group || '').trim();
    return key || DEFAULT_GROUP;
};

const sanitizeDirSegment = (value, fallback) => {
    const sanitized = String(value || '')
        .trim()
        .replace(/[\\/:*?"<>|]/g, '_');
    return sanitized || fallback;
};

const toArray = (value) => Array.isArray(value) ? value : [];

const normalizeMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
        return undefined;
    }

    const result = {};

    if (Array.isArray(metadata.tags) || typeof metadata.tags === 'string') {
        const tagsArray = Array.isArray(metadata.tags)
            ? metadata.tags
            : String(metadata.tags).split(/[,\s]+/);
        const tags = tagsArray
            .map(tag => String(tag || '').trim())
            .filter(Boolean);
        const uniqueTags = Array.from(new Set(tags));
        if (uniqueTags.length) {
            result.tags = uniqueTags;
        }
    }

    if (metadata.type) {
        const type = String(metadata.type || '').trim();
        if (type) {
            result.type = type;
        }
    }

    // 属性を配列として処理（文字列も後方互換性のため受け入れる）
    if (metadata.rating !== undefined) {
        const ratings = Array.isArray(metadata.rating)
            ? metadata.rating.map(r => String(r || '').trim().toLowerCase()).filter(Boolean)
            : (metadata.rating ? [String(metadata.rating).trim().toLowerCase()].filter(Boolean) : []);
        const uniqueRatings = Array.from(new Set(ratings));
        if (uniqueRatings.length) {
            result.rating = uniqueRatings;
        }
    }

    if (metadata.notes) {
        const notes = String(metadata.notes || '').trim();
        if (notes) {
            result.notes = notes;
        }
    }

    if (metadata.source) {
        const source = String(metadata.source || '').trim();
        if (source) {
            result.source = source;
        }
    }

    if (metadata.extra && typeof metadata.extra === 'object') {
        result.extra = { ...metadata.extra };
    }

    return Object.keys(result).length ? result : undefined;
};

const getSetHash = (category, section, setName, tags) => {
    const hash = crypto.createHash('sha1');
    hash.update(String(category || ''));
    hash.update('|');
    hash.update(String(section || ''));
    hash.update('|');
    hash.update(String(setName || ''));
    hash.update('|');
    toArray(tags).forEach(tag => hash.update(`${tag}|`));
    return hash.digest('hex');
};

const normalizeCategoryData = (raw) => {
    const data = raw && typeof raw === 'object' ? raw : {};

    if (data.groups && typeof data.groups === 'object') {
        const groups = {};
        Object.entries(data.groups).forEach(([groupKey, groupValue]) => {
            if (!groupKey) return;
            const group = groupValue && typeof groupValue === 'object' ? groupValue : {};
            const sections = group.sections && typeof group.sections === 'object'
                ? group.sections
                : {};
            groups[groupKey] = { sections };
        });
        if (Object.keys(groups).length > 0) {
            return { groups };
        }
    }

    const sections = data.sections && typeof data.sections === 'object' ? data.sections : data;
    return {
        groups: {
            [DEFAULT_GROUP]: {
                sections: sections && typeof sections === 'object' ? sections : {}
            }
        }
    };
};

const ensureGroup = (groups, groupKey) => {
    const key = String(groupKey || '').trim() || DEFAULT_GROUP;
    if (!groups[key]) {
        groups[key] = { sections: {} };
    } else if (!groups[key].sections || typeof groups[key].sections !== 'object') {
        groups[key].sections = {};
    }
    return key;
};

const loadCategory = (category) => {
    ensureBaseDirectories();
    const filePath = getCategoryFilePath(category);
    const raw = readJsonFile(filePath);
    const { groups } = normalizeCategoryData(raw);
    const defaultSections = groups[DEFAULT_GROUP]?.sections || {};
    return { groups, sections: defaultSections };
};

const writeCategory = (category, groups) => {
    ensureBaseDirectories();
    const filePath = getCategoryFilePath(category);
    writeJsonFile(filePath, { version: '2.1.0', groups });
};

/**
 * カテゴリのセット数をカウント
 */
const countCategorySets = (category) => {
    const { groups } = loadCategory(category);
    let count = 0;
    Object.values(groups).forEach(group => {
        if (group.sections) {
            Object.values(group.sections).forEach(section => {
                count += Object.keys(section).length;
            });
        }
    });
    return count;
};

const saveCategorySet = (category, group, section, setName, tags, image, metadata) => {
    const normalizedName = String(setName || '').trim();
    if (!normalizedName) {
        throw new Error('セット名が空です');
    }
    const normalizedSection = String(section || '').trim() || '未分類';
    const { groups } = loadCategory(category);
    const groupKey = ensureGroup(groups, group);
    const sections = groups[groupKey].sections;
    
    // 既存のセットかチェック（編集の場合はカウントに含めない）
    const isExistingSet = sections[normalizedSection] && sections[normalizedSection][normalizedName];
    
    // ライセンスチェック（開発環境ではスキップ）
    // 開発環境の判定: LICENSE_TYPE環境変数が設定されていない場合
    const isDevelopment = !process.env.LICENSE_TYPE;
    
    if (!isDevelopment) {
        try {
            const { getLicenseManager } = require('./license-manager');
            const licenseManager = getLicenseManager();
            
            // 有効期限切れの場合は編集も不可
            const validation = licenseManager.validateLicense();
            if (!validation.valid && (validation.status === 'trial_expired' || validation.status === 'subscription_expired')) {
                throw new Error(validation.message);
            }
            
            // 新規追加の場合のみセット数制限をチェック
            if (!isExistingSet) {
                const currentCount = countCategorySets(category);
                const limitCheck = licenseManager.checkSetLimit(category, currentCount);
                
                if (!limitCheck.allowed) {
                    throw new Error(limitCheck.message);
                }
            }
        } catch (error) {
            // ライセンス管理モジュールが読み込めない場合はエラーをそのまま投げる
            if (error.message.includes('無料版では') || error.message.includes('セットは') || 
                error.message.includes('試用期間') || error.message.includes('有効期限') ||
                error.message.includes('サブスクリプション')) {
                throw error;
            }
            // その他のエラーは無視（開発環境など）
            console.warn('ライセンスチェックエラー（無視）:', error.message);
        }
    } else {
        // 開発環境ではライセンスチェックをスキップ
        console.log('🔧 開発環境: ライセンスチェックをスキップします');
    }
    
    if (!sections[normalizedSection]) {
        sections[normalizedSection] = {};
    }
    sections[normalizedSection][normalizedName] = {
        tags: toArray(tags),
        tagsCount: toArray(tags).length,
        image: image || '',
        updatedAt: new Date().toISOString(),
        metadata: normalizeMetadata(metadata)
    };
    groups[groupKey].sections = sections;
    writeCategory(category, groups);
    rebuildIndex();
    return { section: normalizedSection, name: normalizedName };
};

const deleteCategorySet = (category, group, section, setName) => {
    const { groups } = loadCategory(category);
    const groupKey = ensureGroup(groups, group);
    const sections = groups[groupKey].sections;
    if (!sections[section] || !sections[section][setName]) {
        throw new Error('セットが見つかりません');
    }
    delete sections[section][setName];
    if (Object.keys(sections[section]).length === 0) {
        delete sections[section];
    }
    groups[groupKey].sections = sections;
    writeCategory(category, groups);
    rebuildIndex();
};

const deleteCategorySection = (category, group, section) => {
    const { groups } = loadCategory(category);
    const groupKey = ensureGroup(groups, group);
    const sections = groups[groupKey].sections;
    if (!sections[section]) {
        throw new Error('セクションが見つかりません');
    }
    delete sections[section];
    groups[groupKey].sections = sections;
    writeCategory(category, groups);
    rebuildIndex();
};

const renameCategorySection = (category, group, oldSection, newSection) => {
    const trimmedNew = String(newSection || '').trim();
    if (!trimmedNew) {
        throw new Error('新しいセクション名が空です');
    }

    const { groups } = loadCategory(category);
    const groupKey = ensureGroup(groups, group);
    const sections = groups[groupKey].sections || {};

    if (!sections[oldSection]) {
        throw new Error(`セクション「${oldSection}」が見つかりません`);
    }
    if (sections[trimmedNew] && trimmedNew !== oldSection) {
        throw new Error(`セクション「${trimmedNew}」は既に存在します`);
    }
    if (trimmedNew === oldSection) {
        return { group: groupKey, oldSection, newSection: trimmedNew };
    }

    const reordered = {};
    Object.keys(sections).forEach(sectionName => {
        if (sectionName === oldSection) {
            reordered[trimmedNew] = sections[sectionName];
        } else {
            reordered[sectionName] = sections[sectionName];
        }
    });

    groups[groupKey].sections = reordered;
    writeCategory(category, groups);

    const categorySegment = sanitizeDirSegment(category, 'category');
    const groupSegment = sanitizeDirSegment(groupKey, DEFAULT_GROUP);
    const oldSegment = sanitizeDirSegment(oldSection, 'section');
    const newSegment = sanitizeDirSegment(trimmedNew, 'section');

    if (oldSegment !== newSegment) {
        initializePaths();
        const oldDir = path.join(IMAGES_DIR, categorySegment, groupSegment, oldSegment);
        const newDir = path.join(IMAGES_DIR, categorySegment, groupSegment, newSegment);
        if (fs.existsSync(oldDir)) {
            if (fs.existsSync(newDir)) {
                throw new Error(`セクション画像フォルダ ${newDir} が既に存在します。先に整理してください。`);
            }
            ensureDirectorySync(path.dirname(newDir));
            fs.renameSync(oldDir, newDir);
        }
    }

    rebuildIndex();
    return { group: groupKey, oldSection, newSection: trimmedNew };
};

const saveSetImage = (category, group, section, setName, imageDataUrl) => {
    ensureBaseDirectories();
    initializePaths();
    if (!imageDataUrl) {
        throw new Error('画像データが空です');
    }
    const match = imageDataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
    if (!match) {
        throw new Error('サポートされていない画像形式です');
    }
    const extension = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const base64 = match[2];
    const categorySegment = sanitizeDirSegment(category, 'category');
    const groupSegment = sanitizeDirSegment(group, DEFAULT_GROUP);
    const sectionSegment = sanitizeDirSegment(section, 'section');
    const fileSegment = `${sanitizeSetName(setName) || 'set'}_${Date.now()}.${extension}`;
    const relativeDir = path.join(categorySegment, groupSegment, sectionSegment);
    const dirPath = path.join(IMAGES_DIR, relativeDir);
    ensureDirectorySync(dirPath);
    const fileName = path.join(relativeDir, fileSegment).replace(/\\/g, '/');
    const filePath = path.join(IMAGES_DIR, fileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);
    rebuildIndex();
    return { fileName, filePath };
};

const loadSetImage = (fileName) => {
    ensureBaseDirectories();
    initializePaths();
    let filePath = path.join(IMAGES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        const legacyPath = path.join(SETS_DIR, 'images', 'thumbnails', fileName);
        if (fs.existsSync(legacyPath)) {
            filePath = legacyPath;
        } else {
            throw new Error('画像ファイルが見つかりません');
        }
    }
    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(fileName).replace('.', '').toLowerCase();
    const mime = extension === 'png' ? 'image/png'
        : extension === 'webp' ? 'image/webp'
        : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
};

const removeSetImage = (category, group, section, setName) => {
    const { groups } = loadCategory(category);
    const groupKey = ensureGroup(groups, group);
    const sections = groups[groupKey].sections;
    if (!sections[section] || !sections[section][setName]) {
        throw new Error('セットが見つかりません');
    }
    const currentImage = sections[section][setName].image || '';
    sections[section][setName].image = '';
    groups[groupKey].sections = sections;
    writeCategory(category, groups);
    if (currentImage) {
        initializePaths();
        const possiblePaths = [
            path.join(IMAGES_DIR, currentImage),
            path.join(SETS_DIR, 'images', 'thumbnails', currentImage)
        ];
        possiblePaths.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (error) {
                    console.warn(`画像ファイル削除失敗: ${filePath}: ${error.message}`);
                }
            }
        });
    }
    rebuildIndex();
};

const renameCategoryGroup = (category, oldGroup, newGroup) => {
    const trimmedNew = String(newGroup || '').trim();
    if (!trimmedNew) {
        throw new Error('新しいグループ名が空です');
    }
    const oldKey = normalizeGroupKey(oldGroup);
    const newKey = normalizeGroupKey(newGroup);
    const { groups } = loadCategory(category);
    if (!groups[oldKey]) {
        throw new Error(`グループ「${oldKey}」が見つかりません`);
    }
    if (groups[newKey] && oldKey !== newKey) {
        throw new Error(`グループ「${newKey}」は既に存在します`);
    }
    if (oldKey === newKey) {
        return { oldGroup: oldKey, newGroup: newKey };
    }
    const groupData = groups[oldKey];
    delete groups[oldKey];
    groups[newKey] = groupData;
    writeCategory(category, groups);

    const categorySegment = sanitizeDirSegment(category, 'category');
    const oldSegment = sanitizeDirSegment(oldKey, DEFAULT_GROUP);
    const newSegment = sanitizeDirSegment(newKey, DEFAULT_GROUP);
    if (oldSegment !== newSegment) {
        initializePaths();
        const oldDir = path.join(IMAGES_DIR, categorySegment, oldSegment);
        const newDir = path.join(IMAGES_DIR, categorySegment, newSegment);
        if (fsSync.existsSync(oldDir)) {
            if (fsSync.existsSync(newDir)) {
                throw new Error(`画像フォルダ ${newDir} が既に存在します。先に整理してください。`);
            }
            ensureDirectorySync(path.dirname(newDir));
            fsSync.renameSync(oldDir, newDir);
        }
    }

    rebuildIndex();
    return { oldGroup: oldKey, newGroup: newKey };
};

const deleteCategoryGroup = (category, group) => {
    const groupKey = normalizeGroupKey(group);
    if (groupKey === DEFAULT_GROUP) {
        throw new Error('default グループは削除できません');
    }
    const { groups } = loadCategory(category);
    if (!groups[groupKey]) {
        throw new Error(`グループ「${groupKey}」が見つかりません`);
    }
    delete groups[groupKey];
    writeCategory(category, groups);

    initializePaths();
    const categorySegment = sanitizeDirSegment(category, 'category');
    const groupSegment = sanitizeDirSegment(groupKey, DEFAULT_GROUP);
    const dirPath = path.join(IMAGES_DIR, categorySegment, groupSegment);
    if (fsSync.existsSync(dirPath)) {
        try {
            fsSync.rmSync(dirPath, { recursive: true, force: true });
        } catch (error) {
            console.warn(`グループ画像フォルダ削除失敗: ${dirPath}: ${error.message}`);
        }
    }

    rebuildIndex();
    return { deletedGroup: groupKey };
};

const listCategoryFiles = () => {
    ensureBaseDirectories();
    initializePaths();
    if (!fs.existsSync(SETS_DIR)) {
        return [];
    }
    return fs.readdirSync(SETS_DIR)
        .filter(name => name.endsWith(CATEGORY_SUFFIX))
        .map(name => ({
            category: name.replace(CATEGORY_SUFFIX, ''),
            path: path.join(SETS_DIR, name)
        }));
};

const rebuildIndex = () => {
    ensureBaseDirectories();
    const items = [];
    const summary = { totalSets: 0, totalTags: 0, categories: {} };
    const files = listCategoryFiles();
    files.forEach(({ category, path: filePath }) => {
        const raw = readJsonFile(filePath);
        const { groups } = normalizeCategoryData(raw);
        const categorySummary = { groups: 0, sections: 0, sets: 0, tags: 0 };

        Object.entries(groups).forEach(([groupKey, groupData]) => {
            categorySummary.groups += 1;
            const sections = groupData && typeof groupData.sections === 'object' ? groupData.sections : {};
            Object.entries(sections).forEach(([sectionName, sets]) => {
                if (!sets || typeof sets !== 'object') {
                    return;
                }
                const setNames = Object.keys(sets);
                if (setNames.length === 0) {
                    return;
                }
                categorySummary.sections += 1;
                setNames.forEach(setName => {
                    const data = sets[setName] || {};
                    const tags = toArray(data.tags);
                    const hasImage = Boolean(data.image);
                    const metadata = normalizeMetadata(data.metadata);
                    const entry = {
                        category,
                        group: groupKey,
                        section: sectionName,
                        name: setName,
                        tagsCount: tags.length,
                        hasImage,
                        image: data.image || '',
                        hash: getSetHash(`${category}|${groupKey}`, sectionName, setName, tags),
                        updatedAt: data.updatedAt || null,
                        metadata
                    };
                    items.push(entry);
                    summary.totalSets += 1;
                    summary.totalTags += tags.length;
                    categorySummary.sets += 1;
                    categorySummary.tags += tags.length;
                });
            });
        });

        summary.categories[category] = categorySummary;
    });

    const payload = {
        version: '2.1.0',
        generatedAt: new Date().toISOString(),
        totalSets: summary.totalSets,
        totalTags: summary.totalTags,
        categories: summary.categories,
        sets: items
    };

    initializePaths();
    writeJsonFile(INDEX_FILE, payload);
    return payload;
};

const validateAllSets = () => {
    ensureBaseDirectories();
    const issues = [];
    const seenByKey = new Map();
    const seenByHash = new Map();

    const files = listCategoryFiles();
    files.forEach(({ category, path: filePath }) => {
        const raw = readJsonFile(filePath);
        const { groups } = normalizeCategoryData(raw);
        Object.entries(groups).forEach(([groupKey, groupData]) => {
            const sections = groupData && typeof groupData.sections === 'object' ? groupData.sections : {};
            Object.entries(sections).forEach(([sectionName, sets]) => {
                if (!sets || typeof sets !== 'object') {
                    issues.push({
                        type: 'invalid_section',
                        category,
                        group: groupKey,
                        section: sectionName,
                        message: 'セクションの形式が不正です'
                    });
                    return;
                }
                Object.entries(sets).forEach(([setName, data]) => {
                    const ref = { category, group: groupKey, section: sectionName, name: setName };
                    const key = `${category}|${groupKey}|${sectionName}|${setName}`;
                    const tags = toArray(data && data.tags);
                    const hash = getSetHash(`${category}|${groupKey}`, sectionName, setName, tags);

                    if (!setName.trim()) {
                        issues.push({ ...ref, type: 'empty_name', message: 'セット名が空です' });
                    }
                    const prev = seenByKey.get(key);
                    if (prev) {
                        issues.push({ ...ref, type: 'duplicate_set', message: `同一カテゴリ・グループ・セクションに同名セットが重複 (${prev.section})` });
                    } else {
                        seenByKey.set(key, ref);
                    }
                    const hashRef = seenByHash.get(hash);
                    if (hashRef) {
                        issues.push({ ...ref, type: 'duplicate_content', message: `セット内容が重複: ${hashRef.category}/${hashRef.group}/${hashRef.section}/${hashRef.name}` });
                    } else {
                        seenByHash.set(hash, ref);
                    }
                    tags.forEach((tag, idx) => {
                        if (typeof tag !== 'string' || !tag.trim()) {
                            issues.push({ ...ref, type: 'invalid_tag', message: `タグ${idx + 1}が不正です` });
                        }
                    });
                    if (data.image) {
                        initializePaths();
                        const imgPath = path.join(IMAGES_DIR, data.image);
                        if (!fs.existsSync(imgPath)) {
                            issues.push({ ...ref, type: 'missing_image', message: `画像ファイルが見つかりません: ${data.image}` });
                        }
                    }
                });
            });
        });
    });

    return {
        success: issues.length === 0,
        issues
    };
};

module.exports = {
    countCategorySets,
    ensureBaseDirectories,
    getDataDir: () => {
        initializePaths();
        return DATA_DIR;
    },
    getSetsBaseDir: () => {
        initializePaths();
        return SETS_DIR;
    },
    getImagesDir: () => {
        initializePaths();
        return IMAGES_DIR;
    },
    getIndexFile: () => {
        initializePaths();
        return INDEX_FILE;
    },
    loadCategory,
    saveCategorySet,
    deleteCategorySet,
    deleteCategorySection,
    renameCategorySection,
    saveSetImage,
    loadSetImage,
    removeSetImage,
    rebuildIndex,
    validateAllSets,
    listCategoryFiles,
    writeCategory,
    getCategoryFilePath,
    renameCategoryGroup,
    deleteCategoryGroup,
    DEFAULT_CATEGORIES,
    DEFAULT_GROUP
};

