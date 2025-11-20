// 🤖 Gemini AIストーリー生成モジュール（Phase 1 - Story Generator）
// プロンプト+ポーズセットから画像生成ストーリーを作成

const geminiBase = require('./gemini-base');

/**
 * Geminiストーリー生成クラス
 * NSFW対応、複数人モード、個別設定システム対応
 */
class GeminiStoryGenerator {
    /**
     * ストーリー生成メソッド
     * @param {string} userPrompt - ユーザー指示プロンプト
     * @param {Object} poseSets - ポーズセット（group/section構造）
     * @param {Object|null} individualSettingsData - 個別設定データ
     * @returns {Promise<Object>} 生成結果
     */
    async generateStory(userPrompt, poseSets, individualSettingsData = null) {
        try {
            console.log('🚀 Gemini AI ストーリー生成開始...');
            console.log('📝 ユーザープロンプト:', userPrompt);

            const model = geminiBase.getModel();

            // ポーズリストを組織化（group/section構造をフラット化）
            const poseList = [];
            if (poseSets && poseSets.groups) {
                Object.entries(poseSets.groups).forEach(([groupName, groupData]) => {
                    if (groupData && groupData.sections) {
                        Object.entries(groupData.sections).forEach(([sectionName, sectionData]) => {
                            if (sectionData && typeof sectionData === 'object') {
                                Object.entries(sectionData).forEach(([poseName, poseData]) => {
                                    poseList.push({
                                        name: poseName,
                                        group: groupName,
                                        section: sectionName,
                                        tags: poseData.tags || []
                                    });
                                });
                            }
                        });
                    }
                });
            }

            console.log(`📊 合計ポーズ数: ${poseList.length}`);

            // セクション統計の計算
            const sectionStats = {};
            if (poseSets && poseSets.groups) {
                Object.entries(poseSets.groups).forEach(([groupName, groupData]) => {
                    if (groupData && groupData.sections) {
                        Object.entries(groupData.sections).forEach(([sectionName, sectionData]) => {
                            const key = `${groupName}:${sectionName}`;
                            if (!sectionStats[key]) {
                                sectionStats[key] = {
                                    group: groupName,
                                    section: sectionName,
                                    poseCount: 0,
                                    commonTags: [],
                                    isNSFW: groupName === 'nsfw'
                                };
                            }

                            if (sectionData && typeof sectionData === 'object') {
                                const poseNames = Object.keys(sectionData);
                                sectionStats[key].poseCount = poseNames.length;

                                // 最初のポーズからcommonTagsを取得
                                if (poseNames.length > 0) {
                                    const firstPoseName = poseNames[0];
                                    const firstPoseData = sectionData[firstPoseName];
                                    if (firstPoseData && firstPoseData.tags) {
                                        sectionStats[key].commonTags = firstPoseData.tags;
                                    }
                                }
                            }
                        });
                    }
                });
            }

            // セクションをカテゴリ分類
            const foreplaySections = [];
            const mainSections = [];
            const aftermathSections = [];
            const oralSections = [];
            const analSections = [];
            const groupSections = [];

            Object.values(sectionStats).forEach(stat => {
                const sectionLower = stat.section.toLowerCase();

                if (sectionLower.includes('前戯') || sectionLower.includes('foreplay')) {
                    foreplaySections.push(stat);
                } else if (sectionLower.includes('後戯') || sectionLower.includes('aftermath')) {
                    aftermathSections.push(stat);
                } else if (sectionLower.includes('口') || sectionLower.includes('oral')) {
                    oralSections.push(stat);
                } else if (sectionLower.includes('アナル') || sectionLower.includes('anal')) {
                    analSections.push(stat);
                } else if (sectionLower.includes('複数') || sectionLower.includes('group')) {
                    groupSections.push(stat);
                } else if (stat.isNSFW) {
                    mainSections.push(stat);
                }
            });

            // お任せモードかどうか判定
            const isOmaaseMode = /お任せ|おまかせ|omakase|auto|自動/i.test(userPrompt);

            // 巨大プロンプト構築
            const prompt = `あなたはAI画像生成用のストーリー構成の専門家です。

【重要な注意事項】
* **利用可能なポーズリストに存在するポーズのみを選択してください。架空のポーズを作成しないでください。**
* **NSFW要素を含むシーンでは、nsfw groupに分類されているポーズを選択してください。**
* **複数の素材セット（背景、服装、表情、男性キャラ、衣服状態）を組み合わせて、多様で豊かなストーリーを作成してください。**
* **ストーリーメモは1行程度、最大2行まで簡潔にしてください。長文にしないでください。**

【ストーリー構成の指示】
${userPrompt}

【利用可能な素材】

**セクション構造**:
${JSON.stringify(Array.from(Object.values(sectionStats)), null, 2)}

**ポーズリスト**（このリストから選択してください）:
${JSON.stringify(poseList, null, 2)}

**区切りテンプレート**:
- 【導入】- 場面設定、キャラクター登場
- 【前戯】- 関係性の深まり、接触
- 【本番】- クライマックス
- 【後戯】- 余韻

**ストーリーの流れの参考**:
- **導入**: 日常シーン → 関係性のきっかけ
- **前戯**: 接触 → 感情の高まり → 愛撫
- **クライマックス**: 体位の変化 → 感情の絶頂 → 結合
- **後処理**: 余韻 → 関係性の変化

**ジャンルパターンの参考** （必須ではありません）:
- **学園もの**: 教室、図書館、体育倉庫
- **オフィス**: 会社、会議室、上司と部下
- **時間停止**: 時が止まった世界での行為
- **催眠**: 意識を操られた状態での行為
- **集団**: 複数人での行為
- **電車痴漢**: 電車内での痴漢行為
- **露出**: 公共の場での露出、野外プレイ
- **コスプレ**: 特定の衣装でのプレイ
- **オーラルメイン**: 口を使った行為がメイン

【出力形式】
以下のJSON形式で出力してください。

{
  "items": [
    { "type": "divider", "text": "【導入】" },
    { "type": "scene", "poseName": "...", "group": "...", "section": "...", "pageNumber": 1, "storyMemo": "...", "individual": {...} },
    ...
  ],
  "explanation": "構成の説明"
}

【個別設定について】
各シーンの "individual" フィールドには、以下の設定を含めることができます：

${individualSettingsData && Array.isArray(individualSettingsData.backgrounds) ? `- **background**: 背景セット（利用可能: ${individualSettingsData.backgrounds.map(b => b.name).join(', ')}）` : '- **background**: 背景セット（設定なし）'}
${individualSettingsData && Array.isArray(individualSettingsData.expressions) ? `- **expression**: 表情セット（利用可能: ${individualSettingsData.expressions.map(e => e.name).join(', ')}）` : '- **expression**: 表情セット（設定なし）'}
${individualSettingsData && Array.isArray(individualSettingsData.clothingSets) ? `- **clothing**: 服装セット（利用可能: ${individualSettingsData.clothingSets.map(c => c.name).join(', ')}）
  * **重要**: 服装セットの選択時は、**セット名だけでなく、含まれるタグ（tags）も確認してください**
  * タグベースマッチング: シーンの文脈（例: school uniform, office wear, casual等）に合う**タグを含む**セットを選んでください
  * 例: 「学園シーン」→ "school uniform", "blazer" などのタグを含むセットを選択
  * 例: 「オフィスシーン」→ "office lady", "business suit" などのタグを含むセットを選択
  * **セット名だけで判断せず、必ずタグの内容を確認してください**` : '- **clothing**: 服装セット（設定なし）'}
- **clothingState**: 服装の状態（空文字列、"上半身"、"下半身"、"全裸"）
${individualSettingsData && Array.isArray(individualSettingsData.maleCharacterSets) ? `- **maleCharacterSet**: 男性キャラセット（利用可能: ${individualSettingsData.maleCharacterSets.map(m => m.name).join(', ')}）` : '- **maleCharacterSet**: 男性キャラセット（設定なし）'}
- **maleClothingState**: 男性の服装状態（空文字列、"上半身"、"下半身"、"全裸"）

${individualSettingsData && Array.isArray(individualSettingsData.multiGirlSettings) && individualSettingsData.multiGirlSettings.length > 0 ? `
**複数人モードについて**:
- このストーリーは複数人（${individualSettingsData.multiGirlSettings.length}人）のキャラクターを使用します
- **multiGirlSettings** フィールドを使用して、各キャラクターの個別設定を配列で指定してください
- **重要**: 配列の長さは必ずキャラクター数（${individualSettingsData.multiGirlSettings.length}人）と一致させてください
- 各要素は { "characterName": "...", "background": "...", "expression": "...", "clothing": "...", "clothingState": "..." } の形式です
- **服装の重複を避けてください**: 同じシーン内で複数のキャラクターが同じ服装セットを使用しないでください
- 利用可能な服装セット: ${individualSettingsData.clothingSets.map(c => c.name).join(', ')}
` : ''}

【重要なルール】
1. **必ずポーズリストに存在するポーズ名を使用してください。架空のポーズを作成しないでください。**
2. ページ番号は1から始まる連番にしてください
3. NSFW要素を含むシーンでは、nsfw groupのポーズを選択してください
4. セクション構造を理解して、適切なgroup/section組み合わせを使用してください
5. 各シーンの "individual" フィールドで、利用可能な個別設定を使用してください
6. ${individualSettingsData && Array.isArray(individualSettingsData.multiGirlSettings) && individualSettingsData.multiGirlSettings.length > 0 ?
    `**複数人モード**: 各シーンの "individual.multiGirlSettings" は配列で、長さは必ず${individualSettingsData.multiGirlSettings.length}人と一致させてください` :
    '通常モード: "individual" フィールドは単一オブジェクトです'}
7. ${individualSettingsData && Array.isArray(individualSettingsData.clothingSets) && individualSettingsData.clothingSets.length > 0 ?
    `服装セット選択時は、**セット名だけでなく、含まれるタグ（tags）を必ず確認**してください。シーンの文脈（学園、オフィス、カジュアル等）に合うタグを含むセットを選んでください。` :
    '服装セットが設定されていません。'}
8. 区切り（divider）を適切に配置して、ストーリーの段落を作成してください
9. storyMemoには、シーンの状況を簡潔に記述してください（セリフも含む）
10. 複数の素材セット（背景、表情、服装、衣服状態、男性キャラ、男性衣服状態）を組み合わせて、多様で豊かなストーリーを作成してください
11. clothingStateは以下のいずれかを使用してください：
    * 空文字列（""）: 通常の服装
    * "上半身": 上半身のみ脱衣
    * "下半身": 下半身のみ脱衣
    * "全裸": 完全に脱衣
12. 衣服状態の指定がない場合は、空文字列（""）にしてください
13. **服装の変化は自然に行ってください**:
      * 同じシーン内では、服装状態を急に変えないでください（例: 通常 → 突然全裸）
      * 段階的に変化させてください（例: 通常 → 上半身 → 全裸）
      * ストーリーの流れに合わせて、自然な脱衣の順序を考慮してください
14. **服装状態の一貫性を保つ**:
      * 同じシーン内や連続するシーンでは、服装状態を急に変えないでください
      * ストーリー全体を通して、服装の統一感と自然な変化のバランスを保ってください
15. 各シーンに「storyMemo」フィールドを追加してください：
    ${isOmaaseMode ? `- **お任せモードでは、storyMemoは必ず空文字列（""）にしてください**
    - ポーズの選択と区切りの配置のみに集中してください` : `- そのシーンのストーリー展開の参考メモ（**1行程度、最大2行まで、簡潔に**）
    - **重要：ストーリーメモは参考用の簡潔なメモ程度です。1行程度、最大でも2行までにしてください。長文にしないでください。**
    - シーンの状況説明を簡潔に記述してください（必要に応じてセリフや音声表現も含める）
    - 例：「展開のシーン。接触をしながら、恥ずかしそうな表情。「やだ…」」
    - 例：「クライマックス。体位ポーズで「あっ…」と感じている。」
    - 例：「関係性のシーン。「ごめんなさい…でも、気持ちいい…」」
    - **絶対に長文にしないでください。簡潔なメモ程度（1行、最大2行）にしてください。**
    - セリフは「」で囲んでください`}

【出力例】
{
  "items": [
    { "type": "divider", "text": "【導入】" },
    { "type": "scene", "poseName": "座りポーズ", "group": "default", "section": "基本セット", "pageNumber": 1, "storyMemo": "教室で机に座っている。「今日も遅くまで勉強しちゃった…」", "individual": { "background": "教室", "expression": "困った", "clothing": "", "clothingState": "", "maleCharacterSet": "", "maleClothingState": "" } },
    { "type": "scene", "poseName": "基本立ちポーズ", "group": "default", "section": "基本セット", "pageNumber": 2, "storyMemo": "立ち上がり、不安そうな表情。「あれ？誰かいるの…？」", "individual": { "background": "", "expression": "不安", "clothing": "", "clothingState": "", "maleCharacterSet": "", "maleClothingState": "" } },
    { "type": "divider", "text": "【前戯】" },
    { "type": "scene", "poseName": "接触ポーズ1", "group": "nsfw", "section": "前戯：接触", "pageNumber": 3, "storyMemo": "接触をしながら、恥ずかしそうな表情。「やだ…」", "individual": { "background": "", "expression": "恥ずかしい", "clothing": "", "clothingState": "上半身", "maleCharacterSet": "", "maleClothingState": "" } },
    { "type": "scene", "poseName": "接触ポーズ2", "group": "nsfw", "section": "前戯：接触", "pageNumber": 4, "storyMemo": "感じている様子。「やめて…でも、気持ちいい…」", "individual": { "background": "", "expression": "感じている", "clothing": "", "clothingState": "上半身", "maleCharacterSet": "", "maleClothingState": "" } },
    { "type": "divider", "text": "【本番】" },
    { "type": "scene", "poseName": "体位ポーズ1", "group": "nsfw", "section": "本番：体位", "pageNumber": 5, "storyMemo": "クライマックス開始。「あっ…」と感じている。", "individual": { "background": "", "expression": "感じている", "clothing": "", "clothingState": "全裸", "maleCharacterSet": "", "maleClothingState": "全裸" } },
    { "type": "scene", "poseName": "体位ポーズ2", "group": "nsfw", "section": "本番：体位", "pageNumber": 6, "storyMemo": "別の体位で、より激しく。「激しい…もうダメ…」", "individual": { "background": "", "expression": "絶頂", "clothing": "", "clothingState": "全裸", "maleCharacterSet": "", "maleClothingState": "全裸" } },
    { "type": "scene", "poseName": "体位ポーズ3", "group": "nsfw", "section": "本番：体位", "pageNumber": 7, "storyMemo": "クライマックスに近づいている。「あっ…いく…！」", "individual": { "background": "", "expression": "絶頂", "clothing": "", "clothingState": "全裸", "maleCharacterSet": "", "maleClothingState": "全裸" } },
    { "type": "divider", "text": "【後戯】" },
    { "type": "scene", "poseName": "リラックスポーズ", "group": "default", "section": "基本セット", "pageNumber": 8, "storyMemo": "事後の余韻。静かに抱き合っている。「すごかった…」", "individual": { "background": "", "expression": "リラックス", "clothing": "", "clothingState": "", "maleCharacterSet": "", "maleClothingState": "" } }
  ],
  "explanation": "導入から展開、クライマックス、後処理へと自然に流れるストーリーを構成しました。全8ページの構成です。"
}`

            // Gemini API呼び出し
            const result = await model.generateContent(prompt);
            const response = await result.response;

            // 安全フィルターのチェック
            if (response.promptFeedback && response.promptFeedback.blockReason) {
                const blockReason = response.promptFeedback.blockReason;
                console.error('❌ 安全フィルターでブロック:', blockReason);
                throw new Error(`安全フィルターによりブロックされました: ${blockReason}`);
            }

            // candidatesのチェック
            if (!response.candidates || response.candidates.length === 0) {
                console.error('❌ レスポンスにcandidatesがありません');
                if (response.promptFeedback) {
                    console.error('❌ promptFeedback:', JSON.stringify(response.promptFeedback, null, 2));
                }
                throw new Error('Gemini APIから有効なレスポンスが返されませんでした。安全フィルターでブロックされた可能性があります。');
            }

            // finishReasonのチェック
            const candidate = response.candidates[0];
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                console.warn('⚠️ finishReason:', candidate.finishReason);
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error('安全フィルターによりブロックされました（SAFETY）。プロンプトの内容を調整してください。');
                }
            }

            let text;
            try {
                text = response.text();
            } catch (textError) {
                console.error('❌ response.text()エラー:', textError);
                console.error('❌ response.candidates:', JSON.stringify(response.candidates, null, 2));
                throw new Error(`レスポンステキストの取得に失敗しました: ${textError.message}`);
            }

            if (!text || text.trim().length === 0) {
                console.error('❌ レスポンステキストが空です');
                console.error('❌ response.candidates:', JSON.stringify(response.candidates, null, 2));
                throw new Error('Gemini APIから空のレスポンスが返されました。安全フィルターでブロックされた可能性があります。');
            }

            console.log('📥 Gemini APIレスポンス受信完了');
            console.log('📄 レスポンステキスト（全文）:', text);

            // JSONを抽出（複数のパターンを試す）
            let jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (!jsonMatch) {
                jsonMatch = text.match(/```\n([\s\S]*?)\n```/);
            }
            if (!jsonMatch) {
                jsonMatch = text.match(/\{[\s\S]*"items"[\s\S]*\}/);
            }
            if (!jsonMatch) {
                // 最後の手段：最初の{から最後の}までを探す
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

            let storyData;
            try {
                const jsonText = jsonMatch[1] || jsonMatch[0];
                storyData = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('❌ JSON解析エラー:', parseError);
                console.error('❌ 抽出したJSONテキスト:', jsonMatch[1] || jsonMatch[0]);
                throw new Error(`JSON解析に失敗しました: ${parseError.message}`);
            }

            return {
                success: true,
                items: storyData.items || [],
                explanation: storyData.explanation || '',
                rawResponse: text
            };

        } catch (error) {
            console.error('❌ Gemini AI ストーリー生成エラー:', error);

            let errorMessage = 'ストーリー生成に失敗しました';
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
                items: [],
                rawError: error.message
            };
        }
    }
}

// シングルトンパターンでexport
module.exports = new GeminiStoryGenerator();
