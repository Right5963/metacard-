#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml
from datetime import datetime

# 除外するタグのリスト
EXCLUDE_TAGS = [
    'wet', 'wet clothes', 'wet shirt', 'wet swimsuit',
    'pool', 'poolside', 'swimming pool', 'in pool', 'pool ladder',
    'beach', 'ocean', 'sea', 'shore', 'seaside', 'water', 'horizon'
]

# 🔥 新規開発オリジナルプロンプト
# 記事の成功法則を適用:
# 1. 「1秒前後の妄想」ができる
# 2. Wardrobe Malfunction（衣装の不具合）
# 3. 検索除外回避（露出小+エロ要素）

NEW_ORIGINAL_PROMPTS = {
    "clothing": [
        # 💡 タオル落下系（バスルーム）
        "towel, holding towel, towel slip, surprised, embarrassed",
        "bath towel, towel wrap, loose towel, holding towel",

        # 💡 髪で隠す系（自然な隠蔽）
        "long hair, hair over breasts, covering, wind, hair lift",
        "very long hair, hair covering breasts, shy, blush",

        # 💡 ストラップずり落ち
        "shoulder strap slip, off shoulder, fixing clothes, one strap down",
        "camisole, strap slip, adjusting clothes",

        # 💡 シャツボタン弾け（Wardrobe Malfunction応用）
        "button pop, button gap, tight shirt, straining clothes, wardrobe stress",
        "dress shirt, button strain, between buttons gap",

        # 💡 結び目ほどける系
        "ribbon untying, bow untying, string untying, clothing coming undone",
        "halter neck, neck tie untying, loose knot",

        # 💡 ファスナー半開き
        "zipper pull, half unzipped, zipper down, unzipping",
        "front zipper, zipper halfway, pulling zipper",

        # 💡 水着系（wetなし・ずり落ち重視）
        "bikini strap loose, bikini adjustment, fixing bikini",
        "swimsuit strap slip, one piece swimsuit, strap down",
        "bikini top untied, holding bikini, bikini strings loose",

        # 💡 タンクトップずり落ち
        "tank top, strap slip, shoulder露出, fixing strap",
        "sports bra visible, tank top slip, adjusting tank top",

        # 💡 スカート押さえ系（風）
        "skirt hold, wind lift, holding down skirt, windy",
        "skirt flutter, pressing down skirt, gust",

        # 💡 ニット伸び系
        "stretched sweater, pulling sweater, sweater strain, oversized sweater slip",
        "loose knit, shoulder露出 sweater, off shoulder knit",
    ],

    "poseemotion": [
        # 💡 タオル落下系ポーズ
        "surprised, covering, hand covering, embarrassed, blush, shocked",
        "holding towel desperately, trying to catch, panic",

        # 💡 髪で隠すポーズ
        "covering with hair, shy, embarrassed, looking away, blush",
        "hand in hair, hair covering, bashful",

        # 💡 ストラップ直しポーズ
        "fixing strap, adjusting clothes, pulling up strap, one hand raised",
        "reaching for strap, shoulder露出, embarrassed smile",

        # 💡 ボタン押さえポーズ
        "holding shirt closed, hand on chest, pressing clothes, worried expression",
        "trying to close, grasping shirt, panicked",

        # 💡 スカート押さえポーズ
        "both hands on skirt, pressing down, windy pose, surprised face",
        "holding skirt down, wind blown, struggling",

        # 💡 座り込み隠しポーズ
        "sitting, knees up, hugging knees, covering, defensive pose",
        "crouching, hiding, embarrassed sitting",

        # 💡 振り向きポーズ（「見られた！」）
        "looking back, surprised, caught, turning around, over shoulder",
        "glancing back, shocked expression, hand covering",

        # 💡 寝起きポーズ（衣装乱れ）
        "just woke up, messy clothes, disheveled, rubbing eyes, sleepy",
        "morning, bed hair, clothes slipping, yawning",

        # 💡 ストレッチポーズ（服の張り）
        "stretching, arms up, arching back, clothing strain",
        "morning stretch, reaching up, clothes tight",
    ],

    "backgrounds": [
        # 💡 バスルーム系
        "bathroom, bath, shower room, mirror, steam",
        "bathroom mirror, washroom, bathtub",

        # 💡 脱衣所
        "changing room, locker room, dressing room",

        # 💡 ビーチ（wetなし・砂浜のみ）
        "sandy area, beach umbrella, beach chair, sand",

        # 💡 屋上・バルコニー（風）
        "rooftop, balcony, railing, windy, sky",
        "terrace, outdoor balcony, rooftop scenery",

        # 💡 ベッドルーム（寝起き）
        "bedroom, morning light, bed, pillow, bed sheet",
        "bedroom window, morning sun, messy bed",

        # 💡 更衣室・フィッティングルーム
        "fitting room, curtain, mirror, changing booth",
        "clothing store, fitting area, dressing booth",

        # 💡 ジム・スポーツ施設
        "gym, locker room, sports facility, bench",
        "fitness room, exercise area, gym locker",
    ],

    "angle": [
        # 💡 「見られた」視点
        "from side, looking back over shoulder",
        "from behind, turning around",
        "from below, looking down at viewer",

        # 💡 「覗き」風味（除外回避版）
        "through gap, partially visible, peeking angle",
    ],

    "sexual": [
        # 💡 Wardrobe Malfunction要素
        "wardrobe malfunction, clothing accident, wardrobe failure",
        "clothing slip, accidental exposure risk, clothes coming loose",
        "strap failure, clothing mishap, wardrobe emergency",

        # 💡 「今にも」要素
        "almost露出, barely covered, about to slip",
        "on the verge, precarious, unstable clothing",
    ],
}

def filter_tags(tag_string):
    """タグ文字列から除外タグを削除"""
    tags = [tag.strip() for tag in tag_string.split(',')]
    filtered_tags = []

    for tag in tags:
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
    input_file = r"C:\metacard\wildcards_minami_lrinka_enhanced_20251003.yaml"
    date_str = datetime.now().strftime("%Y%m%d")
    output_file = rf"C:\metacard\wildcards_minami_lrinka_ultra_{date_str}.yaml"

    print("=" * 80)
    print("オリジナルプロンプト開発ツール")
    print("記事の成功法則を完全適用:")
    print("  1. 「1秒前後の妄想」ができる構図")
    print("  2. Wardrobe Malfunction（衣装の不具合）")
    print("  3. シャドウBAN回避（露出小+エロ要素）")
    print("=" * 80)
    print(f"\n除外タグ: {', '.join(EXCLUDE_TAGS)}\n")

    # 既存YAMLを読み込む
    existing_data = load_yaml(input_file)

    print("\n新規オリジナルプロンプト追加中...")
    print("=" * 80)
    merged_data, added_count = merge_prompts(existing_data, NEW_ORIGINAL_PROMPTS)

    # 保存
    save_yaml(merged_data, output_file)

    print("\n" + "=" * 80)
    print(f"開発完了! {added_count} 個の新規オリジナルプロンプトを追加しました")
    print("=" * 80)

    # カテゴリ別集計
    print("\n追加されたカテゴリ別集計:")
    original_counts = {k: len(v) for k, v in existing_data.items()}
    merged_counts = {k: len(v) for k, v in merged_data.items()}

    for category in merged_counts:
        original = original_counts.get(category, 0)
        merged = merged_counts[category]
        diff = merged - original
        if diff > 0:
            print(f"  {category:20s}: {original:4d} → {merged:4d} (+{diff:2d})")

    print("\n開発コンセプト:")
    print("  - タオル落下系: 「落ちる瞬間」の妄想")
    print("  - ストラップずり落ち: 「このまま落ちたら」の妄想")
    print("  - ボタン弾け: 「次も弾けそう」の妄想")
    print("  - スカート押さえ: 「風で捲れたら」の妄想")
    print("  - 水着調整中: 「直してる最中に」の妄想")
    print("  - 寝起き: 「服が乱れてる」の妄想")
    print("\nシャドウBAN対策:")
    print("  - wet系タグ完全排除")
    print("  - pool/beach背景なし（砂浜のみOK）")
    print("  - 露出度低 × エロ要素高 = 検索除外回避")

if __name__ == "__main__":
    main()
