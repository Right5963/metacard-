/**
 * テキスト抽出ロジックモジュール
 * 複数ファイルから特定カテゴリのタグを抽出してテキスト形式で出力
 */

/**
 * 抽出結果をテキスト形式に変換
 * @param {Array} extractionResults - 抽出結果の配列 [{ filePath, extractedTags }, ...]
 * @returns {string} - テキスト形式の文字列（1ファイル = 1行）
 */
function formatExtractionResults(extractionResults) {
  return extractionResults
    .map(({ extractedTags }) => {
      // タグをカンマ区切りで結合
      return extractedTags.join(',');
    })
    .join('\n');
}

/**
 * ファイル名から抽出ファイル名を生成
 * @param {Array} selectedCategories - 選択されたカテゴリの配列
 * @returns {string} - ファイル名
 */
function generateExtractionFileName(selectedCategories) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  
  let categoryStr;
  if (selectedCategories.length === 0) {
    categoryStr = 'none';
  } else if (selectedCategories.length === 6) {
    categoryStr = 'all';
  } else {
    categoryStr = selectedCategories.join('+');
  }
  
  return `prompts_extracted_${categoryStr}_${dateStr}.txt`;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatExtractionResults,
    generateExtractionFileName
  };
} else {
  // ブラウザ環境
  window.TextExtractor = {
    formatExtractionResults,
    generateExtractionFileName
  };
}

