// 🔍 欠落ポーズ検出モジュール（Phase 2 - Pose Registration）
// ストーリー生成時の警告を監視して欠落ポーズを収集

/**
 * 欠落ポーズ検出クラス
 * console.warnを監視してGeminiが生成した架空のポーズを収集
 */
class MissingPoseDetector {
    constructor() {
        this.missingPoses = [];  // 欠落ポーズリスト
        this.originalWarn = null;  // 元のconsole.warn関数
        this.isMonitoring = false;  // 監視中フラグ
    }

    /**
     * console.warn監視を開始
     * ストーリー生成前に呼び出す
     */
    startDetection() {
        if (this.isMonitoring) {
            console.log('⚠️ 既に監視中です');
            return;
        }

        console.log('👀 欠落ポーズ検出開始...');

        // 元のconsole.warn関数を保存
        this.originalWarn = console.warn;

        // console.warnをオーバーライド
        console.warn = (...args) => {
            const message = args.join(' ');

            // 欠落ポーズ警告を検出
            if (message.includes('⚠️ ポーズが見つかりません:')) {
                this.extractMissingPose(message);
            }

            // 元のconsole.warnも実行（ログ出力を維持）
            this.originalWarn.apply(console, args);
        };

        this.isMonitoring = true;
        this.missingPoses = [];  // リストをクリア
    }

    /**
     * console.warn監視を停止
     * ストーリー生成後に呼び出す
     */
    stopDetection() {
        if (!this.isMonitoring) {
            console.log('⚠️ 監視中ではありません');
            return;
        }

        console.log('🛑 欠落ポーズ検出停止');

        // 元のconsole.warnに戻す
        if (this.originalWarn) {
            console.warn = this.originalWarn;
            this.originalWarn = null;
        }

        this.isMonitoring = false;

        console.log(`📊 収集した欠落ポーズ: ${this.missingPoses.length}個`);
    }

    /**
     * 警告メッセージから欠落ポーズを抽出
     * @param {string} warnMessage - "⚠️ ポーズが見つかりません: groups/レズ/倉庫：騎乗位での愛撫"
     */
    extractMissingPose(warnMessage) {
        try {
            // "groups/レズ/倉庫：騎乗位での愛撫" 部分を抽出
            const match = warnMessage.match(/groups\/([^\/]+)\/([^：]+)：(.+)$/);

            if (!match) {
                console.error('❌ ポーズパス解析失敗:', warnMessage);
                return;
            }

            const [, group, section, name] = match;

            const poseData = {
                group: group.trim(),
                section: section.trim(),
                name: name.trim(),
                fullPath: `groups/${group}/${section}：${name}`
            };

            // 重複チェック
            const isDuplicate = this.missingPoses.some(
                pose => pose.fullPath === poseData.fullPath
            );

            if (!isDuplicate) {
                this.missingPoses.push(poseData);
                console.log(`➕ 欠落ポーズ追加 (${this.missingPoses.length}個目):`, poseData.fullPath);
            }

        } catch (error) {
            console.error('❌ ポーズ抽出エラー:', error);
        }
    }

    /**
     * 収集した欠落ポーズを取得
     * @returns {Array<Object>} [{group, section, name, fullPath}, ...]
     */
    getMissingPoses() {
        return this.missingPoses;
    }

    /**
     * グループ別に欠落ポーズを取得
     * @returns {Object} { "レズ": [...], "default": [...], ... }
     */
    getMissingPosesByGroup() {
        const grouped = {};

        this.missingPoses.forEach(pose => {
            if (!grouped[pose.group]) {
                grouped[pose.group] = [];
            }
            grouped[pose.group].push(pose);
        });

        return grouped;
    }

    /**
     * 欠落ポーズの統計情報を取得
     * @returns {Object} 統計情報
     */
    getStatistics() {
        const grouped = this.getMissingPosesByGroup();

        return {
            total: this.missingPoses.length,
            byGroup: Object.keys(grouped).map(group => ({
                group: group,
                count: grouped[group].length
            })),
            isMonitoring: this.isMonitoring
        };
    }

    /**
     * 収集データをクリア
     */
    clear() {
        this.missingPoses = [];
        console.log('🗑️ 欠落ポーズリストをクリアしました');
    }

    /**
     * 欠落ポーズが存在するか
     * @returns {boolean}
     */
    hasMissingPoses() {
        return this.missingPoses.length > 0;
    }
}

// シングルトンパターンでexport
module.exports = new MissingPoseDetector();
