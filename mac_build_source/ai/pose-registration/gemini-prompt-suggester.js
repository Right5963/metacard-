// 🤖 Gemini AI プロンプト提案モジュール（Phase 2 - Pose Registration）
// 日本語ポーズ名からStable Diffusion用プロンプトを生成

const geminiBase = require('../gemini-base');

/**
 * Gemini AI プロンプト提案クラス
 * 欠落ポーズの日本語名からSD用プロンプトを生成
 */
class GeminiPromptSuggester {
    /**
     * ポーズ名からプロンプト提案を生成
     * @param {string} poseName - 日本語ポーズ名（例: "騎乗位での愛撫"）
     * @param {string} category - カテゴリ（例: "レズ"）
     * @param {string} context - ストーリーコンテキスト（オプション）
     * @returns {Promise<Object>} {
     *   success: boolean,
     *   prompt: string,              // 生成されたプロンプト
     *   tags: string[],              // タグ配列
     *   confidence: number,          // 信頼度（0-100）
     *   explanation: string          // 提案理由
     * }
     */
    async suggestPrompt(poseName, category, context = '') {
        try {
            console.log('🚀 Gemini AI プロンプト提案開始...');
            console.log(`📝 ポーズ名: "${poseName}", カテゴリ: "${category}"`);

            const model = geminiBase.getModel();

            // カテゴリ別の必須タグを設定
            let requiredTags = '';
            if (category === 'レズ' || category === 'lesbian') {
                requiredTags = '2girls, lesbian';
            } else if (category === 'ゲイ' || category === 'gay') {
                requiredTags = '2boys, yaoi';
            } else if (category === 'ヘテロ' || category === 'hetero') {
                requiredTags = '1girl, 1boy, hetero';
            } else if (category === 'default') {
                requiredTags = '1girl';
            } else {
                requiredTags = '1girl';
            }

            // プロンプト構築
            const prompt = `あなたはStable Diffusion用プロンプト生成の専門家です。

【タスク】
日本語のポーズ名を、Stable Diffusion用の英語プロンプトに変換してください。

【入力情報】
- ポーズ名: "${poseName}"
- カテゴリ: "${category}"
${context ? `- コンテキスト: "${context}"` : ''}

【必須タグ】
${requiredTags}

【プロンプト生成ルール】
1. 必須タグを必ず含める
2. ポーズの動作・体位を具体的に表現
3. 親密度・感情表現を含める
4. カメラアングル・構図を指定
5. 全て英語のタグで出力
6. カンマ区切りで出力

【出力形式】（JSON形式で必ず出力）
\`\`\`json
{
  "prompt": "生成されたプロンプト全文",
  "tags": ["tag1", "tag2", "tag3", ...],
  "confidence": 信頼度（0-100の数値）,
  "explanation": "このプロンプトを提案した理由（1-2行程度、日本語）"
}
\`\`\`

【重要】
- JSONのみを出力してください
- 説明文や前置きは不要です
- promptフィールドは完全なプロンプト文字列です
- tagsフィールドは個別タグの配列です`;

            // Gemini API呼び出し
            console.log('📤 Gemini APIにリクエスト送信中...');
            const result = await model.generateContent(prompt);
            const response = await result.response;

            console.log('📥 Gemini APIレスポンス受信完了');

            // 安全フィルターのチェック（3段階）
            if (response.promptFeedback && response.promptFeedback.blockReason) {
                const blockReason = response.promptFeedback.blockReason;
                console.error('❌ promptFeedbackでブロック:', blockReason);
                throw new Error(`安全フィルターによりブロックされました: ${blockReason}`);
            }

            if (!response.candidates || response.candidates.length === 0) {
                console.error('❌ candidates配列が空');
                throw new Error('Gemini APIから有効なレスポンスが返されませんでした。安全フィルターでブロックされた可能性があります。');
            }

            const candidate = response.candidates[0];
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                console.error('❌ finishReasonが異常:', candidate.finishReason);
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error('安全フィルターによりブロックされました（SAFETY）。プロンプトの内容を調整してください。');
                }
                if (candidate.finishReason === 'RECITATION') {
                    throw new Error('既存コンテンツの引用が検出されました（RECITATION）。プロンプトを変更してください。');
                }
            }

            let text;
            try {
                text = response.text();
            } catch (textError) {
                console.error('❌ テキスト取得エラー:', textError);
                throw new Error(`レスポンステキストの取得に失敗しました: ${textError.message}`);
            }

            console.log('📄 レスポンステキスト取得成功');
            console.log('📝 レスポンス（最初の200文字）:', text.substring(0, 200) + '...');

            // JSONを抽出（4パターンのフォールバック）
            let jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (!jsonMatch) {
                jsonMatch = text.match(/```\n([\s\S]*?)\n```/);
            }
            if (!jsonMatch) {
                jsonMatch = text.match(/\{[\s\S]*?"prompt"[\s\S]*?\}/);
            }
            if (!jsonMatch) {
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonMatch = [text.substring(firstBrace, lastBrace + 1)];
                }
            }

            if (!jsonMatch) {
                console.error('❌ JSON抽出失敗。レスポンス全文:', text);
                throw new Error(`Gemini APIからJSON応答を抽出できませんでした。レスポンス: ${text.substring(0, 200)}...`);
            }

            let suggestionData;
            try {
                const jsonText = jsonMatch[1] || jsonMatch[0];
                suggestionData = JSON.parse(jsonText);
                console.log('✅ JSON解析成功:', suggestionData);
            } catch (parseError) {
                console.error('❌ JSON解析エラー:', parseError);
                console.error('❌ 抽出したJSONテキスト:', jsonMatch[1] || jsonMatch[0]);
                throw new Error(`JSON解析に失敗しました: ${parseError.message}`);
            }

            // データ検証
            if (!suggestionData.prompt || !Array.isArray(suggestionData.tags)) {
                console.error('❌ 必須フィールドが欠落:', suggestionData);
                throw new Error('プロンプトまたはタグ配列が欠落しています');
            }

            return {
                success: true,
                prompt: suggestionData.prompt,
                tags: suggestionData.tags,
                confidence: suggestionData.confidence || 75,
                explanation: suggestionData.explanation || 'Gemini AIによる提案'
            };

        } catch (error) {
            console.error('❌ Gemini AI プロンプト提案エラー:', error);

            let errorMessage = 'プロンプト提案に失敗しました';
            if (error.message && error.message.includes('PROHIBITED_CONTENT')) {
                errorMessage = 'コンテンツポリシーによりブロックされました。別のポーズ名を試してください。';
            } else if (error.message && error.message.includes('SAFETY')) {
                errorMessage = '安全フィルターによりブロックされました。別のポーズ名を試してください。';
            } else if (error.message) {
                errorMessage = `エラー: ${error.message}`;
            }

            return {
                success: false,
                error: errorMessage,
                rawError: error.message,
                prompt: '',
                tags: [],
                confidence: 0,
                explanation: ''
            };
        }
    }

    /**
     * 複数ポーズのプロンプトを一括生成
     * @param {Array<Object>} poseList - [{name, category, context}, ...]
     * @returns {Promise<Array<Object>>} 生成結果の配列
     */
    async suggestBatch(poseList) {
        console.log(`🔄 バッチ処理開始: ${poseList.length}個のポーズ`);

        const results = [];
        for (let i = 0; i < poseList.length; i++) {
            const pose = poseList[i];
            console.log(`📋 処理中 (${i + 1}/${poseList.length}): ${pose.name}`);

            const result = await this.suggestPrompt(pose.name, pose.category, pose.context);
            results.push({
                ...result,
                poseName: pose.name,
                category: pose.category
            });

            // レート制限対策（15 RPM = 4秒間隔）
            if (i < poseList.length - 1) {
                console.log('⏳ レート制限対策: 4秒待機...');
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
        }

        console.log('✅ バッチ処理完了');
        return results;
    }
}

// シングルトンパターンでexport
module.exports = new GeminiPromptSuggester();
