#!/usr/bin/env python3
"""
タグ集計スクリプト - WD14 Taggerの結果からタグの統計情報を生成
"""

import os
import re
import sys
import yaml
from collections import Counter, defaultdict

def read_tag_files(directory, pattern_str=r'item_\d+_\d+\.txt'):
    """タグファイルを読み込んでタグを抽出"""
    all_tags = []
    tag_files = 0

    # パターンにマッチするファイルを検索
    pattern = re.compile(pattern_str)
    for filename in os.listdir(directory):
        if pattern.match(filename):
            tag_files += 1
            file_path = os.path.join(directory, filename)

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    # 各行からタグを抽出
                    for line in f:
                        line = line.strip()
                        if ',' in line:
                            tag, confidence = line.split(',', 1)
                            tag = tag.strip()
                            confidence = float(confidence.strip())
                            if tag:
                                all_tags.append((tag, confidence))
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

    return all_tags, tag_files

def categorize_tags(all_tags):
    """タグをカテゴリ別に分類"""
    # タグの出現回数をカウント
    tag_counter = Counter([tag for tag, _ in all_tags])

    # タグを信頼度で重み付け
    weighted_tags = defaultdict(float)
    for tag, confidence in all_tags:
        weighted_tags[tag] += confidence

    # カテゴリごとのキーワード
    categories = {
        'character': ['girl', 'boy', 'woman', 'man', 'female', 'male', 'solo', 'person'],
        'clothing': ['shirt', 'skirt', 'pants', 'dress', 'uniform', 'bra', 'underwear',
                    'swimsuit', 'jacket', 'kimono', 'sweater', 'necktie', 'thighhighs'],
        'attribute': ['hair', 'eyes', 'breasts', 'large', 'small', 'long', 'short',
                     'blue', 'red', 'green', 'black', 'white', 'brown'],
        'action': ['standing', 'sitting', 'lying', 'looking', 'smile', 'walking',
                  'running', 'pose', 'grabbing', 'holding'],
        'background': ['indoors', 'outdoors', 'sky', 'window', 'bed', 'couch', 'floor', 'wall'],
        'nsfw': ['nude', 'naked', 'nipples', 'breasts', 'penis', 'sex', 'pussy',
               'ass', 'explicit', 'nsfw', 'hentai', 'porn']
    }

    # タグをカテゴリに分類
    categorized = defaultdict(list)
    for tag, count in tag_counter.most_common():
        tag_lower = tag.lower()
        assigned = False

        for category, keywords in categories.items():
            if any(keyword in tag_lower for keyword in keywords):
                categorized[category].append((tag, count, weighted_tags[tag]/count))
                assigned = True
                break

        if not assigned:
            categorized['other'].append((tag, count, weighted_tags[tag]/count))

    return categorized, tag_counter

def generate_summary(categorized, tag_counter, total_files):
    """タグの統計情報を生成"""
    summary = {
        "タグ総数": len(tag_counter),
        "画像ファイル総数": total_files,
        "カテゴリ別タグ数": {category: len(tags) for category, tags in categorized.items()},
        "カテゴリ別タグ": {}
    }

    # 各カテゴリのトップタグを格納
    for category, tags in categorized.items():
        summary["カテゴリ別タグ"][category] = [
            {
                "タグ": tag,
                "出現回数": count,
                "平均信頼度": round(confidence, 3),
                "出現率": round(count / total_files * 100, 1)
            }
            for tag, count, confidence in tags[:20]  # 各カテゴリのトップ20のみ
        ]

    # 全体のトップタグ
    summary["最頻出タグ"] = [
        {
            "タグ": tag,
            "出現回数": count,
            "出現率": round(count / total_files * 100, 1)
        }
        for tag, count in tag_counter.most_common(50)  # 全体のトップ50のみ
    ]

    return summary

def main():
    if len(sys.argv) < 2:
        print("使用法: python tag_summary.py タグディレクトリ [出力ファイル]")
        return 1

    directory = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "tag_summary.yaml"

    print(f"{directory}からタグを読み込み中...")

    # タグ読み込み
    all_tags, total_files = read_tag_files(directory)
    if not all_tags:
        print("タグが見つかりませんでした")
        return 1

    print(f"合計{len(all_tags)}タグを{total_files}ファイルから読み込みました")

    # タグのカテゴリ分類
    categorized, tag_counter = categorize_tags(all_tags)

    # 統計情報生成
    summary = generate_summary(categorized, tag_counter, total_files)

    # YAMLとして保存
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(summary, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"タグ統計が{output_file}に保存されました")

    # ターミナルに簡易表示
    print("\n--- タグ統計概要 ---")
    print(f"タグ総数: {summary['タグ総数']}")
    print(f"画像ファイル総数: {summary['画像ファイル総数']}")

    print("\n各カテゴリのタグ数:")
    for category, count in summary['カテゴリ別タグ数'].items():
        print(f"  {category}: {count}")

    print("\n最頻出タグトップ10:")
    for i, tag_info in enumerate(summary['最頻出タグ'][:10]):
        print(f"  {i+1}. {tag_info['タグ']} - {tag_info['出現回数']}回 ({tag_info['出現率']}%)")

    return 0

if __name__ == "__main__":
    sys.exit(main())
