#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter
import random
from datetime import datetime

def parse_arguments():
    """コマンドライン引数のパース"""
    # 今日の日付を取得
    today = datetime.now().strftime("%Y%m%d")
    default_output = f'wildcards_all_{today}.yaml'

    parser = argparse.ArgumentParser(description='タグファイルをワイルドカードYAML形式に変換 (セット形式・すべてのタグ)')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力タグディレクトリ')
    parser.add_argument('--output', '-o', type=str, default=default_output, help='出力YAMLファイル')
    parser.add_argument('--sets', '-s', type=int, default=50, help='各カテゴリのセット数')
    return parser.parse_args()

def get_tag_files(input_dir):
    """指定ディレクトリからタグファイルのリストを取得"""
    files = list(Path(input_dir).glob('*.txt'))
    print(f"ディレクトリ内のtxtファイル総数: {len(files)}")
    return sorted(files)

def read_tags_from_file(file_path):
    """タグファイルからタグを読み取り（カンマ区切り、改行＋カンマ＋スコア形式をサポート）"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            tags = []

            # 改行ごとに処理
            if '\n' in content:
                for line in content.split('\n'):
                    line = line.strip()
                    if not line:
                        continue

                    # 「tag, score」形式の場合
                    if ',' in line:
                        tag_part = line.split(',')[0].strip()
                        if tag_part:
                            tags.append(tag_part)
                    # 「tag: score」形式の場合
                    elif ':' in line:
                        tag_part = line.split(':', 1)[0].strip()
                        if tag_part:
                            tags.append(tag_part)
                    else:
                        # 単独タグ
                        tags.append(line)
            else:
                # 改行がない場合はコンマ区切りとして処理
                for token in content.split(','):
                    token = token.strip()
                    if token:
                        # スコア値（数字）のみは除外
                        if token.replace('.', '', 1).isdigit():
                            continue
                        tags.append(token)

            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def analyze_files(tag_files):
    """タグファイルを分析してタグの出現頻度をカウント"""
    all_tags = Counter()
    file_tags = []  # 各ファイルのタグリストを保存
    file_count = 0
    total_tags = 0

    print(f"処理するファイル数: {len(tag_files)}")
    for file_path in tag_files:
        tags = read_tags_from_file(file_path)
        if not tags:
            continue

        total_tags += len(tags)
        file_tag_list = []
        for tag in tags:
            tag = tag.strip()
            if tag:
                all_tags[tag] += 1
                file_tag_list.append(tag)

        if file_tag_list:
            file_tags.append(file_tag_list)

        file_count += 1
        if file_count % 20 == 0:
            print(f"{file_count} ファイル処理済み...")

    print(f"合計 {file_count} ファイル処理完了")
    print(f"タグの総数: {total_tags}")
    print(f"一意なタグの数: {len(all_tags)}")

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

def create_sets_from_co_occurrence(co_occurrence, category_tags, num_sets=50, set_size=3):
    """共起行列からセットを作成"""
    sets = []
    category_tags_list = list(category_tags)

    # タグ数が少ない場合のエラー処理
    if len(category_tags_list) < set_size:
        if category_tags_list:  # 少なくとも1つはタグがある
            return [", ".join(category_tags_list)]
        return []

    # 最大セット数の調整
    max_possible_sets = len(category_tags_list) // set_size
    effective_num_sets = min(num_sets, max_possible_sets)

    # 共起度の高いタグからセットを構築
    for _ in range(effective_num_sets):
        if not category_tags_list or len(category_tags_list) < set_size:
            break

        # ランダムなシードタグから開始
        seed_tag = random.choice(category_tags_list)
        category_tags_list.remove(seed_tag)
        tag_set = [seed_tag]

        # 最も共起度の高いタグを追加
        for _ in range(set_size - 1):
            # seed_tagと共起度の高いタグを探す
            candidates = []
            for tag in category_tags_list:
                # 共起度を取得（存在しない場合は0）
                co_occur_count = co_occurrence[seed_tag][tag]
                candidates.append((tag, co_occur_count))

            # 候補がなければ終了
            if not candidates:
                break

            # 共起度の高い順にソート
            candidates.sort(key=lambda x: x[1], reverse=True)

            # 最も共起度の高いタグを追加
            next_tag = candidates[0][0]
            tag_set.append(next_tag)
            category_tags_list.remove(next_tag)

        if tag_set:
            sets.append(", ".join(tag_set))

    # 残りのタグも追加（単一タグのセットも可）
    while category_tags_list:
        remaining_set = []
        for _ in range(min(set_size, len(category_tags_list))):
            if category_tags_list:
                remaining_set.append(category_tags_list.pop(0))

        if remaining_set:
            sets.append(", ".join(remaining_set))

    return sets

def categorize_tags(all_tags):
    """タグをカテゴリに分類"""
    # カテゴリの定義
    character_main_tags = set()  # メインキャラクター特性
    character_face_tags = set()  # 顔の特徴
    character_body_tags = set()  # 体の特徴
    clothing_tags = set()  # 衣装
    pose_tags = set()  # ポーズ
    emotion_tags = set()  # 感情
    angle_tags = set()  # アングル
    background_tags = set()  # 背景
    other_tags = set()  # その他のタグ
    style_tags = set()  # 描写・画風・エフェクト
    sexual_tags = set()  # 性的行為・R18要素

    # キーワードリスト
    character_main_keywords = ['1girl', 'girl', 'female', '1boy', 'male', 'woman', 'man', 'loli', 'shota', 'solo']

    # 髪と目、顔の特徴に関するキーワードを更に詳細に定義
    face_keywords = [
        'hair', 'eyes', 'eyebrows', 'eyelashes', 'glasses', 'makeup', 'lipstick',
        'tongue', 'face', 'bangs', 'sidelocks', 'pubic_hair', 'female_pubic_hair',
        'male_pubic_hair', 'heterochromia', 'intakes', 'ear', 'forehead',
        # 色を含む髪の特徴
        'black_hair', 'brown_hair', 'blonde_hair', 'white_hair', 'gray_hair', 'grey_hair',
        'blue_hair', 'purple_hair', 'pink_hair', 'red_hair', 'green_hair', 'orange_hair',
        'multicolored_hair', 'two-tone_hair', 'gradient_hair',
        # 髪型
        'short_hair', 'medium_hair', 'long_hair', 'very_long_hair', 'twintails', 'twin_braids',
        'ponytail', 'side_ponytail', 'high_ponytail', 'low_ponytail', 'braid', 'braided_bangs',
        'hair_bun', 'double_bun', 'hair_over_one_eye', 'hair_between_eyes', 'hair_over_shoulder',
        # 目の色
        'blue_eyes', 'red_eyes', 'brown_eyes', 'green_eyes', 'purple_eyes', 'yellow_eyes',
        'black_eyes', 'gray_eyes', 'grey_eyes', 'pink_eyes', 'orange_eyes', 'multicolored_eyes',
        'empty_eyes', 'glowing_eyes', 'closed_eyes', 'half-closed_eyes'
    ]

    # 体の特徴
    body_keywords = ['breasts', 'nipples', 'ass', 'thighs', 'legs', 'tail', 'cleavage',
                     'collarbone', 'navel', 'midriff', 'flat_chest', 'stomach', 'armpits',
                     'hip', 'tattoo', 'bare_shoulders', 'back', 'muscle', 'slim', 'plump',
                     'tall', 'short', 'skin', 'freckles', 'body', 'mole', 'animal_ears',
                     'groin', 'censored', 'anus', 'pussy', 'penis', 'toes', 'foot', 'feet',
                     'shiny_skin', 'covered_navel', 'skindentation', 'full_body', 'upper_body']

    # 衣装関連
    clothing_keywords = ['dress', 'shirt', 'skirt', 'pants', 'uniform', 'costume', 'swimsuit',
                         'bikini', 'naked', 'nude', 'clothes', 'hat', 'shoes', 'boots', 'gloves',
                         'coat', 'jacket', 'suit', 'maid', 'school_uniform', 'shorts', 'hoodie',
                         'tank_top', 'pantyhose', 'thighhighs', 'lingerie', 'underwear', 'panties',
                         'bra', 'kimono', 'apron', 'scarf', 'necktie', 'bow', 'bowtie', 'buruma',
                         'upskirt', 'topless', 'bottomless', 'collar', 'sailor_collar', 'serafuku',
                         'choker', 'socks', 'white_socks', 'sleeveless', 'puffy_sleeves', 'frills',
                         'crop_top', 'sleeveless_shirt', 'veil', 'wedding_dress', 'bridal_veil',
                         'maid_headdress', 'headdress', 'sportswear', 'highleg', 'spaghetti_strap',
                         'zettai_ryouiki', 'strap', 'buttons', 'cuffs', 'wrist_cuffs', 'tucked_in']

    pose_keywords = ['standing', 'sitting', 'lying', 'kneeling', 'bent_over', 'arms', 'hands',
                     'hand_on_hip', 'crossed_arms', 'spread_legs', 'walking', 'running', 'squatting',
                     'leaning', 'jumping', 'stretching', 'sleeping', 'hugging', 'on_side', 'on_back',
                     'on_stomach', 'legs_up', 'cowboy_shot', 'pose', 'cowgirl_position', 'doggy',
                     'doggystyle', 'missionary', 'leg_up', 'straddling', 'all_fours', 'head_on_pillow',
                     'arm_support', 'hand_up', 'hands_up', 'v', 'v_arms', 'arms_up', 'bare_arms',
                     'head_tilt', 'feet_out_of_frame', 'foot_out_of_frame', 'leaning_forward',
                     'hand_on_own_knee', 'hands_on_lap', 'between_legs', 'hand_between_legs',
                     'holding']

    emotion_keywords = ['smile', 'mouth', 'blush', 'frown', 'pout', 'wink', 'tears', 'crying',
                        'happy', 'sad', 'angry', 'surprised', 'embarrassed', 'annoyed', 'laughing',
                        'grin', 'smirk', 'serious', 'worried', 'disappointed', 'confused', 'excited',
                        'scared', 'expressionless', 'emotion', 'open_mouth', 'closed_mouth', 'parted_lips',
                        'upper_teeth', 'teeth', 'nose', 'lips', 'furrowed_brow', 'nose_blush', 'tearing_up',
                        ':d', 'sweat', 'sweatdrop', 'light_smile', 'light_blush', 'dot_nose']

    angle_keywords = ['looking', 'from_above', 'from_below', 'from_side', 'from_behind', 'close-up',
                      'wide_shot', 'profile', 'dutch_angle', 'pov', 'bird', 'worm', 'selfie', 'shoulder',
                      'angle', 'view', 'looking_at_viewer', 'looking_back', 'pov_crotch', 'sex_from_behind',
                      'looking_to_the_side', 'shoulder_blades']

    background_keywords = ['indoors', 'outdoors', 'sky', 'night', 'day', 'city', 'beach', 'forest',
                           'water', 'mountains', 'sunset', 'room', 'bed', 'classroom', 'street',
                           'bathroom', 'kitchen', 'garden', 'park', 'building', 'ruins', 'cafe',
                           'restaurant', 'shop', 'school', 'train', 'car', 'vehicle', 'rain', 'snow',
                           'window', 'background', 'pillow', 'curtains', 'bed_sheet', 'sunlight', 'bedroom',
                           'architecture', 'bench', 'bush', 'cloud', 'cloudy_sky', 'blue_sky', 'flower',
                           'plant', 'potted_plant', 'school_bag', 'tree', 'water_drop', 'summer',
                           'east_asian_architecture', 'pool', 'picture_frame', 'on_bed']

    # 描写・画風・エフェクト系のキーワード
    style_keywords = ['sketch', 'blurry', 'blur', 'blur_censor', 'identity_censor', 'painterly',
                      'realistic', 'faux_traditional_media', 'glitch', 'depth_of_field',
                      'light', 'light_rays', 'shadow', 'shade', 'sunlight', 'dramatic_lighting']

    # 性的・R18 系キーワード
    sexual_keywords = [
        'sex', 'sexual', 'nude', 'nudity', 'naked', 'cum', 'semen', 'ejaculation',
        'penis', 'vagina', 'pussy', 'anal', 'fingering', 'masturbation', 'orgasm',
        'fellatio', 'blowjob', 'handjob', 'footjob', 'cunnilingus', 'penetration',
        'intercourse', 'deepthroat', 'cumshot', 'cum_in_mouth', 'cum_on_face',
        'cum_inside', 'pov_crotch', 'pov_penetration', 'bdsm', 'bondage', 'tentacle',
        'sex_toy', 'vibrator', 'dildo', 'condom', 'breeding', 'fluid', 'explicit',
        'cameltoe', 'sideboob', 'underboob', 'thigh_gap', 'areola', 'areola_slip',
        'nipple', 'nipples', 'nipple_slip', 'crotch', 'large_areolae', 'pubic_hair',
        'pussy_juice', 'spitroast', 'double_penetration'
    ]

    # タグをカテゴリに分類
    for tag in all_tags:
        tag_lower = tag.lower().replace(' ', '_')  # 空白をアンダースコアに変換して小文字に
        categorized = False

        # 髪色と目の色は優先的に顔の特徴に分類
        if 'hair' in tag_lower or 'eyes' in tag_lower or 'ponytail' in tag_lower or 'sidelocks' in tag_lower:
            character_face_tags.add(tag)
            categorized = True
            continue

        # キャラクターメイン特性
        if any(keyword in tag_lower for keyword in character_main_keywords):
            character_main_tags.add(tag)
            categorized = True

        # 顔の特徴
        if any(keyword in tag_lower for keyword in face_keywords):
            character_face_tags.add(tag)
            categorized = True

        # 体の特徴
        if any(keyword in tag_lower for keyword in body_keywords):
            character_body_tags.add(tag)
            categorized = True

        # 衣装
        if any(keyword in tag_lower for keyword in clothing_keywords):
            clothing_tags.add(tag)
            categorized = True

        # ポーズ
        if any(keyword in tag_lower for keyword in pose_keywords):
            pose_tags.add(tag)
            categorized = True

        # 感情
        if any(keyword in tag_lower for keyword in emotion_keywords):
            emotion_tags.add(tag)
            categorized = True

        # アングル
        if any(keyword in tag_lower for keyword in angle_keywords):
            angle_tags.add(tag)
            categorized = True

        # 背景
        if any(keyword in tag_lower for keyword in background_keywords):
            background_tags.add(tag)
            categorized = True

        # スタイル / エフェクト
        if any(keyword in tag_lower for keyword in style_keywords):
            style_tags.add(tag)
            categorized = True

        # 性的
        if any(keyword in tag_lower for keyword in sexual_keywords):
            sexual_tags.add(tag)
            categorized = True

        # どのカテゴリにも属さないタグ
        if not categorized:
            other_tags.add(tag)

    # カテゴリごとのタグ数を表示
    print("\nカテゴリごとのタグ数:")
    print(f"キャラクターメイン: {len(character_main_tags)}個")
    print(f"顔の特徴: {len(character_face_tags)}個")
    print(f"体の特徴: {len(character_body_tags)}個")
    print(f"衣装: {len(clothing_tags)}個")
    print(f"ポーズ: {len(pose_tags)}個")
    print(f"感情: {len(emotion_tags)}個")
    print(f"アングル: {len(angle_tags)}個")
    print(f"背景: {len(background_tags)}個")
    print(f"スタイル: {len(style_tags)}個")
    print(f"性的: {len(sexual_tags)}個")
    print(f"未分類: {len(other_tags)}個")

    if other_tags:
        print("\n未分類タグ一覧:")
        for tag in sorted(other_tags):
            print(f"  {tag}")

    return {
        "character_main": character_main_tags,
        "character_face": character_face_tags,
        "character_body": character_body_tags,
        "clothing": clothing_tags,
        "pose": pose_tags,
        "emotion": emotion_tags,
        "angle": angle_tags,
        "background": background_tags,
        "sexual": sexual_tags,
        "style": style_tags,
        "other": other_tags
    }

def create_yaml_structure(all_tags, file_tags, categorized_tags, num_sets=50):
    """セット形式のYAML構造を作成"""
    print("\n共起行列を作成中...")
    co_occurrence = create_co_occurrence_matrix(file_tags)

    # メインテンプレート
    charactermain = ["1girl,__characterface__,__characterbody__,__clothing__,__poseemotion__,__angle__,__backgrounds__,__style__,__sexual__"]

    # 各カテゴリからセットを作成
    print("\n顔の特徴セットを生成中...")
    characterface_sets = create_sets_from_co_occurrence(
        co_occurrence, categorized_tags["character_face"], num_sets, 3)

    print("\n体の特徴セットを生成中...")
    characterbody_sets = create_sets_from_co_occurrence(
        co_occurrence, categorized_tags["character_body"], num_sets, 3)

    print("\n衣装セットを生成中...")
    clothing_sets = create_sets_from_co_occurrence(
        co_occurrence, categorized_tags["clothing"], num_sets, 3)

    # ポーズと感情を組み合わせたセット
    print("\nポーズと感情のセットを生成中...")
    poseemotion_sets = []

    # ポーズと感情が十分にある場合
    if categorized_tags["pose"] and categorized_tags["emotion"]:
        # ポーズごとに感情を組み合わせる
        for pose in sorted(categorized_tags["pose"]):
            # ポーズに対応する共起感情を見つける
            emotions = []
            if pose in co_occurrence:
                for emotion, count in co_occurrence[pose].items():
                    if emotion in categorized_tags["emotion"]:
                        emotions.append((emotion, count))

                # 共起度の高い順にソート
                emotions.sort(key=lambda x: x[1], reverse=True)

                # 上位2つの感情を取得
                top_emotions = [e[0] for e in emotions[:2]]

                # 感情が見つからない場合はランダムに選択
                if not top_emotions and categorized_tags["emotion"]:
                    top_emotions = random.sample(categorized_tags["emotion"],
                                               min(2, len(categorized_tags["emotion"])))

                if top_emotions:
                    poseemotion_sets.append(f"{pose}, {', '.join(top_emotions)}")

    # 十分なセットができなかった場合、残りをランダムに作成
    poses_list = sorted(categorized_tags["pose"])
    emotions_list = sorted(categorized_tags["emotion"])
    while len(poseemotion_sets) < num_sets and poses_list and emotions_list:
        pose = random.choice(poses_list)
        emotions = random.sample(emotions_list, min(2, len(emotions_list)))
        poseemotion_sets.append(f"{pose}, {', '.join(emotions)}")

    print(f"生成されたポーズ感情セット数: {len(poseemotion_sets)}")

    print("\nアングルセットを生成中...")
    angle_sets = sorted(categorized_tags["angle"])

    print("\n背景セットを生成中...")
    backgrounds_sets = create_sets_from_co_occurrence(
        co_occurrence, categorized_tags["background"], num_sets, 2)

    # スタイルセット
    print("\nスタイルセットを生成中...")
    style_sets = sorted(categorized_tags["style"])

    # 性的タグセット（共起2語セット）
    print("\n性的タグセットを生成中...")
    sexual_sets = create_sets_from_co_occurrence(
        co_occurrence, categorized_tags["sexual"], num_sets, 2)

    # YAML構造を作成
    yaml_structure = {
        'charactermain': charactermain,
        'characterface': characterface_sets,
        'characterbody': characterbody_sets,
        'clothing': clothing_sets,
        'poseemotion': poseemotion_sets,
        'angle': angle_sets,
        'backgrounds': backgrounds_sets,
        'style': style_sets,
        'sexual': sexual_sets,
    }

    return yaml_structure

def save_yaml(yaml_structure, output_path):
    """YAML構造をファイルに保存"""
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
    args = parse_arguments()
    print(f"=== タグファイルからワイルドカードYAML生成（セット形式・すべてのタグ） ===")

    # タグファイル取得
    tag_files = get_tag_files(args.input)
    if not tag_files:
        print(f"エラー: ディレクトリ '{args.input}' にタグファイルが見つかりません。")
        return

    # タグ分析
    print("\nタグを分析中...")
    all_tags, file_tags, file_count = analyze_files(tag_files)

    # タグをカテゴリに分類
    print("\nタグをカテゴリに分類中...")
    categorized_tags = categorize_tags(all_tags)

    # YAML構造作成
    print("\nYAML構造を作成中...")
    yaml_structure = create_yaml_structure(all_tags, file_tags, categorized_tags, args.sets)

    # 出力ファイルのフルパスを取得（絶対パス）
    output_path = os.path.abspath(args.output)

    # YAML保存
    print(f"\nYAMLファイルを保存中... {args.output}")
    print(f"フルパス: {output_path}")
    save_yaml(yaml_structure, args.output)

    print(f"完了しました。YAML出力: {args.output}")
    print(f"保存場所: {output_path}")

if __name__ == "__main__":
    main()
