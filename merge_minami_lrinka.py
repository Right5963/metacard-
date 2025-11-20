#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml
import re
from datetime import datetime

# 除外するタグのリスト
EXCLUDE_TAGS = [
    # wet関連
    'wet', 'wet clothes', 'wet shirt', 'wet swimsuit',

    # プール関連
    'pool', 'poolside', 'swimming pool',

    # 海/ビーチ関連
    'beach', 'ocean', 'sea', 'shore', 'seaside', 'water', 'horizon'
]

def load_yaml(file_path):
    """YAMLファイルを読み込む"""
    print(f"読み込み中: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def filter_tags(tag_string):
    """タグ文字列から除外タグを削除"""
    tags = [tag.strip() for tag in tag_string.split(',')]
    filtered_tags = []

    for tag in tags:
        # 除外タグリストと照合（大文字小文字を区別しない）
        if tag.lower() not in [exclude.lower() for exclude in EXCLUDE_TAGS]:
            # __xxx__形式のプレースホルダーは保持
            if tag.startswith('__') and tag.endswith('__'):
                filtered_tags.append(tag)
            else:
                filtered_tags.append(tag)

    return ', '.join(filtered_tags)

def merge_and_filter_categories(yaml1, yaml2):
    """2つのYAMLを統合し、除外タグをフィルタリング"""
    merged = {}

    # すべてのカテゴリを取得
    all_categories = set(yaml1.keys()) | set(yaml2.keys())

    for category in all_categories:
        merged[category] = []

        # yaml1からのアイテム
        if category in yaml1:
            for item in yaml1[category]:
                filtered = filter_tags(item)
                if filtered and filtered not in merged[category]:
                    merged[category].append(filtered)

        # yaml2からのアイテム
        if category in yaml2:
            for item in yaml2[category]:
                filtered = filter_tags(item)
                if filtered and filtered not in merged[category]:
                    merged[category].append(filtered)

    return merged

def save_yaml(data, output_path):
    """YAMLファイルとして保存"""
    print(f"保存中: {output_path}")

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
    file1 = r"C:\metacard\wildcards_light_minami_20251002.yaml"
    file2 = r"C:\metacard\wildcards_lrinkaillust_20251002.yaml"

    # 現在の日付でファイル名を生成
    date_str = datetime.now().strftime("%Y%m%d")
    output_file = rf"C:\metacard\wildcards_minami_lrinka_{date_str}.yaml"

    print("=" * 50)
    print("YAML統合・フィルタリングツール")
    print("みなみ × lrinkaillust 統合版")
    print("=" * 50)
    print(f"\n除外タグ: {', '.join(EXCLUDE_TAGS)}\n")

    # YAMLファイルを読み込む
    yaml1 = load_yaml(file1)
    yaml2 = load_yaml(file2)

    # 統合とフィルタリング
    print("\n統合とフィルタリング実行中...")
    merged_data = merge_and_filter_categories(yaml1, yaml2)

    # 保存
    save_yaml(merged_data, output_file)

    print("\n" + "=" * 50)
    print("処理完了!")
    print("=" * 50)

if __name__ == "__main__":
    main()
