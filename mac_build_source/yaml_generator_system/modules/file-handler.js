/**
 * ファイルI/O処理モジュール
 * Electron IPCを使用してファイル操作を実行
 */

/**
 * テキストファイルを読み込む
 * @param {string} filePath - ファイルパス
 * @returns {Promise<string>} - ファイル内容
 */
async function readTextFile(filePath) {
  if (!window.electronAPI || !window.electronAPI.readTextFile) {
    throw new Error('Electron APIが利用できません');
  }
  
  const result = await window.electronAPI.readTextFile(filePath);
  console.log('📄 readTextFile結果:', result);
  
  if (!result.success) {
    throw new Error(result.error || 'ファイル読み込みに失敗しました');
  }
  
  return result.content;
}

/**
 * フォルダ内のtxtファイル一覧を取得
 * @param {string} folderPath - フォルダパス
 * @returns {Promise<Array>} - ファイル名の配列
 */
async function listTextFiles(folderPath) {
  if (!window.electronAPI || !window.electronAPI.listTextFiles) {
    throw new Error('Electron APIが利用できません');
  }
  
  const result = await window.electronAPI.listTextFiles(folderPath);
  console.log('📁 listTextFiles結果:', result);
  
  if (!result.success) {
    throw new Error(result.error || 'ファイル一覧取得に失敗しました');
  }
  
  return result.files || [];
}

/**
 * フォルダ内の全txtファイルを読み込む
 * @param {string} folderPath - フォルダパス
 * @returns {Promise<Array>} - ファイル内容の配列 [{ filePath, content }, ...]
 */
async function readAllTextFiles(folderPath) {
  const files = await listTextFiles(folderPath);
  const contents = [];
  
  for (const fileName of files) {
    const filePath = `${folderPath}\\${fileName}`.replace(/\\/g, '/');
    try {
      const content = await readTextFile(filePath);
      contents.push({ filePath, content });
    } catch (error) {
      console.error(`❌ ${fileName} 読み込み失敗:`, error);
    }
  }
  
  return contents;
}

/**
 * YAMLファイルを保存する
 * @param {string} filePath - 保存先ファイルパス
 * @param {string} content - YAML内容
 * @returns {Promise<Object>} - 保存結果
 */
async function saveYamlFile(filePath, content) {
  if (!window.electronAPI || !window.electronAPI.saveYamlFile) {
    throw new Error('Electron APIが利用できません');
  }
  
  return await window.electronAPI.saveYamlFile(filePath, content);
}

/**
 * テキストファイルを保存する
 * @param {string} filePath - 保存先ファイルパス
 * @param {string} content - テキスト内容
 * @returns {Promise<Object>} - 保存結果
 */
async function saveTextFile(filePath, content) {
  if (!window.electronAPI || !window.electronAPI.saveTextFile) {
    throw new Error('Electron APIが利用できません');
  }
  
  return await window.electronAPI.saveTextFile(filePath, content);
}

/**
 * ファイル保存ダイアログを表示
 * @param {string} defaultPath - デフォルトパス
 * @param {Array} filters - ファイルフィルター
 * @returns {Promise<string|null>} - 選択されたファイルパス（キャンセル時はnull）
 */
async function showSaveDialog(defaultPath, filters) {
  if (!window.electronAPI || !window.electronAPI.showSaveDialog) {
    throw new Error('Electron APIが利用できません');
  }
  
  return await window.electronAPI.showSaveDialog(defaultPath, filters);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    readTextFile,
    listTextFiles,
    readAllTextFiles,
    saveYamlFile,
    saveTextFile,
    showSaveDialog
  };
} else {
  // ブラウザ環境
  window.FileHandler = {
    readTextFile,
    listTextFiles,
    readAllTextFiles,
    saveYamlFile,
    saveTextFile,
    showSaveDialog
  };
}

