const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const STORIES_DIR = path.join(DATA_DIR, 'stories');
const HISTORY_ROOT = path.join(STORIES_DIR, '_history');
const INDEX_FILE = path.join(STORIES_DIR, 'index.json');

const STORY_SCHEMA_VERSION = '1.0.0';

const ensureDirectorySync = (targetPath) => {
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
};

const ensureBaseDirectories = () => {
    ensureDirectorySync(DATA_DIR);
    ensureDirectorySync(STORIES_DIR);
    ensureDirectorySync(HISTORY_ROOT);
};

const sanitizeIdSegment = (value, fallback) => {
    const sanitized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return sanitized || fallback;
};

const generateStoryId = (title) => {
    const base = sanitizeIdSegment(title, 'story');
    const random = crypto.randomBytes(3).toString('hex');
    return `${base}-${Date.now()}-${random}`;
};

const readJsonSafe = (filePath) => {
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

const writeJsonAtomic = (filePath, data) => {
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
};

const getStoryDir = (storyId) => path.join(STORIES_DIR, storyId);
const getStoryFilePath = (storyId) => path.join(getStoryDir(storyId), 'story.json');
const getTemplateFilePath = (storyId) => path.join(getStoryDir(storyId), 'template.md');
const getAssetsDir = (storyId) => path.join(getStoryDir(storyId), '_assets');
const getHistoryDir = (storyId) => path.join(HISTORY_ROOT, storyId);

const normalizeStoryMeta = (story) => {
    const result = { ...story };
    result.schemaVersion = STORY_SCHEMA_VERSION;
    result.updatedAt = new Date().toISOString();
    if (!result.createdAt) {
        result.createdAt = result.updatedAt;
    }
    if (!Array.isArray(result.chapters)) {
        result.chapters = [];
    }
    return result;
};

const summarizeStory = (story) => {
    const chapters = Array.isArray(story.chapters) ? story.chapters : [];
    const scenes = chapters.reduce((sum, chapter) => {
        const chapterScenes = Array.isArray(chapter?.scenes) ? chapter.scenes.length : 0;
        return sum + chapterScenes;
    }, 0);
    return {
        id: story.id,
        title: story.title || '無題ストーリー',
        author: story.author || '',
        updatedAt: story.updatedAt,
        createdAt: story.createdAt,
        chapterCount: chapters.length,
        sceneCount: scenes
    };
};

const loadIndex = () => {
    const data = readJsonSafe(INDEX_FILE);
    if (data && Array.isArray(data.stories)) {
        return data;
    }
    return { version: STORY_SCHEMA_VERSION, stories: [] };
};

const writeIndex = (index) => {
    writeJsonAtomic(INDEX_FILE, index);
};

const listStories = () => {
    ensureBaseDirectories();
    const index = loadIndex();
    const existing = new Set(index.stories.map(entry => entry.id));

    // Garbage collect entries with missing folders
    const filtered = index.stories.filter(entry => {
        const storyDir = getStoryDir(entry.id);
        return fs.existsSync(storyDir) && fs.existsSync(getStoryFilePath(entry.id));
    });

    if (filtered.length !== index.stories.length) {
        writeIndex({ ...index, stories: filtered });
    }

    return filtered.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
};

const loadStory = (storyId) => {
    ensureBaseDirectories();
    const sanitizedId = sanitizeIdSegment(storyId, null);
    if (!sanitizedId) {
        throw new Error('無効なストーリーIDです');
    }
    const filePath = getStoryFilePath(sanitizedId);
    const story = readJsonSafe(filePath);
    if (!story) {
        throw new Error(`ストーリーが見つかりません: ${sanitizedId}`);
    }
    return story;
};

const createHistorySnapshot = (storyId, snapshot) => {
    if (!snapshot) return;
    const historyDir = getHistoryDir(storyId);
    ensureDirectorySync(historyDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(historyDir, `${timestamp}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
};

const saveStory = (storyInput) => {
    ensureBaseDirectories();
    if (!storyInput || typeof storyInput !== 'object') {
        throw new Error('保存するストーリーデータが無効です');
    }

    const index = loadIndex();
    const existingIds = new Set(index.stories.map(entry => entry.id));

    let storyId = sanitizeIdSegment(storyInput.id, null);
    if (!storyId || !existingIds.has(storyId)) {
        storyId = storyId || generateStoryId(storyInput.title || 'story');
        storyId = sanitizeIdSegment(storyId, generateStoryId('story'));
    }

    const storyDir = getStoryDir(storyId);
    ensureDirectorySync(storyDir);
    ensureDirectorySync(getAssetsDir(storyId));

    const storyFilePath = getStoryFilePath(storyId);
    const previous = readJsonSafe(storyFilePath);

    const storyPayload = normalizeStoryMeta({ ...storyInput, id: storyId });

    if (previous) {
        createHistorySnapshot(storyId, previous);
        storyPayload.createdAt = previous.createdAt || storyPayload.createdAt;
    }

    writeJsonAtomic(storyFilePath, storyPayload);

    const summary = summarizeStory(storyPayload);
    const otherStories = index.stories.filter(entry => entry.id !== storyId);
    otherStories.push(summary);
    writeIndex({ version: STORY_SCHEMA_VERSION, stories: otherStories });

    return {
        id: storyId,
        dir: storyDir,
        summary
    };
};

const deleteStory = (storyId) => {
    ensureBaseDirectories();
    const sanitizedId = sanitizeIdSegment(storyId, null);
    if (!sanitizedId) {
        throw new Error('無効なストーリーIDです');
    }
    const storyDir = getStoryDir(sanitizedId);
    if (!fs.existsSync(storyDir)) {
        return { deleted: false };
    }
    const removeRecursive = (target) => {
        if (fs.existsSync(target)) {
            fs.readdirSync(target).forEach((entry) => {
                const entryPath = path.join(target, entry);
                const stat = fs.statSync(entryPath);
                if (stat.isDirectory()) {
                    removeRecursive(entryPath);
                } else {
                    fs.unlinkSync(entryPath);
                }
            });
            fs.rmdirSync(target);
        }
    };
    removeRecursive(storyDir);

    const index = loadIndex();
    const stories = index.stories.filter(entry => entry.id !== sanitizedId);
    writeIndex({ version: STORY_SCHEMA_VERSION, stories });

    return { deleted: true };
};

module.exports = {
    STORY_SCHEMA_VERSION,
    STORIES_DIR,
    listStories,
    loadStory,
    saveStory,
    deleteStory,
    generateStoryId,
    getStoryDir,
    getAssetsDir,
    getTemplateFilePath
};
