// 🤖 Gemini AI共通初期化モジュール（Phase 1 - 基盤）
// 🆓 完全無料で運用可能（Gemini API Free）
// - 15 RPM (requests per minute)
// - 1 million TPM (tokens per minute)
// - 1500 RPD (requests per day)

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Gemini共通基盤クラス
 * 全Gemini機能モジュールが共有する初期化処理
 */
class GeminiBase {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.apiKey = null;
        this.isInitialized = false;
    }

    /**
     * 初期化：config.jsonからAPIキー読み込み
     */
    initialize() {
        try {
            // Prefer environment variable first to avoid reading secrets from disk
            const envKey = process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim();
            if (envKey) {
                this.apiKey = envKey;
                this.genAI = new GoogleGenerativeAI(this.apiKey);
                this.model = this.genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
                });
                this.isInitialized = true;
                return true;
            }
            // 配布版ではuserDataから読み込み、開発版では__dirnameから読み込み
            const configPath = app && app.isPackaged
                ? path.join(app.getPath('userData'), 'config.json')
                : path.join(__dirname, '..', 'config.json');

            if (!fs.existsSync(configPath)) {
                throw new Error('config.jsonが見つかりません');
            }

            const configData = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData);

            if (!config.geminiApiKey || config.geminiApiKey.trim() === '') {
                throw new Error('Gemini APIキーが設定されていません');
            }

            this.apiKey = config.geminiApiKey;
            this.genAI = new GoogleGenerativeAI(this.apiKey);

            // gemini-2.5-flash: 無料枠で使用可能、高速、1M tokens対応
            // 🔓 BLOCK_NONE: アダルトコンテンツ分類のためフィルター最小化
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE,
                    },
                ]
            });

            this.isInitialized = true;
            console.log('✅ Gemini共通基盤 初期化完了（無料枠モード）');
            return true;

        } catch (error) {
            console.error('❌ Gemini初期化エラー:', error.message);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * 初期化済みモデルを取得
     * 未初期化の場合は自動的に初期化を実行
     * @returns {Object} Gemini model instance
     */
    getModel() {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.model;
    }
}

// シングルトンパターンでexport
module.exports = new GeminiBase();
