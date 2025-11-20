// 🤖 Gemini AI SNS投稿プロンプト生成モジュール（Phase 1 - SNS Generator）
// ユーザープロンプト+ポーズセットから1枚絵用のプロンプトを生成

const geminiBase = require('./gemini-base');

/**
 * Gemini SNS投稿プロンプト生成クラス
 * Twitter/Pixiv/Patreon等のSNS投稿用に1枚絵のプロンプトを生成
 */
class GeminiSNSGenerator {
    /**
     * SNS投稿用プロンプトを生成
     * @param {string} userPrompt - ユーザーの指示プロンプト
     * @param {string} snsPlatform - SNSプラットフォーム（twitter/pixiv/patreon）
     * @param {boolean} isR18 - R18コンテンツかどうか
     * @param {Object} poseSets - 利用可能なポーズセット
     * @param {Object} individualSettingsData - 個別設定データ
     * @param {Object} commonSettings - 共通設定
     * @param {boolean} useCommonSettings - 共通設定を使用するか
     * @returns {Promise<Object>} 生成結果
     */
    async generateSNSPost(userPrompt, snsPlatform, isR18, poseSets, individualSettingsData, commonSettings, useCommonSettings) {
        try {
            console.log('🚀 Gemini AI SNS投稿プロンプト生成開始...');
            console.log(`📱 プラットフォーム: ${snsPlatform}, R18: ${isR18}`);

            const model = geminiBase.getModel();

            // SNS別の露出レベル制限を決定
            let allowedClothingStates = [];
            if (snsPlatform === 'twitter') {
                // X（Twitter）は常に下着・水着程度まで
                allowedClothingStates = ['通常', '上半身', '下着のみ'];
            } else if (snsPlatform === 'pixiv' || snsPlatform === 'patreon') {
                if (isR18) {
                    allowedClothingStates = ['通常', '上半身', '下着のみ', '全裸'];
                } else {
                    allowedClothingStates = ['通常', '上半身', '下着のみ'];
                }
            } else {
                allowedClothingStates = ['通常', '上半身', '下着のみ'];
            }

            // 服装状態セットから許可された状態のみを抽出
            const allClothingStates = individualSettingsData.clothingState || [];
            const filteredClothingStates = allClothingStates.filter(state =>
                allowedClothingStates.some(allowed => state.includes(allowed) || allowed.includes(state))
            );

            // ポーズセット一覧を整理
            const poseList = [];
            Object.entries(poseSets.groups || {}).forEach(([groupName, group]) => {
                Object.entries(group.sections || {}).forEach(([sectionName, section]) => {
                    Object.entries(section).forEach(([poseName, poseData]) => {
                        poseList.push({
                            name: poseName,
                            group: groupName,
                            section: sectionName,
                            tags: poseData.tags || [],
                            description: `${groupName === 'nsfw' ? '🔞' : '🎨'} ${sectionName} > ${poseName}`
                        });
                    });
                });
            });

            console.log(`📊 利用可能なポーズ: ${poseList.length}件`);
            console.log(`👗 許可された服装状態: ${filteredClothingStates.join(', ')}`);

            // プラットフォーム名を整形
            const platformName = snsPlatform === 'twitter' ? 'X（Twitter）' :
                               snsPlatform === 'pixiv' ? 'Pixiv' :
                               snsPlatform === 'patreon' ? 'Patreon' : snsPlatform;

            // R18注記
            const r18Note = isR18 ? '（R18コンテンツ可）' : '（通常コンテンツ）';

            // 巨大プロンプト構築
            const prompt = `あなたはAI画像生成用のプロンプト構成の専門家です。

【重要な注意事項】
* **利用可能なポーズリストに存在するポーズのみを選択してください。架空のポーズを作成しないでください。**
* **利用可能な素材セット（背景、服装、表情）のみを選択してください。存在しないセットを作成しないでください。**
* **プロンプトを生成する必要はありません。既存の素材から最適な組み合わせを選択してください。**

【プロンプト生成の指示】
${userPrompt}

【投稿先プラットフォーム】
${platformName} ${r18Note}

【利用可能な素材】
**ポーズリスト**（このリストから1つ選択してください）:
${poseList.map(pose => {
    const tagPreview = pose.tags.slice(0, 10).join(', ');
    const tagCount = pose.tags.length;
    return `- ${pose.description}\n  タグ例（最初の10個、合計${tagCount}個）: ${tagPreview}`;
}).join('\n')}

**個別設定（選択可能なオプション）**:

1. **背景セット**（${individualSettingsData.background?.length || 0}個）:
${(individualSettingsData.background || []).map(bg => `   - ${bg}`).join('\n')}

2. **表情セット**（${individualSettingsData.expression?.length || 0}個）:
${(individualSettingsData.expression || []).map(exp => `   - ${exp}`).join('\n')}

3. **服装セット**（${individualSettingsData.clothing?.length || 0}個）:
${(individualSettingsData.clothing || []).map(cloth => `   - ${cloth}`).join('\n')}

4. **服装状態**（プラットフォーム制限適用後）（${filteredClothingStates.length}個）:
${filteredClothingStates.map(state => `   - ${state}`).join('\n')}

5. **男性キャラセット**（${individualSettingsData.maleCharacter?.length || 0}個）:
${(individualSettingsData.maleCharacter || []).map(male => `   - ${male}`).join('\n')}

${useCommonSettings ? `
【共通設定（必ず使用）】
- 背景: ${commonSettings.background || 'なし'}
- 表情: ${commonSettings.expression || 'なし'}
- 服装: ${commonSettings.clothing || 'なし'}
- 服装状態: ${commonSettings.clothingState || 'なし'}
- 男性キャラ: ${commonSettings.maleCharacter || 'なし'}

※共通設定が「なし」以外の場合、その項目は共通設定を優先してください。
` : ''}

【出力形式】（JSON形式で必ず出力してください）
\`\`\`json
{
  "poseName": "ポーズ名（必須：上記ポーズリストから選択）",
  "group": "グループ名（必須：ポーズのグループ）",
  "section": "セクション名（必須：ポーズのセクション）",
  "expression": "表情セット名（任意：個別設定または共通設定から選択）",
  "background": "背景セット名（任意：個別設定または共通設定から選択）",
  "clothing": "服装セット名（任意：個別設定または共通設定から選択）",
  "clothingState": "服装状態（任意：許可された服装状態から選択）",
  "explanation": "選択理由の説明（1-2行程度）"
}
\`\`\`

【重要なルール】
1. **必ず利用可能なポーズリストから1つ選択してください**
2. **表情・背景・服装は、提供されたセット名から選択してください**（存在しないセットは作成しない）
3. **共通設定が指定されている場合、該当項目は共通設定を優先してください**
4. **服装状態は、プラットフォーム制限で許可された状態のみを使用してください**
5. **explanationには、なぜこの組み合わせを選んだかを簡潔に説明してください**
6. **ポーズの選択理由、素材の組み合わせの意図を明確にしてください**
7. **プロンプトを生成する必要はありません**（既存の素材を組み合わせるだけ）
8. **JSON形式で必ず出力してください**（他の形式は受け付けません）

【注意】
- 利用可能なポーズリストに存在しないポーズは選択しないでください
- 提供された素材セットに存在しない名前は使用しないでください
- プラットフォーム制限（${platformName} ${r18Note}）に適合した服装状態を選択してください`;

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
                jsonMatch = text.match(/\{[\s\S]*?"poseName"[\s\S]*?\}/);
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

            let snsData;
            try {
                const jsonText = jsonMatch[1] || jsonMatch[0];
                snsData = JSON.parse(jsonText);
                console.log('✅ JSON解析成功:', snsData);
            } catch (parseError) {
                console.error('❌ JSON解析エラー:', parseError);
                console.error('❌ 抽出したJSONテキスト:', jsonMatch[1] || jsonMatch[0]);
                throw new Error(`JSON解析に失敗しました: ${parseError.message}`);
            }

            return {
                success: true,
                poseName: snsData.poseName,
                group: snsData.group,
                section: snsData.section,
                expression: snsData.expression || '',
                background: snsData.background || '',
                clothing: snsData.clothing || '',
                clothingState: snsData.clothingState || '',
                explanation: snsData.explanation || ''
            };

        } catch (error) {
            console.error('❌ Gemini AI SNS投稿用プロンプト生成エラー:', error);

            let errorMessage = 'SNS投稿用プロンプト生成に失敗しました';
            if (error.message && error.message.includes('PROHIBITED_CONTENT')) {
                errorMessage = 'コンテンツポリシーによりブロックされました。プロンプトの内容を調整して再試行してください。';
            } else if (error.message && error.message.includes('SAFETY')) {
                errorMessage = '安全フィルターによりブロックされました。プロンプトの内容を調整して再試行してください。';
            } else if (error.message) {
                errorMessage = `エラー: ${error.message}`;
            }

            return {
                success: false,
                error: errorMessage,
                rawError: error.message
            };
        }
    }
}

// シングルトンパターンでexport
module.exports = new GeminiSNSGenerator();
