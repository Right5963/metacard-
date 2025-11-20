// 💾 ポーズ登録モジュール（Phase 2 - Pose Registration）
// data/sets/*.jsonへの新規ポーズ登録を担当

const fs = require('fs');
const path = require('path');

/**
 * ポーズ登録クラス
 * 欠落ポーズをdata/sets/配下のJSONファイルに登録
 */
class PoseRegistry {
    constructor() {
        this.setsDirectory = path.join(__dirname, '../../data/sets');
    }

    /**
     * 新規ポーズをセットに登録
     * @param {Object} poseData - {
     *   group: string,        // "レズ", "default"等
     *   section: string,      // "倉庫", "体育館"等
     *   name: string,         // "騎乗位での愛撫"
     *   tags: string[],       // ["2girls", "lesbian", ...]
     *   prompt: string        // 完全なプロンプト文字列
     * }
     * @returns {Promise<Object>} {success: boolean, message: string, filePath: string}
     */
    async registerPose(poseData) {
        try {
            console.log('💾 ポーズ登録開始:', poseData.name);

            // 1. 適切なJSONファイルを特定
            const fileName = this.getSetFileName(poseData.group);
            const filePath = path.join(this.setsDirectory, fileName);

            console.log(`📂 ファイル: ${fileName}`);

            // 2. 既存データ読み込み（ファイルがない場合は新規作成）
            let setData;
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                setData = JSON.parse(fileContent);
            } else {
                console.log('📄 新規ファイル作成');
                setData = {
                    groups: {}
                };
            }

            // 3. グループ・セクション構造を確保
            if (!setData.groups[poseData.group]) {
                setData.groups[poseData.group] = {
                    sections: {}
                };
            }

            if (!setData.groups[poseData.group].sections[poseData.section]) {
                setData.groups[poseData.group].sections[poseData.section] = {};
            }

            // 4. 重複チェック
            const existingPose = setData.groups[poseData.group].sections[poseData.section][poseData.name];
            if (existingPose) {
                console.log('⚠️ 既に存在するポーズです:', poseData.name);
                return {
                    success: false,
                    message: `ポーズ "${poseData.name}" は既に存在します`,
                    filePath: filePath
                };
            }

            // 5. 新規ポーズ追加
            setData.groups[poseData.group].sections[poseData.section][poseData.name] = {
                tags: poseData.tags,
                prompt: poseData.prompt,
                addedAt: new Date().toISOString(),
                addedBy: 'MissingPoseRegistration'
            };

            // 6. ファイル保存
            fs.writeFileSync(filePath, JSON.stringify(setData, null, 2), 'utf-8');

            console.log('✅ ポーズ登録完了:', poseData.name);

            return {
                success: true,
                message: `ポーズ "${poseData.name}" を登録しました`,
                filePath: filePath
            };

        } catch (error) {
            console.error('❌ ポーズ登録エラー:', error);
            return {
                success: false,
                message: `登録失敗: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * 複数ポーズを一括登録
     * @param {Array<Object>} posesArray - ポーズデータの配列
     * @returns {Promise<Object>} {
     *   totalCount: number,
     *   successCount: number,
     *   failureCount: number,
     *   results: Array<Object>
     * }
     */
    async batchRegister(posesArray) {
        console.log(`🔄 バッチ登録開始: ${posesArray.length}個のポーズ`);

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < posesArray.length; i++) {
            const poseData = posesArray[i];
            console.log(`📋 登録中 (${i + 1}/${posesArray.length}): ${poseData.name}`);

            const result = await this.registerPose(poseData);
            results.push({
                ...result,
                poseName: poseData.name,
                index: i + 1
            });

            if (result.success) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        console.log('✅ バッチ登録完了');
        console.log(`📊 成功: ${successCount}個, 失敗: ${failureCount}個`);

        return {
            totalCount: posesArray.length,
            successCount: successCount,
            failureCount: failureCount,
            results: results
        };
    }

    /**
     * グループ名から適切なJSONファイル名を取得
     * @param {string} group - グループ名（"レズ", "default"等）
     * @returns {string} ファイル名（"lesbian_poses.json"等）
     */
    getSetFileName(group) {
        // グループ名とファイル名のマッピング
        const fileMapping = {
            'レズ': 'lesbian_poses.json',
            'lesbian': 'lesbian_poses.json',
            'ゲイ': 'gay_poses.json',
            'gay': 'gay_poses.json',
            'ヘテロ': 'hetero_poses.json',
            'hetero': 'hetero_poses.json',
            'default': 'default_poses.json'
        };

        return fileMapping[group] || 'default_poses.json';
    }

    /**
     * セットディレクトリ内の全JSONファイルを取得
     * @returns {Array<string>} ファイル名の配列
     */
    listSetFiles() {
        try {
            if (!fs.existsSync(this.setsDirectory)) {
                console.log('📁 setsディレクトリが存在しません。作成します...');
                fs.mkdirSync(this.setsDirectory, { recursive: true });
                return [];
            }

            const files = fs.readdirSync(this.setsDirectory);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            console.log(`📂 既存セットファイル: ${jsonFiles.length}個`);
            return jsonFiles;

        } catch (error) {
            console.error('❌ ファイル一覧取得エラー:', error);
            return [];
        }
    }

    /**
     * 特定のグループ・セクションのポーズ数を取得
     * @param {string} group - グループ名
     * @param {string} section - セクション名（オプション）
     * @returns {number} ポーズ数
     */
    countPoses(group, section = null) {
        try {
            const fileName = this.getSetFileName(group);
            const filePath = path.join(this.setsDirectory, fileName);

            if (!fs.existsSync(filePath)) {
                return 0;
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const setData = JSON.parse(fileContent);

            if (!setData.groups[group]) {
                return 0;
            }

            if (section) {
                // 特定セクションのポーズ数
                const sectionData = setData.groups[group].sections[section];
                return sectionData ? Object.keys(sectionData).length : 0;
            } else {
                // 全セクションのポーズ数
                let totalCount = 0;
                const sections = setData.groups[group].sections || {};
                Object.values(sections).forEach(sectionData => {
                    totalCount += Object.keys(sectionData).length;
                });
                return totalCount;
            }

        } catch (error) {
            console.error('❌ ポーズ数カウントエラー:', error);
            return 0;
        }
    }

    /**
     * セットディレクトリのパスを取得
     * @returns {string} ディレクトリパス
     */
    getSetsDirectory() {
        return this.setsDirectory;
    }
}

// シングルトンパターンでexport
module.exports = new PoseRegistry();
