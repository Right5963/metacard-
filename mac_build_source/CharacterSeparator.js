// 🎭 CharacterSeparator.js - ADDCOL区切り解析モジュール
// 複数キャラクタープロンプトの分離・解析を担当

class CharacterSeparator {
    constructor() {
        this.delimiter = 'ADDCOL,';
        this.alternativeDelimiters = ['ADDCOL', 'addcol,', 'addcol', 'ADD_COL,', 'ADD_COL'];
        console.log('[CharacterSeparator] 初期化完了');
    }

    /**
     * プロンプトを複数キャラクターに分離
     * @param {string} prompt - 入力プロンプト
     * @returns {Object} 分離結果
     */
    separateCharacters(prompt) {
        console.log('[CharacterSeparator] プロンプト分離開始');

        try {
            const separationResult = this.detectAndSeparate(prompt);

            if (separationResult.isMultiCharacter) {
                console.log(`[CharacterSeparator] 複数キャラクター検出: ${separationResult.characters.length}人`);
                return separationResult;
            } else {
                console.log('[CharacterSeparator] 単一キャラクター判定');
                return {
                    isMultiCharacter: false,
                    totalCharacters: 1,
                    characters: [{
                        id: 1,
                        tags: this.parseTagsFromPrompt(prompt),
                        rawPrompt: prompt.trim()
                    }]
                };
            }
        } catch (error) {
            console.error('[CharacterSeparator] エラー:', error);
            return this.createErrorResult(prompt);
        }
    }

    /**
     * ADDCOL区切りを検出して分離
     * @param {string} prompt - 入力プロンプト
     * @returns {Object} 分離結果
     */
    detectAndSeparate(prompt) {
        let separatedPrompts = [];
        let usedDelimiter = null;

        // 各区切り文字を順番に試行
        for (const delimiter of [this.delimiter, ...this.alternativeDelimiters]) {
            if (prompt.includes(delimiter)) {
                separatedPrompts = prompt.split(delimiter);
                usedDelimiter = delimiter;
                break;
            }
        }

        // 区切り文字が見つからない場合は単一キャラクター
        if (!usedDelimiter || separatedPrompts.length <= 1) {
            return {
                isMultiCharacter: false,
                totalCharacters: 1,
                usedDelimiter: null
            };
        }

        // 各キャラクターのプロンプトを解析
        const characters = separatedPrompts.map((characterPrompt, index) => {
            const cleanPrompt = characterPrompt.trim();
            const tags = this.parseTagsFromPrompt(cleanPrompt);

            return {
                id: index + 1,
                tags: tags,
                rawPrompt: cleanPrompt,
                characterNumber: index + 1
            };
        });

        return {
            isMultiCharacter: true,
            totalCharacters: characters.length,
            characters: characters,
            usedDelimiter: usedDelimiter
        };
    }

    /**
     * プロンプトからタグを抽出
     * @param {string} prompt - プロンプト文字列
     * @returns {Array} タグ配列
     */
    parseTagsFromPrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            return [];
        }

        // カンマ区切りで分割
        const tags = prompt.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .filter(tag => !this.isDelimiterTag(tag));

        return tags;
    }

    /**
     * 区切り文字タグかどうかチェック
     * @param {string} tag - チェックするタグ
     * @returns {boolean} 区切り文字タグかどうか
     */
    isDelimiterTag(tag) {
        const cleanTag = tag.toLowerCase().trim();
        return this.alternativeDelimiters.some(delimiter =>
            cleanTag.includes(delimiter.toLowerCase())
        );
    }

    /**
     * エラー時のデフォルト結果作成
     * @param {string} prompt - 元のプロンプト
     * @returns {Object} エラー結果
     */
    createErrorResult(prompt) {
        return {
            isMultiCharacter: false,
            totalCharacters: 1,
            characters: [{
                id: 1,
                tags: [],
                rawPrompt: prompt || '',
                error: true
            }],
            error: true
        };
    }
}

// グローバル初期化
if (typeof window !== 'undefined') {
    window.characterSeparator = new CharacterSeparator();
    console.log('[CharacterSeparator] モジュール読み込み完了');
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterSeparator;
}
