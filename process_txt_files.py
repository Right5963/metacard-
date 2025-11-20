#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import yaml
import glob
from datetime import datetime

# タグのカテゴリ定義
TAG_CATEGORIES = {
    "character": [
        "1girl", "solo", "multiple girls", "1boy", "2girls", "multiple boys",
        "girl", "boy", "female", "male", "blonde", "brown hair", "black hair",
        "blue eyes", "green eyes", "brown eyes", "red eyes", "purple eyes",
        "twintails", "ponytail", "long hair", "short hair", "medium hair",
        "hair ornament", "hair ribbon", "ribbon", "sidelocks", "bangs"
    ],
    "clothing": [
        "buruma", "gym uniform", "shirt", "gym shirt", "socks", "kneehighs",
        "sportswear", "gym shorts", "shorts", "underwear", "panties", "bra",
        "no bra", "clothes lift", "shirt lift", "open clothes", "clothes pull"
    ],
    "body": [
        "breasts", "large breasts", "medium breasts", "nipples", "censored nipples",
        "breasts out", "large areolae", "areola slip", "nipple slip", "thighs",
        "thick thighs", "ass", "cameltoe", "navel", "stomach", "midriff",
        "legs", "feet", "kneepits", "shiny skin", "groin tendon", "sweat"
    ],
    "pose": [
        "on back", "lying", "sitting", "presenting", "on bed", "spread legs",
        "facing viewer"
    ],
    "expression": [
        "blush", "smile", "closed eyes", "half-closed eyes", "closed mouth",
        "open mouth", "parted lips", "looking at viewer", "one eye closed"
    ],
    "background": [
        "simple background", "black background", "bed", "bed sheet"
    ],
    "quality": [
        "sketch", "identity censor", "glitch", "see-through", "ass focus",
        "partially visible vulva", "censored", "feet out of frame"
    ],
    "color": [
        "white shirt", "blue buruma", "black buruma", "light brown hair"
    ]
}

def process_quotes(text):
    """カンマで区切られたタグを整理"""
    if not text:
        return []

    # カンマで分割し、各タグを整理
    tags = [tag.strip() for tag in text.split(',')]
    return [tag for tag in tags if tag]  # 空のタグを除外

def categorize_tags(tags):
    """タグをカテゴリ別に分類"""
    categorized = {category: [] for category in TAG_CATEGORIES}
    categorized["uncategorized"] = []

    for tag in tags:
        placed = False
        for category, category_tags in TAG_CATEGORIES.items():
            # 完全一致または下位タグのチェック
            if tag in category_tags or any(cat_tag in tag for cat_tag in category_tags):
                categorized[category].append(tag)
                placed = True
                break

        if not placed:
            categorized["uncategorized"].append(tag)

    # 空のカテゴリを削除
    return {k: v for k, v in categorized.items() if v}

def save_yaml(yaml_structure, output_path):
    """YAMLファイルに保存"""
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_structure, f, allow_unicode=True, default_flow_style=False)
    print(f"YAMLファイルを保存しました: {output_path}")

def process_file(file_path):
    """単一のファイルを処理し、カテゴリ分けしたタグを返す"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            tags = process_quotes(content)
            return {
                "ファイル名": os.path.basename(file_path),
                "タグ数": len(tags),
                "カテゴリ別": categorize_tags(tags),
                "全タグ": tags
            }
    except Exception as e:
        print(f"エラー - {file_path}: {str(e)}")
        return None

def process_all_txt_files(directory_path):
    """指定したディレクトリの全txtファイルを処理"""
    all_files = glob.glob(os.path.join(directory_path, "*.txt"))
    print(f"{len(all_files)}個のテキストファイルが見つかりました。")

    # 各ファイルごとの処理結果を保持
    file_results = []

    # カテゴリごとのユニークなタグセットをカウント
    unique_category_sets = {category: set() for category in TAG_CATEGORIES}
    unique_category_sets["uncategorized"] = set()

    for file_path in all_files:
        result = process_file(file_path)
        if result:
            file_results.append(result)
            print(f"処理中: {result['ファイル名']} - {result['タグ数']}タグ")

            # カテゴリごとのタグセットをカウント（タプルに変換してset内で使えるように）
            for category, tags in result["カテゴリ別"].items():
                if tags:
                    unique_category_sets[category].add(tuple(sorted(tags)))

    # カテゴリごとのユニークなタグセット数を集計
    category_stats = {category: len(tag_sets) for category, tag_sets in unique_category_sets.items() if tag_sets}

    return {
        "統計": {
            "ファイル数": len(all_files),
            "処理成功": len(file_results),
            "カテゴリごとのユニークなセット数": category_stats
        },
        "ファイル別結果": file_results
    }

def main():
    # ダウンロードしたファイルのディレクトリを使用
    directory_path = r"C:\metacard\downloaded_images"
    # 日付を含むファイル名を使用
    today = datetime.now().strftime("%Y%m%d")
    output_path = f"C:\\metacard\\processed_tags_by_file_{today}.yaml"

    # 全ファイルを処理
    result = process_all_txt_files(directory_path)

    # 結果を保存
    save_yaml(result, output_path)

if __name__ == "__main__":
    main()
