#!/usr/bin/env python3
import os
import argparse
import yaml
from datetime import datetime

def parse_arguments():
    parser = argparse.ArgumentParser(description='Create a YAML file from tagged results with date in filename')
    parser.add_argument('--input', required=True, help='Directory containing tag files')
    parser.add_argument('--output', help='Base output filename without extension (date will be added)')
    parser.add_argument('--threshold', type=float, default=0.4, help='Threshold for tag frequency (default: 0.4)')
    return parser.parse_args()

def read_tags_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    # Split by comma and strip whitespace
    tags = [tag.strip() for tag in content.split(',')]
    return tags

def is_excluded_tag(tag):
    excluded_keywords = ['watermark', 'sample', 'text', 'logo', 'signature', 'cover', 'cover page']
    return any(keyword in tag for keyword in excluded_keywords)

def categorize_tags(tags):
    """タグをカテゴリごとに分類し、セットとして返す"""
    categories = {
        'characterface': [],
        'characterbody': [],
        'clothing': [],
        'poseemotion': [],
        'angle': [],
        'backgrounds': []
    }

    # 除外タグをフィルタリング
    filtered_tags = [tag for tag in tags if not is_excluded_tag(tag)]

    character_face_tags = []
    character_body_tags = []
    clothing_tags = []
    pose_emotion_tags = []
    angle_tags = []
    background_tags = []

    for tag in filtered_tags:
        # Angle (最優先で処理)
        if any(keyword in tag for keyword in ['looking at viewer', 'from above', 'from below', 'side view', 'close-up', 'wide shot']):
            angle_tags.append(tag)
            continue

        # Clothing
        elif any(keyword in tag for keyword in ['swimsuit', 'outfit', 'dress', 'shirt', 'skirt', 'uniform', 'clothes',
                                             'covered navel', 'competition swimsuit', 'leotard', 'panties', 'shoes',
                                             'thighhighs', 'bow', 'pantyhose', 'maid', 'apron', 'underwear']):
            clothing_tags.append(tag)
            continue

        # Pose/Emotion
        elif any(keyword in tag for keyword in ['lying', 'sitting', 'standing', 'smile', 'blush', 'looking',
                                             'parted lips', 'masturbation', 'on back', 'spread legs',
                                             'grin', 'squatting']):
            pose_emotion_tags.append(tag)
            continue

        # Background
        elif any(keyword in tag for keyword in ['outdoors', 'indoors', 'bed', 'pillow', 'day', 'night',
                                             'beach', 'sky', 'room', 'bed sheet']):
            background_tags.append(tag)
            continue

        # Character face (顔、髪に関するタグ)
        elif any(keyword in tag for keyword in ['hair', 'eyes', 'face', 'eyebrows', 'eyelashes', 'glasses', 
                                             'bangs', 'ponytail', 'twintails', 'blonde', 'brown_hair', 
                                             'black_hair', 'blue_hair', 'pink_hair', 'red_hair', 'heterochromia']):
            character_face_tags.append(tag)
            continue

        # Character body (体に関するタグ)
        elif any(keyword in tag for keyword in ['breasts', 'nipples', 'ass', 'thighs', 'legs', 'body', 
                                             'cleavage', 'navel', 'stomach', 'muscle', 'slim', 'plump', 
                                             'tall', 'short', 'pale_skin', 'dark_skin', 'freckles']):
            character_body_tags.append(tag)
            continue

        # その他のタグは体の特徴として扱う
        else:
            character_body_tags.append(tag)

    # タグセットを構築
    if character_face_tags:
        categories['characterface'].append(','.join(character_face_tags))

    if character_body_tags:
        categories['characterbody'].append(','.join(character_body_tags))

    if clothing_tags:
        categories['clothing'].append(','.join(clothing_tags))

    if pose_emotion_tags:
        categories['poseemotion'].append(','.join(pose_emotion_tags))

    if angle_tags:
        categories['angle'].append(','.join(angle_tags))

    if background_tags:
        categories['backgrounds'].append(','.join(background_tags))

    return categories

def create_yaml_structure(all_files_tags):
    """各ファイルのタグからYAML構造を生成"""
    categories = {
        'charactermain': ["1girl,__characterface__,__characterbody__,__clothing__,__poseemotion__,__angle__,__backgrounds__"],
        'characterface': [],
        'characterbody': [],
        'clothing': [],
        'poseemotion': [],
        'angle': [],
        'backgrounds': []
    }

    # 各ファイルからのタグセットを集約
    for file_tags in all_files_tags:
        categorized_tags = categorize_tags(file_tags)

        # 各カテゴリのタグセットを追加
        for category, tag_sets in categorized_tags.items():
            if tag_sets:
                for tag_set in tag_sets:
                    if tag_set and tag_set not in categories[category]:
                        categories[category].append(tag_set)

    # 空のカテゴリにデフォルト値設定
    for category in categories:
        if not categories[category] and category != 'charactermain':
            if category == 'angle':
                categories[category] = ["looking at viewer", "from above", "from below", "side view"]
            elif category == 'poseemotion':
                categories[category] = ["standing", "sitting", "blush"]
            elif category == 'backgrounds':
                categories[category] = ["indoors", "outdoors"]
            elif category == 'characterface':
                categories[category] = ["long_hair", "blue_eyes"]
            elif category == 'characterbody':
                categories[category] = ["slim", "medium_breasts"]

    return categories

def save_yaml_manually(yaml_structure, output_path):
    """YAMLファイルを手動で保存（PyYAMLの書式を修正するため）"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for category, items in yaml_structure.items():
            f.write(f"{category}:\n")
            for item in items:
                f.write(f'  - "{item}"\n')
            # カテゴリ間に空行を追加
            if category != list(yaml_structure.keys())[-1]:
                f.write("\n")

    print(f"Wildcard YAML structure created and saved as {output_path}")

def main():
    args = parse_arguments()

    # 今日の日付を取得
    today = datetime.now().strftime("%Y%m%d")

    # 出力ファイル名の設定
    output_base = args.output if args.output else "webui_wildcards"
    output_path = f"{output_base}_{today}.yaml"

    # 同名ファイルがある場合は連番を付加
    counter = 1
    while os.path.exists(output_path):
        counter += 1
        output_path = f"{output_base}_{today}_{counter}.yaml"

    all_files_tags = []

    # タグファイルの読み込み
    if os.path.exists(args.input) and os.path.isdir(args.input):
        file_count = 0
        for filename in os.listdir(args.input):
            if filename.endswith('.txt'):
                file_path = os.path.join(args.input, filename)
                tags = read_tags_from_file(file_path)
                all_files_tags.append(tags)
                file_count += 1

        print(f"Processed {file_count} files")

        # YAML構造の生成
        yaml_structure = create_yaml_structure(all_files_tags)

        # ファイルの保存（手動書き込み方式）
        save_yaml_manually(yaml_structure, output_path)
    else:
        print(f"Input directory {args.input} does not exist")

if __name__ == "__main__":
    main()
