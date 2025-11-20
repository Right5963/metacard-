#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml
from datetime import datetime

# 除外するタグ（永久BAN級）
PERMANENT_BAN_TAGS = [
    # 白い液体系（ラベル付け確定）
    'cum', 'bukkake', 'facial', 'semen', 'ejaculation',

    # 性行為系（永久センシティブ確定）
    'sex', 'sexual intercourse', 'penetration', 'insertion',

    # 一人称の手系（危険度高）
    'pov hands', 'hand on breast pov', 'groping pov',
]

# wetは透けすぎるので除外（ユーザー要求）
WET_TAGS = [
    'wet', 'wet clothes', 'wet shirt', 'wet swimsuit',
    'pool', 'poolside', 'swimming pool', 'in pool', 'pool ladder',
    'beach', 'ocean', 'sea', 'shore', 'seaside', 'water', 'horizon'
]

# キャラに合わないタグ
CHARACTER_MISMATCH_TAGS = [
    'one side up',
]

# バズらない単調なタグ（ストーリー性ゼロ）
BORING_TAGS = [
    # 単調な立ち・座りのみ（動きなし）
    # 注意：standing upやgetting upは除外しない（動きがある）
]

# バズる要素のキーワード
BUZZ_KEYWORDS = {
    # 動き
    'motion', 'dynamic', 'movement', 'turning', 'climbing', 'rising', 'getting up', 'standing up',
    'stretching', 'reaching', 'bending', 'leaning', 'bent over',
    # 妄想誘発
    'about to', 'almost', 'barely', 'slip', 'slipping', 'falling', 'dropping', 'untied', 'untying',
    'malfunction', 'accident', 'precarious', 'loose', 'adjusting', 'fixing', 'holding down',
    'catching', 'trying', 'pulling', 'pushing', 'grabbing', 'holding',
    # 反応・感情
    'surprised', 'shocked', 'embarrassed', 'panic', 'desperate', 'caught', 'flustered',
    'shy', 'bashful', 'worried', 'nervous',
    # エロ要素
    'cleavage', 'spread legs', 'legs apart', 'all fours', 'hand bra', 'covering',
    'seductive', 'inviting', 'provocative', 'teasing',
    'beckoning', 'presenting', 'displaying', 'squeezing', 'lifting', 'lift',
    'wardrobe', 'bursting', 'strap break', 'towel', 'wind', 'hair',
}

BUZZ_POSES = {
    'sitting spread', 'spread legs', 'legs apart', 'bent over', 'on back', 'lying', 'lie down',
    'all fours', 'kneeling', 'squatting', 'crouching', 'on bed', 'on stomach',
    'cowboy shot', 'from above', 'from below', 'dutch angle', 'looking back',
}

def has_buzz_element(tag_string):
    """バズる要素があるかチェック"""
    tag_lower = tag_string.lower()

    for keyword in BUZZ_KEYWORDS:
        if keyword in tag_lower:
            return True

    for pose in BUZZ_POSES:
        if pose in tag_lower:
            return True

    return False

def is_boring_expression_only(tag_string):
    """表情だけの単調プロンプトを検出"""
    tags = [tag.strip().lower() for tag in tag_string.split(',')]

    # 表情系ワード
    expression_words = {'smile', 'blush', 'closed mouth', 'open mouth', 'nose blush'}
    # 単調ポーズワード
    static_words = {'standing', 'sitting'}

    # 全てのタグが表情系or単調ポーズのみ = 単調
    all_tags_set = set(tags)
    if all_tags_set and all_tags_set.issubset(expression_words | static_words):
        return True

    return False

EXCLUDE_TAGS = PERMANENT_BAN_TAGS + WET_TAGS + CHARACTER_MISMATCH_TAGS + BORING_TAGS

# 🔥 ギリギリのライン攻めプロンプト
# 記事から学んだポイント:
# 1. 「股が写らないように開脚」= 露出回避しつつエロ
# 2. 「谷間メイン」= 横乳・下乳より通りやすい
# 3. 「ランジェリーの紐が解けてる」= Wardrobe Malfunction
# 4. いいね率10%を維持できる = エロ要素強め

EXTREME_EDGE_PROMPTS = {
    "clothing": [
        # 💥 Wardrobe Malfunction系（記事の核心）
        "Wardrobe Malfunction bikini, untied bikini, strap break, bursting breasts, Outfit Disconnect bikini",
        "Wardrobe Malfunction lingerie, untied lingerie, strap break, bursting breasts, Outfit Disconnect lingerie",
        "bikini slip, bikini malfunction, untying bikini, side tie bikini untied",
        "lingerie slip, bra untied, strap broken, clothing accident",

        # 💥 今にも系（妄想を誘う）
        "bikini about to slip, barely holding, precarious bikini",
        "adjusting bikini, fixing bikini, holding bikini top",
        "skirt lift wind, holding down skirt, windy upskirt",
        "towel slip, towel drop, catching towel, towel falling",

        # 💥 谷間特化（通りやすい）
        "deep cleavage focus, plunging neckline, extreme cleavage",
        "cleavage cutout, open chest, revealing cleavage",
        "micro bikini, string bikini, barely covered",

        # 💥 柄・デザイン系（差別化）
        "Leopard print lingerie, animal print bikini",
        "Strawberry print lingerie, strawberry bra, fruit pattern",
        "lace lingerie, sheer lingerie, see through lingerie",
    ],

    "poseemotion": [
        # 💥 ビキニバースト応用（記事実証済み）
        "hand bra, Crossing arms, covering breasts",
        "all fours, dynamic pose, motion lines",
        "on stomach, air mattress, dutch angle",
        "cowboy shot, lie down, on bed, from above",

        # 💥 妄想ポーズ（1秒後が見える）
        "climbing ladder, pool ladder, from above, looking at viewer",
        "standing up, getting up, rising from bed",
        "stretching, arms up, arching back, yawning",
        "turning around, looking back, over shoulder, surprised",

        # 💥 誘いポーズ（シチュ重視）
        "inviting pose, beckoning, come hither",
        "lying seductive, on back spread legs, supine",
        "sitting spread legs, M字開脚, legs apart",
        "bent over, leaning forward, presenting",

        # 💥 表情（ストーリー性）
        "embarrassed, blushing, surprised, shocked",
        "disappointed, pouting, sulking",
        "seductive gaze, bedroom eyes, half-closed eyes",
        "teasing smile, smirk, playful expression",
    ],

    "backgrounds": [
        # 💥 シチュ重視（記事実証済み）
        "luxury hotel lobby, hotel room, love hotel",
        "shopping floor, department store, indoor, boutique",
        "on bed, bedroom, messy bed, rumpled sheets",
        "changing room, locker room, fitting room",

        # 💥 バカンス系
        "side table, drink, reclining chair, resort",
        "park, garden, tree, mountain, trekking, stone",

        # 💥 日常エロ系
        "living room, home, casual setting",
        "after bath, bathroom, steam, bathtub",
        "gym, locker room, sports facility",
    ],

    "angle": [
        # 💥 妄想アングル
        "from above, cowboy shot, looking down",
        "dutch angle, dynamic angle, tilted",
        "from below, upskirt angle, low angle",
        "close up, cleavage focus, breast focus",
    ],

    "sexual": [
        # 💥 状況エロ（妄想重視）
        "about to start, anticipation, moment before",
        "just woke up, drowsy, sleepy, yawn",
        "inviting, tempting, seductive situation",
        "intimate moment, private moment, alone time",

        # 💥 Wardrobe系強化
        "wardrobe malfunction, clothing accident, wardrobe failure",
        "accidental exposure, almost露出, barely covered",
        "clothing slip, strap break, zipper down",

        # 💥 妄想ワード
        "inner thigh, V sign, peace sign",
        "oily skin, glistening, shiny skin",
        "motion lines, movement, dynamic",
    ],
}

def filter_tags(tag_string):
    """タグ文字列から除外タグを削除"""
    # 単調プロンプトチェック
    if is_boring_expression_only(tag_string):
        return ''  # 空文字列を返して除外

    tags = [tag.strip() for tag in tag_string.split(',')]
    filtered_tags = []

    for tag in tags:
        tag_lower = tag.lower()
        if not any(exclude.lower() in tag_lower for exclude in EXCLUDE_TAGS):
            filtered_tags.append(tag)

    return ', '.join(filtered_tags)

def load_yaml(file_path):
    """YAMLファイルを読み込み、既存データもフィルタリング"""
    print(f"読み込み中: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    # 既存データ全体をフィルタリング
    print("既存データをクリーンアップ中...")
    filtered_data = {}
    removed_count = 0
    buzz_filtered_count = 0

    for category, items in data.items():
        filtered_data[category] = []
        for item in items:
            filtered = filter_tags(item)

            # sexual カテゴリのみバズる要素必須（単体で効果が必要）
            # clothing は組み合わせ素材なのでフィルタリングしない
            if category.lower() == 'sexual':
                if filtered and not has_buzz_element(filtered):
                    buzz_filtered_count += 1
                    filtered = ''  # バズる要素なし = 除外

            if filtered and filtered != item:
                removed_count += 1
            if filtered:
                filtered_data[category].append(filtered)

    print(f"  除外タグを含む項目を {removed_count} 個削除しました")
    print(f"  sexual カテゴリからバズる要素なしで除外: {buzz_filtered_count} 個")
    return filtered_data

def merge_prompts(existing_data, new_prompts):
    """既存データに新しいプロンプトを統合"""
    merged = existing_data.copy()
    added_count = 0

    for category, prompts in new_prompts.items():
        if category not in merged:
            merged[category] = []

        for prompt in prompts:
            filtered = filter_tags(prompt)

            # sexual カテゴリのみバズる要素必須
            # clothing は組み合わせ素材なのでフィルタリングしない
            if category.lower() == 'sexual':
                if filtered and not has_buzz_element(filtered):
                    continue  # バズる要素なし = スキップ

            if filtered and filtered not in merged[category]:
                merged[category].append(filtered)
                added_count += 1
                print(f"  追加: [{category}] {filtered[:70]}...")

    return merged, added_count

def save_yaml(data, output_path):
    """YAMLファイルとして保存"""
    print(f"\n保存中: {output_path}")

    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(data.items()):
            f.write(f"{key}:\n")
            for value in values:
                f.write(f'  - "{value}"\n')
            if i < len(data) - 1:
                f.write('\n')

    print(f"完了: {len(data)} カテゴリ、合計 {sum(len(v) for v in data.values())} アイテム")

def main():
    input_file = r"C:\metacard\wildcards_minami_lrinka_ultra_20251003.yaml"
    date_str = datetime.now().strftime("%Y%m%d")
    output_file = rf"C:\metacard\wildcards_minami_lrinka_EXTREME_{date_str}.yaml"

    print("=" * 80)
    print("ギリギリのライン攻めプロンプト開発ツール")
    print("=" * 80)
    print("記事第1章「ギリギリのラインを攻める」完全適用:")
    print("  - いいね率10%維持を目指す高エロ要素")
    print("  - 谷間メイン（横乳・下乳より通りやすい）")
    print("  - 股を写さず開脚（除外回避）")
    print("  - ランジェリー紐解け（Wardrobe Malfunction）")
    print("=" * 80)
    print("\n永久BAN回避:")
    print(f"  除外: {', '.join(PERMANENT_BAN_TAGS[:5])}...")
    print(f"  除外: {', '.join(WET_TAGS[:5])}...")
    print(f"  除外: {', '.join(CHARACTER_MISMATCH_TAGS)}（キャラ不一致）")
    print()

    existing_data = load_yaml(input_file)

    print("ギリギリプロンプト追加中...")
    print("=" * 80)
    merged_data, added_count = merge_prompts(existing_data, EXTREME_EDGE_PROMPTS)

    save_yaml(merged_data, output_file)

    print("\n" + "=" * 80)
    print(f"開発完了! {added_count} 個のギリギリプロンプトを追加しました")
    print("=" * 80)

    print("\n追加されたカテゴリ別集計:")
    original_counts = {k: len(v) for k, v in existing_data.items()}
    merged_counts = {k: len(v) for k, v in merged_data.items()}

    for category in merged_counts:
        original = original_counts.get(category, 0)
        merged = merged_counts[category]
        diff = merged - original
        if diff > 0:
            print(f"  {category:20s}: {original:4d} → {merged:4d} (+{diff:2d})")

    print("\nギリギリ攻めコンセプト:")
    print("  1. 谷間特化: 横乳・下乳より検索除外されにくい")
    print("  2. 透け系: wet除外版（布の透け感のみ）")
    print("  3. 開脚: 股を写さない工夫で除外回避")
    print("  4. ビキニ/ランジェリー: 紐解け・ずれ強調")
    print("  5. 挑発ポーズ: 直接描写なしでエロさ最大化")
    print("  6. 表情重視: ahegao、bedroom eyes等")
    print("\nリスク管理:")
    print("  - 白い液体系: 完全除外（ラベル付け確定）")
    print("  - 性行為系: 完全除外（永久センシティブ確定）")
    print("  - 一人称の手: 除外（危険度高）")
    print("  - wet系: 除外（透けすぎ防止）")
    print("\n目標:")
    print("  いいね率10%維持 = 1万インプで1000いいね = バズる")

if __name__ == "__main__":
    main()
