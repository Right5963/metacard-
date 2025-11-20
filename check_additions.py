#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import yaml

# ファイルを読み込む
with open(r'C:\metacard\wildcards_minami_lrinka_20251003.yaml', 'r', encoding='utf-8') as f:
    old_data = yaml.safe_load(f)

with open(r'C:\metacard\wildcards_minami_lrinka_enhanced_20251003.yaml', 'r', encoding='utf-8') as f:
    new_data = yaml.safe_load(f)

print("カテゴリ別追加数:")
print("=" * 60)

total_old = 0
total_new = 0

for cat, items in new_data.items():
    old_count = len(old_data.get(cat, []))
    new_count = len(items)
    diff = new_count - old_count

    total_old += old_count
    total_new += new_count

    if diff > 0:
        print(f"  {cat:20s}: {old_count:4d} → {new_count:4d} (+{diff:2d})")
    elif diff < 0:
        print(f"  {cat:20s}: {old_count:4d} → {new_count:4d} ({diff:2d})")
    else:
        print(f"  {cat:20s}: {old_count:4d} → {new_count:4d} (変更なし)")

print("=" * 60)
print(f"  {'合計':20s}: {total_old:4d} → {total_new:4d} (+{total_new - total_old:2d})")
print()
print(f"新しいファイル: wildcards_minami_lrinka_enhanced_20251003.yaml")
print(f"  - 全カテゴリ: {len(new_data)}")
print(f"  - 全アイテム: {total_new}")
