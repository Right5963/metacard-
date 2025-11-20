#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml
from datetime import datetime

# 除外するタグ
EXCLUDE_TAGS = [
    # 永久BAN
    'cum', 'bukkake', 'facial', 'semen', 'ejaculation',
    'sex', 'sexual intercourse', 'penetration', 'insertion',
    'pov hands', 'hand on breast pov', 'groping pov',
    # wet系
    'wet', 'wet clothes', 'wet shirt', 'wet swimsuit',
    'pool', 'poolside', 'swimming pool', 'in pool', 'pool ladder',
    'beach', 'ocean', 'sea', 'shore', 'seaside', 'water', 'horizon',
    # キャラ不一致
    'one side up',
]

def filter_tags(tag_string):
    """除外タグを削除"""
    tags = [tag.strip() for tag in tag_string.split(',')]
    filtered_tags = []

    for tag in tags:
        tag_lower = tag.lower()
        if not any(exclude.lower() in tag_lower for exclude in EXCLUDE_TAGS):
            filtered_tags.append(tag)

    return ', '.join(filtered_tags)

def main():
    input_file = r"C:\metacard\wildcards_minami_lrinka_ultra_20251003.yaml"
    date_str = datetime.now().strftime("%Y%m%d")
    output_file = rf"C:\metacard\wildcards_minami_lrinka_CLEAN_{date_str}.yaml"

    print("除外タグフィルタリング")
    print("=" * 60)
    print(f"入力: {input_file}")
    print(f"出力: {output_file}")
    print()

    # 読み込み
    with open(input_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    # フィルタリング
    filtered_data = {}
    removed_count = 0

    for category, items in data.items():
        filtered_data[category] = []
        for item in items:
            filtered = filter_tags(item)
            if filtered and filtered != item:
                removed_count += 1
            if filtered:
                filtered_data[category].append(filtered)

    print(f"除外タグを含む項目: {removed_count} 個削除")
    print()

    # 保存
    with open(output_file, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(filtered_data.items()):
            f.write(f"{key}:\n")
            for value in values:
                f.write(f'  - "{value}"\n')
            if i < len(data) - 1:
                f.write('\n')

    print(f"完了: {len(filtered_data)} カテゴリ、{sum(len(v) for v in filtered_data.values())} items")

if __name__ == "__main__":
    main()
