#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml
from collections import defaultdict

# カテゴリー定義
CATEGORIES = {
    "characterface": ["hair", "eyes", "eyebrows", "eyelashes", "glasses", "sunglasses", "makeup", "lipstick", "fangs", "face"],
    "characterbody": ["breasts", "ass", "thighs", "legs", "tail", "wings", "animal_ears", "cat_ears", "body", "skin", "navel", "arm", "foot", "feet", "collarbone", "shoulders", "armpits"],
    "clothing": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude", "clothes", "leotard", "maid"],
    "poseemotion": ["standing", "sitting", "lying", "smile", "mouth", "eyes", "blush", "frown", "pose", "emotion", "split", "stretching"],
    "angle": ["looking", "from_above", "from_below", "angle", "view", "viewer", "pov"],
    "backgrounds": ["indoors", "outdoors", "sky", "night", "day", "city", "background", "bed", "pool"],
    "style": ["anime", "manga", "realistic", "3d", "sketch", "painting", "style", "quality", "res", "glitch"],
    "sexual": ["breasts", "nipples", "ass", "underwear", "bra", "panties", "nude", "naked", "sexually", "crotch", "cameltoe"]
}

# 特定のファイルパス
file_paths = [
    r"c:\Users\user\Downloads\新しいフォルダー (2)\20250427j1182524055.txt",
    r"c:\Users\user\Downloads\新しいフォルダー (2)\20250427g1182531563.txt",
    r"c:\Users\user\Downloads\新しいフォルダー (2)\20250427j1182516106.txt"
]

def read_tags_from_file(file_path):
    """ファイルからタグを読み込む"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            # コンマ区切りのタグを処理
            tags = []
            if ',' in content:
                for tag in content.split(','):
                    tag = tag.strip()
                    if tag:
                        tags.append(tag)
            else:
                tags.append(content)
            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def categorize_tags(tags):
    """タグをカテゴリ別に分類"""
    categorized = {
        "character_main": [],
        "characterface": [],
        "characterbody": [],
        "clothing": [],
        "poseemotion": [],
        "angle": [],
        "backgrounds": [],
        "style": [],
        "sexual": [],
        "uncategorized": []
    }

    for tag in tags:
        tag_lower = tag.lower()

        # キャラクター主要属性
        if tag in ["1girl", "solo", "girl", "female", "1boy", "male", "woman", "man"]:
            categorized["character_main"].append(tag)
            continue

        # 顔の特徴
        if any(keyword in tag_lower for keyword in CATEGORIES["characterface"]):
            categorized["characterface"].append(tag)
            continue

        # 体の特徴
        if any(keyword in tag_lower for keyword in CATEGORIES["characterbody"]):
            categorized["characterbody"].append(tag)
            continue

        # 衣装関連
        if any(keyword in tag_lower for keyword in CATEGORIES["clothing"]):
            categorized["clothing"].append(tag)
            continue

        # ポーズと感情
        if any(keyword in tag_lower for keyword in CATEGORIES["poseemotion"]):
            categorized["poseemotion"].append(tag)
            continue

        # アングル
        if any(keyword in tag_lower for keyword in CATEGORIES["angle"]):
            categorized["angle"].append(tag)
            continue

        # 背景
        if any(keyword in tag_lower for keyword in CATEGORIES["backgrounds"]):
            categorized["backgrounds"].append(tag)
            continue

        # スタイル
        if any(keyword in tag_lower for keyword in CATEGORIES["style"]):
            categorized["style"].append(tag)
            continue

        # 性的内容
        if any(keyword in tag_lower for keyword in CATEGORIES["sexual"]):
            categorized["sexual"].append(tag)
            continue

        # 上記のどれにも当てはまらない場合
        categorized["uncategorized"].append(tag)

    # 空のカテゴリを削除
    return {k: v for k, v in categorized.items() if v}

def create_yaml_from_categorized(categorized_tags):
    """カテゴリ別タグからYAML構造を作成"""
    yaml_structure = {}

    # character_mainを特別処理
    if "character_main" in categorized_tags:
        yaml_structure["character_main"] = categorized_tags["character_main"]

    # その他のカテゴリ
    for category, tags in categorized_tags.items():
        if category != "character_main":
            yaml_structure[category] = tags

    return yaml_structure

def save_yaml(yaml_structure, output_path):
    """YAMLファイルに保存（セクション間に空行を挿入）"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(yaml_structure.items()):
            # キーの書き出し
            f.write(f"{key}:\n")

            # 値の書き出し
            for value in values:
                # 値はダブルクォートで囲む
                f.write(f'  - "{value}"\n')

            # セクション間に空行を挿入（最後のセクション以外）
            if i < len(yaml_structure) - 1:
                f.write('\n')

def main():
    """メイン関数"""
    for i, file_path in enumerate(file_paths):
        print(f"ファイル {i+1}: {file_path}")

        # タグを読み込み
        tags = read_tags_from_file(file_path)
        print(f"合計タグ数: {len(tags)}")
        print(f"全タグ: {', '.join(tags)}")
        print()

        # タグをカテゴリに分類
        categorized = categorize_tags(tags)

        # 分類結果を表示
        for category, cat_tags in categorized.items():
            print(f"{category}: {len(cat_tags)}タグ")
            print(f"  {', '.join(cat_tags)}")

        # YAML構造を作成
        yaml_structure = create_yaml_from_categorized(categorized)

        # YAMLファイルに保存
        output_file = f"specific_file_{i+1}_tags.yaml"
        save_yaml(yaml_structure, output_file)
        print(f"\nYAMLファイル保存先: {output_file}")
        print("-" * 80)

    # 3つのファイルの結合分析
    print("\n3つのファイルの結合分析")
    all_tags = []
    for file_path in file_paths:
        all_tags.extend(read_tags_from_file(file_path))

    # 重複を削除
    unique_tags = list(set(all_tags))
    print(f"合計ユニークタグ数: {len(unique_tags)}")

    # タグをカテゴリに分類
    categorized = categorize_tags(unique_tags)

    # 分類結果を表示
    for category, cat_tags in categorized.items():
        print(f"{category}: {len(cat_tags)}タグ")
        print(f"  {', '.join(cat_tags)}")

    # YAML構造を作成
    yaml_structure = create_yaml_from_categorized(categorized)

    # 結合YAMLファイルに保存
    output_file = "combined_specific_files.yaml"
    save_yaml(yaml_structure, output_file)
    print(f"\n結合YAMLファイル保存先: {output_file}")

if __name__ == "__main__":
    main()
