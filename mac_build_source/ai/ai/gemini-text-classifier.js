// 🤖 Gemini AIテキスト分類モジュール（Phase 1 - Text Classifier）
// プロンプトテキストから8カテゴリに分類

const geminiBase = require('./gemini-base');

/**
 * Geminiテキスト分類クラス
 * テキスト分析によるタグ分類機能
 */
class GeminiTextClassifier {
    /**
     * テキストプロンプトを8カテゴリに分類
     * @param {string} promptText - 分類するプロンプトテキスト
     * @returns {Promise<Object>} 分類結果
     */
    async classifyText(promptText) {
        try {
            console.log('🚀 Gemini AIテキスト分類開始...');
            console.log('📝 入力プロンプト:', promptText.substring(0, 100) + '...');

            const model = geminiBase.getModel();

            // プロンプト：8カテゴリに分類してタグ提案（テキストベース）
            // 技術的な文脈を明示してコンテンツブロックを回避
            const prompt = `You are a technical metadata classifier for AI image generation systems. This is a purely technical task to categorize image generation parameters (tags) into 8 predefined categories for database organization and artistic content management purposes.

**Task**: Classify the following Stable Diffusion image generation parameters into 8 technical categories.

Input parameters: ${promptText}

**Categories**:
1. people: Number of subjects (1girl, 2girls, 1boy, multiple girls, etc.)
2. face: Hair style, hair color, eye color, facial features (long hair, blue eyes, blonde hair, etc.)
3. body: Body type, anatomy features (large breasts, small breasts, slim, navel, etc.)
4. pose: Body posture, gaze direction, camera angle (standing, sitting, looking at viewer, cowboy shot, etc.)
5. background: Location, scenery (outdoors, bedroom, beach, sky, cloud, etc.)
6. clothing: Clothing, accessories (dress, uniform, hat, jewelry, underwear, skirt, etc.)
7. expression: Facial expression, emotion (smile, blush, open mouth, embarrassed, etc.)
8. quality: Image quality, art quality (masterpiece, high quality, detailed, best quality, etc.)

**Output format** (strictly follow this format):
people: tag1, tag2, tag3
face: tag1, tag2, tag3
body: tag1, tag2, tag3
pose: tag1, tag2, tag3
background: tag1, tag2, tag3
clothing: tag1, tag2, tag3
expression: tag1, tag2, tag3
quality: tag1, tag2, tag3

**Important**:
- Respond with English tags only (Stable Diffusion prompt format)
- Only classify tags that are present in the input parameters
- Do not duplicate or omit any tags
- This is a technical metadata organization task for artistic content database management`;

            // Gemini API呼び出し（テキストのみ）
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log('📥 Gemini APIレスポンス受信完了');
            console.log('📄 レスポンステキスト:', text.substring(0, 200) + '...');

            // レスポンスを8カテゴリに分解
            const categories = this.parseResponse(text);

            return {
                success: true,
                categories: categories,
                rawResponse: text
            };

        } catch (error) {
            console.error('❌ Gemini AI テキスト分類エラー:', error);
            return {
                success: false,
                error: error.message,
                categories: {
                    people: [], face: [], body: [], pose: [],
                    background: [], clothing: [], expression: [], quality: []
                }
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
module.exports = new GeminiTextClassifier();
