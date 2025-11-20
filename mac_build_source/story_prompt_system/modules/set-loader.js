// set-loader.js - セット読み込みモジュール
// 責任: Electron IPC経由でセットデータを取得

const SetLoader = (() => {
    'use strict';

    /**
     * Electron APIが利用可能かチェック
     * @returns {boolean}
     */
    const hasElectron = () => {
        // 直接アクセス
        if (typeof window.electronAPI !== 'undefined') {
            return true;
        }
        // iframe内の場合は親ウィンドウから取得
        if (window.parent && window.parent !== window && typeof window.parent.electronAPI !== 'undefined') {
            return true;
        }
        return false;
    };
    
    /**
     * Electron APIを取得
     * @returns {Object}
     */
    const getElectronAPI = () => {
        if (typeof window.electronAPI !== 'undefined') {
            return window.electronAPI;
        }
        if (window.parent && window.parent !== window && typeof window.parent.electronAPI !== 'undefined') {
            return window.parent.electronAPI;
        }
        return null;
    };

    /**
     * カテゴリ別セットを読み込み
     * @param {string} category - カテゴリ名
     * @returns {Promise<Object|Array>} セットデータ（poseは階層構造、その他は配列）
     */
    /**
     * WebUI用のモックデータ
     */
    const getMockData = (category) => {
        const mockSets = {
            pose: {
                groups: {
                    default: {
                        sections: {
                            '基本ポーズ': {
                                '立ちポーズ': { tags: ['standing', 'basic'], image: null },
                                '座りポーズ': { tags: ['sitting', 'basic'], image: null },
                                '寝ポーズ': { tags: ['lying', 'basic'], image: null }
                            },
                            'セクシーポーズ': {
                                '誘惑ポーズ': { tags: ['sexy', 'seductive'], image: null },
                                '挑発ポーズ': { tags: ['sexy', 'provocative'], image: null }
                            }
                        }
                    },
                    nsfw: {
                        sections: {
                            '前戯': {
                                'キス': { tags: ['kiss', 'foreplay'], image: null },
                                '愛撫': { tags: ['caress', 'foreplay'], image: null }
                            },
                            '本番': {
                                '正常位': { tags: ['missionary', 'sex'], image: null },
                                '騎乗位': { tags: ['cowgirl', 'sex'], image: null }
                            }
                        }
                    }
                }
            },
            face: {
                groups: {
                    default: {
                        sections: {
                            '基本表情': {
                                '笑顔': { tags: ['smile', 'happy'], image: null },
                                '真剣': { tags: ['serious'], image: null }
                            }
                        }
                    }
                }
            },
            body: {
                groups: {
                    default: {
                        sections: {
                            '体型': {
                                'スリム': { tags: ['slim', 'body'], image: null },
                                'グラマラス': { tags: ['glamorous', 'body'], image: null }
                            }
                        }
                    }
                }
            },
            background: {
                groups: {
                    default: {
                        sections: {
                            '室内': {
                                'ベッドルーム': { tags: ['bedroom', 'indoor'], image: null },
                                'リビング': { tags: ['living room', 'indoor'], image: null }
                            }
                        }
                    }
                }
            },
            clothing: {
                groups: {
                    default: {
                        sections: {
                            '服装': {
                                '制服': { tags: ['uniform', 'clothing'], image: null },
                                'ドレス': { tags: ['dress', 'clothing'], image: null }
                            }
                        }
                    }
                }
            },
            expression: {
                groups: {
                    default: {
                        sections: {
                            '表情': {
                                '恥じらい': { tags: ['shy', 'expression'], image: null },
                                '快楽': { tags: ['pleasure', 'expression'], image: null }
                            }
                        }
                    }
                }
            }
        };
        
        return mockSets[category] || { groups: {} };
    };

    const loadCategorySets = async (category) => {
        if (!hasElectron()) {
            console.warn('[SetLoader] Electron API が利用できません - モックデータを使用');
            return getMockData(category);
        }
        
        try {
            console.log(`[SetLoader] セット読み込み開始: ${category}`);
            const electronAPI = getElectronAPI();
            if (!electronAPI) {
                console.error('[SetLoader] Electron API が取得できません');
                return getMockData(category);
            }
            const result = await electronAPI.loadCategorySets(category);
            
            console.log(`[SetLoader] 受信データ (${category}):`, result);
            
            if (result && result.success) {
                // 全カテゴリで groups を使用（階層構造）
                if (result.groups) {
                    const groupCount = Object.keys(result.groups).length;
                    console.log(`[SetLoader] セット読み込み成功: ${category} (${groupCount}グループ)`, Object.keys(result.groups));
                    return { groups: result.groups };
                }
                // groups がない場合は sections を使用（後方互換性）
                else if (result.sections) {
                    const count = Object.keys(result.sections).length;
                    console.log(`[SetLoader] セクション読み込み成功: ${category} (${count}件)`);
                    // sections を groups 形式に変換
                    return { groups: { default: { sections: result.sections } } };
                }
                // sets がある場合（古い形式）
                else if (result.sets) {
                    const count = Array.isArray(result.sets) ? result.sets.length : Object.keys(result.sets).length;
                    console.log(`[SetLoader] セット読み込み成功（古い形式）: ${category} (${count}件)`);
                    return result.sets;
                }
            }
            
            console.warn(`[SetLoader] セット読み込み失敗: ${category}`, result);
            return category === 'pose' ? { groups: {} } : [];
        } catch (error) {
            console.error(`[SetLoader] セット読み込みエラー (${category}):`, error);
            return category === 'pose' ? { groups: {} } : [];
        }
    };

    /**
     * 全カテゴリのセットを読み込み
     * @returns {Promise<Object>} カテゴリ別セットオブジェクト
     */
    const loadAllSets = async () => {
        console.log('[SetLoader] 全セット読み込み開始');
        
        const categories = ['face', 'body', 'background', 'clothing', 'expression', 'pose'];
        const promises = categories.map(cat => loadCategorySets(cat));
        const results = await Promise.all(promises);
        
        const allSets = {};
        categories.forEach((cat, index) => {
            allSets[cat] = results[index];
        });
        
        console.log('[SetLoader] 全セット読み込み完了');
        return allSets;
    };

    /**
     * セット画像を読み込み
     * @param {string} fileName - ファイル名
     * @returns {Promise<string|null>} データURL
     */
    const loadSetImage = async (fileName) => {
        if (!hasElectron() || !fileName) {
            return null;
        }
        
        try {
            const electronAPI = getElectronAPI();
            if (!electronAPI) {
                return null;
            }
            const result = await electronAPI.loadSetImage(fileName);
            if (result && result.success && result.dataUrl) {
                return result.dataUrl;
            }
            return null;
        } catch (error) {
            console.error('[SetLoader] 画像読み込みエラー:', error);
            return null;
        }
    };

    // 公開API
    return {
        loadCategorySets,
        loadAllSets,
        loadSetImage
    };
})();

// グローバルに公開
window.SetLoader = SetLoader;

