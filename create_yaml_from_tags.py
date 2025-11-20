#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter

# カテゴリ定義
TAG_CATEGORIES = {
    "キャラクター": ["1girl", "girl", "female", "1boy", "male", "woman", "man", "loli", "shota", "solo"],
    "衣装": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude",
              "clothes", "hat", "shoes", "boots", "gloves", "coat", "jacket", "suit", "maid", "school_uniform",
              "serafuku", "shorts", "hoodie", "tank_top", "pantyhose", "thighhighs", "lingerie", "underwear",
              "panties", "bra", "kimono", "apron", "scarf", "necktie", "bow", "bowtie", "overalls", "stockings",
              "sweater", "cardigan", "sweatshirt", "blazer", "leotard", "pajamas"],
    "髪型": ["long_hair", "short_hair", "blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair",
            "white_hair", "red_hair", "ponytail", "twintails", "braid", "hair_ornament", "hairclip",
            "side_ponytail", "hair_bow", "hair_ribbon", "twin_braids", "drill_hair", "hime_cut", "bangs",
            "ahoge", "sidelocks", "messy_hair", "hair_over_one_eye", "hair_between_eyes"],
    "顔": ["smile", "open_mouth", "closed_eyes", "blush", "looking_at_viewer", "expressionless",
           "eyebrows", "eyelashes", "blue_eyes", "green_eyes", "red_eyes", "brown_eyes", "heterochromia",
           "frown", "pout", "wink", "tears", "crying", "glasses", "sunglasses", "makeup", "lipstick",
           "fangs", "tongue", "tongue_out", "parted_lips"],
    "身体": ["small_breasts", "medium_breasts", "large_breasts", "breasts", "ass", "thighs", "legs",
            "tail", "wings", "animal_ears", "cat_ears", "cleavage", "collarbone", "navel", "midriff",
            "flat_chest", "stomach", "armpits", "hip", "tattoo", "bare_shoulders", "back", "muscle",
            "slim", "plump", "tall", "short", "pale_skin", "dark_skin", "freckles"],
    "ポーズ": ["standing", "sitting", "lying", "kneeling", "bent_over", "arms_up", "hands_up",
               "hand_on_hip", "crossed_arms", "spread_legs", "walking", "running", "squatting",
               "leaning", "jumping", "stretching", "sleeping", "hugging", "hand_holding", "hand_on_own_face",
               "hand_in_hair", "on_side", "on_back", "on_stomach", "legs_up", "cowboy_shot", "looking_back"],
    "背景": ["indoors", "outdoors", "sky", "night", "day", "city", "beach", "forest", "water",
              "mountains", "sunset", "room", "bed", "classroom", "street", "bathroom", "kitchen",
              "garden", "park", "building", "ruins", "cafe", "restaurant", "shop", "school",
              "train", "car", "vehicle", "rain", "snow", "winter", "autumn", "spring", "summer"],
    "画質": ["highres", "absurdres", "lowres", "jpeg_artifacts", "blurry", "monochrome", "grayscale",
              "sketch", "watermark", "simple_background", "gradient_background", "white_background",
              "black_background", "colored_background", "transparent_background", "dynamic_angle"],
    "スタイル": ["anime", "manga", "realistic", "3d", "sketch", "painting", "drawing", "digital_art",
                 "traditional_media", "photorealistic", "chibi", "comic", "illustration"]
}

def parse_arguments():
    """コマンドライン引数のパース"""
    parser = argparse.ArgumentParser(description='タグファイルをYAML形式に変換')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力タグディレクトリ')
    parser.add_argument('--output', '-o', type=str, default='converted_result.yaml', help='出力YAMLファイル')
    parser.add_argument('--max-files', '-m', type=int, default=100, help='処理する最大ファイル数')
    return parser.parse_args()

def get_tag_files(input_dir, max_files=100):
    """指定ディレクトリからタグファイルのリストを取得"""
    files = list(Path(input_dir).glob('*.txt'))
    return sorted(files)[:max_files]  # 最大ファイル数まで

def read_tags_from_file(file_path):
    """タグファイルからタグを読み取り"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            # コンマで区切られたタグのリスト
            tags = [tag.strip() for tag in content.split(',')]
            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def categorize_tags(tags):
    """タグをカテゴリごとに分類"""
    categorized = defaultdict(list)
    uncategorized = []

    for tag in tags:
        tag = tag.strip()
        if not tag:
            continue

        assigned = False
        for category, keywords in TAG_CATEGORIES.items():
            if any(keyword == tag or tag.startswith(keyword + " ") for keyword in keywords):
                categorized[category].append(tag)
                assigned = True
                break

        if not assigned:
            uncategorized.append(tag)

    # 未カテゴリ化タグを「その他」に入れる
    if uncategorized:
        categorized["その他"] = uncategorized

    return dict(categorized)

def analyze_tags(tag_files):
    """タグファイルを分析して頻出タグを抽出"""
    all_tags = []
    categorized_results = []

    for file_path in tag_files:
        tags = read_tags_from_file(file_path)
        all_tags.extend(tags)
        categorized = categorize_tags(tags)
        categorized_results.append(categorized)

    # タグの出現頻度を集計
    tag_counter = Counter(all_tags)
    most_common_tags = tag_counter.most_common(50)  # 上位50個のタグ

    # カテゴリごとの頻出タグ
    category_tags = defaultdict(Counter)
    for result in categorized_results:
        for category, tags in result.items():
            category_tags[category].update(tags)

    return {
        'most_common_tags': most_common_tags,
        'category_tags': {k: v.most_common(10) for k, v in category_tags.items()},
        'categorized_results': categorized_results
    }

def create_yaml_structure(analysis_result):
    """分析結果からYAML構造を作成"""
    # 基本構造
    yaml_structure = {
        "WD14_TAGS": {
            "character1": {
                "fixed": "",
                "fixed_clothes": [],
                "prefix_ero": [""],
                "prefix_ultra_ero": [""],
                "scenario_pose_normal_withclothes": [],
                "scenario_pose_normal_noclothes": [],
                "card_character1": []
            },
            "card": []
        }
    }

    # キャラクター特性を設定
    character_tags = []
    for category, tags in analysis_result['category_tags'].items():
        if category == "キャラクター":
            character_tags = [tag for tag, count in tags]

    if character_tags:
        yaml_structure["WD14_TAGS"]["character1"]["fixed"] = ", ".join(character_tags)
    else:
        # キャラクターカテゴリがない場合は最も一般的なタグを使用
        yaml_structure["WD14_TAGS"]["character1"]["fixed"] = "1girl, solo"

    # 衣装を設定
    clothes_tags = []
    for category, tags in analysis_result['category_tags'].items():
        if category == "衣装":
            clothes_tags = [tag for tag, count in tags if count > 2]  # 一定回数以上出現するタグのみ

    if clothes_tags:
        yaml_structure["WD14_TAGS"]["character1"]["fixed_clothes"].append(", ".join(clothes_tags))
    else:
        yaml_structure["WD14_TAGS"]["character1"]["fixed_clothes"].append("")

    # ポーズと顔のタグを設定
    pose_tags = []
    face_tags = []
    hair_tags = []

    for category, tags in analysis_result['category_tags'].items():
        if category == "ポーズ":
            pose_tags = [tag for tag, count in tags if count > 1]
        elif category == "顔":
            face_tags = [tag for tag, count in tags if count > 1]
        elif category == "髪型":
            hair_tags = [tag for tag, count in tags if count > 1]

    normal_pose = ", ".join(face_tags + hair_tags + pose_tags)
    if normal_pose:
        yaml_structure["WD14_TAGS"]["character1"]["scenario_pose_normal_withclothes"].append(normal_pose)
    else:
        yaml_structure["WD14_TAGS"]["character1"]["scenario_pose_normal_withclothes"].append("looking_at_viewer")

    # 服なしのポーズも同様に設定
    yaml_structure["WD14_TAGS"]["character1"]["scenario_pose_normal_noclothes"].append(", ".join(face_tags + pose_tags))

    # カードリファレンス設定
    yaml_structure["WD14_TAGS"]["character1"]["card_character1"] = [
        "{__WD14_TAGS/character1/fixed__}, {__WD14_TAGS/character1/fixed_clothes__}, {__WD14_TAGS/character1/scenario_pose_normal_withclothes__}",
        "{__WD14_TAGS/character1/fixed__}, {__WD14_TAGS/character1/scenario_pose_normal_noclothes__}"
    ]

    yaml_structure["WD14_TAGS"]["card"] = ["__WD14_TAGS/character1/card_character1__"]

    return yaml_structure

def save_yaml(yaml_structure, output_file):
    """YAML構造をファイルに保存"""
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_structure, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    print(f"YAMLファイルを保存しました: {output_file}")

def main():
    """メイン関数"""
    args = parse_arguments()
    print(f"=== タグファイルからYAML生成 ===")

    # タグファイル取得
    tag_files = get_tag_files(args.input, args.max_files)
    if not tag_files:
        print(f"エラー: ディレクトリ '{args.input}' にタグファイルが見つかりません。")
        return

    print(f"処理するファイル数: {len(tag_files)}")

    # タグ分析
    print("タグを分析中...")
    analysis_result = analyze_tags(tag_files)

    # YAML構造作成
    print("YAML構造を作成中...")
    yaml_structure = create_yaml_structure(analysis_result)

    # YAML保存
    save_yaml(yaml_structure, args.output)

    print("完了しました。")

if __name__ == "__main__":
    main()
