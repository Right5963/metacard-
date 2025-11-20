#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter
import random

# カテゴリ定義
TAG_CATEGORIES = {
    "キャラクター": ["1girl", "girl", "female", "1boy", "male", "woman", "man", "loli", "shota", "solo"],
    "衣装": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude",
              "clothes", "hat", "shoes", "boots", "gloves", "coat", "jacket", "suit", "maid", "school_uniform",
              "serafuku", "shorts", "hoodie", "tank_top", "pantyhose", "thighhighs", "lingerie", "underwear",
              "panties", "bra", "kimono", "apron", "scarf", "necktie", "bow", "bowtie", "overalls", "stockings",
              "sweater", "cardigan", "sweatshirt", "blazer", "leotard", "pajamas"],
    "髪型": ["long_hair", "short_hair", "blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair",
            "white_hair", "red_hair", "ponytail", "twintails", "braid", "hair_ornament", "hairclip",
            "side_ponytail", "hair_bow", "hair_ribbon", "twin_braids", "drill_hair", "hime_cut", "bangs",
            "ahoge", "sidelocks", "messy_hair", "hair_over_one_eye", "hair_between_eyes"],
    "顔": ["expressionless", "eyebrows", "eyelashes", "blue_eyes", "green_eyes", "red_eyes", "brown_eyes",
           "heterochromia", "glasses", "sunglasses", "makeup", "lipstick", "fangs", "tongue", "tongue_out",
           "parted_lips", "looking_at_viewer", "looking_back"],
    "感情": ["smile", "open_mouth", "closed_eyes", "blush", "frown", "pout", "wink", "tears", "crying",
            "happy", "sad", "angry", "surprised", "embarrassed", "annoyed", "laughing", "grin", "smirk",
            "serious", "worried", "disappointed", "confused", "excited", "scared", "closed_mouth"],
    "身体": ["small_breasts", "medium_breasts", "large_breasts", "breasts", "ass", "thighs", "legs",
            "tail", "wings", "animal_ears", "cat_ears", "cleavage", "collarbone", "navel", "midriff",
            "flat_chest", "stomach", "armpits", "hip", "tattoo", "bare_shoulders", "back", "muscle",
            "slim", "plump", "tall", "short", "pale_skin", "dark_skin", "freckles"],
    "ポーズ": ["standing", "sitting", "lying", "kneeling", "bent_over", "arms_up", "hands_up",
               "hand_on_hip", "crossed_arms", "spread_legs", "walking", "running", "squatting",
               "leaning", "jumping", "stretching", "sleeping", "hugging", "hand_holding", "hand_on_own_face",
               "hand_in_hair", "on_side", "on_back", "on_stomach", "legs_up", "cowboy_shot"],
    "アングル": ["from_above", "from_below", "from_side", "from_behind", "close-up", "wide_shot",
                "profile", "dutch_angle", "pov", "bird's_eye_view", "worm's_eye_view", "selfie",
                "over-the-shoulder", "low_angle", "high_angle", "medium_shot", "full_body", "half_body"],
    "背景": ["indoors", "outdoors", "sky", "night", "day", "city", "beach", "forest", "water",
              "mountains", "sunset", "room", "bed", "classroom", "street", "bathroom", "kitchen",
              "garden", "park", "building", "ruins", "cafe", "restaurant", "shop", "school",
              "train", "car", "vehicle", "rain", "snow", "winter", "autumn", "spring", "summer"],
    "画質": ["highres", "absurdres", "lowres", "jpeg_artifacts", "blurry", "monochrome", "grayscale",
              "sketch", "watermark", "simple_background", "gradient_background", "white_background",
              "black_background", "colored_background", "transparent_background", "dynamic_angle"],
    "スタイル": ["anime", "manga", "realistic", "3d", "sketch", "painting", "drawing", "digital_art",
                 "traditional_media", "photorealistic", "chibi", "comic", "illustration"]
}

def parse_arguments():
    """コマンドライン引数のパース"""
    parser = argparse.ArgumentParser(description='タグファイルをワイルドカードYAML形式に変換')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力タグディレクトリ')
    parser.add_argument('--output', '-o', type=str, default='wildcards.yaml', help='出力YAMLファイル')
    parser.add_argument('--max-files', '-m', type=int, default=100, help='処理する最大ファイル数')
    parser.add_argument('--threshold', '-t', type=float, default=0.6, help='タグを含めるしきい値')
    return parser.parse_args()

def get_tag_files(input_dir, max_files=100):
    """指定ディレクトリからタグファイルのリストを取得"""
    files = list(Path(input_dir).glob('*.txt'))
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
    file_count = 0

    print(f"処理するファイル数: {len(tag_files)}")

    for file_path in tag_files:
        tags_with_scores = read_tags_from_file(file_path)
        if not tags_with_scores:
            continue

        # しきい値以上のタグのみを追加
        for tag, score in tags_with_scores:
            if score >= threshold:
                all_tags[tag.strip()] += 1

        file_count += 1
        if file_count % 10 == 0:
            print(f"{file_count} ファイル処理済み...")

    print(f"合計 {file_count} ファイル処理完了")
    print(f"一意なタグ数: {len(all_tags)}")

    return all_tags, file_count

def create_yaml_structure(all_tags, file_count, min_frequency=0.0):
    """
    タグをカテゴリ分けし、YAML構造を作成

    :param all_tags: タグと出現数のCounter
    :param file_count: 処理したファイルの総数
    :param min_frequency: 含めるタグの最小出現頻度（0.0〜1.0）
    :return: YAML構造の辞書
    """
    # タグをカテゴリごとに分類
    character_main_tags = set()
    character_face_tags = set()  # 顔の特徴用
    character_body_tags = set()  # 体の特徴用
    clothing_tags = set()
    pose_tags = set()
    emotion_tags = set()
    angle_tags = set()
    background_tags = set()
    style_tags = set()
    quality_tags = set()

    # 最小出現回数を計算
    min_count = min_frequency * file_count

    # タグをカテゴリに分類
    for tag, count in all_tags.items():
        if count < min_count:
            continue

        tag = tag.strip()
        if not tag:
            continue

        # キャラクターメイン特性
        if tag in ['1girl', 'solo', 'girl', 'female', '1boy', 'male', 'woman', 'man']:
            character_main_tags.add(tag)
            continue

        # 衣装関連
        if any(keyword in tag for keyword in ['dress', 'shirt', 'skirt', 'pants', 'uniform', 'costume',
                                            'swimsuit', 'bikini', 'naked', 'nude', 'clothes', 'hat',
                                            'shoes', 'boots', 'gloves', 'coat', 'jacket', 'suit', 'maid',
                                            'school_uniform', 'serafuku', 'shorts', 'hoodie', 'tank_top',
                                            'pantyhose', 'thighhighs', 'lingerie', 'underwear', 'panties',
                                            'bra', 'kimono', 'apron', 'scarf', 'necktie', 'bow', 'bowtie',
                                            'overalls', 'stockings', 'sweater', 'cardigan', 'sweatshirt',
                                            'blazer', 'leotard', 'pajamas']):
            clothing_tags.add(tag)
            continue

        # 顔の特徴（髪型・髪色・目の色など）
        if any(keyword in tag for keyword in ['hair', 'blonde', 'brown_hair', 'black_hair', 'blue_hair',
                                             'pink_hair', 'white_hair', 'red_hair', 'ponytail', 'twintails',
                                             'braid', 'hairclip', 'ahoge', 'hime_cut', 'bangs',
                                             'eyes', 'eyebrows', 'eyelashes', 'heterochromia',
                                             'glasses', 'sunglasses', 'makeup', 'lipstick', 'fangs', 
                                             'tongue', 'tongue_out', 'parted_lips', 'face']):
            character_face_tags.add(tag)
            continue

        # 体の特徴
        if any(keyword in tag for keyword in ['breasts', 'nipples', 'ass', 'thighs', 'legs', 'tail', 'wings',
                                            'animal_ears', 'cat_ears', 'cleavage', 'collarbone', 'navel',
                                            'midriff', 'flat_chest', 'stomach', 'armpits', 'hip', 'tattoo',
                                            'bare_shoulders', 'back', 'muscle', 'slim', 'plump', 'tall',
                                            'short', 'pale_skin', 'dark_skin', 'freckles', 'body']):
            character_body_tags.add(tag)
            continue

        # 視点・アングル - より包括的に
        if any(keyword in tag for keyword in ['looking_at', 'looking at', 'looking_back', 'looking back',
                                             'looking_away', 'looking away', 'looking_down', 'looking down',
                                             'looking_up', 'looking up', 'from_above', 'from above',
                                             'from_below', 'from below', 'from_side', 'from side',
                                             'from_behind', 'from behind', 'close-up', 'wide_shot',
                                             'profile', 'dutch_angle', 'pov', 'bird\'s_eye_view',
                                             'worm\'s_eye_view', 'selfie', 'over-the-shoulder',
                                             'low_angle', 'high_angle', 'medium_shot', 'full_body',
                                             'half_body', 'view']):
            angle_tags.add(tag)
            continue

        # ポーズとアクション
        if any(keyword in tag for keyword in ['standing', 'sitting', 'lying', 'kneeling', 'bent_over',
                                             'arms_up', 'hands_up', 'hand_on_hip', 'crossed_arms',
                                             'spread_legs', 'walking', 'running', 'squatting', 'leaning',
                                             'jumping', 'stretching', 'sleeping', 'hugging', 'hand_holding',
                                             'hand_on_own_face', 'hand_in_hair', 'on_side', 'on_back',
                                             'on_stomach', 'legs_up', 'cowboy_shot', 'masturbation',
                                             'sex', 'oral', 'anal', 'penetration', 'handjob', 'blowjob',
                                             'footjob', 'paizuri', 'fingering', 'female_masturbation',
                                             'male_masturbation', 'pose']):
            pose_tags.add(tag)
            continue

        # 感情 - より包括的に
        if any(keyword in tag for keyword in ['smile', 'open_mouth', 'closed_eyes', 'blush', 'frown',
                                             'pout', 'wink', 'tears', 'crying', 'happy', 'sad', 'angry',
                                             'surprised', 'embarrassed', 'annoyed', 'laughing', 'grin',
                                             'smirk', 'serious', 'worried', 'disappointed', 'confused',
                                             'excited', 'scared', 'closed_mouth', 'expressionless',
                                             'blushing', 'drooling', 'emotion', 'facial_expression']):
            emotion_tags.add(tag)
            continue

        # 背景
        if any(keyword in tag for keyword in ['indoors', 'outdoors', 'sky', 'night', 'day', 'city',
                                             'beach', 'forest', 'water', 'mountains', 'sunset', 'room',
                                             'bed', 'classroom', 'street', 'bathroom', 'kitchen', 'garden',
                                             'park', 'building', 'ruins', 'cafe', 'restaurant', 'shop',
                                             'school', 'train', 'car', 'vehicle', 'rain', 'snow', 'winter',
                                             'autumn', 'spring', 'summer', 'background']):
            background_tags.add(tag)
            continue

        # 画質
        if any(keyword in tag for keyword in ['highres', 'absurdres', 'lowres', 'jpeg_artifacts',
                                             'blurry', 'monochrome', 'grayscale', 'sketch', 'watermark',
                                             'simple_background', 'gradient_background', 'white_background',
                                             'black_background', 'colored_background', 'transparent_background',
                                             'dynamic_angle', 'high quality', 'best quality', 'masterpiece',
                                             'ultra detailed', '8k', '4k', 'hdr', 'quality']):
            quality_tags.add(tag)
            continue

        # スタイル
        if any(keyword in tag for keyword in ['anime', 'manga', 'realistic', '3d', 'sketch', 'painting',
                                             'drawing', 'digital_art', 'traditional_media', 'photorealistic',
                                             'chibi', 'comic', 'illustration', 'style']):
            style_tags.add(tag)
            continue

        # その他の特徴は体の特徴として扱う
        character_body_tags.add(tag)

    # セットを並べ替えたリストに変換
    character_main = sorted(list(character_main_tags))
    character_face = sorted(list(character_face_tags))
    character_body = sorted(list(character_body_tags))
    clothing = sorted(list(clothing_tags))
    poses = sorted(list(pose_tags))
    emotion = sorted(list(emotion_tags))
    angle = sorted(list(angle_tags))
    backgrounds = sorted(list(background_tags))
    styles = sorted(list(style_tags))
    quality = sorted(list(quality_tags))

    # カテゴリが空の場合デフォルト値を設定
    if not character_main:
        character_main = ["1girl"]
    if not emotion and 'looking_at_viewer' in character_face_tags:
        angle.append('looking_at_viewer')
        character_face_tags.discard('looking_at_viewer')

    # character_mainを再定義
    character_main = ["1girl,__characterface__,__characterbody__,__clothing__,__poseemotion__,__angle__,__backgrounds__"]

    # YAML構造を作成
    yaml_structure = {
        'character_main': character_main,
        'characterface': character_face,
        'characterbody': character_body,
        'clothing': clothing,
        'poses': poses,
        'emotion': emotion,
        'angle': angle,
        'backgrounds': backgrounds,
        'styles': styles,
        'quality': quality,
    }

    return yaml_structure

def process_quotes(text):
    """ワイルドカード参照に適切にクォートを処理"""
    # ワイルドカード参照を含む場合でもクォートを追加しない（yamlモジュールが処理する）
    return text

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
    print(f"=== タグファイルからワイルドカードYAML生成 ===")

    # タグファイル取得
    tag_files = get_tag_files(args.input, args.max_files)
    if not tag_files:
        print(f"エラー: ディレクトリ '{args.input}' にタグファイルが見つかりません。")
        return

    # タグ分析
    print("タグを分析中...")
    all_tags, file_count = analyze_files(tag_files, args.threshold)

    # YAML構造作成
    print("ワイルドカードYAML構造を作成中...")
    yaml_structure = create_yaml_structure(all_tags, file_count)

    # YAML保存
    print(f"ワイルドカードYAML保存中... {args.output}")
    save_yaml(yaml_structure, args.output)

    print(f"完了しました。YAML出力: {args.output}")

if __name__ == "__main__":
    main()
