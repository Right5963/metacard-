/**
 * ライセンス管理システム
 * 買い切り型とサブスクリプション型の両方に対応
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

// ✅ ユーザーAppDataに保存（再インストールしても同じファイルを参照）
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');
const LICENSE_TYPES = {
    FREE: 'free',
    TRIAL: 'trial',
    ONETIME: 'onetime',      // 買い切り型
    SUBSCRIPTION: 'subscription'  // サブスクリプション型
};

// セット登録数制限
const SET_LIMITS = {
    free: 3,
    trial: 2,  // Trial版は新規追加+2個まで
    onetime: Infinity,
    subscription: Infinity
};

// 試用期間（日数）
const TRIAL_DAYS = 7;

// 定期認証間隔（日数）- サブスクリプション型のみ
const VERIFICATION_INTERVALS = {
    subscription: 7,  // 7日ごとに認証が必要
    onetime: null      // 買い切り型は定期認証不要
};

class LicenseManager {
    constructor() {
        this.licenseData = null;
        this.loadLicense();
    }

    /**
     * ライセンス情報を読み込む
     */
    loadLicense() {
        try {
            // configディレクトリが存在しない場合は作成
            const configDir = path.dirname(LICENSE_FILE);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            if (fs.existsSync(LICENSE_FILE)) {
                const content = fs.readFileSync(LICENSE_FILE, 'utf-8');
                this.licenseData = JSON.parse(content);
            } else {
                // ライセンスファイルが存在しない場合は、ビルド時のライセンスタイプに基づいて初期化
                const buildLicenseType = process.env.LICENSE_TYPE;

                if (buildLicenseType === 'trial') {
                    this.licenseData = this.createTrialLicense();
                    console.log('✅ Trial版ライセンス作成（初回起動）: 7日間の試用期間を開始');
                } else {
                    this.licenseData = this.createFreeLicense();
                    console.log('✅ Free版ライセンス作成（初回起動）');
                }

                this.saveLicense();
            }
        } catch (error) {
            console.error('❌ ライセンス読み込みエラー:', error);
            // エラー時もビルド時のライセンスタイプを確認
            const buildLicenseType = process.env.LICENSE_TYPE;

            if (buildLicenseType === 'trial') {
                this.licenseData = this.createTrialLicense();
            } else {
                this.licenseData = this.createFreeLicense();
            }

            this.saveLicense();
        }
    }

    /**
     * 無料版ライセンスを作成
     */
    createFreeLicense() {
        return {
            version: '1.0.0',
            licenseType: LICENSE_TYPES.FREE,
            licenseKey: '',
            activatedAt: new Date().toISOString(),
            expiresAt: null,
            lastVerifiedAt: null,
            verificationInterval: null,
            trialStartedAt: null,
            trialDays: null
        };
    }

    /**
     * 試用版ライセンスを作成
     */
    createTrialLicense() {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);

        return {
            version: '1.0.0',
            licenseType: LICENSE_TYPES.TRIAL,
            licenseKey: '',
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            lastVerifiedAt: null,
            verificationInterval: null,
            trialStartedAt: now.toISOString(),
            trialDays: TRIAL_DAYS
        };
    }

    /**
     * 買い切り型ライセンスを作成
     */
    createOnetimeLicense(licenseKey) {
        return {
            version: '1.0.0',
            licenseType: LICENSE_TYPES.ONETIME,
            licenseKey: licenseKey,
            activatedAt: new Date().toISOString(),
            expiresAt: null,  // 買い切り型は有効期限なし
            lastVerifiedAt: new Date().toISOString(),
            verificationInterval: null,
            trialStartedAt: null,
            trialDays: null
        };
    }

    /**
     * サブスクリプション型ライセンスを作成
     */
    createSubscriptionLicense(licenseKey, expiresAt) {
        return {
            version: '1.0.0',
            licenseType: LICENSE_TYPES.SUBSCRIPTION,
            licenseKey: licenseKey,
            activatedAt: new Date().toISOString(),
            expiresAt: expiresAt,
            lastVerifiedAt: new Date().toISOString(),
            verificationInterval: VERIFICATION_INTERVALS.subscription,
            trialStartedAt: null,
            trialDays: null
        };
    }

    /**
     * ライセンス情報を保存
     */
    saveLicense() {
        try {
            const configDir = path.dirname(LICENSE_FILE);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(LICENSE_FILE, JSON.stringify(this.licenseData, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ ライセンス保存エラー:', error);
            return false;
        }
    }

    /**
     * ライセンスタイプを取得
     */
    getLicenseType() {
        return this.licenseData?.licenseType || LICENSE_TYPES.FREE;
    }

    /**
     * ライセンス情報を取得
     */
    getLicenseInfo() {
        return { ...this.licenseData };
    }

    /**
     * 有効期限が切れているかチェック
     */
    isExpired() {
        const licenseType = this.getLicenseType();
        
        // 無料版・買い切り型は有効期限なし
        if (licenseType === LICENSE_TYPES.FREE || licenseType === LICENSE_TYPES.ONETIME) {
            return false;
        }

        // 試用版・サブスクリプション型は有効期限をチェック
        if (!this.licenseData.expiresAt) {
            return false;
        }

        const expiresAt = new Date(this.licenseData.expiresAt);
        const now = new Date();
        return now > expiresAt;
    }

    /**
     * 試用期間が残っているかチェック
     */
    getTrialDaysRemaining() {
        if (this.getLicenseType() !== LICENSE_TYPES.TRIAL) {
            return null;
        }

        if (!this.licenseData.expiresAt) {
            return 0;
        }

        const expiresAt = new Date(this.licenseData.expiresAt);
        const now = new Date();
        const diff = expiresAt - now;
        const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return Math.max(0, daysRemaining);
    }

    /**
     * 認証が必要かチェック（定期認証）
     */
    needsVerification() {
        const licenseType = this.getLicenseType();
        
        // 無料版・買い切り型は定期認証不要
        if (licenseType === LICENSE_TYPES.FREE || licenseType === LICENSE_TYPES.ONETIME) {
            return false;
        }

        // サブスクリプション型のみ定期認証が必要
        if (licenseType === LICENSE_TYPES.SUBSCRIPTION) {
            const verificationInterval = this.licenseData.verificationInterval;
            if (!verificationInterval) {
                return false;
            }

            const lastVerifiedAt = this.licenseData.lastVerifiedAt;
            if (!lastVerifiedAt) {
                return true;  // 一度も認証していない場合は認証が必要
            }

            const lastVerified = new Date(lastVerifiedAt);
            const now = new Date();
            const diffDays = Math.floor((now - lastVerified) / (1000 * 60 * 60 * 24));
            
            return diffDays >= verificationInterval;
        }

        return false;
    }

    /**
     * セット登録数制限をチェック
     */
    checkSetLimit(category, currentCount) {
        const licenseType = this.getLicenseType();
        
        // 有効期限切れの場合は使用不可
        if (this.isExpired()) {
            if (licenseType === LICENSE_TYPES.TRIAL) {
                return {
                    allowed: false,
                    limit: 0,
                    currentCount,
                    message: '試用期間が終了しました。有料版へのアップグレードが必要です。'
                };
            } else if (licenseType === LICENSE_TYPES.SUBSCRIPTION) {
                return {
                    allowed: false,
                    limit: 0,
                    currentCount,
                    message: 'サブスクリプションの有効期限が切れています。更新が必要です。'
                };
            }
        }
        
        const limit = SET_LIMITS[licenseType] || SET_LIMITS.free;

        if (limit === Infinity) {
            return {
                allowed: true,
                limit: Infinity,
                currentCount
            };
        }

        if (currentCount >= limit) {
            return {
                allowed: false,
                limit,
                currentCount,
                message: `無料版では${category}セットは${limit}個まで登録できます。有料版へのアップグレードをご検討ください。`
            };
        }

        return {
            allowed: true,
            limit,
            currentCount
        };
    }

    /**
     * パスコード（ライセンスキー）を検証
     */
    verifyPasscode(passcode) {
        // パスコード形式チェック: XXXX-XXXX-XXXX-XXXX
        const passcodePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        if (!passcodePattern.test(passcode)) {
            return {
                success: false,
                error: 'パスコードの形式が正しくありません。XXXX-XXXX-XXXX-XXXXの形式で入力してください。'
            };
        }

        // パスコードの検証（簡易版）
        // 実際の実装では、サーバーで検証するか、ハッシュ化して保存したパスコードと比較する
        // ここでは簡易的に、特定のパターンで検証する
        
        // 買い切り型のパスコード: ONET-XXXX-XXXX-XXXX
        if (passcode.startsWith('ONET-')) {
            const licenseData = this.createOnetimeLicense(passcode);
            this.licenseData = licenseData;
            this.saveLicense();
            return {
                success: true,
                licenseType: LICENSE_TYPES.ONETIME,
                message: '買い切り型ライセンスが有効化されました。'
            };
        }

        // サブスクリプション型のパスコード: SUBS-XXXX-XXXX-XXXX
        if (passcode.startsWith('SUBS-')) {
            // サブスクリプション型の有効期限を設定（例: 1ヶ月）
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
            
            const licenseData = this.createSubscriptionLicense(passcode, expiresAt.toISOString());
            this.licenseData = licenseData;
            this.saveLicense();
            return {
                success: true,
                licenseType: LICENSE_TYPES.SUBSCRIPTION,
                expiresAt: expiresAt.toISOString(),
                message: 'サブスクリプション型ライセンスが有効化されました。有効期限: ' + expiresAt.toLocaleDateString('ja-JP')
            };
        }

        // 年額サブスクリプション: YEAR-XXXX-XXXX-XXXX
        if (passcode.startsWith('YEAR-')) {
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            
            const licenseData = this.createSubscriptionLicense(passcode, expiresAt.toISOString());
            this.licenseData = licenseData;
            this.saveLicense();
            return {
                success: true,
                licenseType: LICENSE_TYPES.SUBSCRIPTION,
                expiresAt: expiresAt.toISOString(),
                message: '年額サブスクリプション型ライセンスが有効化されました。有効期限: ' + expiresAt.toLocaleDateString('ja-JP')
            };
        }

        return {
            success: false,
            error: '無効なパスコードです。正しいパスコードを入力してください。'
        };
    }

    /**
     * 認証を完了（定期認証用）
     */
    completeVerification() {
        this.licenseData.lastVerifiedAt = new Date().toISOString();
        this.saveLicense();
        return true;
    }

    /**
     * ライセンスを無料版にリセット
     */
    resetToFree() {
        this.licenseData = this.createFreeLicense();
        this.saveLicense();
        return true;
    }

    /**
     * ライセンスを試用版に設定
     */
    activateTrial() {
        // 既に試用版が有効な場合は何もしない
        if (this.getLicenseType() === LICENSE_TYPES.TRIAL) {
            const daysRemaining = this.getTrialDaysRemaining();
            if (daysRemaining > 0) {
                return {
                    success: false,
                    message: `試用版は既に有効です。残り${daysRemaining}日です。`
                };
            }
        }

        // 試用版を有効化
        this.licenseData = this.createTrialLicense();
        this.saveLicense();
        return {
            success: true,
            message: `試用版が有効化されました。${TRIAL_DAYS}日間利用できます。`,
            expiresAt: this.licenseData.expiresAt
        };
    }

    /**
     * ライセンスの状態を検証（起動時など）
     */
    validateLicense() {
        const licenseType = this.getLicenseType();
        const isExpired = this.isExpired();
        const needsVerification = this.needsVerification();

        // 有効期限切れの場合
        if (isExpired) {
            if (licenseType === LICENSE_TYPES.TRIAL) {
                return {
                    valid: false,
                    status: 'trial_expired',
                    message: '試用期間が終了しました。有料版へのアップグレードをご検討ください。'
                };
            } else if (licenseType === LICENSE_TYPES.SUBSCRIPTION) {
                return {
                    valid: false,
                    status: 'subscription_expired',
                    message: 'サブスクリプションの有効期限が切れています。更新してください。'
                };
            }
        }

        // 認証が必要な場合
        if (needsVerification) {
            return {
                valid: false,
                status: 'verification_required',
                message: '定期認証が必要です。認証を完了してください。'
            };
        }

        // 有効な場合
        return {
            valid: true,
            status: 'active',
            licenseType,
            message: 'ライセンスは有効です。'
        };
    }
}

// シングルトンインスタンス
let licenseManagerInstance = null;

function getLicenseManager() {
    if (!licenseManagerInstance) {
        licenseManagerInstance = new LicenseManager();
    }
    return licenseManagerInstance;
}

module.exports = {
    LicenseManager,
    getLicenseManager,
    LICENSE_TYPES,
    SET_LIMITS,
    TRIAL_DAYS,
    VERIFICATION_INTERVALS
};

