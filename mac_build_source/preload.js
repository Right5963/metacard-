const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readImageFile: (filePath) => ipcRenderer.invoke('read-image-file', filePath),
    loadObsidianDictionaries: () => ipcRenderer.invoke('load-obsidian-dictionaries'),

    // 📚 共通辞書システム（C:\metacard\dictionaries\）
    readSharedDictionary: (filename) => ipcRenderer.invoke('read-shared-dictionary', filename),
    writeSharedDictionary: (filename, content) => ipcRenderer.invoke('write-shared-dictionary', filename, content),

    // 🌐 Danbooru辞書更新システム（Phase 10）
    updateDictionariesFromDanbooru: (options) => ipcRenderer.invoke('update-dictionaries-from-danbooru', options),
    updateDictionariesFromCivitai: (options) => ipcRenderer.invoke('update-dictionaries-from-civitai', options),
    onDictionaryUpdateProgress: (callback) => ipcRenderer.on('dictionary-update-progress', callback),

    // 🔑 APIキー管理（Phase 11 - 配布対応）
    saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
    loadApiKey: () => ipcRenderer.invoke('load-api-key'),
    deleteApiKey: () => ipcRenderer.invoke('delete-api-key'),

    // 🤖 Gemini AI分類支援（Phase 12 - 無料枠）
    classifyImageWithGemini: (base64Image) => ipcRenderer.invoke('classify-image-with-gemini', base64Image),
    classifyTextWithGemini: (promptText) => ipcRenderer.invoke('classify-text-with-gemini', promptText),
    generateStoryWithGemini: (userPrompt, poseSets, individualSettingsData) => ipcRenderer.invoke('generate-story-with-gemini', userPrompt, poseSets, individualSettingsData),
    generateSNSPostWithGemini: (userPrompt, snsPlatform, isR18, poseSets, individualSettingsData, commonSettings, useCommonSettings) => ipcRenderer.invoke('generate-sns-post-with-gemini', userPrompt, snsPlatform, isR18, poseSets, individualSettingsData, commonSettings, useCommonSettings),

    // 🏷️ Tagger + Gemini AIハイブリッド分類（Phase 13 - 最高精度）
    checkSDWebUI: (port) => ipcRenderer.invoke('check-sd-webui', port),
    classifyWithTagger: (imagePath, port) => ipcRenderer.invoke('classify-with-tagger', imagePath, port),

    // 📚 AI Learning Dictionary System（Phase 15.2）
    appendToDictionary: (category, tags) => ipcRenderer.invoke('append-to-dictionary', category, tags),

    // 📚 AI Learning Dictionary System（Phase 15.3 - 恒久的保存）
    saveLearnedTags: (learnedTags) => ipcRenderer.invoke('save-learned-tags', learnedTags),
    loadLearnedTags: () => ipcRenderer.invoke('load-learned-tags'),
    sanitizeLearnedDictionary: () => ipcRenderer.invoke('sanitize-learned-tags'),

    // Per-image learned tags
    saveImageLearnedTags: (imageHash, learnedTags) => ipcRenderer.invoke('save-image-learned-tags', imageHash, learnedTags),
    loadImageLearnedTags: (imageHash) => ipcRenderer.invoke('load-image-learned-tags', imageHash),

    // SD API設定 永続化
    saveApiSettings: (settings) => ipcRenderer.invoke('save-api-settings', settings),
    loadApiSettings: () => ipcRenderer.invoke('load-api-settings'),

    // Calibrationファイル読み込み
    loadCalibrationFile: (relPath) => ipcRenderer.invoke('load-calibration-file', relPath),
    saveDebugJson: (payload) => ipcRenderer.invoke('save-debug-json', payload),

    // コンソールログ保存
    saveConsoleLogs: (logs) => ipcRenderer.invoke('save-console-logs', logs),

    // Set Store
    listSets: () => ipcRenderer.invoke('sets-list'),
    saveSet: (set) => ipcRenderer.invoke('sets-save', set),
    deleteSet: (id) => ipcRenderer.invoke('sets-delete', id),
    getSet: (id) => ipcRenderer.invoke('sets-get', id),
    exportSets: (ids) => ipcRenderer.invoke('sets-export', ids),
    exportSetsFile: (ids) => ipcRenderer.invoke('sets-export-file', ids),
    exportSetsLegacy: (ids) => ipcRenderer.invoke('sets-export-legacy', ids),
    exportSetsLegacyFile: (ids) => ipcRenderer.invoke('sets-export-legacy-file', ids),
    importSetsJson: (jsonText, strategy) => ipcRenderer.invoke('sets-import-json', jsonText, strategy),
    importSetsFile: (strategy) => ipcRenderer.invoke('sets-import-file', strategy),

    // Legacy Import helpers
    pickLegacyFolder: () => ipcRenderer.invoke('legacy-pick-folder'),
    scanLegacyFolder: (folder) => ipcRenderer.invoke('legacy-scan-folder', folder),

    // Phase 15: セット選択UI & データ移行システム
    loadCategorySets: (category) => ipcRenderer.invoke('load-category-sets', category),
    saveCategorySet: (category, group, section, setName, tags, image, metadata) =>
        ipcRenderer.invoke('save-category-set', category, group, section, setName, tags, image, metadata),
    deleteCategorySet: (category, group, section, setName) =>
        ipcRenderer.invoke('delete-category-set', category, group, section, setName),
    deleteCategorySection: (category, group, section) =>
        ipcRenderer.invoke('delete-category-section', category, group, section),
    renameCategorySection: (category, group, oldSection, newSection) =>
        ipcRenderer.invoke('rename-category-section', category, group, oldSection, newSection),
    renameCategoryGroup: (category, oldGroup, newGroup) =>
        ipcRenderer.invoke('rename-category-group', category, oldGroup, newGroup),
    getSetsBaseDir: () => ipcRenderer.invoke('get-sets-base-dir'),
    deleteCategoryGroup: (category, group) =>
        ipcRenderer.invoke('delete-category-group', category, group),
    
    // ストーリープロンプトのお気に入り管理
    saveStoryFavorites: (favorites) => ipcRenderer.invoke('save-story-favorites', favorites),
    loadStoryFavorites: () => ipcRenderer.invoke('load-story-favorites'),

    // ストーリー指示テンプレート管理
    saveStoryInstructionTemplates: (templates) => ipcRenderer.invoke('save-story-instruction-templates', templates),
    loadStoryInstructionTemplates: () => ipcRenderer.invoke('load-story-instruction-templates'),

    // サムネイル画像検索
    findThumbnailImage: (category, searchTerm) => ipcRenderer.invoke('find-thumbnail-image', category, searchTerm),
    importSetsFromJSON: () => ipcRenderer.invoke('import-sets-from-json'),
    exportAllSets: () => ipcRenderer.invoke('export-all-sets'),
    saveSetImage: (category, group, section, setName, imageData) =>
        ipcRenderer.invoke('save-set-image', category, group, section, setName, imageData),
    loadSetImage: (fileName) => ipcRenderer.invoke('load-set-image', fileName),
    removeSetImage: (category, group, section, setName) =>
        ipcRenderer.invoke('remove-set-image', category, group, section, setName),

    // Story Library (Phase 16 roadmap)
    listStories: () => ipcRenderer.invoke('story-list'),
    loadStory: (storyId) => ipcRenderer.invoke('story-load', storyId),
    saveStory: (storyPayload) => ipcRenderer.invoke('story-save', storyPayload),
    deleteStory: (storyId) => ipcRenderer.invoke('story-delete', storyId),
    
    // YAML Generator IPC functions
    selectTextFile: () => ipcRenderer.invoke('select-text-file'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
    listTextFiles: (folderPath) => ipcRenderer.invoke('list-text-files', folderPath),
    saveYamlFile: (filePath, content) => ipcRenderer.invoke('save-yaml-file', filePath, content),
    saveTextFile: (filePath, content) => ipcRenderer.invoke('save-text-file', filePath, content),
    showSaveDialog: (defaultPath, filters) => ipcRenderer.invoke('show-save-dialog', defaultPath, filters),
    
    // YAML Generator お気に入り
    saveYamlFavorites: (favorites) => ipcRenderer.invoke('save-yaml-favorites', favorites),
    loadYamlFavorites: () => ipcRenderer.invoke('load-yaml-favorites'),
    
    // 辞書ファイル読み込み（YAML生成システム用）
    readDictionaryFile: (filename) => ipcRenderer.invoke('read-dictionary-file', filename),
    
    // ライセンス管理API
    getLicenseInfo: () => ipcRenderer.invoke('license-get-info'),
    verifyLicense: (method, data) => ipcRenderer.invoke('license-verify', method, data),
    checkSetLimit: (category) => ipcRenderer.invoke('license-check-set-limit', category),
    activateTrial: () => ipcRenderer.invoke('license-activate-trial'),
    validateLicense: () => ipcRenderer.invoke('license-validate'),
    completeVerification: () => ipcRenderer.invoke('license-complete-verification'),
    
    // ガイドライン読み込み
    readGuideFile: (filename) => ipcRenderer.invoke('read-guide-file', filename),
    
    // アプリケーション状態
    isPackaged: () => ipcRenderer.invoke('app-is-packaged'),

    // ========================================
    // Phase 2: 欠落ポーズ登録システム API
    // ========================================
    detectMissingPosesStart: () => ipcRenderer.invoke('detect-missing-poses-start'),
    detectMissingPosesStop: () => ipcRenderer.invoke('detect-missing-poses-stop'),
    getMissingPoses: () => ipcRenderer.invoke('get-missing-poses'),
    suggestPosePrompt: (poseData) => ipcRenderer.invoke('suggest-pose-prompt', poseData),
    registerPose: (poseData) => ipcRenderer.invoke('register-pose', poseData),
    batchRegisterPoses: (posesArray) => ipcRenderer.invoke('batch-register-poses', posesArray)
});
