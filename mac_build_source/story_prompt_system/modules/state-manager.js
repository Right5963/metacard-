// state-manager.js - 状態管理モジュール
// 責任: グローバル状態の管理

const StateManager = (() => {
    'use strict';

    // 初期状態
    const initialState = {
        currentView: 'pose', // 'pose' or 'scene'
        currentCategory: 'pose', // 'pose', 'face', 'body', 'background', 'clothing', 'expression'
        currentGroup: 'default', // 'default' or 'nsfw'
        expandedSections: {
            'default': [], // 展開中のセクション名リスト
            'nsfw': []
        },
        selectedPoses: [], // { id, title, tags, order, group, section }
        scenes: [], // Scene[]
        activeSceneId: null,
        globalSettings: {
            face: null,
            body: null,
            background: null,
            clothing: null
        },
        sceneType: 'normal', // 'normal' or 'lesbian'
        storyId: null,
        storyTitle: '',
        availableSets: {
            face: [],
            body: [],
            background: [],
            clothing: [],
            expression: [],
            pose: null // { groups: { default: { sections: {...} }, nsfw: { sections: {...} } } }
        }
    };

    // 現在の状態（ディープコピー）
    let state = JSON.parse(JSON.stringify(initialState));

    /**
     * 現在の状態を取得
     * @returns {Object} 現在の状態
     */
    const getState = () => {
        return state;
    };

    /**
     * 状態を更新
     * @param {Object} updates - 更新内容
     */
    const updateState = (updates) => {
        state = { ...state, ...updates };
        console.log('[StateManager] 状態更新:', updates);
    };

    /**
     * ネストされた状態を更新
     * @param {string} path - パス（例: 'globalSettings.face'）
     * @param {*} value - 値
     */
    const updateNestedState = (path, value) => {
        const keys = path.split('.');
        let current = state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        console.log(`[StateManager] ネスト更新: ${path} =`, value);
    };

    /**
     * 状態をリセット
     */
    const resetState = () => {
        state = JSON.parse(JSON.stringify(initialState));
        console.log('[StateManager] 状態リセット');
    };

    /**
     * シーンを追加
     * @param {Object} scene - シーンオブジェクト
     */
    const addScene = (scene) => {
        state.scenes.push(scene);
        console.log('[StateManager] シーン追加:', scene.id);
    };

    /**
     * シーンを更新
     * @param {string} sceneId - シーンID
     * @param {Object} updates - 更新内容
     */
    const updateScene = (sceneId, updates) => {
        const index = state.scenes.findIndex(s => s.id === sceneId);
        if (index >= 0) {
            state.scenes[index] = { ...state.scenes[index], ...updates };
            console.log('[StateManager] シーン更新:', sceneId, updates);
        }
    };

    /**
     * シーンを削除
     * @param {string} sceneId - シーンID
     */
    const deleteScene = (sceneId) => {
        const index = state.scenes.findIndex(s => s.id === sceneId);
        if (index >= 0) {
            state.scenes.splice(index, 1);
            console.log('[StateManager] シーン削除:', sceneId);
        }
    };

    /**
     * アクティブシーンを取得
     * @returns {Object|null} アクティブシーン
     */
    const getActiveScene = () => {
        return state.scenes.find(s => s.id === state.activeSceneId) || null;
    };

    /**
     * セクションの展開状態を切り替え
     * @param {string} group - グループ名
     * @param {string} section - セクション名
     */
    const toggleSection = (group, section) => {
        if (!state.expandedSections[group]) {
            state.expandedSections[group] = [];
        }
        
        const index = state.expandedSections[group].indexOf(section);
        if (index >= 0) {
            // 折りたたむ
            state.expandedSections[group].splice(index, 1);
            console.log(`[StateManager] セクション折りたたみ: ${group}/${section}`);
        } else {
            // 展開
            state.expandedSections[group].push(section);
            console.log(`[StateManager] セクション展開: ${group}/${section}`);
        }
    };

    /**
     * セクションを展開
     * @param {string} group - グループ名
     * @param {string} section - セクション名
     */
    const expandSection = (group, section) => {
        if (!state.expandedSections[group]) {
            state.expandedSections[group] = [];
        }
        
        if (!state.expandedSections[group].includes(section)) {
            state.expandedSections[group].push(section);
            console.log(`[StateManager] セクション展開: ${group}/${section}`);
        }
    };

    /**
     * セクションが展開されているか確認
     * @param {string} group - グループ名
     * @param {string} section - セクション名
     * @returns {boolean}
     */
    const isSectionExpanded = (group, section) => {
        return state.expandedSections[group]?.includes(section) || false;
    };

    // 公開API
    return {
        getState,
        updateState,
        updateNestedState,
        resetState,
        addScene,
        updateScene,
        deleteScene,
        getActiveScene,
        toggleSection,
        expandSection,
        isSectionExpanded
    };
})();

// グローバルに公開
window.StateManager = StateManager;

