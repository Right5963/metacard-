/**
 * Gemini AI Tag Classifier
 * 無料のGemini APIを使用してDanbooruタグを8カテゴリに自動分類
 *
 * カテゴリ:
 * - face: 女性の顔（髪型・目・化粧）
 * - body: 体（体型・おっぱい・お尻）
 * - clothing: 服装（ドレス・下着・アクセサリー）
 * - poseemotion: ポーズ・表情（動き・感情）
 * - background: 背景（場所・時間・天気）
 * - expression: 表情（笑顔・悲しい・怒り）
 * - quality: 品質（画質・スタイル）
 * - people: 複数人・人数（1girl, 2boys等）
 */

const fs = require('fs');
const path = require('path');

// config.jsonからAPIキーを読み込む（配布対応）
function loadApiKey() {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        return config.geminiApiKey || process.env.GEMINI_API_KEY || '';
    } catch (error) {
        console.error('⚠️ config.json読み込みエラー:', error);
        return process.env.GEMINI_API_KEY || '';
    }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Gemini APIでタグを分類
 * @param {string[]} tags - 分類するタグのリスト
 * @returns {Promise<Object>} - {tag: {category: string, confidence: number}}
 */
async function classifyTagsWithGemini(tags) {
    const prompt = `
あなたはStable Diffusion画像生成のプロンプト分類専門家です。
以下のDanbooruタグを8つのカテゴリに分類してください。

【カテゴリ定義】
1. face: 女性の顔に関する要素（髪型・髪色・目の色・化粧・顔の形）
2. body: 体に関する要素（体型・胸のサイズ・お尻・筋肉・肌の色）
3. clothing: 服装・装飾（ドレス・下着・靴・アクセサリー・帽子）
4. poseemotion: ポーズ・動作（座る・立つ・走る・寝る・踊る）
5. background: 背景・環境（場所・時間・天気・室内/屋外）
6. expression: 表情・感情（笑顔・悲しい・怒り・驚き）
7. quality: 品質・スタイル（画質・アートスタイル・ライティング）
8. people: 複数人・人数（1girl, 2boys, solo, couple等）

【分類するタグ】
${tags.join(', ')}

【出力形式】
JSON形式で出力してください。各タグに対して最も適切なカテゴリと信頼度（0-100%）を返してください。

例:
{
  "smile": {"category": "expression", "confidence": 98},
  "dress": {"category": "clothing", "confidence": 95},
  "sitting": {"category": "poseemotion", "confidence": 92}
}
`;

    try {
        const apiKey = loadApiKey();
        if (!apiKey) {
            throw new Error('Gemini APIキーが設定されていません。設定画面からAPIキーを登録してください。');
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        // JSONを抽出（マークダウンコードブロックから取り出す）
        const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) ||
                         generatedText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Gemini APIからJSON応答を抽出できませんでした');
        }

        const classifications = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
            success: true,
            classifications
        };

    } catch (error) {
        console.error('❌ Gemini API分類エラー:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * バッチ処理：大量のタグを効率的に分類
 * @param {string[]} tags - 分類するタグのリスト
 * @param {number} batchSize - 1回のAPI呼び出しで処理するタグ数（デフォルト: 50）
 * @returns {Promise<Object>} - 全タグの分類結果
 */
async function classifyTagsBatch(tags, batchSize = 50) {
    const results = {};

    for (let i = 0; i < tags.length; i += batchSize) {
        const batch = tags.slice(i, i + batchSize);
        console.log(`📊 バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(tags.length / batchSize)} 処理中... (${batch.length}タグ)`);

        const batchResult = await classifyTagsWithGemini(batch);

        if (batchResult.success) {
            Object.assign(results, batchResult.classifications);

            // レート制限対策: 1秒待機
            if (i + batchSize < tags.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            console.error(`❌ バッチ処理エラー:`, batchResult.error);
        }
    }

    return results;
}

module.exports = {
    classifyTagsWithGemini,
    classifyTagsBatch
};
