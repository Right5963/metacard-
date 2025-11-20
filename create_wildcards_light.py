#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from datetime import datetime
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

# 除外タグリスト
EXCLUDE_TAGS = [
    "sample", "watermark", "english text", "artist name", "cover", "artist logo", "web address",
    "doujin cover", "cover page", "content rating", "novel cover", "copyright name", "company name",
    "logo", "chinese text", "character name", "character profile", "fake screenshot", "stats",
    "pixelated", "mosaic censoring", "censored", "copyright notice", "censored nipples", "blur censor",
    "sunlight", "identity censor", "1", "small breasts", "milestone celebration", "thank you", "glitch"
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
                    if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                        tags.append(tag)
                    else:
                        print(f"タグが除外されました: {tag}")
            else:
                # コンマがない場合は単一のタグとして扱う
                if content.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                    tags.append(content)
                else:
                    print(f"タグが除外されました: {content}")
            print(f"ファイル {file_path} から読み込んだタグ: {tags}")
            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def categorize_tags(tags):
    """タグをカテゴリ別に分類（単純らいと式）"""
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
        # 除外タグはスキップ
        if tag.lower() in [t.lower() for t in EXCLUDE_TAGS]:
            continue

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

def collect_tags_by_file(input_dir):
    """ディレクトリ内のすべてのtxtファイルからタグを収集"""
    all_files_tags = []  # 各ファイルのタグを格納するリスト

    # ディレクトリ内の全txtファイルを処理
    for filename in os.listdir(input_dir):
        if filename.endswith('.txt'):
            file_path = os.path.join(input_dir, filename)
            tags = read_tags_from_file(file_path)
            if tags:
                # ファイル名とタグをタプルで保存
                all_files_tags.append((filename, tags))

    return all_files_tags

def create_yaml_structure(all_files_tags):
    """ファイルごとにタグを分類し、YAML構造を作成"""
    # 各カテゴリのタグリストを格納する辞書
    categorized_by_category = defaultdict(list)

    # 各ファイルのタグをカテゴリに分類
    for filename, tags in all_files_tags:
        categorized = categorize_tags(tags)

        # 各カテゴリごとにタグをカンマ区切りの文字列として追加
        for category, cat_tags in categorized.items():
            if cat_tags:  # 空でない場合のみ追加
                tag_str = ", ".join(cat_tags)
                categorized_by_category[category].append(tag_str)

    # 最終的なYAML構造を作成
    yaml_structure = {}

    # character_mainの特殊処理
    if "character_main" in categorized_by_category:
        yaml_structure["character_main"] = [
            "1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__, __style__, __sexual__, __uncategorized__"
        ]

    # 他のカテゴリはそのまま追加
    for category, tag_strings in categorized_by_category.items():
        if category != "character_main":
            # 重複を除去
            unique_tag_strings = list(set(tag_strings))
            yaml_structure[category] = unique_tag_strings

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
    parser = argparse.ArgumentParser(description='テキストファイルからワイルドカードYAMLを生成（単純らいと式）')
    parser.add_argument('--input', '-i', required=True, help='入力ディレクトリ（txtファイルが格納されているフォルダ）')
    parser.add_argument('--output', '-o', help='出力YAMLファイルのパス（デフォルト: wildcards_light_YYYYMMDD.yaml）')

    args = parser.parse_args()

    # 入力ディレクトリの確認
    if not os.path.isdir(args.input):
        print(f"エラー: 指定された入力ディレクトリが存在しません: {args.input}")
        return

    # 出力ファイル名の生成（日付を含む）
    today = datetime.now().strftime("%Y%m%d")
    output_file = args.output if args.output else f"wildcards_light_{today}.yaml"

    # 処理開始
    print(f"処理を開始します...")
    print(f"入力ディレクトリ: {args.input}")
    print(f"除外タグ: {len(EXCLUDE_TAGS)}個")

    # 全txtファイルからタグを収集
    all_files_tags = collect_tags_by_file(args.input)
    print(f"処理したファイル数: {len(all_files_tags)}")

    if not all_files_tags:
        print("処理するファイルがありませんでした。")
        return

    # YAML構造を作成
    yaml_structure = create_yaml_structure(all_files_tags)

    # YAMLファイルに保存
    save_yaml(yaml_structure, output_file)
    print(f"ワイルドカードYAMLを保存しました: {output_file}")

    # 各カテゴリのエントリ数を表示
    for category, entries in yaml_structure.items():
        print(f"{category}: {len(entries)}エントリ")

if __name__ == "__main__":
    main()
