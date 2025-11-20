// 🤖 Gemini AI画像分類モジュール（Phase 1 - Image Classifier）
// 画像からタグを抽出し、8カテゴリに分類

const geminiBase = require('./gemini-base');

/**
 * Gemini画像分類クラス
 * 画像分析によるタグ提案機能
 */
class GeminiImageClassifier {
    /**
     * 画像を8カテゴリに分類してタグ提案
     * @param {string} base64Image - Base64エンコードされた画像データ
     * @returns {Promise<Object>} 分類結果
     */
    async classifyImage(base64Image) {
        try {
            console.log('🚀 Gemini AI画像分析開始...');

            const model = geminiBase.getModel();

            // プロンプト：8カテゴリに分類してタグ提案
            const prompt = `この画像はStable Diffusionで生成されたイラストです。以下の8カテゴリに分類して、各カテゴリのタグをカンマ区切りで提案してください。

**カテゴリ**:
1. people（複数人・人数）: 人数に関するタグ（1girl, 2girls, 1boy, multiple girls等）
2. face（女性の顔）: 髪型、髪色、目の色、顔の特徴（long hair, blue eyes, blonde hair等）
3. body（体）: 体型、胸のサイズ、体の部位（large breasts, small breasts, slim等）
4. pose（ポーズ）: 体の姿勢、視線、アングル（standing, sitting, looking at viewer等）
5. background（背景）: 背景の場所、風景（outdoors, bedroom, beach, sky等）
6. clothing（服装）: 服、アクセサリー（dress, uniform, hat, jewelry等）
7. expression（表情）: 表情、感情（smile, blush, embarrassed, angry等）
8. quality（品質）: 画質、アート品質（masterpiece, high quality, detailed等）

**回答形式**（必ずこの形式で）:
people: タグ1, タグ2, タグ3
face: タグ1, タグ2, タグ3
body: タグ1, タグ2, タグ3
pose: タグ1, タグ2, タグ3
background: タグ1, タグ2, タグ3
clothing: タグ1, タグ2, タグ3
expression: タグ1, タグ2, タグ3
quality: タグ1, タグ2, タグ3

**重要**: 必ず英語のタグで回答してください（Stable Diffusionのプロンプト形式）`;

            // Gemini API呼び出し（Vision対応）
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: base64Image
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();

            console.log('📥 Gemini APIレスポンス受信完了');

            // レスポンスを8カテゴリに分解
            const categories = this.parseResponse(text);

            return {
                success: true,
                categories: categories,
                rawResponse: text
            };

        } catch (error) {
            console.error('❌ Gemini分類エラー:', error);

            // エラーメッセージを詳細化
            let errorMessage = error.message;

            if (error.message.includes('API_KEY_INVALID')) {
                errorMessage = 'APIキーが無効です。Google AI Studioで確認してください。';
            } else if (error.message.includes('PERMISSION_DENIED')) {
                errorMessage = 'APIキーに権限がありません。';
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                errorMessage = '無料枠のクォータを超過しました。しばらく待ってから再試行してください。\n無料枠制限: 15 RPM, 1500 RPD';
            } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
                errorMessage = 'レート制限を超過しました（15 requests/minute）。1分待ってから再試行してください。';
            }

            return {
                success: false,
                error: errorMessage,
                categories: null
            };
        }
    }

    /**
     * Gemini APIレスポンスを解析して8カテゴリに分解
     * @param {string} text - Gemini APIからのレスポンステキスト
     * @returns {Object} カテゴリ別タグオブジェクト
     */
    parseResponse(text) {
        const categories = {
            people: [],
            face: [],
            body: [],
            pose: [],
            background: [],
            clothing: [],
            expression: [],
            quality: []
        };

        try {
            // 各行を解析
            const lines = text.split('\n');

            for (const line of lines) {
                // "category: tag1, tag2, tag3" 形式を解析
                const match = line.match(/^(people|face|body|pose|background|clothing|expression|quality):\s*(.+)$/i);

                if (match) {
                    const category = match[1].toLowerCase();
                    const tagsString = match[2];

                    // タグをカンマで分割して配列化
                    const tags = tagsString
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);

                    if (categories.hasOwnProperty(category)) {
                        categories[category] = tags;
                    }
                }
            }

            console.log('✅ レスポンス解析完了:', categories);
            return categories;

        } catch (error) {
            console.error('❌ レスポンス解析エラー:', error);
            return categories; // 空のカテゴリを返す
        }
    }
}

// シングルトンパターンでexport
module.exports = new GeminiImageClassifier();
