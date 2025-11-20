#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter
import shutil
import datetime
from typing import List, Dict, Set, Tuple, Counter as CounterType, Optional, Any, Union

# カテゴリ定義
TAG_CATEGORIES = {
    "キャラクター": ["1girl", "girl", "female", "1boy", "male", "woman", "man", "loli", "shota", "solo"],
    "衣装": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude",
              "clothes", "hat", "shoes", "boots", "gloves", "coat", "jacket", "suit", "maid", "school_uniform"],
    "髪型": ["long_hair", "short_hair", "blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair",
            "white_hair", "red_hair", "ponytail", "twintails", "braid", "hair_ornament", "hairclip"],
    "顔": ["expressionless", "eyebrows", "eyelashes", "blue_eyes", "green_eyes", "red_eyes", "brown_eyes",
           "heterochromia", "glasses", "sunglasses", "makeup", "lipstick", "fangs", "tongue", "tongue_out"],
    "感情": ["smile", "open_mouth", "closed_eyes", "blush", "frown", "pout", "wink", "tears", "crying",
            "happy", "sad", "angry", "surprised", "embarrassed", "annoyed", "laughing", "grin", "smirk"],
    "身体": ["small_breasts", "medium_breasts", "large_breasts", "breasts", "ass", "thighs", "legs",
            "tail", "wings", "animal_ears", "cat_ears", "cleavage", "collarbone", "navel", "midriff"],
    "ポーズ": ["standing", "sitting", "lying", "kneeling", "bent_over", "arms_up", "hands_up",
               "hand_on_hip", "crossed_arms", "spread_legs", "walking", "running", "squatting"],
    "アングル": ["from_above", "from_below", "from_side", "from_behind", "close-up", "wide_shot",
                "profile", "dutch_angle", "pov", "bird's_eye_view", "worm's_eye_view", "selfie"],
    "背景": ["indoors", "outdoors", "sky", "night", "day", "city", "beach", "forest", "water",
              "mountains", "sunset", "room", "bed", "classroom", "street", "bathroom", "kitchen"],
    "画質": ["highres", "absurdres", "lowres", "jpeg_artifacts", "blurry", "monochrome", "grayscale",
              "sketch", "watermark", "simple_background", "gradient_background", "white_background"],
    "スタイル": ["anime", "manga", "realistic", "3d", "sketch", "painting", "drawing", "digital_art",
                 "traditional_media", "photorealistic", "chibi", "comic", "illustration"]
}

def copy_txt_files(src_dir: str, dest_dir: str) -> List[str]:
    """
    指定したソースディレクトリからすべてのtxtファイルをコピーする

    :param src_dir: コピー元ディレクトリパス
    :param dest_dir: コピー先ディレクトリパス
    :return: コピーしたファイルのリスト
    """
    # コピー先ディレクトリがない場合は作成
    os.makedirs(dest_dir, exist_ok=True)

    # ソースディレクトリが存在しなければエラー
    if not os.path.exists(src_dir):
        print(f"エラー: ディレクトリ '{src_dir}' が見つかりません。")
        return []

    copied_files: List[str] = []

    # txtファイルをすべて探してコピー
    for file in Path(src_dir).glob('*.txt'):
        dest_file = os.path.join(dest_dir, file.name)
        shutil.copy2(file, dest_file)
        copied_files.append(dest_file)

    return copied_files

def get_tag_files(input_dir: str, max_files: int = 100) -> List[Path]:
    """指定ディレクトリからタグファイルのリストを取得"""
    files = list(Path(input_dir).glob('*.txt'))
    return sorted(files)[:max_files]  # 最大ファイル数まで

def read_tags_from_file(file_path: Union[str, Path]) -> List[Tuple[str, float]]:
    """タグファイルからタグを読み取り"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            # コンマ区切りのタグを処理
            tags: List[Tuple[str, float]] = []
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
                    else:
                        # スコアがない場合はデフォルトスコア1.0を使用
                        tag = line.strip()
                        if tag:
                            tags.append((tag, 1.0))
            else:
                # 単一行の場合
                if content:
                    tags.append((content, 1.0))

            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def analyze_files(tag_files: List[Union[str, Path]], threshold: float = 0.6) -> Tuple[CounterType[str], int]:
    """タグファイルを分析してタグの出現頻度をカウント"""
    all_tags: CounterType[str] = Counter()
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

def create_yaml_structure(all_tags: CounterType[str], file_count: int, min_frequency: float = 0.0) -> Dict[str, List[str]]:
    """
    タグをカテゴリ分けし、YAML構造を作成

    :param all_tags: タグと出現数のCounter
    :param file_count: 処理したファイルの総数
    :param min_frequency: 含めるタグの最小出現頻度（0.0〜1.0）
    :return: YAML構造の辞書
    """
    # タグをカテゴリごとに分類
    character_main_tags: Set[str] = set()
    character_face_tags: Set[str] = set()  # 顔の特徴用
    character_body_tags: Set[str] = set()  # 体の特徴用
    clothing_tags: Set[str] = set()
    pose_tags: Set[str] = set()
    emotion_tags: Set[str] = set()
    angle_tags: Set[str] = set()
    background_tags: Set[str] = set()
    style_tags: Set[str] = set()
    quality_tags: Set[str] = set()

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
                                            'swimsuit', 'bikini', 'naked', 'nude', 'clothes', 'hat']):
            clothing_tags.add(tag)
            continue

        # 顔の特徴（髪型・髪色・目の色など）
        if any(keyword in tag for keyword in ['hair', 'eyes', 'eyebrows', 'eyelashes', 'glasses',
                                             'sunglasses', 'makeup', 'lipstick', 'fangs', 'face']):
            character_face_tags.add(tag)
            continue

        # 体の特徴
        if any(keyword in tag for keyword in ['breasts', 'ass', 'thighs', 'legs', 'tail', 'wings',
                                            'animal_ears', 'cat_ears', 'body']):
            character_body_tags.add(tag)
            continue

        # 視点・アングル
        if any(keyword in tag for keyword in ['looking_at', 'from_above', 'from_below', 'from_side',
                                             'from_behind', 'close-up', 'view']):
            angle_tags.add(tag)
            continue

        # ポーズとアクション
        if any(keyword in tag for keyword in ['standing', 'sitting', 'lying', 'kneeling', 'bent_over',
                                             'arms_up', 'hands_up', 'pose']):
            pose_tags.add(tag)
            continue

        # 感情
        if any(keyword in tag for keyword in ['smile', 'open_mouth', 'closed_eyes', 'blush', 'frown',
                                             'emotion', 'facial_expression']):
            emotion_tags.add(tag)
            continue

        # 背景
        if any(keyword in tag for keyword in ['indoors', 'outdoors', 'sky', 'night', 'day', 'city',
                                             'background']):
            background_tags.add(tag)
            continue

        # 画質
        if any(keyword in tag for keyword in ['highres', 'absurdres', 'lowres', 'quality']):
            quality_tags.add(tag)
            continue

        # スタイル
        if any(keyword in tag for keyword in ['anime', 'manga', 'realistic', '3d', 'sketch', 'style']):
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
    yaml_structure: Dict[str, List[str]] = {
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

def save_yaml(yaml_structure: Dict[str, List[str]], output_path: str) -> None:
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

def main() -> None:
    """メイン関数"""
    parser = argparse.ArgumentParser(description='外部ディレクトリからタグファイルをコピーしてワイルドカードYAML形式に変換')
    parser.add_argument('--source', '-s', type=str, required=True, help='ソースディレクトリ（txtファイルがあるフォルダ）')

    # 出力ファイル名に日付を追加するデフォルト値を設定
    today = datetime.datetime.now().strftime("%Y%m%d")
    default_output = f'wildcards_{today}.yaml'
    parser.add_argument('--output', '-o', type=str, default=default_output, help='出力YAMLファイル')

    parser.add_argument('--threshold', '-t', type=float, default=0.6, help='タグを含めるしきい値')
    args = parser.parse_args()

    print(f"=== 外部ディレクトリからタグファイルをコピーしてワイルドカードYAML生成 ===")

    # 一時ディレクトリの作成
    temp_dir = "temp_tags"

    # ソースディレクトリからtxtファイルをコピー
    print(f"'{args.source}' からtxtファイルをコピー中...")
    copied_files = copy_txt_files(args.source, temp_dir)

    if not copied_files:
        print(f"エラー: '{args.source}' からコピーできるtxtファイルがありません。")
        return

    print(f"{len(copied_files)}個のファイルをコピーしました。")

    # タグ分析
    print("タグを分析中...")
    all_tags, file_count = analyze_files(copied_files, args.threshold)

    # YAML構造作成
    print("ワイルドカードYAML構造を作成中...")
    yaml_structure = create_yaml_structure(all_tags, file_count)

    # YAML保存
    print(f"ワイルドカードYAML保存中... {args.output}")
    save_yaml(yaml_structure, args.output)

    print(f"完了しました。YAML出力: {args.output}")

    # 後片付け（一時ディレクトリの削除は、確認のためコメントアウト）
    # try:
    #     shutil.rmtree(temp_dir)
    #     print(f"一時ディレクトリ '{temp_dir}' を削除しました。")
    # except Exception as e:
    #     print(f"一時ディレクトリの削除中にエラーが発生しました: {e}")

if __name__ == "__main__":
    main()
