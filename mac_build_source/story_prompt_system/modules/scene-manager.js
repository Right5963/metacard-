// scene-manager.js - シーン管理モジュール
// 責任: シーンのCRUD操作

const SceneManager = (() => {
    'use strict';

    /**
     * IDを生成
     * @param {string} prefix - プレフィックス
     * @returns {string} ID
     */
    const generateId = (prefix = 'scene') => 
        `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

    /**
     * シーンを作成
     * @param {Object} poseSet - ポーズセット { id, name, group, section, tags }
     * @returns {Object} シーンオブジェクト
     */
    const createScene = (poseSet) => {
        const state = window.StateManager.getState();
        
        const scene = {
            id: generateId('scene'),
            poseSet: poseSet.id || poseSet.name,
            poseGroup: poseSet.group || 'default',
            poseSection: poseSet.section || '',
            title: poseSet.name || 'シーン',
            poseTags: poseSet.tags || [],
            backgroundSet: state.globalSettings.background,
            expressionSet: null,
            clothingSet: state.globalSettings.clothing,
            clothingState: 'normal',
            notes: ''
        };
        
        console.log('[SceneManager] シーン作成:', scene.id, `(${scene.poseGroup}/${scene.poseSection})`);
        return scene;
    };

    /**
     * シーンを更新
     * @param {string} sceneId - シーンID
     * @param {Object} updates - 更新内容
     */
    const updateScene = (sceneId, updates) => {
        window.StateManager.updateScene(sceneId, updates);
        console.log('[SceneManager] シーン更新:', sceneId);
    };

    /**
     * シーンを削除
     * @param {string} sceneId - シーンID
     */
    const deleteScene = (sceneId) => {
        window.StateManager.deleteScene(sceneId);
        console.log('[SceneManager] シーン削除:', sceneId);
    };

    /**
     * シーンを並び替え
     * @param {Array<string>} sceneIds - シーンID配列（新しい順序）
     */
    const reorderScenes = (sceneIds) => {
        const state = window.StateManager.getState();
        const newScenes = [];
        
        sceneIds.forEach(id => {
            const scene = state.scenes.find(s => s.id === id);
            if (scene) {
                newScenes.push(scene);
            }
        });
        
        window.StateManager.updateState({ scenes: newScenes });
        console.log('[SceneManager] シーン並び替え完了');
    };

    /**
     * シーンを上に移動
     * @param {string} sceneId - シーンID
     */
    const moveSceneUp = (sceneId) => {
        const state = window.StateManager.getState();
        const index = state.scenes.findIndex(s => s.id === sceneId);
        
        if (index > 0) {
            const newScenes = [...state.scenes];
            [newScenes[index - 1], newScenes[index]] = [newScenes[index], newScenes[index - 1]];
            window.StateManager.updateState({ scenes: newScenes });
            console.log('[SceneManager] シーン上移動:', sceneId);
        }
    };

    /**
     * シーンを下に移動
     * @param {string} sceneId - シーンID
     */
    const moveSceneDown = (sceneId) => {
        const state = window.StateManager.getState();
        const index = state.scenes.findIndex(s => s.id === sceneId);
        
        if (index >= 0 && index < state.scenes.length - 1) {
            const newScenes = [...state.scenes];
            [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
            window.StateManager.updateState({ scenes: newScenes });
            console.log('[SceneManager] シーン下移動:', sceneId);
        }
    };

    // 公開API
    return {
        createScene,
        updateScene,
        deleteScene,
        reorderScenes,
        moveSceneUp,
        moveSceneDown
    };
})();

// グローバルに公開
window.SceneManager = SceneManager;

