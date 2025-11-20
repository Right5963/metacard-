// preview-generator.js - プレビュー生成モジュール
// 責任: シーンデータからプロンプトテキストを生成

const PreviewGenerator = (() => {
    'use strict';

    const SCENE_TYPES = {
        normal: '普通のSEX',
        lesbian: 'レズビアン'
    };

    const CLOTHING_STATES = {
        normal: '通常',
        nude: '全裸',
        topless: '上半身',
        bottomless: '下着のみ'
    };

    /**
     * 単一シーンのプロンプトを生成
     * @param {Object} scene - シーンオブジェクト
     * @param {Object} options - オプション
     * @returns {string} プロンプトテキスト
     */
    const generatePrompt = (scene, options = {}) => {
        const { showExplanation = false } = options;
        
        let prompt = '';
        
        // タグを結合
        const tags = [];
        
        if (scene.poseTags && scene.poseTags.length > 0) {
            tags.push(...scene.poseTags);
        }
        
        if (scene.backgroundSet) {
            tags.push(scene.backgroundSet);
        }
        
        if (scene.expressionSet) {
            tags.push(scene.expressionSet);
        }
        
        if (scene.clothingSet) {
            tags.push(scene.clothingSet);
            if (scene.clothingState !== 'normal') {
                tags.push(CLOTHING_STATES[scene.clothingState]);
            }
        }
        
        prompt = tags.join(', ');
        
        return prompt;
    };

    /**
     * プレビューテキストを生成
     * @param {Array} scenes - シーン配列
     * @param {Object} options - オプション
     * @returns {string} プレビューテキスト
     */
    const generatePreview = (scenes, options = {}) => {
        const { showExplanation = false, sceneType = 'normal' } = options;
        
        if (!scenes || scenes.length === 0) {
            return 'ポーズを選択してシーンを作成してください。';
        }
        
        let preview = '';
        
        if (showExplanation) {
            preview += `【ストーリータイプ: ${SCENE_TYPES[sceneType]}】\n`;
            preview += `【シーン数: ${scenes.length}】\n\n`;
        }
        
        scenes.forEach((scene, index) => {
            if (showExplanation) {
                preview += `━━━━━━━━━━━━━━━━━━━━\n`;
                preview += `【シーン${index + 1}: ${scene.title}】\n`;
                preview += `━━━━━━━━━━━━━━━━━━━━\n`;
            } else {
                preview += `■ シーン${index + 1}: ${scene.title}\n`;
            }
            
            const prompt = generatePrompt(scene, options);
            preview += `${prompt}\n`;
            
            if (scene.notes) {
                preview += `メモ: ${scene.notes}\n`;
            }
            
            preview += '\n';
        });
        
        console.log('[PreviewGenerator] プレビュー生成完了');
        return preview;
    };

    /**
     * エクスポート用のプロンプトを生成
     * @param {Array} scenes - シーン配列
     * @returns {string} エクスポート用テキスト
     */
    const generateExportPrompt = (scenes) => {
        if (!scenes || scenes.length === 0) {
            return '';
        }
        
        let text = '';
        
        scenes.forEach((scene, index) => {
            const prompt = generatePrompt(scene);
            text += `${prompt}\n`;
        });
        
        return text.trim();
    };

    // 公開API
    return {
        generatePrompt,
        generatePreview,
        generateExportPrompt
    };
})();

// グローバルに公開
window.PreviewGenerator = PreviewGenerator;

