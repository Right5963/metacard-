// 🔍 利用可能なGeminiモデル一覧取得スクリプト

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// config.json読み込み
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('🔑 APIキー確認:', config.geminiApiKey ? `${config.geminiApiKey.substring(0, 20)}...` : '未設定\n');

if (!config.geminiApiKey) {
    console.error('❌ APIキーが設定されていません！');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function listAvailableModels() {
    try {
        console.log('🚀 利用可能なGeminiモデル一覧取得中...\n');

        // ⚠️ Note: GoogleGenerativeAI SDK v0.1.x doesn't have listModels() method
        // 代替として、直接REST APIを呼び出す
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log('✅ 利用可能なモデル一覧:\n');
        console.log('─'.repeat(80));

        if (data.models && data.models.length > 0) {
            data.models.forEach((model, index) => {
                console.log(`\n${index + 1}. ${model.name}`);
                console.log(`   表示名: ${model.displayName || 'N/A'}`);
                console.log(`   説明: ${model.description || 'N/A'}`);

                if (model.supportedGenerationMethods) {
                    console.log(`   対応メソッド: ${model.supportedGenerationMethods.join(', ')}`);
                }

                // generateContent対応モデルをハイライト
                if (model.supportedGenerationMethods &&
                    model.supportedGenerationMethods.includes('generateContent')) {
                    console.log('   ✅ generateContent対応（テキスト生成可能）');
                }
            });

            console.log('\n' + '─'.repeat(80));
            console.log(`\n📊 合計 ${data.models.length} モデル利用可能`);

            // generateContent対応モデルのみ抽出
            const textGenModels = data.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent')
            );

            if (textGenModels.length > 0) {
                console.log('\n🎯 テキスト生成に使えるモデル:\n');
                textGenModels.forEach(model => {
                    // models/gemini-xxx から gemini-xxx だけ抽出
                    const modelId = model.name.replace('models/', '');
                    console.log(`   - ${modelId}`);
                });
            }

        } else {
            console.log('⚠️ モデルが見つかりませんでした');
        }

    } catch (error) {
        console.error('\n❌ モデル一覧取得エラー:\n');
        console.error('エラー詳細:', error.message);
        console.error('\nエラー内容:', error);
        process.exit(1);
    }
}

listAvailableModels()
    .then(() => {
        console.log('\n✨ モデル一覧取得完了\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
