// storage-manager.js - ストーリー保存/読み込みモジュール
// 責任: Electron IPC経由でストーリーデータを保存/読み込み

const StorageManager = (() => {
    'use strict';

    /**
     * Electron APIが利用可能かチェック
     * @returns {boolean}
     */
    const hasElectron = () => typeof window.electronAPI !== 'undefined';

    /**
     * IDを生成
     * @param {string} prefix - プレフィックス
     * @returns {string} ID
     */
    const generateId = (prefix = 'story') => 
        `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

    /**
     * ストーリーを保存
     * @param {Object} storyData - ストーリーデータ
     * @returns {Promise<Object>} 結果
     */
    const saveStory = async (storyData) => {
        if (!hasElectron()) {
            console.warn('[StorageManager] Electron API が利用できません');
            return { success: false, error: 'Electron API が利用できません' };
        }
        
        try {
            console.log('[StorageManager] ストーリー保存開始:', storyData.id);
            
            const payload = {
                id: storyData.id || generateId('story'),
                title: storyData.title || '無題のストーリー',
                createdAt: storyData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                globalSettings: storyData.globalSettings || {},
                sceneType: storyData.sceneType || 'normal',
                scenes: storyData.scenes || []
            };
            
            const result = await window.electronAPI.saveStory(payload);
            
            if (result && result.success) {
                console.log('[StorageManager] ストーリー保存成功:', payload.id);
                return { success: true, storyId: payload.id };
            }
            
            console.warn('[StorageManager] ストーリー保存失敗');
            return { success: false, error: 'ストーリー保存に失敗しました' };
        } catch (error) {
            console.error('[StorageManager] ストーリー保存エラー:', error);
            return { success: false, error: error.message };
        }
    };

    /**
     * ストーリーを読み込み
     * @param {string} storyId - ストーリーID
     * @returns {Promise<Object>} ストーリーデータ
     */
    const loadStory = async (storyId) => {
        if (!hasElectron()) {
            console.warn('[StorageManager] Electron API が利用できません');
            return null;
        }
        
        try {
            console.log('[StorageManager] ストーリー読み込み開始:', storyId);
            const result = await window.electronAPI.loadStory(storyId);
            
            if (result && result.success && result.story) {
                console.log('[StorageManager] ストーリー読み込み成功:', storyId);
                return result.story;
            }
            
            console.warn('[StorageManager] ストーリー読み込み失敗:', storyId);
            return null;
        } catch (error) {
            console.error('[StorageManager] ストーリー読み込みエラー:', error);
            return null;
        }
    };

    /**
     * ストーリー一覧を取得
     * @returns {Promise<Array>} ストーリー一覧
     */
    const listStories = async () => {
        if (!hasElectron()) {
            console.warn('[StorageManager] Electron API が利用できません');
            return [];
        }
        
        try {
            console.log('[StorageManager] ストーリー一覧取得開始');
            const result = await window.electronAPI.listStories();
            
            if (result && result.success && result.stories) {
                console.log('[StorageManager] ストーリー一覧取得成功:', result.stories.length);
                return result.stories;
            }
            
            console.warn('[StorageManager] ストーリー一覧取得失敗');
            return [];
        } catch (error) {
            console.error('[StorageManager] ストーリー一覧取得エラー:', error);
            return [];
        }
    };

    /**
     * ストーリーを削除
     * @param {string} storyId - ストーリーID
     * @returns {Promise<boolean>} 成功/失敗
     */
    const deleteStory = async (storyId) => {
        if (!hasElectron()) {
            console.warn('[StorageManager] Electron API が利用できません');
            return false;
        }
        
        try {
            console.log('[StorageManager] ストーリー削除開始:', storyId);
            const result = await window.electronAPI.deleteStory(storyId);
            
            if (result && result.success) {
                console.log('[StorageManager] ストーリー削除成功:', storyId);
                return true;
            }
            
            console.warn('[StorageManager] ストーリー削除失敗:', storyId);
            return false;
        } catch (error) {
            console.error('[StorageManager] ストーリー削除エラー:', error);
            return false;
        }
    };

    // 公開API
    return {
        saveStory,
        loadStory,
        listStories,
        deleteStory
    };
})();

// グローバルに公開
window.StorageManager = StorageManager;

