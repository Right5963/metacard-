/**
 * API Key Manager - Gemini APIキーの管理
 *
 * 優先順位:
 * 1. config.jsonに保存されたユーザーのAPIキー
 * 2. 埋め込まれた暗号化APIキー（Trial版フォールバック）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

// 埋め込まれた暗号化APIキー設定（Trial版用）
const ENCRYPTED_API_CONFIG = {
    encrypted: '603a36634379a99673f21bfa2bc80f382eff5323cc1915217068c8c0e32d093a47a3b52dae07df',
    iv: 'b4535fbfdd941e6eff3a00094479ef3b',
    authTag: '2d0698d1cd3ad32870fb5c98f2671d98'
};

/**
 * 埋め込まれた暗号化APIキーを復号化
 * @returns {string} 復号化されたAPIキー、失敗時は空文字列
 */
function decryptGeminiApiKey() {
    // 復号化キー（環境変数 or フォールバック）
    const keyHex = process.env.TRIAL_ENCRYPTION_KEY || 'e9240a150e1bcc32775755d7b120c82f8eed244e638baa60f19aef30156bef0c';
    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ENCRYPTED_API_CONFIG.iv, 'hex');
    const authTag = Buffer.from(ENCRYPTED_API_CONFIG.authTag, 'hex');

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ENCRYPTED_API_CONFIG.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('❌ APIキーの復号化に失敗:', error.message);
        return '';
    }
}

/**
 * APIキーを読み込む
 * 優先順位: config.json → 埋め込みキー
 *
 * @returns {Object} { success, apiKey, hasApiKey, source, error }
 */
function loadApiKey() {
    try {
        // Step 1: config.jsonからユーザーのAPIキーを読み込み
        const configPath = app.isPackaged
            ? path.join(app.getPath('userData'), 'config.json')
            : path.join(__dirname, '..', 'config.json');

        if (fs.existsSync(configPath)) {
            try {
                const configData = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(configData);

                if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
                    console.log('✅ ユーザー保存のAPIキーを使用します（config.json）');
                    return {
                        success: true,
                        apiKey: config.geminiApiKey,
                        hasApiKey: true,
                        source: 'config.json'
                    };
                }
            } catch (parseError) {
                console.warn('⚠️ config.jsonの読み込みエラー、埋め込みキーにフォールバック:', parseError.message);
            }
        }

        // Step 2: フォールバック - 埋め込まれた暗号化APIキーを使用
        const embeddedApiKey = decryptGeminiApiKey();

        if (!embeddedApiKey) {
            console.error('❌ Trial版: APIキーの復号化に失敗しました');
            return {
                success: false,
                apiKey: '',
                hasApiKey: false,
                error: 'APIキーの復号化に失敗しました'
            };
        }

        console.log('✅ Trial版: 埋め込みAPIキーを使用します（フォールバック）');
        return {
            success: true,
            apiKey: embeddedApiKey,
            hasApiKey: true,
            source: 'embedded'
        };

    } catch (error) {
        console.error('❌ APIキー読み込みエラー:', error);
        return {
            success: false,
            error: error.message,
            apiKey: '',
            hasApiKey: false
        };
    }
}

/**
 * APIキーをconfig.jsonに保存
 *
 * @param {string} apiKey - 保存するAPIキー
 * @returns {Object} { success, message, error }
 */
function saveApiKey(apiKey) {
    try {
        // 配布版ではuserDataに保存、開発版では__dirnameに保存
        const configPath = app.isPackaged
            ? path.join(app.getPath('userData'), 'config.json')
            : path.join(__dirname, '..', 'config.json');

        // 既存設定読み込み
        let config = {};
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf-8');
            config = JSON.parse(configData);
        }

        // APIキー更新
        config.geminiApiKey = apiKey;

        // ディレクトリが存在しない場合は作成
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // 保存
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        console.log('✅ Gemini APIキー保存完了:', configPath);

        return {
            success: true,
            message: 'APIキーを保存しました'
        };
    } catch (error) {
        console.error('❌ APIキー保存エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * APIキーをconfig.jsonから削除
 *
 * @returns {Object} { success, message, error }
 */
function deleteApiKey() {
    try {
        const configPath = app.isPackaged
            ? path.join(app.getPath('userData'), 'config.json')
            : path.join(__dirname, '..', 'config.json');

        if (!fs.existsSync(configPath)) {
            return {
                success: true,
                message: 'APIキーは既に存在しません'
            };
        }

        // 既存設定読み込み
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);

        // APIキー削除
        delete config.geminiApiKey;

        // 保存
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        console.log('✅ Gemini APIキー削除完了:', configPath);

        return {
            success: true,
            message: 'APIキーを削除しました'
        };
    } catch (error) {
        console.error('❌ APIキー削除エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    loadApiKey,
    saveApiKey,
    deleteApiKey,
    decryptGeminiApiKey  // テスト用にエクスポート
};
