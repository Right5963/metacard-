/**
 * Gemini API統合テストスクリプト
 * 実際にGemini APIを呼び出してタグ分類が動作するか確認
 *
 * 使用方法:
 * 1. GEMINI_API_KEY環境変数を設定
 * 2. node utils/test-gemini-api.js
 */

const { classifyTagsWithGemini, classifyTagsBatch } = require('./gemini-classifier');

// テスト用タグサンプル（実際のDanbooruタグ）
const TEST_TAGS = [
    'smile',           // expression
    'dress',           // clothing
    'sitting',         // poseemotion
    'large breasts',   // body
    'long hair',       // face
    'outdoors',        // background
    'masterpiece',     // quality
    '1girl',           // people
    'blue eyes',       // face
    'blush',           // expression
    'school uniform',  // clothing
    'standing',        // poseemotion
    'bedroom',         // background
    'best quality',    // quality
    '2girls',          // people
    'brown hair',      // face
    'medium breasts',  // body
    'happy',           // expression
    'pantyhose',       // clothing
    'walking'          // poseemotion
];

async function runTest() {
    console.log('🚀 Gemini API分類テスト開始\n');
    console.log(`📋 テストタグ数: ${TEST_TAGS.length}`);
    console.log(`🎯 期待される動作: 各タグを8カテゴリに自動分類\n`);

    // APIキー確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        console.error('❌ エラー: GEMINI_API_KEY環境変数が設定されていません');
        console.log('\n設定方法:');
        console.log('Windows PowerShell: $env:GEMINI_API_KEY="your-api-key-here"');
        console.log('Windows CMD:        set GEMINI_API_KEY=your-api-key-here');
        console.log('Linux/Mac:          export GEMINI_API_KEY="your-api-key-here"');
        process.exit(1);
    }

    console.log('✅ Gemini APIキー確認完了\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // テスト1: 小規模テスト（10タグ）
    console.log('\n📊 テスト1: 小規模分類テスト（10タグ）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const smallBatch = TEST_TAGS.slice(0, 10);
    const result1 = await classifyTagsWithGemini(smallBatch);

    if (result1.success) {
        console.log('✅ テスト1成功\n');
        console.log('分類結果:');

        const categoryCount = {};
        Object.entries(result1.classifications).forEach(([tag, data]) => {
            console.log(`  ${tag.padEnd(20)} → ${data.category.padEnd(15)} (信頼度: ${data.confidence}%)`);
            categoryCount[data.category] = (categoryCount[data.category] || 0) + 1;
        });

        console.log('\nカテゴリ別集計:');
        Object.entries(categoryCount).forEach(([category, count]) => {
            console.log(`  ${category}: ${count}タグ`);
        });
    } else {
        console.error('❌ テスト1失敗:', result1.error);
        process.exit(1);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // テスト2: バッチ処理テスト（全20タグ）
    console.log('\n📊 テスト2: バッチ処理テスト（20タグ）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result2 = await classifyTagsBatch(TEST_TAGS, 10);

    console.log('✅ テスト2成功\n');
    console.log('最終分類結果:');

    const finalCategoryCount = {};
    Object.entries(result2).forEach(([tag, data]) => {
        console.log(`  ${tag.padEnd(20)} → ${data.category.padEnd(15)} (信頼度: ${data.confidence}%)`);
        finalCategoryCount[data.category] = (finalCategoryCount[data.category] || 0) + 1;
    });

    console.log('\n最終カテゴリ別集計:');
    Object.entries(finalCategoryCount).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}タグ`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 全テスト完了！');
    console.log('\n次のステップ:');
    console.log('1. main.jsにIPC handler追加');
    console.log('2. index.htmlに手動分類UI追加');
    console.log('3. classifier.jsにAI予測表示機能追加');
}

// テスト実行
runTest().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
});
