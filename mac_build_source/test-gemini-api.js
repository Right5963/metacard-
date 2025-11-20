// 🧪 Gemini API動作確認テストスクリプト
// config.jsonから実際のAPIキーを読み込んで動作テスト

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// config.json読み込み
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('🔑 APIキー確認:', config.geminiApiKey ? `${config.geminiApiKey.substring(0, 20)}...` : '未設定');

if (!config.geminiApiKey) {
    console.error('❌ APIキーが設定されていません！');
    process.exit(1);
}

// Gemini API初期化
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function testGeminiAPI() {
    try {
        console.log('\n🚀 Gemini API接続テスト開始...\n');

        // モデル取得（最新のモデル名を使用）
        // gemini-2.5-flash: 最新安定版Flash（2025年6月リリース、1M tokens対応）
        // gemini-2.5-pro: 最新安定版Pro（高性能、複雑なタスク向け）
        // gemini-flash-latest: 最新Flash（自動更新）
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // 簡単なテストプロンプト
        const prompt = 'こんにちは！簡単に自己紹介してください。';

        console.log('📤 送信プロンプト:', prompt);
        console.log('⏳ Gemini APIレスポンス待機中...\n');

        // API呼び出し
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Gemini APIレスポンス成功！\n');
        console.log('📥 レスポンス内容:');
        console.log('─'.repeat(60));
        console.log(text);
        console.log('─'.repeat(60));

        console.log('\n✨ APIキーは正常に動作しています！');
        console.log('🎯 Phase 12実装準備完了\n');

        return true;

    } catch (error) {
        console.error('\n❌ Gemini API呼び出しエラー:\n');

        if (error.message.includes('API_KEY_INVALID')) {
            console.error('🔑 APIキーが無効です。Google AI Studioで確認してください。');
            console.error('   https://makersuite.google.com/app/apikey');
        } else if (error.message.includes('PERMISSION_DENIED')) {
            console.error('🚫 APIキーに権限がありません。');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            console.error('📊 APIクォータを超過しました。');
        } else {
            console.error('エラー詳細:', error.message);
        }

        console.error('\nエラー内容:', error);
        return false;
    }
}

// テスト実行
testGeminiAPI()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
