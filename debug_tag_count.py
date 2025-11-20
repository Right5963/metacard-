#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import argparse
from pathlib import Path
from collections import Counter

def parse_arguments():
    parser = argparse.ArgumentParser(description='タグファイルの統計情報を出力')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力タグディレクトリ')
    return parser.parse_args()

def get_tag_files(input_dir):
    files = list(Path(input_dir).glob('*.txt'))
    return sorted(files)

def read_tags_from_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            tags = []
            if ',' in content:
                for tag in content.split(','):
                    tag = tag.strip()
                    if tag:
                        tags.append(tag)
            elif '\n' in content:
                for line in content.split('\n'):
                    if ':' in line:
                        tag = line.split(':', 1)[0].strip()
                        if tag:
                            tags.append(tag)
            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def main():
    args = parse_arguments()
    print(f"=== タグファイルの統計情報 ===")

    tag_files = get_tag_files(args.input)
    print(f"ディレクトリ内のtxtファイル総数: {len(tag_files)}")

    if not tag_files:
        print(f"エラー: ディレクトリ '{args.input}' にタグファイルが見つかりません。")
        return

    all_tags = Counter()
    file_count = 0
    total_tags = 0

    print("タグを集計中...")
    for file_path in tag_files:
        tags = read_tags_from_file(file_path)
        if tags:
            total_tags += len(tags)
            for tag in tags:
                all_tags[tag] += 1
            file_count += 1

    print(f"処理したファイル数: {file_count}")
    print(f"タグの総数: {total_tags}")
    print(f"一意なタグの数: {len(all_tags)}")

    print("\n最も出現頻度の高いタグトップ30:")
    for tag, count in all_tags.most_common(30):
        print(f"  {tag}: {count}回")

    # カテゴリごとにタグを分類
    category_counts = {
        "顔の特徴": 0,
        "体の特徴": 0,
        "衣装": 0,
        "ポーズ": 0,
        "感情": 0,
        "アングル": 0,
        "背景": 0,
        "未分類": 0
    }

    # 顔の特徴のキーワード
    face_keywords = ['hair', 'eyes', 'eyebrows', 'eyelashes', 'glasses',
                     'makeup', 'lipstick', 'tongue', 'face', 'bangs']

    # 体の特徴のキーワード
    body_keywords = ['breasts', 'nipples', 'ass', 'thighs', 'legs', 'tail',
                     'cleavage', 'collarbone', 'navel', 'midriff', 'flat_chest',
                     'stomach', 'armpits', 'hip', 'tattoo', 'bare_shoulders', 'back',
                     'muscle', 'slim', 'plump', 'tall', 'short', 'skin', 'freckles', 'body']

    # 衣装のキーワード
    clothing_keywords = ['dress', 'shirt', 'skirt', 'pants', 'uniform', 'costume',
                        'swimsuit', 'bikini', 'naked', 'nude', 'clothes', 'hat',
                        'shoes', 'boots', 'gloves', 'coat', 'jacket', 'suit', 'maid',
                        'school_uniform', 'shorts', 'hoodie', 'tank_top',
                        'pantyhose', 'thighhighs', 'lingerie', 'underwear', 'panties',
                        'bra', 'kimono', 'apron', 'scarf', 'necktie', 'bow', 'bowtie']

    # ポーズのキーワード
    pose_keywords = ['standing', 'sitting', 'lying', 'kneeling', 'bent_over',
                    'arms', 'hands', 'hand_on_hip', 'crossed_arms',
                    'spread_legs', 'walking', 'running', 'squatting', 'leaning',
                    'jumping', 'stretching', 'sleeping', 'hugging',
                    'on_side', 'on_back', 'on_stomach', 'legs_up', 'cowboy_shot',
                    'sex', 'oral', 'anal', 'penetration', 'handjob',
                    'footjob', 'fingering', 'masturbation', 'pose']

    # 感情のキーワード
    emotion_keywords = ['smile', 'mouth', 'blush', 'frown',
                       'pout', 'wink', 'tears', 'crying', 'happy', 'sad', 'angry',
                       'surprised', 'embarrassed', 'annoyed', 'laughing', 'grin',
                       'smirk', 'serious', 'worried', 'disappointed', 'confused',
                       'excited', 'scared', 'expressionless', 'emotion']

    # アングルのキーワード
    angle_keywords = ['looking', 'from_above', 'from_below', 'from_side',
                     'from_behind', 'close-up', 'wide_shot', 'profile',
                     'dutch_angle', 'pov', 'bird', 'worm', 'selfie',
                     'shoulder', 'angle', 'view']

    # 背景のキーワード
    background_keywords = ['indoors', 'outdoors', 'sky', 'night', 'day', 'city',
                          'beach', 'forest', 'water', 'mountains', 'sunset', 'room',
                          'bed', 'classroom', 'street', 'bathroom', 'kitchen', 'garden',
                          'park', 'building', 'ruins', 'cafe', 'restaurant', 'shop',
                          'school', 'train', 'car', 'vehicle', 'rain', 'snow', 'window',
                          'background']

    # タグをカテゴリに分類
    for tag in all_tags:
        categorized = False

        # 顔の特徴
        if any(keyword in tag for keyword in face_keywords):
            category_counts["顔の特徴"] += 1
            categorized = True

        # 体の特徴
        elif any(keyword in tag for keyword in body_keywords):
            category_counts["体の特徴"] += 1
            categorized = True

        # 衣装
        elif any(keyword in tag for keyword in clothing_keywords):
            category_counts["衣装"] += 1
            categorized = True

        # ポーズ
        elif any(keyword in tag for keyword in pose_keywords):
            category_counts["ポーズ"] += 1
            categorized = True

        # 感情
        elif any(keyword in tag for keyword in emotion_keywords):
            category_counts["感情"] += 1
            categorized = True

        # アングル
        elif any(keyword in tag for keyword in angle_keywords):
            category_counts["アングル"] += 1
            categorized = True

        # 背景
        elif any(keyword in tag for keyword in background_keywords):
            category_counts["背景"] += 1
            categorized = True

        # 未分類
        if not categorized:
            category_counts["未分類"] += 1

    print("\nカテゴリごとのタグ数:")
    for category, count in category_counts.items():
        print(f"  {category}: {count}個")

    # 未分類タグのうち一部を表示
    uncategorized_tags = [tag for tag in all_tags if not any(
        any(keyword in tag for keyword in keywords)
        for keywords in [face_keywords, body_keywords, clothing_keywords,
                        pose_keywords, emotion_keywords, angle_keywords,
                        background_keywords]
    )]

    if uncategorized_tags:
        print("\n未分類タグの例（最大30個）:")
        for tag in uncategorized_tags[:30]:
            print(f"  {tag}: {all_tags[tag]}回")

if __name__ == "__main__":
    main()
