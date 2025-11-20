/**
 * Danbooru Tag Fetcher - Phase 10
 *
 * Danbooru Tag APIから人気タグを取得し、共通辞書に統合する
 * API Documentation: https://danbooru.donmai.us/wiki_pages/api%3Atags
 */

const https = require('https');

/**
 * Danbooru Tag APIからタグを取得
 * @param {number} category - カテゴリコード (0=General, 1=Artist, 3=Copyright, 4=Character, 5=Meta)
 * @param {number} limit - 取得タグ数上限（最大1000）
 * @param {number} minPostCount - 最小投稿数（人気タグフィルタ）
 * @returns {Promise<Array>} - タグ配列
 */
async function fetchDanbooruTags(category = 0, limit = 1000, minPostCount = 100) {
    return new Promise((resolve, reject) => {
        const url = `https://danbooru.donmai.us/tags.json?search[category]=${category}&limit=${limit}&search[order]=count`;

        console.log(`📡 Danbooru API リクエスト: Category ${category}, Limit ${limit}`);

        const options = {
            headers: {
                'User-Agent': 'PromptClassifier/3.0 MetaCard (Educational Use)',
                'Accept': 'application/json'
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const tags = JSON.parse(data);

                    // 投稿数でフィルタリング + 整形
                    const filteredTags = tags
                        .filter(tag => tag.post_count >= minPostCount)
                        .map(tag => ({
                            name: tag.name,
                            postCount: tag.post_count,
                            category: tag.category
                        }))
                        .sort((a, b) => b.postCount - a.postCount);

                    console.log(`✅ 取得成功: ${filteredTags.length}タグ（投稿数${minPostCount}件以上）`);
                    resolve(filteredTags);
                } catch (error) {
                    reject(new Error(`JSON Parse Error: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`HTTP Request Error: ${error.message}`));
        });
    });
}

/**
 * カテゴリマッピング（Danbooru → MetaCard）
 */
const CATEGORY_MAPPING = {
    0: {
        metacardCategory: 'general',
        description: 'General tags (poses, objects, actions)',
        dictionaryFiles: ['body.md', 'poseemotion.md', 'other.md']
    },
    1: {
        metacardCategory: 'artist',
        description: 'Artist tags (style references)',
        dictionaryFiles: ['quality.md']
    },
    3: {
        metacardCategory: 'copyright',
        description: 'Copyright/Series tags',
        dictionaryFiles: ['other.md']
    },
    4: {
        metacardCategory: 'character',
        description: 'Character tags',
        dictionaryFiles: ['face.md', 'people.md']
    },
    5: {
        metacardCategory: 'meta',
        description: 'Meta tags (quality, resolution)',
        dictionaryFiles: ['quality.md']
    }
};

/**
 * すべての主要カテゴリからタグを取得
 * @param {number} limitPerCategory - 各カテゴリの取得上限
 * @returns {Promise<Object>} - カテゴリ別タグ集
 */
async function fetchAllCategories(limitPerCategory = 500) {
    console.log('🚀 全カテゴリタグ取得開始...\n');

    const results = {};

    // レート制限対策: 各リクエスト間に1秒待機
    for (const [categoryCode, info] of Object.entries(CATEGORY_MAPPING)) {
        try {
            const tags = await fetchDanbooruTags(
                parseInt(categoryCode),
                limitPerCategory,
                100 // 投稿数100件以上のタグのみ
            );

            results[info.metacardCategory] = {
                tags: tags,
                count: tags.length,
                description: info.description
            };

            console.log(`  ✅ ${info.metacardCategory}: ${tags.length}タグ取得`);

            // レート制限対策（1秒待機）
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`  ❌ ${info.metacardCategory}: ${error.message}`);
            results[info.metacardCategory] = {
                tags: [],
                count: 0,
                error: error.message
            };
        }
    }

    console.log('\n✅ 全カテゴリ取得完了');
    return results;
}

/**
 * テスト実行（このファイルを直接実行した場合）
 */
if (require.main === module) {
    console.log('🧪 Danbooru Tag Fetcher テスト実行\n');

    fetchAllCategories(100)
        .then(results => {
            console.log('\n📊 取得結果サマリー:');
            for (const [category, data] of Object.entries(results)) {
                console.log(`  - ${category}: ${data.count}タグ`);
                if (data.tags.length > 0) {
                    console.log(`    Top 5: ${data.tags.slice(0, 5).map(t => t.name).join(', ')}`);
                }
            }
        })
        .catch(error => {
            console.error('❌ テスト失敗:', error);
        });
}

module.exports = {
    fetchDanbooruTags,
    fetchAllCategories,
    CATEGORY_MAPPING
};
