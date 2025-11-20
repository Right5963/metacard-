#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml
from datetime import datetime

# 除外するタグのリスト（merge_minami_lrinka.pyと同じ）
EXCLUDE_TAGS = [
    # wet関連
    'wet', 'wet clothes', 'wet shirt', 'wet swimsuit',

    # プール関連
    'pool', 'poolside', 'swimming pool', 'in pool', 'pool ladder',

    # 海/ビーチ関連
    'beach', 'ocean', 'sea', 'shore', 'seaside', 'water', 'horizon'
]

# オリジナルプロンプト集（14種類から除外タグを含まないものを抽出）
ORIGINAL_PROMPTS = {
    # プロンプト1: ビキニバースト
    "clothing": [
        "Wardrobe Malfunction lingerie, untied lingerie, strap break, bursting breasts, Outfit Disconnect lingerie",
        "Wardrobe Malfunction bikini, untied bikini, strap break, bursting breasts, Outfit Disconnect bikini",
    ],
    "poseemotion": [
        "hand bra, Crossing arms",
        "hand bra, Crossing arms, lie down, from above",
        "all fours, dynamic pose",
        "motion lines",
    ],

    # プロンプト3: 制服捲りブラジャー
    # "clothing"に追加済み（重複回避）

    # プロンプト4: ヒョウ柄ランジェリー
    "backgrounds": [
        "luxury Hotel lobby, small bag",
        "shopping floor, department store, indoor, Boutique, small bag",
        "park, garden, tree, Mountain, Mountain climbing, trekking, stone",
    ],

    # プロンプト5: いちご柄ブラジャー
    # "clothing"に追加済み

    # プロンプト6: 部屋着
    # "clothing", "poseemotion", "backgrounds"に追加済み

    # プロンプト7: 眠い💤
    # "poseemotion", "backgrounds"に追加済み

    # プロンプト9: メイド服
    # "clothing"に追加済み

    # プロンプト11: 穴あきスク水
    # "clothing"に追加済み

    # プロンプト12: クールビズ
    # "clothing", "backgrounds"に追加済み

    # プロンプト13: パイスラ
    # "clothing", "poseemotion", "backgrounds"に追加済み
}

# 詳細プロンプト（カテゴリ別に整理）
DETAILED_PROMPTS = {
    "clothing": [
        # ビキニバースト系
        "Wardrobe Malfunction lingerie, untied lingerie, strap break, bursting breasts, Outfit Disconnect lingerie",
        "Wardrobe Malfunction bikini, untied bikini, strap break, bursting breasts, Outfit Disconnect bikini",

        # 制服捲り
        "up shirt, lift up shirt self",

        # ランジェリー系
        "Leopard print lingerie, oily skin, lift up Knit",
        "light blue Leopard print lingerie, oily skin, lift up Knit",
        "Strawberry print lingerie, Strawberry bra",

        # 部屋着
        "white T-shirt, sleeveless, shorts",

        # 眠い
        "white shirt, open shirt, school bow, ribbon",

        # メイド服
        "maid, sleeveless, knee-high socks, maid frill headband, Katyusha, animal ear fluff, apron, bell, collared dress, clothing cutout, bow, cat tail, garter straps",
        "under boob",

        # 穴あきスク水
        "OHighLeg, thin Cloth area, side boob, bare shoulders, breasts, cleavage, cleavage cutout, navel cutout, clothing cutout, one-piece swimsuit, school swimsuit, navy swimsuit",

        # クールビズ
        "sailor bikini, very miniskirt, white pantie, school bag, stomach, navel",
        "bikini, stomach, navel",

        # パイスラ
        "white knitwear, sleeveless, denim, cowboy shot, sling bag, messenger bag, Wear it crossbody",
    ],

    "poseemotion": [
        # ビキニバースト応用
        "hand bra, Crossing arms",
        "cowboy shot, hand bra, Crossing arms, on bed, lie down, from above",
        "all fours, dynamic pose",
        "motion lines",
        "cowboy shot, on stomach, air mattress, dutch angle",
        "from above, lie down, side table, drink, chair, Reclining chair",

        # いちご柄ブラジャー
        "disappointed, V sign, peace sign, inner thigh",

        # 部屋着
        "on bed, lie down, from above, cleavage, armpit, arm up, stomach, navel, drowsy, sleepy, yawn, tear, close one eye",

        # 眠い
        "Sleepy, close one eyes, yawn",

        # メイド服
        "laugh, teasing smile, smirk, open mouth, Smug mouth with fang",
        "embarrassed, blush, paw pose",

        # パイスラ
        "cowboy shot",
    ],

    "backgrounds": [
        # ヒョウ柄ランジェリー
        "luxury Hotel lobby",
        "shopping floor, department store, indoor, Boutique",

        # 部屋着
        "on bed, lie down, from above, bed room",

        # 眠い
        "living room",

        # メイド服
        "cafe, drink, pink cafe",
        "kawaii cafe, drink, pink cafe",

        # クールビズ
        "train interior",

        # パイスラ
        "park, garden, tree",
    ],

    "sexual": [
        # ビキニバースト系（性的要素強）
        "bursting breasts, Outfit Disconnect",
        "under boob",
        "cleavage cutout, navel cutout",
    ],
}

def filter_tags(tag_string):
    """タグ文字列から除外タグを削除"""
    tags = [tag.strip() for tag in tag_string.split(',')]
    filtered_tags = []

    for tag in tags:
        # 除外タグリストと照合（大文字小文字を区別しない）
        tag_lower = tag.lower()
        if not any(exclude.lower() in tag_lower for exclude in EXCLUDE_TAGS):
            filtered_tags.append(tag)

    return ', '.join(filtered_tags)

def load_yaml(file_path):
    """YAMLファイルを読み込む"""
    print(f"読み込み中: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def merge_prompts(existing_data, new_prompts):
    """既存データに新しいプロンプトを統合"""
    merged = existing_data.copy()

    added_count = 0

    for category, prompts in new_prompts.items():
        if category not in merged:
            merged[category] = []

        for prompt in prompts:
            # フィルタリング
            filtered = filter_tags(prompt)

            # 空でなく、重複していない場合のみ追加
            if filtered and filtered not in merged[category]:
                merged[category].append(filtered)
                added_count += 1
                print(f"  追加: [{category}] {filtered[:60]}...")

    return merged, added_count

def save_yaml(data, output_path):
    """YAMLファイルとして保存"""
    print(f"\n保存中: {output_path}")

    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(data.items()):
            # キーの書き出し
            f.write(f"{key}:\n")

            # 値の書き出し
            for value in values:
                # 値はダブルクォートで囲む
                f.write(f'  - "{value}"\n')

            # セクション間に空行を挿入（最後のセクション以外）
            if i < len(data) - 1:
                f.write('\n')

    print(f"完了: {len(data)} カテゴリ、合計 {sum(len(v) for v in data.values())} アイテム")

def main():
    # ファイルパス
    input_file = r"C:\metacard\wildcards_minami_lrinka_20251003.yaml"

    # 現在の日付でファイル名を生成
    date_str = datetime.now().strftime("%Y%m%d")
    output_file = rf"C:\metacard\wildcards_minami_lrinka_enhanced_{date_str}.yaml"

    print("=" * 70)
    print("ワイルドカード強化ツール")
    print("14種類のオリジナルプロンプトを追加")
    print("=" * 70)
    print(f"\n除外タグ: {', '.join(EXCLUDE_TAGS)}\n")

    # 既存YAMLを読み込む
    existing_data = load_yaml(input_file)

    # プロンプト統合
    print("\nプロンプト追加中...")
    merged_data, added_count = merge_prompts(existing_data, DETAILED_PROMPTS)

    # 保存
    save_yaml(merged_data, output_file)

    print("\n" + "=" * 70)
    print(f"処理完了! {added_count} 個のプロンプトを追加しました")
    print("=" * 70)

    # 追加詳細
    print("\n追加されたカテゴリ別集計:")
    original_counts = {k: len(v) for k, v in existing_data.items()}
    merged_counts = {k: len(v) for k, v in merged_data.items()}

    for category in merged_counts:
        original = original_counts.get(category, 0)
        merged = merged_counts[category]
        diff = merged - original
        if diff > 0:
            print(f"  {category}: {original} → {merged} (+{diff})")

if __name__ == "__main__":
    main()
