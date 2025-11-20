// 👥 MultiCharacterManager.js - 改良版複数キャラクター管理システム
// UniversalDualSelector UI + originalIndex対応 + 動的拡張

class MultiCharacterManager {
    constructor() {
        this.characters = new Map();
        this.currentMode = 'single'; // 'single' | 'multi'
        this.activeCharacters = [1, 2]; // アクティブなキャラクターID配列
        this.maxCharacters = 5;
        this.currentSelectingChar = null;
        this.currentSelectingCategory = null;

        // 複数キャラクター対象カテゴリ（背景・品質・人数は共通）
        this.dualCategories = ['face', 'body', 'clothing', 'pose', 'expression', 'other'];
        this.commonCategories = ['people', 'background', 'quality'];

        this.categoryDisplayNames = {
            'people': '複数人・人数',
            'face': '女性の顔',
            'body': '体',
            'pose': 'ポーズ',
            'background': '背景',
            'clothing': '服装',
            'expression': '表情',
            'quality': '品質',
            'other': 'その他'
        };

        this.characterColors = [
            '#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1'
        ];

        this.initializeEventHandlers();
        console.log('[MultiCharacterManager] 改良版初期化完了');
    }

    initializeEventHandlers() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }
    }

    initializeUI() {
        this.createMultiCharacterPanel();
        this.bindUIEvents();
        console.log('[MultiCharacterManager] UI初期化完了');
    }

    createMultiCharacterPanel() {
        const existingPanel = document.getElementById('multi-character-panel');
        if (existingPanel) existingPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'multi-character-panel';
        panel.innerHTML = `
            <style>
                #multi-character-panel {
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 8px;
                    margin-bottom: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .multi-character-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 32px;
                }
                .header-left { display: flex; align-items: center; gap: 8px; }
                .toggle-panel-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 6px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    font-size: 18px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.2s ease;
                }
                .toggle-panel-btn:hover { transform: scale(1.1); }
                .panel-title { font-size: 14px; font-weight: 600; color: #333; }
                .mode-toggle-compact {
                    display: flex;
                    gap: 4px;
                    background: #f0f0f0;
                    border-radius: 16px;
                    padding: 2px;
                }
                .mode-btn {
                    background: transparent;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 14px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .mode-btn.active {
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .multi-character-content {
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #e0e0e0;
                    display: none;
                }
                .dual-category-buttons {
                    background: #f8f9fa;
                    padding: 8px;
                    border-radius: 6px;
                    margin-top: 8px;
                    border-left: 4px solid #007bff;
                }
                .dual-buttons-row {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 8px;
                    flex-wrap: wrap;
                }
                .char-select-btn {
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    color: white;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                .char-select-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                .char-preview-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 8px;
                }
                .char-preview {
                    padding: 6px;
                    background: white;
                    border-radius: 6px;
                    font-size: 12px;
                }
                .char-preview strong {
                    display: block;
                    margin-bottom: 4px;
                }
                .char-preview-content {
                    color: #666;
                    font-size: 11px;
                }
                .action-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                    padding: 8px;
                    background: white;
                    border-radius: 6px;
                }
                .action-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(0,0,0,0.2);
                }
                .add-char-btn {
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
            </style>
            <div class="multi-character-header">
                <div class="header-left">
                    <button class="toggle-panel-btn" id="toggle-multi-char-panel" title="複数キャラクター設定">🎭</button>
                    <span class="panel-title">複数キャラ</span>
                </div>
                <div class="mode-toggle-compact">
                    <button class="mode-btn single-mode active" data-mode="single" title="単一モード">👤</button>
                    <button class="mode-btn multi-mode" data-mode="multi" title="複数モード">👥</button>
                </div>
            </div>
            <div class="multi-character-content" id="multi-character-content">
            </div>
        `;

        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(panel, mainContent.firstChild);
        }
    }

    bindUIEvents() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                modeButtons.forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.switchMode(mode);
            });
        });

        const toggleBtn = document.getElementById('toggle-multi-char-panel');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const content = document.getElementById('multi-character-content');
                if (content.style.display === 'none') {
                    if (this.currentMode === 'single') {
                        document.querySelector('.mode-btn.multi-mode').click();
                    } else {
                        content.style.display = 'block';
                    }
                } else {
                    content.style.display = 'none';
                }
            });
        }
    }

    switchMode(mode) {
        this.currentMode = mode;
        const content = document.getElementById('multi-character-content');
        content.style.display = mode === 'multi' ? 'block' : 'none';

        if (mode === 'single') {
            this.clearAllCharacters();
            this.removeCategoryButtons();
        } else {
            this.initializeCharacters();
            this.addCategoryButtons();
        }

        console.log(`[MultiCharacterManager] モード: ${mode}`);
    }

    initializeCharacters() {
        // 初期2人のキャラクターを作成
        this.activeCharacters = [1, 2];
        this.characters.clear();

        this.activeCharacters.forEach(id => {
            this.characters.set(id, {
                id: id,
                name: `キャラクター${id}`,
                categories: this.initializeEmptyCategories()
            });
        });
    }

    addCategoryButtons() {
        this.dualCategories.forEach(category => {
            this.addCategoryDualButtons(category);
        });
    }

    removeCategoryButtons() {
        this.dualCategories.forEach(category => {
            const existingButtons = document.querySelector(`[data-category="${category}"] .dual-category-buttons`);
            if (existingButtons) {
                existingButtons.remove();
            }
        });
    }

    addCategoryDualButtons(category) {
        const categoryBox = document.querySelector(`[data-category="${category}"]`);
        if (!categoryBox) return;

        // 既存のボタンを削除
        const existing = categoryBox.querySelector('.dual-category-buttons');
        if (existing) existing.remove();

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'dual-category-buttons';

        // キャラクター選択ボタンを動的生成
        const buttonsHTML = this.activeCharacters.map((charId, idx) => {
            const color = this.characterColors[idx];
            return `
                <button class="char-select-btn"
                        style="background: ${color};"
                        onclick="window.multiCharacterManager.selectForCharacter(${charId}, '${category}')">
                    🎭 キャラ${charId}の${this.categoryDisplayNames[category]}選択
                </button>
            `;
        }).join('');

        // キャラクター追加ボタン
        const addButton = this.activeCharacters.length < this.maxCharacters ?
            `<button class="add-char-btn" onclick="window.multiCharacterManager.addCharacter()">➕ キャラ追加</button>` : '';

        buttonsDiv.innerHTML = `
            <div class="dual-buttons-row">
                ${buttonsHTML}
                ${addButton}
            </div>
            <div class="char-preview-grid" id="preview-${category}">
                ${this.generatePreviewHTML(category)}
            </div>
        `;

        categoryBox.appendChild(buttonsDiv);
    }

    generatePreviewHTML(category) {
        return this.activeCharacters.map((charId, idx) => {
            const character = this.characters.get(charId);
            const tags = character?.categories[category] || [];
            const color = this.characterColors[idx];
            const preview = tags.length > 0 ?
                tags.slice(0, 3).map(t => t.text).join(', ') + (tags.length > 3 ? '...' : '') :
                '未選択';

            return `
                <div class="char-preview">
                    <strong style="color: ${color};">👩 キャラクター${charId}:</strong>
                    <div class="char-preview-content">${preview}</div>
                </div>
            `;
        }).join('');
    }

    selectForCharacter(charId, category) {
        this.currentSelectingChar = charId;
        this.currentSelectingCategory = category;

        console.log(`[MultiCharacterManager] キャラ${charId}の${category}選択開始`);

        // セット選択モーダルを開く（既存システムを利用）
        if (window.showCategoryModal) {
            window.showCategoryModal(category);
        }
    }

    // セット選択後に呼ばれる（既存システムから）
    onSetSelected(category, tags, setName) {
        if (!this.currentSelectingChar || !this.currentSelectingCategory) return;

        const character = this.characters.get(this.currentSelectingChar);
        if (!character) return;

        // originalIndexを保持したままタグを保存
        character.categories[category] = tags.map((tag, idx) => ({
            text: typeof tag === 'string' ? tag : tag.text,
            originalIndex: typeof tag === 'object' && tag.originalIndex !== undefined ?
                tag.originalIndex : idx
        }));

        console.log(`[MultiCharacterManager] キャラ${this.currentSelectingChar}の${category}更新:`,
                    character.categories[category]);

        // プレビュー更新
        this.updatePreview(category);

        this.currentSelectingChar = null;
        this.currentSelectingCategory = null;
    }

    updatePreview(category) {
        const previewContainer = document.getElementById(`preview-${category}`);
        if (previewContainer) {
            previewContainer.innerHTML = this.generatePreviewHTML(category);
        }
    }

    addCharacter() {
        if (this.activeCharacters.length >= this.maxCharacters) {
            alert(`⚠️ 最大${this.maxCharacters}人まで`);
            return;
        }

        const newId = Math.max(...this.activeCharacters, 0) + 1;
        this.activeCharacters.push(newId);
        this.characters.set(newId, {
            id: newId,
            name: `キャラクター${newId}`,
            categories: this.initializeEmptyCategories()
        });

        // 全カテゴリのボタンを再生成
        this.dualCategories.forEach(category => {
            this.addCategoryDualButtons(category);
        });

        console.log(`[MultiCharacterManager] キャラクター${newId}追加`);
    }

    mergeAllCharacters() {
        if (this.characters.size === 0) {
            alert('⚠️ 統合するキャラクターがありません');
            return;
        }

        console.log('[MultiCharacterManager] 統合プロンプト生成開始');

        // 【修正】共通カテゴリタグを収集（quality, background, other）
        const commonTags = [];
        this.commonCategories.forEach(category => {
            if (category === 'people') return; // 人数は後で追加

            const categoryBox = document.querySelector(`[data-category="${category}"]`);
            if (!categoryBox) return;

            const tagElements = categoryBox.querySelectorAll('.tag');
            tagElements.forEach(tagEl => {
                const tagText = tagEl.textContent.replace('×', '').trim();
                const originalIndex = parseInt(tagEl.dataset.originalIndex) || 0;
                commonTags.push({ text: tagText, originalIndex });
            });
        });

        // originalIndexでソート
        commonTags.sort((a, b) => a.originalIndex - b.originalIndex);
        const commonPrompt = commonTags.map(t => t.text).join(', ');

        // キャラクター別プロンプト生成
        const characterPrompts = [];
        this.activeCharacters.forEach(charId => {
            const character = this.characters.get(charId);
            if (!character) return;

            const prompt = this.generateCharacterPrompt(character);
            if (prompt.trim()) {
                characterPrompts.push(prompt);
            }
        });

        if (characterPrompts.length === 0) {
            alert('⚠️ 選択されたタグがありません');
            return;
        }

        // 人数タグ
        const peopleTag = `${characterPrompts.length}girls, multiple girls`;

        // 【修正】最終プロンプト統合: 共通タグ + 人数 + キャラ1 ADDCOL, キャラ2
        let finalPrompt = '';
        if (commonPrompt) {
            finalPrompt = commonPrompt + ', ';
        }
        finalPrompt += peopleTag + ', ' + characterPrompts.join(' ADDCOL, ');

        // プロンプト出力エリアに設定
        const textarea = document.getElementById('generatedPrompt');
        if (textarea) {
            textarea.value = finalPrompt;
            alert(`✅ ${characterPrompts.length}人のキャラクターを統合しました`);
        }

        console.log('[MultiCharacterManager] 統合完了:', finalPrompt);
    }

    generateCharacterPrompt(character) {
        const allTags = [];

        // 対象カテゴリからタグを収集
        this.dualCategories.forEach(category => {
            const tags = character.categories[category];
            if (tags && tags.length > 0) {
                allTags.push(...tags);
            }
        });

        // originalIndexでソート（重要！）
        allTags.sort((a, b) => a.originalIndex - b.originalIndex);

        // textのみを抽出して結合
        return allTags.map(tagObj => tagObj.text).join(', ');
    }

    analyzeCurrentPrompt() {
        const textarea = document.getElementById('generatedPrompt');
        if (!textarea || !textarea.value.trim()) {
            alert('⚠️ プロンプトがありません');
            return;
        }

        const result = window.characterSeparator?.separateCharacters(textarea.value);

        if (result && result.isMultiCharacter) {
            this.clearAllCharacters();
            this.activeCharacters = [];

            result.characters.forEach((charData, index) => {
                const charId = index + 1;
                this.activeCharacters.push(charId);

                const character = {
                    id: charId,
                    name: `キャラクター${charId}`,
                    categories: this.initializeEmptyCategories()
                };

                // カテゴリ分類（既存システムを利用）
                if (window.categorizeTags) {
                    const categorized = window.categorizeTags(charData.tags);
                    Object.keys(categorized).forEach(category => {
                        character.categories[category] = categorized[category];
                    });
                }

                this.characters.set(charId, character);
            });

            // 複数キャラクターモードを有効化
            this.activateMultiMode();

            // 各カテゴリに分類結果を表示
            this.dualCategories.forEach(category => {
                this.displayCategoryTags(category);
            });

            alert(`✅ ${result.totalCharacters}人のキャラクターを検出し、各カテゴリに分類しました`);
        } else {
            alert('ℹ️ 単一キャラクターです');
        }
    }

    initializeEmptyCategories() {
        const categories = {};
        [...this.dualCategories, ...this.commonCategories].forEach(category => {
            categories[category] = [];
        });
        return categories;
    }

    clearAllCharacters() {
        this.characters.clear();
        this.activeCharacters = [];
    }

    /**
     * カテゴリごとにタグを表示（参照アプリrenderer.js line 1730準拠）
     * 両キャラのタグを統合して表示
     */
    displayCategoryTags(category) {
        // 両キャラクターのタグを統合
        const allTags = [];

        this.characters.forEach((character, charId) => {
            const categoryTags = character.categories[category] || [];
            allTags.push(...categoryTags);
        });

        // 重複除去
        const uniqueTags = [...new Set(allTags)];

        // カテゴリボックスのタグコンテナを取得
        const tagContainer = document.getElementById(`${category}-tags`);
        const countElement = document.getElementById(`${category}-count`);

        if (tagContainer && countElement) {
            tagContainer.innerHTML = '';

            // タグ要素を作成して表示
            uniqueTags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tag;
                tagContainer.appendChild(tagEl);
            });

            // カウント更新
            countElement.textContent = uniqueTags.length;
        }
    }
}

// グローバル初期化
if (typeof window !== 'undefined') {
    window.multiCharacterManager = new MultiCharacterManager();
    console.log('[MultiCharacterManager] モジュール読み込み完了');
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiCharacterManager;
}
