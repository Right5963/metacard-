#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter
import random

def parse_arguments():
    """コマンドライン引数のパース"""
    parser = argparse.ArgumentParser(description='タグファイルをワイルドカードYAML形式に変換 (セット形式とデバッグ情報)')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力タグディレクトリ')
    parser.add_argument('--output', '-o', type=str, default='wildcards_debug.yaml', help='出力YAMLファイル')
    parser.add_argument('--max-files', '-m', type=int, default=1000, help='処理する最大ファイル数')
    parser.add_argument('--threshold', '-t', type=float, default=0.6, help='タグを含めるしきい値')
    parser.add_argument('--sets', '-s', type=int, default=30, help='各カテゴリのセット数')
    return parser.parse_args()

def get_tag_files(input_dir, max_files=1000):
    """指定ディレクトリからタグファイルのリストを取得"""
    files = list(Path(input_dir).glob('*.txt'))
    print(f"ディレクトリ内のtxtファイル総数: {len(files)}")
    return sorted(files)[:max_files]  # 最大ファイル数まで

def read_tags_from_file(file_path):
    """タグファイルからタグを読み取り"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            # コンマ区切りのタグを処理
            tags = []
            if ',' in content:
                for tag in content.split(','):
                    tag = tag.strip()
                    if tag:
                        tags.append((tag, 1.0))  # デフォルトスコア1.0
            # コロン区切りのタグを処理（スコア付き）
            elif '\n' in content:
                for line in content.split('\n'):
                    if ':' in line:
                        tag, score_str = line.split(':', 1)
                        try:
                            score = float(score_str.strip())
                            tags.append((tag.strip(), score))
                        except ValueError:
                            # スコア変換エラーの場合はスキップ
                            continue

            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def analyze_files(tag_files, threshold=0.6):
    """タグファイルを分析してタグの出現頻度をカウント"""
    all_tags = Counter()
    file_tags = []  # 各ファイルのタグリストを保存
    total_tags_before_threshold = 0
    file_count = 0
    total_tags_in_files = 0

    print(f"処理するファイル数: {len(tag_files)}")

    for file_path in tag_files:
        tags_with_scores = read_tags_from_file(file_path)
        if not tags_with_scores:
            continue

        total_tags_in_files += len(tags_with_scores)
        # しきい値以上のタグのみを追加
        file_tag_list = []
        for tag, score in tags_with_scores:
            tag = tag.strip()
            total_tags_before_threshold += 1
            if score >= threshold and tag:
                all_tags[tag] += 1
                file_tag_list.append(tag)

        if file_tag_list:
            file_tags.append(file_tag_list)

        file_count += 1
        if file_count % 10 == 0:
            print(f"{file_count} ファイル処理済み...")

    print(f"合計 {file_count} ファイル処理完了")
    print(f"全ファイル中のタグ数: {total_tags_in_files}")
    print(f"閾値フィルタ前の総タグ数: {total_tags_before_threshold}")
    print(f"閾値フィルタ後の一意なタグ数: {len(all_tags)}")

    # 最も出現頻度の高いタグトップ10
    print("\n最も出現頻度の高いタグトップ10:")
    for tag, count in all_tags.most_common(10):
        print(f"  {tag}: {count}回")

    return all_tags, file_tags, file_count

def create_co_occurrence_matrix(file_tags):
    """タグの共起行列を作成"""
    co_occurrence = defaultdict(Counter)

    for tags in file_tags:
        for i, tag1 in enumerate(tags):
            for tag2 in tags[i:]:
                if tag1 != tag2:
                    co_occurrence[tag1][tag2] += 1
                    co_occurrence[tag2][tag1] += 1

    return co_occurrence

def create_sets_from_co_occurrence(co_occurrence, category_tags, num_sets=30, set_size=3):
    """共起行列からセットを作成"""
    sets = []

    print(f"\nカテゴリ内のタグ数: {len(category_tags)}")

    if len(category_tags) < 5:
        print(f"カテゴリ内のタグ: {category_tags}")

    # カテゴリタグが少なすぎる場合はすべてのタグを使用
    if len(category_tags) <= num_sets:
        print(f"カテゴリ内のタグ数が少ないため、すべてのタグを使用します")
        return [tag for tag in category_tags]

    # 各タグから始めて、最も共起度の高いタグを追加
    for seed_tag in random.sample(list(category_tags), min(num_sets * 2, len(category_tags))):
        tag_set = [seed_tag]
        current_tag = seed_tag

        # セットサイズになるまでタグを追加
        for _ in range(set_size - 1):
            if current_tag not in co_occurrence or not co_occurrence[current_tag]:
                break

            # 最も共起度の高いタグを選択
            most_common = co_occurrence[current_tag].most_common(10)
            if not most_common:
                break

            next_tag = most_common[0][0]

            # カテゴリに一致するタグか確認
            if next_tag in category_tags and next_tag not in tag_set:
                tag_set.append(next_tag)
                current_tag = next_tag
            else:
                # カテゴリに一致しないか既にセットにある場合はスキップ
                found = False
                for tag, _ in most_common:
                    if tag in category_tags and tag not in tag_set:
                        tag_set.append(tag)
                        current_tag = tag
                        found = True
                        break
                if not found:
                    break

        if len(tag_set) >= 2:  # 最低2つのタグがあるセットのみ追加
            sets.append(", ".join(tag_set))
            if len(sets) >= num_sets:
                break

    print(f"生成されたセット数: {len(sets)}")
    return sets

def create_yaml_structure_sets(all_tags, file_tags, file_count, num_sets=30):
    """
    タグをカテゴリ分けし、セット形式のYAML構造を作成
    """
    # タグをカテゴリごとに分類
    character_face_tags = set()  # 顔の特徴用
    character_body_tags = set()  # 体の特徴用
    clothing_tags = set()
    pose_tags = set()
    emotion_tags = set()
    angle_tags = set()
    background_tags = set()
    uncategorized_tags = set()  # 分類されなかったタグ

    # タグをカテゴリに分類
    for tag in all_tags:
        categorized = False

        # 顔の特徴（髪型・髪色・目の色など）
        if any(keyword in tag for keyword in ['hair', 'eyes', 'eyebrows', 'eyelashes', 'glasses',
                                             'makeup', 'lipstick', 'tongue', 'face', 'bangs']):
            character_face_tags.add(tag)
            categorized = True

        # 体の特徴
        elif any(keyword in tag for keyword in ['breasts', 'nipples', 'ass', 'thighs', 'legs', 'tail',
                                            'cleavage', 'collarbone', 'navel', 'midriff', 'flat_chest',
                                            'stomach', 'armpits', 'hip', 'tattoo', 'bare_shoulders', 'back',
                                            'muscle', 'slim', 'plump', 'tall', 'short', 'skin', 'freckles', 'body']):
            character_body_tags.add(tag)
            categorized = True

        # 衣装関連
        elif any(keyword in tag for keyword in ['dress', 'shirt', 'skirt', 'pants', 'uniform', 'costume',
                                            'swimsuit', 'bikini', 'naked', 'nude', 'clothes', 'hat',
                                            'shoes', 'boots', 'gloves', 'coat', 'jacket', 'suit', 'maid',
                                            'school_uniform', 'shorts', 'hoodie', 'tank_top',
                                            'pantyhose', 'thighhighs', 'lingerie', 'underwear', 'panties',
                                            'bra', 'kimono', 'apron', 'scarf', 'necktie', 'bow', 'bowtie']):
            clothing_tags.add(tag)
            categorized = True

        # ポーズとアクション
        elif any(keyword in tag for keyword in ['standing', 'sitting', 'lying', 'kneeling', 'bent_over',
                                             'arms', 'hands', 'hand_on_hip', 'crossed_arms',
                                             'spread_legs', 'walking', 'running', 'squatting', 'leaning',
                                             'jumping', 'stretching', 'sleeping', 'hugging',
                                             'on_side', 'on_back', 'on_stomach', 'legs_up', 'cowboy_shot',
                                             'sex', 'oral', 'anal', 'penetration', 'handjob',
                                             'footjob', 'fingering', 'masturbation', 'pose']):
            pose_tags.add(tag)
            categorized = True

        # 感情
        elif any(keyword in tag for keyword in ['smile', 'mouth', 'blush', 'frown',
                                             'pout', 'wink', 'tears', 'crying', 'happy', 'sad', 'angry',
                                             'surprised', 'embarrassed', 'annoyed', 'laughing', 'grin',
                                             'smirk', 'serious', 'worried', 'disappointed', 'confused',
                                             'excited', 'scared', 'expressionless', 'emotion']):
            emotion_tags.add(tag)
            categorized = True

        # 視点・アングル
        elif any(keyword in tag for keyword in ['looking', 'from_above', 'from_below', 'from_side',
                                             'from_behind', 'close-up', 'wide_shot', 'profile',
                                             'dutch_angle', 'pov', 'bird', 'worm', 'selfie',
                                             'shoulder', 'angle', 'view']):
            angle_tags.add(tag)
            categorized = True

        # 背景
        elif any(keyword in tag for keyword in ['indoors', 'outdoors', 'sky', 'night', 'day', 'city',
                                             'beach', 'forest', 'water', 'mountains', 'sunset', 'room',
                                             'bed', 'classroom', 'street', 'bathroom', 'kitchen', 'garden',
                                             'park', 'building', 'ruins', 'cafe', 'restaurant', 'shop',
                                             'school', 'train', 'car', 'vehicle', 'rain', 'snow', 'window',
                                             'background']):
            background_tags.add(tag)
            categorized = True

        # 分類されなかったタグ
        if not categorized:
            uncategorized_tags.add(tag)

    # カテゴリごとのタグ数を表示
    print("\nカテゴリごとのタグ数:")
    print(f"顔の特徴: {len(character_face_tags)}")
    print(f"体の特徴: {len(character_body_tags)}")
    print(f"衣装: {len(clothing_tags)}")
    print(f"ポーズ: {len(pose_tags)}")
    print(f"感情: {len(emotion_tags)}")
    print(f"アングル: {len(angle_tags)}")
    print(f"背景: {len(background_tags)}")
    print(f"未分類: {len(uncategorized_tags)}")

    # 未分類タグの一部を表示
    if uncategorized_tags:
        print("\n未分類タグ（最初の20個）:")
        for tag in list(uncategorized_tags)[:20]:
            print(f"  {tag}")

    # 共起行列を作成
    print("\n共起行列を作成中...")
    co_occurrence = create_co_occurrence_matrix(file_tags)

    # セットを作成
    print("\nセットを生成中...")
    charactermain = ["1girl,__characterface__,__characterbody__,__clothing__,__poseemotion__,__angle__,__backgrounds__"]

    print("\n顔の特徴セットを生成中...")
    characterface_sets = create_sets_from_co_occurrence(co_occurrence, character_face_tags, num_sets, 3)

    print("\n体の特徴セットを生成中...")
    characterbody_sets = create_sets_from_co_occurrence(co_occurrence, character_body_tags, num_sets, 3)

    print("\n衣装セットを生成中...")
    clothing_sets = create_sets_from_co_occurrence(co_occurrence, clothing_tags, num_sets, 3)

    # ポーズと感情を組み合わせたセット
    print("\nポーズと感情のセットを生成中...")
    pose_emotion_sets = []
    for pose in random.sample(list(pose_tags), min(num_sets, len(pose_tags))):
        if emotion_tags:
            emotions = random.sample(list(emotion_tags), min(2, len(emotion_tags)))
            pose_emotion_sets.append(f"{pose}, {', '.join(emotions)}")

    print(f"生成されたポーズ感情セット数: {len(pose_emotion_sets)}")

    print("\nアングルセットを生成中...")
    angle_sets = list(angle_tags)

    print("\n背景セットを生成中...")
    background_sets = create_sets_from_co_occurrence(co_occurrence, background_tags, num_sets, 2)

    # YAML構造を作成
    yaml_structure = {
        'charactermain': charactermain,
        'characterface': characterface_sets,
        'characterbody': characterbody_sets,
        'clothing': clothing_sets,
        'poseemotion': pose_emotion_sets,
        'angle': angle_sets,
        'backgrounds': background_sets,
        'uncategorized': list(uncategorized_tags),  # デバッグ用に未分類タグも含める
    }

    return yaml_structure

def save_yaml(yaml_structure, output_path):
    """YAML構造をファイルに保存する（セクション間に空行を挿入）"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(yaml_structure.items()):
            # キーの書き出し
            f.write(f"{key}:\n")

            # 値の書き出し
            for value in values:
                # 値は必ずダブルクォートで囲む
                f.write(f'  - "{value}"\n')

            # セクション間に空行を挿入（最後のセクション以外）
            if i < len(yaml_structure) - 1:
                f.write('\n')

def main():
    """メイン関数"""
    args = parse_arguments()
    print(f"=== タグファイルからワイルドカードYAML生成（セット形式） - デバッグ版 ===")

    # タグファイル取得
    tag_files = get_tag_files(args.input, args.max_files)
    if not tag_files:
        print(f"エラー: ディレクトリ '{args.input}' にタグファイルが見つかりません。")
        return

    # タグ分析
    print("\nタグを分析中...")
    all_tags, file_tags, file_count = analyze_files(tag_files, args.threshold)

    # YAML構造作成（セット形式）
    print("\nワイルドカードYAML構造を作成中（セット形式）...")
    yaml_structure = create_yaml_structure_sets(all_tags, file_tags, file_count, args.sets)

    # YAML保存
    print(f"\nワイルドカードYAML保存中... {args.output}")
    save_yaml(yaml_structure, args.output)

    print(f"完了しました。YAML出力: {args.output}")

if __name__ == "__main__":
    main()
