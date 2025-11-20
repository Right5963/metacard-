(function () {
    const DISPLAY_NAMES = {
        face: '女性の顔',
        body: '体',
        clothing: '服装',
        expression: '表情',
        pose: 'ポーズ',
        poseemotion: 'ポーズ・感情',
        background: '背景',
        quality: '品質',
        other: 'その他',
        people: '複数人・人数'
    };

    const CATEGORY_MAPPING = {
        face: 'face',
        body: 'body',
        clothing: 'clothing',
        expression: 'face',
        pose: 'poseemotion',
        poseemotion: 'poseemotion',
        background: 'background',
        quality: 'quality',
        other: 'other',
        people: 'people'
    };

    let setsBasePath = 'data/sets';
    let setsPathSeparator = '/';

    function updateSetsBasePath(rawPath) {
        if (!rawPath || !String(rawPath).trim()) {
            setsBasePath = 'data/sets';
            setsPathSeparator = '/';
            refreshBasePathDisplays();
            return;
        }
        let normalized = String(rawPath).trim();
        normalized = normalized.replace(/[\\/]+$/, '');
        setsBasePath = normalized;
        setsPathSeparator = normalized.includes('\\') ? '\\' : '/';
        refreshBasePathDisplays();
    }

    const DEFAULT_GROUP = 'default';
    const DEFAULT_METADATA = Object.freeze({
        tags: [],
        type: '',
        rating: 'normal',
        notes: ''
    });
    const DEFAULT_FILTERS = {
        keyword: '',
        rating: 'all',
        metaTags: []
    };

    const state = {
        currentCategory: null,
        currentDisplayName: '',
        groups: {},
        currentGroup: DEFAULT_GROUP,
        sections: {},
        editingSet: null,
        pendingImageData: null,
        filters: { ...DEFAULT_FILTERS }
    };

    const hasElectron = () => typeof window.electronAPI !== 'undefined';

    const overlay = () => document.getElementById('categorySetModalOverlay');
    const bodyContainer = () => document.getElementById('categorySetModalBody');
    const editOverlay = () => document.getElementById('setEditOverlay');
    const imageOverlay = () => document.getElementById('setImageOverlay');

    const normalizeSetMetadata = (metadata) => {
        if (!metadata || typeof metadata !== 'object') {
            return { ...DEFAULT_METADATA };
        }
        const tags = Array.isArray(metadata.tags)
            ? metadata.tags.map(tag => String(tag || '').trim()).filter(Boolean)
            : [];
        const uniqueTags = Array.from(new Set(tags));
        const type = metadata.type ? String(metadata.type || '').trim() : '';

        const rating = metadata.rating ? String(metadata.rating || '').trim().toLowerCase() : DEFAULT_METADATA.rating;
        const notes = metadata.notes ? String(metadata.notes || '').trim() : '';
        return {
            tags: uniqueTags,
            type,
            rating,
            notes
        };
    };

    const cloneMetadata = (metadata) => normalizeSetMetadata(metadata);

    const normalizeFilterTags = (value) => {
        if (!value) return [];
        return value
            .split(/[,、\s]+/)
            .map(tag => String(tag || '').trim().toLowerCase())
            .filter(Boolean);
    };

    const getSetMetadata = (setData = {}) => normalizeSetMetadata(setData.metadata);

    const filterMatches = (setName, setData = {}) => {
        const metadata = getSetMetadata(setData);
        const ratingFilter = state.filters.rating;
        const setRating = (metadata.rating || DEFAULT_METADATA.rating).toLowerCase();
        if (ratingFilter !== 'all' && setRating !== ratingFilter) {
            return false;
        }
        if (state.filters.metaTags.length) {
            const metaTagsLower = metadata.tags.map(tag => tag.toLowerCase());
            const missing = state.filters.metaTags.some(tag => !metaTagsLower.includes(tag));
            if (missing) return false;
        }
        const keyword = state.filters.keyword.trim().toLowerCase();
        if (keyword) {
            const haystack = [
                setName,
                ...(Array.isArray(setData.tags) ? setData.tags : []),
                ...metadata.tags,
                metadata.type,
                metadata.notes
            ]
                .join(' ')
                .toLowerCase();
            if (!haystack.includes(keyword)) {
                return false;
            }
        }
        return true;
    };

    const setFilterKeyword = (value) => {
        state.filters.keyword = value;
        renderModal();
    };

    const setFilterMetaTags = (value) => {
        state.filters.metaTags = normalizeFilterTags(value);
        renderModal();
    };

    const setFilterRating = (value) => {
        state.filters.rating = value || 'all';
        renderModal();
    };

    const resetFilters = () => {
        state.filters = { ...DEFAULT_FILTERS };
        renderModal();
    };

    const renderFilterBar = (container) => {
        const bar = document.createElement('div');
        bar.className = 'set-filter-bar';
        bar.innerHTML = `
            <div class="filter-field">
                <label for="setFilterKeyword">キーワード</label>
                <input id="setFilterKeyword" type="text" placeholder="名前・タグ・メモを検索">
            </div>
            <div class="filter-field">
                <label for="setFilterMetaTags">メタタグ（カンマ区切り）</label>
                <input id="setFilterMetaTags" type="text" placeholder="normal, portrait">
            </div>
            <div class="filter-field filter-field--small">
                <label for="setFilterRating">属性</label>
                <select id="setFilterRating">
                    <option value="all">すべて</option>
                    <option value="normal">normal</option>
                    <option value="nsfw">nsfw</option>
                    <option value="mature">mature</option>
                    <option value="sfw">sfw</option>
                    <option value="restricted">restricted</option>
                </select>
            </div>
            <button id="setFilterReset" class="set-filter-reset">フィルタ解除</button>
        `;
        container.appendChild(bar);

        const keywordInput = bar.querySelector('#setFilterKeyword');
        const metaTagsInput = bar.querySelector('#setFilterMetaTags');
        const ratingSelect = bar.querySelector('#setFilterRating');
        const resetBtn = bar.querySelector('#setFilterReset');

        if (keywordInput) {
            keywordInput.value = state.filters.keyword;
            keywordInput.addEventListener('input', (e) => {
                setFilterKeyword(e.target.value);
            });
        }
        if (metaTagsInput) {
            metaTagsInput.value = state.filters.metaTags.join(', ');
            metaTagsInput.addEventListener('input', (e) => {
                setFilterMetaTags(e.target.value);
            });
        }
        if (ratingSelect) {
            ratingSelect.value = state.filters.rating;
            ratingSelect.addEventListener('change', (e) => {
                setFilterRating(e.target.value);
            });
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                resetFilters();
            });
        }
        return bar;
    };

    const collectMetadataFromModal = () => {
        const tagsInput = document.getElementById('editMetaTags');
        const typeInput = document.getElementById('editMetaType');
        const ratingSelect = document.getElementById('editMetaRating');
        const notesInput = document.getElementById('editMetaNotes');

        // 🔍 DEBUG: Log raw DOM values before processing
        console.log('🔍 collectMetadataFromModal - Raw DOM values:', {
            tagsInputValue: tagsInput?.value,
            typeInputValue: typeInput?.value,
            ratingSelectValue: ratingSelect?.value,
            notesInputValue: notesInput?.value
        });

        const rawTags = tagsInput
            ? tagsInput.value.split(/[,、\s]+/).map(tag => tag.trim()).filter(Boolean)
            : [];
        const uniqueTags = Array.from(new Set(rawTags));

        const typeValue = typeInput ? typeInput.value.trim() : '';
        const ratingValue = ratingSelect ? ratingSelect.value : DEFAULT_METADATA.rating;
        const notesValue = notesInput ? notesInput.value.trim() : '';

        const collected = {
            tags: uniqueTags,
            type: typeValue,
            rating: ratingValue,
            notes: notesValue
        };

        // 🔍 DEBUG: Log collected values before normalization
        console.log('🔍 collectMetadataFromModal - Collected (pre-normalize):', JSON.stringify(collected, null, 2));

        const normalized = normalizeSetMetadata(collected);

        // 🔍 DEBUG: Log normalized result
        console.log('🔍 collectMetadataFromModal - Normalized result:', JSON.stringify(normalized, null, 2));

        return normalized;
    };

    const syncLocalStorage = (category, groups) => {
        if (typeof localStorage === 'undefined') return;
        const payload = {};
        const imageMap = {};
        Object.entries(groups || {}).forEach(([groupKey, groupData]) => {
            const sections = groupData && groupData.sections ? groupData.sections : {};
            payload[groupKey] = {};
            Object.entries(sections).forEach(([sectionName, sets]) => {
                payload[groupKey][sectionName] = {};
                Object.entries(sets || {}).forEach(([setName, data]) => {
                    const detail = data || {};
                    payload[groupKey][sectionName][setName] = Array.isArray(detail.tags) ? detail.tags : [];
                    if (detail.image) {
                        imageMap[`${category}::${groupKey}::${sectionName}::${setName}`] = detail.image;
                    }
                });
            });
        });
        try {
            localStorage.setItem(`customSets_${category}`, JSON.stringify(payload));
            const existing = localStorage.getItem('setImageMappings');
            const map = existing ? JSON.parse(existing) : {};
            Object.keys(map).forEach(key => {
                if (key.startsWith(`${category}::`)) {
                    delete map[key];
                }
            });
            localStorage.setItem('setImageMappings', JSON.stringify({ ...map, ...imageMap }));
        } catch (error) {
            console.warn('localStorage sync error:', error);
        }
    };

    const getGroupPreferenceKey = (category) => `setGroup_${category}`;

    const applyGroupSelection = (groupKey) => {
        const availableGroups = Object.keys(state.groups || {});
        const fallback = availableGroups[0] || DEFAULT_GROUP;
        const normalized = availableGroups.includes(groupKey) ? groupKey : fallback;
        state.currentGroup = normalized;
        state.sections = (state.groups[normalized] && state.groups[normalized].sections) || {};
        if (typeof localStorage !== 'undefined' && state.currentCategory) {
            localStorage.setItem(getGroupPreferenceKey(state.currentCategory), normalized);
        }
    };

    const loadPreferredGroup = (category, groups) => {
        if (typeof localStorage === 'undefined') return null;
        try {
            const stored = localStorage.getItem(getGroupPreferenceKey(category));
            if (stored && groups && Object.prototype.hasOwnProperty.call(groups, stored)) {
                return stored;
            }
        } catch {}
        return null;
    };

    const notify = (message, type = 'info') => {
        if (typeof window.showMessage === 'function') {
            window.showMessage(message, type);
        } else {
            alert(message);
        }
    };

    const prepareCategoryContext = async (category) => {
        if (!category) {
            throw new Error('カテゴリが指定されていません');
        }
        if (!hasElectron()) {
            throw new Error('Electron APIが利用できません');
        }
        const displayName = DISPLAY_NAMES[category] || category;
        const res = await window.electronAPI.loadCategorySets(category);
        updateSetsBasePath(res && res.basePath ? res.basePath : null);
        if (!res || !res.success) {
            throw new Error((res && res.error) || 'セットの読み込みに失敗しました');
        }
        state.currentCategory = category;
        state.currentDisplayName = displayName;

        const loadedGroups = res.groups && Object.keys(res.groups).length
            ? res.groups
            : { [DEFAULT_GROUP]: { sections: res.sections || {} } };
        state.groups = loadedGroups;
        const preferredGroup = loadPreferredGroup(category, loadedGroups);
        applyGroupSelection(preferredGroup);
        state.filters = { ...DEFAULT_FILTERS };

        syncLocalStorage(category, state.groups);
        return { displayName, groups: state.groups };
    };

    const ensurePromptStore = () => {
        if (!window.currentPromptData) {
            window.currentPromptData = {
                people: [],
                face: [],
                body: [],
                poseemotion: [],
                background: [],
                clothing: [],
                quality: [],
                other: []
            };
        }
    };

    const getBasePathLabel = () => `${setsBasePath}${setsPathSeparator}`;
    const getCategoryJsonPath = (category) => `${setsBasePath}${setsPathSeparator}${category}_sets.json`;
    const getImageDirectoryPath = () => {
        const category = state.currentCategory || '[category]';
        const group = state.currentGroup || DEFAULT_GROUP;
        const section = state.editingSet?.originalSection || '[section]';
        return `${setsBasePath}${setsPathSeparator}images${setsPathSeparator}${category}${setsPathSeparator}${group}${setsPathSeparator}${section}${setsPathSeparator}`;
    };

    function refreshBasePathDisplays() {
        const imagePathEl = document.getElementById('setImageSavePath');
        if (imagePathEl) {
            imagePathEl.textContent = `保存先: ${getImageDirectoryPath()}`;
        }
    }

    const updateSetModalSubtitle = (sectionCount, setCount, filteredSectionCount = sectionCount, filteredSetCount = setCount) => {
        const subtitleEl = document.getElementById('categorySetModalSubtitle');
        if (!subtitleEl) return;
        const pathLabel = state.currentCategory ? getCategoryJsonPath(state.currentCategory) : getBasePathLabel();
        const sectionLabel = sectionCount === filteredSectionCount
            ? `${sectionCount}`
            : `${filteredSectionCount}/${sectionCount}`;
        const setLabel = setCount === filteredSetCount
            ? `${setCount}`
            : `${filteredSetCount}/${setCount}`;
        subtitleEl.textContent = `グループ: ${state.currentGroup} ｜ セクション ${sectionLabel} ｜ セット ${setLabel} ｜ 保存先: ${pathLabel}`;
    };

    const applyTags = (category, tags) => {
        ensurePromptStore();
        const mapped = CATEGORY_MAPPING[category] || category;
        const bucket = window.currentPromptData[mapped] || (window.currentPromptData[mapped] = []);
        let added = 0;
        tags.forEach(tag => {
            if (!bucket.includes(tag)) {
                bucket.push(tag);
                added += 1;
            }
        });
        if (typeof window.displayCategories === 'function') {
            window.displayCategories();
        }
        return added;
    };

    const applySectionRenameLocally = (oldName, newName) => {
        if (!oldName || !newName || oldName === newName) return;
        if (!state.sections[oldName]) return;

        const reordered = {};
        Object.keys(state.sections).forEach(sectionKey => {
            if (sectionKey === oldName) {
                reordered[newName] = state.sections[sectionKey];
            } else {
                reordered[sectionKey] = state.sections[sectionKey];
            }
        });

        state.sections = reordered;
        if (state.groups[state.currentGroup]) {
            state.groups[state.currentGroup].sections = reordered;
        }
        if (state.editingSet && state.editingSet.originalSection === oldName) {
            state.editingSet.originalSection = newName;
        }
    };

    const buildSectionHeader = (sectionName) => {
        const container = document.createElement('div');
        container.className = 'set-section-header';

        const title = document.createElement('h3');
        title.className = 'set-section-title';
        title.textContent = sectionName;

        const actions = document.createElement('div');
        actions.className = 'set-section-actions';

        const addBtn = document.createElement('button');
        addBtn.textContent = '➕ セット追加';
        addBtn.addEventListener('click', () => {
            openEditModal({
                category: state.currentCategory,
                group: state.currentGroup,
                section: sectionName,
                setName: '',
                setData: { tags: [] }
            });
        });

        actions.appendChild(addBtn);

        const renameBtn = document.createElement('button');
        renameBtn.textContent = '✏️ セクション名変更';
        renameBtn.addEventListener('click', () => renameSectionInline(sectionName));
        actions.appendChild(renameBtn);

        container.appendChild(title);
        container.appendChild(actions);
        return container;
    };


    const loadSetImage = (fileName, target) => {
        if (!fileName || !hasElectron()) return;
        window.electronAPI.loadSetImage(fileName)
            .then(res => {
                if (res && res.success) {
                    const img = document.createElement('img');
                    img.src = res.dataUrl;
                    img.alt = fileName;
                    target.innerHTML = '';
                    target.appendChild(img);
                }
            })
            .catch(err => console.warn('loadSetImage error:', err));
    };

    const createSetCard = (sectionName, setName, setData = {}) => {
        const card = document.createElement('div');
        card.className = 'set-card';
        card.dataset.section = sectionName;
        card.dataset.set = setName;
        const metadata = getSetMetadata(setData);
        const hasMetadataSource = Boolean(setData && typeof setData.metadata === 'object');

        const header = document.createElement('div');
        header.className = 'set-card-header';

        const nameEl = document.createElement('p');
        nameEl.className = 'set-card-name';
        nameEl.textContent = setName;

        const count = document.createElement('span');
        count.className = 'set-card-count';
        const tags = Array.isArray(setData.tags) ? setData.tags : [];
        count.textContent = `${tags.length}タグ`;

        header.appendChild(nameEl);
        header.appendChild(count);

        const thumb = document.createElement('div');
        thumb.className = 'set-card-thumbnail';
        if (setData.image) {
            thumb.textContent = '';
            loadSetImage(setData.image, thumb);
        } else {
            thumb.textContent = '🎨';
        }

        const actions = document.createElement('div');
        actions.className = 'set-card-actions';

        const selectBtn = document.createElement('button');
        selectBtn.className = 'set-btn-primary';
        selectBtn.textContent = '選択';
        selectBtn.addEventListener('click', () => {
            let added = 0;
            if (typeof window.applySetToUI === 'function') {
                // 複数キャラモードのチェック
                const multiCharManager = window.multiCharacterManager;
                const isMultiMode = multiCharManager && multiCharManager.currentMode === 'multi';
                const currentSelectingChar = multiCharManager ? multiCharManager.currentSelectingChar : null;
                
                // 適切なコンテナを選択
                let containerSelector = `#${state.currentCategory}-tags`;
                if (isMultiMode && currentSelectingChar) {
                    containerSelector = `#${state.currentCategory}-char${currentSelectingChar}-tags`;
                }
                
                const beforeCount = document.querySelectorAll(`${containerSelector} .tag, ${containerSelector} .tag-item`).length;
                window.applySetToUI({ tagsByCategory: { [state.currentCategory]: tags } }, 'append', [state.currentCategory]);
                const afterCount = document.querySelectorAll(`${containerSelector} .tag, ${containerSelector} .tag-item`).length;
                added = Math.max(0, afterCount - beforeCount);
            } else {
                // 複数キャラモードのチェック
                const multiCharManager = window.multiCharacterManager;
                const isMultiMode = multiCharManager && multiCharManager.currentMode === 'multi';
                const currentSelectingChar = multiCharManager ? multiCharManager.currentSelectingChar : null;
                
                // 適切なコンテナを選択
                let container = null;
                if (isMultiMode && currentSelectingChar) {
                    container = document.getElementById(`${state.currentCategory}-char${currentSelectingChar}-tags`);
                }
                if (!container) {
                    container = document.getElementById(`${state.currentCategory}-tags`);
                }
                
                if (container) {
                    const existing = new Set(Array.from(container.querySelectorAll('.tag,.tag-item')).map(n => (n.textContent || '').trim().toLowerCase()));
                    tags.forEach(tag => {
                        const normalized = String(tag || '').trim();
                        if (!normalized) return;
                        const key = normalized.toLowerCase();
                        if (existing.has(key)) return;
                        const span = document.createElement('span');
                        span.className = 'tag';
                        span.textContent = normalized;
                        container.appendChild(span);
                        existing.add(key);
                        added += 1;
                    });
                    if (typeof window.updateCategoryCount === 'function') {
                        window.updateCategoryCount(state.currentCategory);
                    }
                }
            }
            notify(`✅ セット「${setName}」を適用しました（${added}/${tags.length}タグ追加）`, 'success');
            closeCategorySetModal();
        });

        const imageBtn = document.createElement('button');
        imageBtn.className = 'set-btn-image';
        imageBtn.textContent = '画像';
        imageBtn.addEventListener('click', () => {
            openImageModal({
                category: state.currentCategory,
                group: state.currentGroup,
                section: sectionName,
                setName,
                setData
            });
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'set-btn-edit';
        editBtn.textContent = '編集';
        editBtn.addEventListener('click', () => {
            openEditModal({
                category: state.currentCategory,
                group: state.currentGroup,
                section: sectionName,
                setName,
                setData
            });
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'set-btn-delete';
        deleteBtn.textContent = '削除';
        deleteBtn.addEventListener('click', () => deleteCategorySet(state.currentCategory, state.currentGroup, sectionName, setName));

        actions.appendChild(selectBtn);
        actions.appendChild(imageBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(header);
        card.appendChild(thumb);

        const metaContainer = document.createElement('div');
        metaContainer.className = 'set-card-meta';

        const shouldShowRating = metadata.rating && (hasMetadataSource || metadata.rating !== DEFAULT_METADATA.rating);
        if (shouldShowRating) {
            const ratingChip = document.createElement('span');
            const ratingClass = metadata.rating.replace(/[^a-z0-9-]/g, '');
            ratingChip.className = `set-meta-chip set-meta-chip--rating rating-${ratingClass}`;
            ratingChip.textContent = metadata.rating.toUpperCase();
            metaContainer.appendChild(ratingChip);
        }

        if (metadata.type) {
            const typeChip = document.createElement('span');
            typeChip.className = 'set-meta-chip set-meta-chip--type';
            typeChip.textContent = metadata.type;
            metaContainer.appendChild(typeChip);
        }

        if (metadata.tags.length) {
            metadata.tags.slice(0, 4).forEach(tag => {
                const tagChip = document.createElement('span');
                tagChip.className = 'set-meta-chip set-meta-chip--tag';
                tagChip.textContent = tag;
                metaContainer.appendChild(tagChip);
            });
            if (metadata.tags.length > 4) {
                const moreChip = document.createElement('span');
                moreChip.className = 'set-meta-chip set-meta-chip--tag set-meta-chip--more';
                moreChip.textContent = `＋${metadata.tags.length - 4}`;
                metaContainer.appendChild(moreChip);
            }
        }

        if (metadata.notes) {
            const notesChip = document.createElement('span');
            notesChip.className = 'set-meta-chip set-meta-chip--notes';
            notesChip.title = metadata.notes;
            notesChip.textContent = '📝';
            metaContainer.appendChild(notesChip);
        }

        if (metaContainer.childElementCount) {
            card.appendChild(metaContainer);
        }

        card.appendChild(actions);

        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openEditModal({
                category: state.currentCategory,
                group: state.currentGroup,
                section: sectionName,
                setName,
                setData
            });
        });

        return card;
    };

    const renderModal = () => {
        const ov = overlay();
        const body = bodyContainer();
        if (!ov || !body) return;

        ov.classList.add('show');
        const titleEl = document.getElementById('categorySetModalTitle');
        if (titleEl) {
            titleEl.textContent = `${state.currentDisplayName} - セット選択`;
        }
        body.innerHTML = '';

        renderFilterBar(body);

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'set-group-tabs';
        body.appendChild(tabsContainer);

        const contentContainer = document.createElement('div');
        contentContainer.id = 'categorySetGroupContent';
        body.appendChild(contentContainer);

        const renderGroupTabs = () => {
            tabsContainer.innerHTML = '';
            const groupNames = Object.keys(state.groups || {});
            groupNames.forEach(groupName => {
                const btn = document.createElement('button');
                btn.className = `set-group-tab${state.currentGroup === groupName ? ' active' : ''}`;
                btn.textContent = groupName;
                btn.addEventListener('click', () => {
                    if (state.currentGroup === groupName) return;
                    applyGroupSelection(groupName);
                    renderGroupTabs();
                    renderGroupContent();
                });
                tabsContainer.appendChild(btn);
            });
        };

        const renderGroupContent = () => {
            contentContainer.innerHTML = '';
            const sectionNames = Object.keys(state.sections || {});
            const totalSets = sectionNames.reduce((count, sectionName) => {
                const sets = state.sections[sectionName];
                if (!sets) return count;
                return count + Object.keys(sets).length;
            }, 0);

            let filteredSectionCount = 0;
            let filteredSetCount = 0;
            const sectionsToRender = [];

            sectionNames.forEach(sectionName => {
                const sets = state.sections[sectionName];
                if (!sets) return;
                const filteredEntries = Object.entries(sets).filter(([setName, setData]) => filterMatches(setName, setData));
                if (!filteredEntries.length) {
                    return;
                }
                filteredSectionCount += 1;
                filteredSetCount += filteredEntries.length;

                const section = document.createElement('section');
                section.className = 'set-section';
                section.appendChild(buildSectionHeader(sectionName));

                const grid = document.createElement('div');
                grid.className = 'sets-grid';

                filteredEntries.forEach(([setName, setData]) => {
                    const card = createSetCard(sectionName, setName, setData);
                    grid.appendChild(card);
                });

                section.appendChild(grid);
                sectionsToRender.push(section);
            });

            updateSetModalSubtitle(sectionNames.length, totalSets, filteredSectionCount, filteredSetCount);

            if (sectionNames.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'set-empty-message';
                empty.innerHTML = `
                    <p style="font-size:1.1em; font-weight:600;">${state.currentDisplayName}に登録されたセットがありません</p>
                    <p>「➕ セット追加」から新しいセットを作成してください。</p>
                `;
                const cta = document.createElement('button');
                cta.className = 'set-btn-primary';
                cta.style.marginTop = '18px';
                cta.textContent = '最初のセットを作成する';
                cta.addEventListener('click', () => {
                    openEditModal({
                        category: state.currentCategory,
                        group: state.currentGroup,
                        section: '',
                        setName: '',
                        setData: { tags: [], metadata: { rating: DEFAULT_METADATA.rating } }
                    });
                });
                empty.appendChild(cta);
                contentContainer.appendChild(empty);
                return;
            }

            if (!sectionsToRender.length) {
                const emptyFilter = document.createElement('div');
                emptyFilter.className = 'set-empty-message';
                emptyFilter.innerHTML = `
                    <p style="font-size:1.1em; font-weight:600;">フィルタ条件に一致するセットがありません</p>
                    <p>フィルタを調整するかリセットしてください。</p>
                `;
                const resetBtn = document.createElement('button');
                resetBtn.className = 'set-btn-primary';
                resetBtn.style.marginTop = '18px';
                resetBtn.textContent = 'フィルタをリセット';
                resetBtn.addEventListener('click', () => resetFilters());
                emptyFilter.appendChild(resetBtn);
                contentContainer.appendChild(emptyFilter);
                return;
            }
            sectionsToRender.forEach(section => contentContainer.appendChild(section));
        };

        renderGroupTabs();
        renderGroupContent();
    };

    const openCategoryModal = async (category) => {
        const displayName = DISPLAY_NAMES[category] || category;
        try {
            await prepareCategoryContext(category);
            renderModal();
        } catch (error) {
            console.error('loadCategorySets error:', error);
            notify(`❌ ${displayName}セットの読み込みに失敗しました`, 'error');
        }
    };

    const pickDefaultSection = (hint) => {
        const sections = Object.keys(state.sections || {});
        if (hint && sections.includes(hint)) return hint;
        if (sections.includes('基本セット')) return '基本セット';
        if (sections.includes('ベースセット')) return 'ベースセット';
        return sections.length ? sections[0] : '';
    };

    const openCreateModalFromClassifier = async ({ category, tags = [], suggestedName = '', sectionHint = '' }) => {
        const normalizedTags = Array.from(
            new Set(
                (Array.isArray(tags) ? tags : [])
                    .map(tag => String(tag || '').trim())
                    .filter(Boolean)
            )
        );

        try {
            await prepareCategoryContext(category);
        } catch (error) {
            console.error('prepareCategoryContext error:', error);
            notify(`❌ ${(DISPLAY_NAMES[category] || category)}セットを読み込めませんでした`, 'error');
            throw error;
        }

        const defaultSection = pickDefaultSection(sectionHint);
        openEditModal({
            category,
            group: state.currentGroup,
            section: '',
            setName: '',
            setData: { tags: normalizedTags, metadata: { rating: DEFAULT_METADATA.rating } }
        });

        const sectionSelect = document.getElementById('editSetSection');
        if (sectionSelect) {
            if (defaultSection) {
                sectionSelect.value = defaultSection;
                updateEditModalStatus({ currentGroup: state.currentGroup, currentSection: '', targetSection: defaultSection });
            } else {
                sectionSelect.value = '__NEW__';
                handleSectionChange();
            }
        }

        if (!defaultSection) {
            const newSectionInput = document.getElementById('newSectionInput');
            if (newSectionInput && !newSectionInput.value.trim()) {
                newSectionInput.value = sectionHint || '基本セット';
            }
        }

        const nameEl = document.getElementById('editSetName');
        if (nameEl) {
            nameEl.value = suggestedName || `${category}_set_${Date.now()}`;
            nameEl.focus();
            nameEl.select();
        }

        return { success: true };
    };

    const closeCategorySetModal = () => {
        const ov = overlay();
        if (ov) ov.classList.remove('show');
        const subtitleEl = document.getElementById('categorySetModalSubtitle');
        if (subtitleEl) subtitleEl.textContent = '';
        closeEditModal();
        state.sections = {};
        state.currentCategory = null;
        state.currentDisplayName = '';
    };

    const renderEditSectionOptions = (currentSection) => {
        const sectionSelect = document.getElementById('editSetSection');
        if (!sectionSelect) return;
        sectionSelect.innerHTML = '';
        Object.keys(state.sections || {}).forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec;
            opt.textContent = sec;
            if (sec === currentSection) opt.selected = true;
            sectionSelect.appendChild(opt);
        });
        const newOpt = document.createElement('option');
        newOpt.value = '__NEW__';
        newOpt.textContent = '＋ 新しいセクション';
        sectionSelect.appendChild(newOpt);
        if (currentSection && sectionSelect.querySelector(`option[value="${currentSection}"]`)) {
            sectionSelect.value = currentSection;
        } else {
            sectionSelect.value = '__NEW__';
        }
    };

    const renderEditGroupOptions = (currentGroup) => {
        const groupSelect = document.getElementById('editSetGroup');
        if (!groupSelect) return;
        groupSelect.innerHTML = '';
        const groups = Object.keys(state.groups || {});
        if (!groups.length) {
            const opt = document.createElement('option');
            opt.value = DEFAULT_GROUP;
            opt.textContent = DEFAULT_GROUP;
            groupSelect.appendChild(opt);
            groupSelect.value = DEFAULT_GROUP;
            return;
        }
        groups.forEach(groupName => {
            const opt = document.createElement('option');
            opt.value = groupName;
            opt.textContent = groupName;
            if (groupName === currentGroup) opt.selected = true;
            groupSelect.appendChild(opt);
        });
        if (!groupSelect.value && groupSelect.options.length) {
            groupSelect.value = groupSelect.options[0].value;
        }
    };

    const createGroup = () => {
        const input = document.getElementById('newGroupInput');
        if (!input) return;
        const value = input.value.trim();
        if (!value) {
            notify('❌ 新しいグループ名を入力してください', 'error');
            return;
        }
        if (state.groups[value]) {
            notify('❌ 同名のグループが既に存在します', 'error');
            return;
        }
        state.groups[value] = { sections: {} };
        applyGroupSelection(value);
        renderEditGroupOptions(value);
        renderEditSectionOptions('');
        updateEditModalStatus({ currentGroup: value, currentSection: state.editingSet?.originalSection, targetSection: '' });
        if (state.currentCategory) {
            syncLocalStorage(state.currentCategory, state.groups);
        }
        input.value = '';
        notify(`✅ グループ「${value}」を追加しました`, 'success');
    };

    const renameGroup = async () => {
        if (!state.currentCategory) return;
        if (!hasElectron() || !window.electronAPI.renameCategoryGroup) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }
        const input = document.getElementById('renameGroupInput');
        const value = (input && input.value.trim()) || '';
        if (!value) {
            notify('❌ 新しいグループ名を入力してください', 'error');
            return;
        }
        if (state.groups[value]) {
            notify('❌ 同名のグループが既に存在します', 'error');
            return;
        }
        try {
            const res = await window.electronAPI.renameCategoryGroup(state.currentCategory, state.currentGroup, value);
            if (res && res.success) {
                notify(res.message || '✅ グループ名を変更しました', 'success');
                if (input) input.value = '';
                state.currentGroup = value;
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.setItem(getGroupPreferenceKey(state.currentCategory), value);
                    } catch {}
                }
                await openCategoryModal(state.currentCategory);
            } else {
                notify(`❌ グループ名変更に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('renameGroup error:', error);
            notify('❌ グループ名変更でエラーが発生しました', 'error');
        }
    };

    const deleteGroup = async () => {
        if (!state.currentCategory) return;
        if (state.currentGroup === DEFAULT_GROUP) {
            notify('⚠️ default グループは削除できません', 'warning');
            return;
        }
        if (!hasElectron() || !window.electronAPI.deleteCategoryGroup) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }
        const totalSets = Object.values(state.sections || {}).reduce(
            (count, sets) => count + Object.keys(sets || {}).length,
            0
        );
        const message = totalSets > 0
            ? `グループ「${state.currentGroup}」内の ${totalSets} セットを削除します。よろしいですか？`
            : `グループ「${state.currentGroup}」を削除します。よろしいですか？`;
        if (!confirm(message)) return;
        try {
            const res = await window.electronAPI.deleteCategoryGroup(state.currentCategory, state.currentGroup);
            if (res && res.success) {
                notify(res.message || '✅ グループを削除しました', 'success');
                state.currentGroup = DEFAULT_GROUP;
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.setItem(getGroupPreferenceKey(state.currentCategory), DEFAULT_GROUP);
                    } catch {}
                }
                await openCategoryModal(state.currentCategory);
            } else {
                notify(`❌ グループ削除に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('deleteGroup error:', error);
            notify('❌ グループ削除でエラーが発生しました', 'error');
        }
    };

    const handleGroupChange = () => {
        const groupSelect = document.getElementById('editSetGroup');
        if (!groupSelect) return;
        const value = groupSelect.value;
        if (!value) return;
        applyGroupSelection(value);
        if (state.editingSet) {
            state.editingSet.group = state.currentGroup;
        }
        renderEditSectionOptions(state.editingSet ? state.editingSet.originalSection : '');
        updateEditModalStatus({ currentGroup: state.currentGroup, currentSection: state.editingSet?.originalSection, targetSection: state.editingSet?.originalSection });
        if (state.currentCategory) {
            syncLocalStorage(state.currentCategory, state.groups);
        }
    };

    const updateEditModalStatus = ({ currentGroup, currentSection, targetSection }) => {
        const groupLabel = document.getElementById('editCurrentGroup');
        if (groupLabel) groupLabel.textContent = currentGroup || state.currentGroup || DEFAULT_GROUP;
        const currentLabel = document.getElementById('editCurrentSection');
        if (currentLabel) currentLabel.textContent = currentSection || '未分類';
        const sectionSelect = document.getElementById('editSetSection');
        if (sectionSelect && targetSection) sectionSelect.value = targetSection;
        const subtitle = document.getElementById('setEditSubtitle');
        if (subtitle && state.currentCategory) {
            const isCreating = !state.editingSet || !state.editingSet.originalName;
            const modeLabel = isCreating ? '新規作成' : '編集';
            const groupName = currentGroup || state.currentGroup || DEFAULT_GROUP;
            const sectionName = currentSection || '未分類';
            const pathLabel = getCategoryJsonPath(state.currentCategory);
            subtitle.textContent = `${modeLabel} ｜ グループ: ${groupName} ｜ セクション: ${sectionName} ｜ 保存先: ${pathLabel}`;
        }
    };

    const openEditModal = ({ category, group = state.currentGroup, section, setName, setData = {} }) => {
        applyGroupSelection(group);
        const activeGroup = state.currentGroup;
        const overlayEl = editOverlay();
        if (!overlayEl) return;

        // 🔍 DEBUG: Log incoming setData metadata
        console.log('🔍 openEditModal - setData:', JSON.stringify(setData, null, 2));
        console.log('🔍 openEditModal - setData.metadata:', JSON.stringify(setData.metadata, null, 2));

        state.editingSet = {
            category,
            originalGroup: group,
            group: activeGroup,
            originalSection: section,
            originalName: setName,
            image: setData.image || '',
            tags: Array.isArray(setData.tags) ? setData.tags : [],
            metadata: cloneMetadata(setData.metadata)
        };

        // 🔍 DEBUG: Log state.editingSet.metadata after cloning
        console.log('🔍 openEditModal - state.editingSet.metadata:', JSON.stringify(state.editingSet.metadata, null, 2));

        const nameEl = document.getElementById('editSetName');
        if (nameEl) {
            nameEl.value = setName || '';
            nameEl.focus();
            nameEl.select();
        }
        const tagsEl = document.getElementById('editSetTags');
        if (tagsEl) tagsEl.value = state.editingSet.tags.join(', ');
        const newSectionInput = document.getElementById('newSectionInput');
        if (newSectionInput) newSectionInput.value = '';

        const metaTagsEl = document.getElementById('editMetaTags');
        if (metaTagsEl) metaTagsEl.value = state.editingSet.metadata.tags.join(', ');
        const metaTypeEl = document.getElementById('editMetaType');
        if (metaTypeEl) metaTypeEl.value = state.editingSet.metadata.type || '';
        const metaRatingEl = document.getElementById('editMetaRating');
        if (metaRatingEl) metaRatingEl.value = state.editingSet.metadata.rating || DEFAULT_METADATA.rating;
        const metaNotesEl = document.getElementById('editMetaNotes');
        if (metaNotesEl) metaNotesEl.value = state.editingSet.metadata.notes || '';

        // 🔍 DEBUG: Log what values were set in DOM fields
        console.log('🔍 openEditModal - DOM field values:', {
            metaTags: metaTagsEl?.value,
            metaType: metaTypeEl?.value,
            metaRating: metaRatingEl?.value,
            metaNotes: metaNotesEl?.value
        });

        renderEditGroupOptions(activeGroup);
        renderEditSectionOptions(section);
        updateEditModalStatus({ currentGroup: activeGroup, currentSection: section, targetSection: section });

        const saveBtn = document.getElementById('editSetSaveBtn');
        if (saveBtn) {
            saveBtn.textContent = setName ? 'セット更新' : 'セット作成';
        }

        overlayEl.classList.add('show');
        document.body.classList.add('modal-open');
    };

    const closeEditModal = () => {
        const overlayEl = editOverlay();
        if (overlayEl) overlayEl.classList.remove('show');
        document.body.classList.remove('modal-open');
        state.editingSet = null;

        const subtitle = document.getElementById('setEditSubtitle');
        if (subtitle) subtitle.textContent = '';
    };

    const saveEditedSet = async () => {
        if (!state.editingSet) return;
        if (!hasElectron()) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }

        // 🔐 Trial版：新規セット登録禁止
        const isNewSet = !state.editingSet.originalName;
        if (isNewSet) {
            try {
                const licenseInfo = await window.electronAPI.getLicenseInfo();
                if (licenseInfo.success && licenseInfo.licenseInfo.licenseType === 'trial') {
                    notify('❌ Trial版では新規セットの登録はできません。既存のセットの編集のみ可能です。', 'error');
                    return;
                }
            } catch (error) {
                console.error('ライセンス確認エラー:', error);
                // ライセンス確認失敗時は処理を続行（後方互換性）
            }
        }

        const name = document.getElementById('editSetName').value.trim();
        const sectionSelect = document.getElementById('editSetSection');
        let section = sectionSelect ? sectionSelect.value : state.editingSet.originalSection;
        const tagsText = document.getElementById('editSetTags').value.trim();

        if (!name) {
            notify('❌ セット名を入力してください', 'error');
            return;
        }
        if (!tagsText) {
            notify('❌ タグを入力してください', 'error');
            return;
        }

        if (section === '__NEW__') {
            const newSectionInput = document.getElementById('newSectionInput');
            const value = (newSectionInput && newSectionInput.value.trim()) || '';
            if (!value) {
                notify('❌ 新しいセクション名を入力してください', 'error');
                return;
            }
            if (state.sections[value]) {
                notify('❌ 同名のセクションが既に存在します', 'error');
                return;
            }
            section = value;
        }

        const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
        if (!tags.length) {
            notify('❌ 有効なタグを入力してください', 'error');
            return;
        }

        // 🔍 DEBUG: Log state before collecting metadata
        console.log('🔍 saveEditedSet - state.editingSet.metadata (before collect):', JSON.stringify(state.editingSet.metadata, null, 2));

        const metadata = collectMetadataFromModal();

        // 🔍 DEBUG: Log collected metadata
        console.log('🔍 saveEditedSet - metadata (after collect):', JSON.stringify(metadata, null, 2));

        state.editingSet.metadata = metadata;

        const { category, originalGroup, originalSection, originalName, image } = state.editingSet;
        const targetGroup = state.currentGroup;

        // 🔍 DEBUG: Log what will be sent to backend
        console.log('🔍 saveEditedSet - Sending to backend:', {
            category,
            targetGroup,
            section,
            name,
            tags,
            image: image || '',
            metadata: JSON.stringify(metadata, null, 2)
        });

        try {
            if (originalName && (originalName !== name || originalSection !== section || (originalGroup || targetGroup) !== targetGroup)) {
                await window.electronAPI.deleteCategorySet(category, originalGroup || targetGroup, originalSection, originalName);
            }

            const res = await window.electronAPI.saveCategorySet(category, targetGroup, section, name, tags, image || '', metadata);
            if (res && res.success) {
                notify(`✅ セット「${name}」を保存しました`, 'success');
                closeEditModal();
                openCategoryModal(category);
            } else {
                notify(`❌ セット保存に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('saveCategorySet error:', error);
            notify('❌ セット保存でエラーが発生しました', 'error');
        }
    };

    const createSection = () => {
        const input = document.getElementById('newSectionInput');
        if (!input) return;
        const value = input.value.trim();
        if (!value) {
            notify('❌ 新しいセクション名を入力してください', 'error');
            return;
        }
        if (state.sections[value]) {
            notify('❌ 同名のセクションが既に存在します', 'error');
            return;
        }
        state.sections[value] = {};
        if (state.groups[state.currentGroup]) {
            state.groups[state.currentGroup].sections = state.sections;
        }
        renderEditSectionOptions(value);
        updateEditModalStatus({ currentGroup: state.currentGroup, currentSection: state.editingSet?.originalSection, targetSection: value });
        input.value = '';
        if (state.currentCategory) {
            syncLocalStorage(state.currentCategory, state.groups);
        }
        notify(`✅ セクション「${value}」を追加しました`, 'success');
    };

    const handleSectionChange = () => {
        const select = document.getElementById('editSetSection');
        if (!select) return;
        const value = select.value;
        if (value === '__NEW__') {
            const input = document.getElementById('newSectionInput');
            if (input) input.focus();
            return;
        }
        updateEditModalStatus({ currentGroup: state.currentGroup, currentSection: state.editingSet?.originalSection, targetSection: value });
    };

    const renameSection = async () => {
        if (!state.currentCategory) return;
        if (!hasElectron() || !window.electronAPI.renameCategorySection) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }
        const select = document.getElementById('editSetSection');
        const renameInput = document.getElementById('renameSectionInput');
        const targetSection = (() => {
            if (select && select.value && select.value !== '__NEW__') {
                return select.value;
            }
            return state.editingSet?.originalSection || '';
        })();
        if (!targetSection) {
            notify('⚠️ 変更対象のセクションが選択されていません', 'warning');
            return;
        }
        const newName = (renameInput && renameInput.value.trim()) || '';
        if (!newName) {
            notify('❌ 新しいセクション名を入力してください', 'error');
            return;
        }
        if (state.sections[newName] && newName !== targetSection) {
            notify('❌ 同名のセクションが既に存在します', 'error');
            return;
        }
        try {
            const res = await window.electronAPI.renameCategorySection(
                state.currentCategory,
                state.currentGroup,
                targetSection,
                newName
            );
            if (res && res.success) {
                notify(res.message || `✅ セクション名を「${targetSection}」から「${newName}」に変更しました`, 'success');
                if (renameInput) renameInput.value = '';

                applySectionRenameLocally(targetSection, newName);

                renderEditSectionOptions(state.editingSet ? state.editingSet.originalSection : newName);
                updateEditModalStatus({
                    currentGroup: state.currentGroup,
                    currentSection: state.editingSet?.originalSection || newName,
                    targetSection: newName
                });

                if (select) {
                    select.value = newName;
                }

                if (state.currentCategory) {
                    syncLocalStorage(state.currentCategory, state.groups);
                }
                renderModal();
            } else {
                notify(`❌ セクション名変更に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('renameSection error:', error);
            notify('❌ セクション名変更でエラーが発生しました', 'error');
        }
    };

    let pendingSectionRename = null;
    let renameDialogAppliedBodyLock = false;

    const renameOverlay = () => document.getElementById('sectionRenameOverlay');
    const renameDialogInput = () => document.getElementById('sectionRenameDialogInput');
    const renameDialogError = () => document.getElementById('sectionRenameDialogError');

    const showRenameDialogError = (message) => {
        const el = renameDialogError();
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    };

    const openSectionRenameDialog = (sectionName) => {
        pendingSectionRename = sectionName;
        const overlayEl = renameOverlay();
        if (overlayEl) overlayEl.classList.add('show');
        const inputEl = renameDialogInput();
        if (inputEl) {
            inputEl.value = sectionName || '';
            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 0);
        }
        showRenameDialogError('');
        if (!document.body.classList.contains('modal-open')) {
            document.body.classList.add('modal-open');
            renameDialogAppliedBodyLock = true;
        }
    };

    const closeSectionRenameDialog = () => {
        const overlayEl = renameOverlay();
        if (overlayEl) overlayEl.classList.remove('show');
        pendingSectionRename = null;
        showRenameDialogError('');
        if (renameDialogAppliedBodyLock) {
            document.body.classList.remove('modal-open');
            renameDialogAppliedBodyLock = false;
        }
    };

    const confirmSectionRenameDialog = async () => {
        if (!state.currentCategory || !pendingSectionRename) return;
        if (!hasElectron() || !window.electronAPI.renameCategorySection) {
            showRenameDialogError('❌ Electron APIが利用できません');
            return;
        }
        const inputEl = renameDialogInput();
        const newName = (inputEl && inputEl.value.trim()) || '';
        if (!newName) {
            showRenameDialogError('❌ 新しいセクション名を入力してください');
            return;
        }
        const currentName = pendingSectionRename;
        if (newName === currentName) {
            showRenameDialogError('⚠️ 同じ名前が入力されています');
            return;
        }
        if (state.sections[newName]) {
            showRenameDialogError('❌ 同名のセクションが既に存在します');
            return;
        }
        try {
            const res = await window.electronAPI.renameCategorySection(
                state.currentCategory,
                state.currentGroup,
                currentName,
                newName
            );
            if (res && res.success) {
                notify(res.message || `✅ セクション名を「${currentName}」から「${newName}」に変更しました`, 'success');
                applySectionRenameLocally(currentName, newName);
                if (state.currentCategory) {
                    syncLocalStorage(state.currentCategory, state.groups);
                }
                closeSectionRenameDialog();
                renderModal();
            } else {
                showRenameDialogError(`❌ セクション名変更に失敗しました: ${(res && res.error) || ''}`);
            }
        } catch (error) {
            console.error('renameSectionInline error:', error);
            showRenameDialogError('❌ セクション名変更でエラーが発生しました');
        }
    };

    const renameSectionInline = (sectionName) => {
        const currentName = String(sectionName || '').trim();
        if (!currentName) {
            notify('⚠️ 変更対象のセクションが無効です', 'warning');
            return;
        }
        openSectionRenameDialog(currentName);
    };

    const deleteSection = async () => {
        if (!state.currentCategory) return;
        const select = document.getElementById('editSetSection');
        if (!select) return;
        const target = select.value === '__NEW__' ? state.editingSet.originalSection : select.value;
        if (!target) {
            notify('⚠️ 削除対象のセクションが選択されていません', 'warning');
            return;
        }
        if (!hasElectron() || !window.electronAPI.deleteCategorySection) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }
        if (!confirm(`セクション「${target}」内の全セットを削除します。よろしいですか？`)) return;
        try {
            const res = await window.electronAPI.deleteCategorySection(state.currentCategory, state.currentGroup, target);
            if (res && res.success) {
                notify(`✅ セクション「${target}」を削除しました`, 'success');
                closeEditModal();
                openCategoryModal(state.currentCategory);
            } else {
                notify(`❌ セクション削除に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('deleteCategorySection error:', error);
            notify('❌ セクション削除でエラーが発生しました', 'error');
        }
    };

    const deleteCategorySet = async (category, group = state.currentGroup, section, setName) => {
        if (!hasElectron()) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }
        if (!confirm(`セット「${setName}」を削除しますか？`)) return;

        try {
            const res = await window.electronAPI.deleteCategorySet(category, group, section, setName);
            if (res && res.success) {
                notify(`✅ セット「${setName}」を削除しました`, 'success');
                openCategoryModal(category);
            } else {
                notify(`❌ セット削除に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('deleteCategorySet error:', error);
            notify('❌ セット削除でエラーが発生しました', 'error');
        }
    };

    const openImageModal = async ({ category, group = state.currentGroup, section, setName, setData = {} }) => {
        applyGroupSelection(group);
        const activeGroup = state.currentGroup;
        const ov = imageOverlay();
        if (!ov) return;

        state.editingSet = {
            category,
            originalGroup: group,
            group: activeGroup,
            originalSection: section,
            originalName: setName,
            image: setData.image || '',
            tags: Array.isArray(setData.tags) ? setData.tags : []
        };
        state.pendingImageData = null;

        refreshBasePathDisplays();

        const preview = document.getElementById('setImagePreview');
        const currentContainer = document.getElementById('currentImageContainer');
        const currentName = document.getElementById('currentImageName');
        const titleEl = document.getElementById('imageModalTitle');
        const removeBtn = document.getElementById('removeImageBtn');
        if (titleEl) titleEl.textContent = `画像登録・${setName || '新規セット'}`;
        if (preview) preview.src = '';
        if (currentContainer) currentContainer.style.display = 'none';
        if (currentName) currentName.textContent = '';
        if (removeBtn) removeBtn.disabled = !setData.image;

        if (setData.image && hasElectron()) {
            try {
                const res = await window.electronAPI.loadSetImage(setData.image);
                if (res && res.success && preview) {
                    preview.src = res.dataUrl;
                    if (currentContainer && currentName) {
                        currentName.textContent = setData.image;
                        currentContainer.style.display = 'block';
                    }
                    if (removeBtn) removeBtn.disabled = false;
                }
            } catch (error) {
                console.warn('loadSetImage error:', error);
            }
        }

        ov.classList.add('show');
    };

    const closeImageModal = () => {
        const ov = imageOverlay();
        if (ov) ov.classList.remove('show');
        state.pendingImageData = null;
        state.editingSet = null;
        const preview = document.getElementById('setImagePreview');
        if (preview) preview.src = '';
        const currentContainer = document.getElementById('currentImageContainer');
        if (currentContainer) currentContainer.style.display = 'none';
    };

    const handleImageFile = (file) => {
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
            notify('❌ PNG / JPG / JPEG / WEBP のみ対応しています', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            state.pendingImageData = e.target.result;
            const preview = document.getElementById('setImagePreview');
            const currentContainer = document.getElementById('currentImageContainer');
            const currentName = document.getElementById('currentImageName');
            const removeBtn = document.getElementById('removeImageBtn');
            if (preview) {
                preview.src = state.pendingImageData;
            }
            if (currentContainer) currentContainer.style.display = 'block';
            if (currentName) currentName.textContent = 'アップロード予定の画像';
            if (removeBtn) removeBtn.disabled = true;
        };
        reader.readAsDataURL(file);
    };

    const saveSetImage = async () => {
        if (!state.editingSet) return;
        if (!state.pendingImageData) {
            notify('❌ 画像が選択されていません', 'error');
            return;
        }
        if (!hasElectron()) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }

        const { category, group, originalSection, originalName, tags } = state.editingSet;
        try {
            const upload = await window.electronAPI.saveSetImage(
                category,
                group || state.currentGroup,
                originalSection,
                originalName || `set-${Date.now()}`,
                state.pendingImageData
            );
            if (!upload || !upload.success) {
                notify(`❌ 画像保存に失敗しました: ${(upload && upload.error) || ''}`, 'error');
                return;
            }

            await window.electronAPI.saveCategorySet(
                category,
                group || state.currentGroup,
                originalSection,
                originalName,
                tags || [],
                upload.fileName,
                state.editingSet.metadata || { ...DEFAULT_METADATA }
            );
            notify('✅ 画像を保存しました', 'success');
            closeImageModal();
            openCategoryModal(category);
        } catch (error) {
            console.error('saveSetImage error:', error);
            notify('❌ 画像保存中にエラーが発生しました', 'error');
        }
    };

    const removeSetImage = async () => {
        if (!state.editingSet || !state.editingSet.image) {
            notify('⚠️ 登録済み画像がありません', 'warning');
            return;
        }
        if (!hasElectron() || !window.electronAPI.removeSetImage) {
            notify('❌ Electron APIが利用できません', 'error');
            return;
        }
        if (!confirm('登録済み画像を削除しますか？')) return;
        const { category, group, originalSection, originalName } = state.editingSet;
        try {
            const res = await window.electronAPI.removeSetImage(
                category,
                group || state.currentGroup,
                originalSection,
                originalName
            );
            if (res && res.success) {
                state.editingSet.image = '';
                notify('✅ 登録画像を削除しました', 'success');
                closeImageModal();
                openCategoryModal(category);
            } else {
                notify(`❌ 画像削除に失敗しました: ${(res && res.error) || ''}`, 'error');
            }
        } catch (error) {
            console.error('removeSetImage error:', error);
            notify('❌ 画像削除でエラーが発生しました', 'error');
        }
    };

    const bindSidebarButtons = () => {
        const importBtn = document.getElementById('sidebarImportSetsBtn');
        if (importBtn) {
            importBtn.addEventListener('click', async () => {
                if (!hasElectron()) {
                    notify('❌ Electron APIが利用できません', 'error');
                    return;
                }
                try {
                    const res = await window.electronAPI.importSetsFromJSON();
                    if (res && res.success) {
                        notify(`✅ ${res.imported || 0}個のセットをインポートしました`, 'success');
                    } else if (res && res.error !== 'キャンセルされました') {
                        notify(`❌ インポートに失敗しました: ${(res && res.error) || ''}`, 'error');
                    }
                } catch (error) {
                    console.error('importSetsFromJSON error:', error);
                    notify('❌ インポート中にエラーが発生しました', 'error');
                }
            });
        }

        const exportBtn = document.getElementById('sidebarExportSetsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                if (!hasElectron()) {
                    notify('❌ Electron APIが利用できません', 'error');
                    return;
                }
                try {
                    const res = await window.electronAPI.exportAllSets();
                    if (res && res.success) {
                        notify(`✅ ${res.totalSets || 0}個のセットをエクスポートしました\n保存先: ${res.file}`, 'success');
                    } else if (res && res.error !== 'キャンセルされました') {
                        notify(`❌ エクスポートに失敗しました: ${(res && res.error) || ''}`, 'error');
                    }
                } catch (error) {
                    console.error('exportAllSets error:', error);
                    notify('❌ エクスポート中にエラーが発生しました', 'error');
                }
            });
        }
    };

    const initImageDropZone = () => {
        const dropZone = document.getElementById('imageDropZone');
        const fileInput = document.getElementById('imageFileInput');
        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (file) handleImageFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
        });
    };

    const initOverlayInteractions = () => {
        const ov = overlay();
        if (ov) {
            ov.addEventListener('click', (e) => {
                if (e.target === ov) closeCategorySetModal();
            });
        }
        const editOv = editOverlay();
        if (editOv) {
            editOv.addEventListener('click', (e) => {
                if (e.target === editOv) closeEditModal();
            });
        }
        const imgOv = imageOverlay();
        if (imgOv) {
            imgOv.addEventListener('click', (e) => {
                if (e.target === imgOv) closeImageModal();
            });
        }

        const sectionSelect = document.getElementById('editSetSection');
        if (sectionSelect) {
            sectionSelect.addEventListener('change', handleSectionChange);
        }
        const groupSelect = document.getElementById('editSetGroup');
        if (groupSelect) {
            groupSelect.addEventListener('change', handleGroupChange);
        }
        const createSectionBtn = document.getElementById('createSectionBtn');
        if (createSectionBtn) {
            createSectionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                createSection();
            });
        }
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                createGroup();
            });
        }
        const renameGroupBtn = document.getElementById('renameGroupBtn');
        if (renameGroupBtn) {
            renameGroupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                renameGroup();
            });
        }
        const deleteGroupBtn = document.getElementById('deleteGroupBtn');
        if (deleteGroupBtn) {
            deleteGroupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                deleteGroup();
            });
        }
        const deleteSectionBtn = document.getElementById('deleteSectionBtn');
        if (deleteSectionBtn) {
            deleteSectionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                deleteSection();
            });
        }
        const renameSectionBtn = document.getElementById('renameSectionBtn');
        if (renameSectionBtn) {
            renameSectionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                renameSection();
            });
        }
        const renameDialogConfirm = document.getElementById('sectionRenameConfirmBtn');
        if (renameDialogConfirm) {
            renameDialogConfirm.addEventListener('click', (e) => {
                e.preventDefault();
                confirmSectionRenameDialog();
            });
        }
        const renameDialogCancel = document.getElementById('sectionRenameCancelBtn');
        if (renameDialogCancel) {
            renameDialogCancel.addEventListener('click', (e) => {
                e.preventDefault();
                closeSectionRenameDialog();
            });
        }
        const renameOverlayEl = renameOverlay();
        if (renameOverlayEl) {
            renameOverlayEl.addEventListener('click', (e) => {
                if (e.target === renameOverlayEl) closeSectionRenameDialog();
            });
        }
        const renameDialogInputEl = renameDialogInput();
        if (renameDialogInputEl) {
            renameDialogInputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmSectionRenameDialog();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeSectionRenameDialog();
                }
            });
        }
        const removeImageBtn = document.getElementById('removeImageBtn');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                removeSetImage();
            });
        }
        const saveBtn = document.getElementById('editSetSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                saveEditedSet();
            });
        }
        const cancelBtn = document.getElementById('editSetCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeEditModal();
            });
        }
        const closeBtn = document.getElementById('setEditCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeEditModal();
            });
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        bindSidebarButtons();
        initImageDropZone();
        initOverlayInteractions();
        refreshBasePathDisplays();
    });

    window.categorySets = {
        openCategoryModal,
        closeCategorySetModal,
        openEditModal,
        openCreateModalFromClassifier,
        closeEditModal,
        saveEditedSet,
        openImageModal,
        closeImageModal,
        saveSetImage,
        deleteCategorySet,
        removeSetImage,
        renameGroup,
        deleteGroup,
        renameSection
    };

    window.showCategoryModal = openCategoryModal;
})();
