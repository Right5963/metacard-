#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter
import datetime
from typing import List, Dict, Set, Tuple, Counter as CounterType, Optional, Any, Union
import itertools
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# カテゴリ定義
TAG_CATEGORIES = {
    "キャラクター": ["1girl", "girl", "female", "1boy", "male", "woman", "man", "loli", "shota", "solo", "2girls", "multiple girls"],
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
            "slim", "plump", "tall", "short", "pale_skin", "dark_skin", "freckles", "nipples"],
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

# 除外するタグのリスト
EXCLUDE_TAGS = [
    "sample", "watermark", "english text", "artist name", "cover", "artist logo", "web address",
    "doujin cover", "content rating", "novel cover", "copyright name", "company name", "logo",
    "chinese text", "character name", "character profile", "fake screenshot", "stats",
    "pixelated", "mosaic censoring", "censored", "copyright notice"
]

def parse_arguments():
    """コマンドライン引数のパース"""
    parser = argparse.ArgumentParser(description='タグファイルをセット形式のワイルドカードYAML形式に変換')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力タグディレクトリ')

    # 出力ファイル名に日付を追加するデフォルト値を設定
    today = datetime.datetime.now().strftime("%Y%m%d")
    default_output = f'wildcards_sets_{today}.yaml'
    parser.add_argument('--output', '-o', type=str, default=default_output, help='出力YAMLファイル')

    parser.add_argument('--threshold', '-t', type=float, default=0.6, help='タグを含めるしきい値')
    parser.add_argument('--similarity', '-s', type=float, default=0.5, help='共起性の類似度しきい値')
    parser.add_argument('--min-set-size', '-m', type=int, default=3, help='セットの最小サイズ')
    parser.add_argument('--max-set-size', '-x', type=int, default=10, help='セットの最大サイズ')
    return parser.parse_args()

def get_tag_files(input_dir: str) -> List[Path]:
    """指定ディレクトリからタグファイルのリストを取得"""
    files = list(Path(input_dir).glob('*.txt'))
    return sorted(files)

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
                    if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                        tags.append((tag, 1.0))  # デフォルトスコア1.0
            # コロン区切りのタグを処理（スコア付き）
            elif '\n' in content:
                for line in content.split('\n'):
                    if ':' in line:
                        tag, score_str = line.split(':', 1)
                        tag = tag.strip()
                        if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                            try:
                                score = float(score_str.strip())
                                tags.append((tag, score))
                            except ValueError:
                                # スコア変換エラーの場合はスキップ
                                continue
                    else:
                        # スコアがない場合はデフォルトスコア1.0を使用
                        tag = line.strip()
                        if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                            tags.append((tag, 1.0))
            else:
                # 単一行の場合
                if content and content.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                    tags.append((content, 1.0))

            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def analyze_files(tag_files: List[Union[str, Path]], threshold: float = 0.6) -> Tuple[Dict[str, List[Tuple[str, int]]], int]:
    """タグファイルを分析してタグの出現頻度と共起関係をカウント"""
    all_tags: CounterType[str] = Counter()
    file_count = 0
    tag_sets = []  # 各ファイルのタグセット

    print(f"処理するファイル数: {len(tag_files)}")

    # 各ファイルからタグを抽出し、タグセットリストを作成
    for file_path in tag_files:
        tags_with_scores = read_tags_from_file(file_path)
        if not tags_with_scores:
            continue

        # しきい値以上のタグのみを追加
        valid_tags = []
        for tag, score in tags_with_scores:
            if score >= threshold:
                tag = tag.strip()
                valid_tags.append(tag)
                all_tags[tag] += 1

        if valid_tags:
            tag_sets.append(valid_tags)

        file_count += 1
        if file_count % 100 == 0:
            print(f"{file_count} ファイル処理済み...")

    print(f"合計 {file_count} ファイル処理完了")
    print(f"一意なタグ数: {len(all_tags)}")

    # カテゴリごとにタグを分類
    categorized_tags = defaultdict(list)

    # 出現回数が1以上のタグとその出現回数をカテゴリごとにグループ化
    for tag, count in all_tags.items():
        if count > 0:
            # キャラクター数判定
            if "1girl" in tag or "solo" in tag:
                categorized_tags["character_main"].append((tag, count))
                continue
            if "2girls" in tag or "multiple girls" in tag:
                categorized_tags["character_main"].append((tag, count))
                continue

            # 顔の特徴（髪型・髪色・目の色など）
            if any(keyword in tag.lower() for keyword in ['hair', 'eyes', 'eyebrows', 'eyelashes', 'glasses',
                                                'sunglasses', 'makeup', 'lipstick', 'fangs', 'face']):
                categorized_tags["characterface"].append((tag, count))
                continue

            # 体の特徴
            if any(keyword in tag.lower() for keyword in ['breasts', 'ass', 'thighs', 'legs', 'tail', 'wings',
                                                'animal_ears', 'cat_ears', 'body']):
                categorized_tags["characterbody"].append((tag, count))
                continue

            # 衣装関連
            if any(keyword in tag.lower() for keyword in ['dress', 'shirt', 'skirt', 'pants', 'uniform', 'costume',
                                                'swimsuit', 'bikini', 'naked', 'nude', 'clothes']):
                categorized_tags["clothing"].append((tag, count))
                continue

            # ポーズと感情
            if any(keyword in tag.lower() for keyword in ['standing', 'sitting', 'lying', 'kneeling', 'smile',
                                                'open_mouth', 'closed_eyes', 'blush', 'emotion']):
                categorized_tags["poseemotion"].append((tag, count))
                continue

            # 視点・アングル
            if any(keyword in tag.lower() for keyword in ['looking_at', 'from_above', 'from_below', 'from_side',
                                                'from_behind', 'close-up', 'view']):
                categorized_tags["angle"].append((tag, count))
                continue

            # アクセサリー
            if any(keyword in tag.lower() for keyword in ['ribbon', 'bow', 'hairclip', 'accessory', 'jewelry',
                                                'necklace', 'earrings']):
                categorized_tags["accessories"].append((tag, count))
                continue

            # 背景
            if any(keyword in tag.lower() for keyword in ['indoors', 'outdoors', 'sky', 'night', 'day', 'city',
                                                'background']):
                categorized_tags["backgrounds"].append((tag, count))
                continue

            # スタイル
            if any(keyword in tag.lower() for keyword in ['anime', 'manga', 'realistic', '3d', 'sketch', 'style']):
                categorized_tags["style"].append((tag, count))
                continue

            # 上記のいずれにも当てはまらないものは体の特徴として扱う
            categorized_tags["characterbody"].append((tag, count))

    return categorized_tags, tag_sets, file_count

def create_tag_sets(categorized_tags: Dict[str, List[Tuple[str, int]]], tag_sets: List[List[str]],
                   min_set_size: int = 3, max_set_size: int = 10, similarity_threshold: float = 0.5) -> Dict[str, List[str]]:
    """カテゴリごとにタグのセットを作成"""
    result_sets = {}

    # character_mainは特別に処理
    character_main_tags = [tag for tag, _ in categorized_tags.get("character_main", [])]
    if "1girl" in character_main_tags or "solo" in character_main_tags:
        result_sets["character_main"] = [
            "セット1: 1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__"
        ]
    if "2girls" in character_main_tags or "multiple girls" in character_main_tags:
        result_sets["character_main"] = result_sets.get("character_main", []) + [
            "セット2: 2girls, multiple girls, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__"
        ]

    # その他のカテゴリを処理
    for category, tags_with_count in categorized_tags.items():
        if category == "character_main":
            continue  # character_mainは既に処理済み

        # タグのみのリストを作成
        tags = [tag for tag, _ in tags_with_count]

        if not tags:
            result_sets[category] = []
            continue

        # タグの共起行列を作成
        tag_occurrence = defaultdict(set)

        # 各タグがどのファイルに出現するかを記録
        for i, tag_set in enumerate(tag_sets):
            for tag in tag_set:
                if tag in tags:
                    tag_occurrence[tag].add(i)

        # タグの共起性を計算
        cooccurrence = defaultdict(float)
        for tag1, tag2 in itertools.combinations(tags, 2):
            # 両方のタグが出現するファイルの集合
            common_files = tag_occurrence[tag1].intersection(tag_occurrence[tag2])

            # いずれかのタグが出現するファイルの集合
            all_files = tag_occurrence[tag1].union(tag_occurrence[tag2])

            # Jaccard類似度を計算
            if all_files:
                similarity = len(common_files) / len(all_files)
                if similarity >= similarity_threshold:
                    cooccurrence[(tag1, tag2)] = similarity

        # タグをグループ化してセットを作成
        used_tags = set()
        tag_sets_result = []

        # 最も共起性の高いペアから順にセットを形成
        for (tag1, tag2), sim in sorted(cooccurrence.items(), key=lambda x: x[1], reverse=True):
            if tag1 in used_tags or tag2 in used_tags:
                continue

            # 新しいセットを開始
            current_set = {tag1, tag2}
            used_tags.add(tag1)
            used_tags.add(tag2)

            # 関連するタグを追加
            for tag in tags:
                if tag in used_tags:
                    continue

                # 現在のセット内のタグとの類似度を確認
                is_related = True
                for existing_tag in current_set:
                    if (tag, existing_tag) in cooccurrence or (existing_tag, tag) in cooccurrence:
                        continue
                    else:
                        is_related = False
                        break

                if is_related and len(current_set) < max_set_size:
                    current_set.add(tag)
                    used_tags.add(tag)

                if len(current_set) >= max_set_size:
                    break

            # セットサイズが最小値以上であれば追加
            if len(current_set) >= min_set_size:
                tag_sets_result.append(f"セット{len(tag_sets_result)+1}: {', '.join(sorted(current_set))}")

        # 残りの未使用タグも適宜セットに追加
        remaining_tags = [tag for tag in tags if tag not in used_tags]

        while remaining_tags:
            current_set = set()

            # 最大セットサイズまたは残りタグがなくなるまで追加
            while remaining_tags and len(current_set) < max_set_size:
                current_set.add(remaining_tags.pop(0))

            # セットサイズが最小値以上であれば追加
            if len(current_set) >= min_set_size:
                tag_sets_result.append(f"セット{len(tag_sets_result)+1}: {', '.join(sorted(current_set))}")

        result_sets[category] = tag_sets_result

    return result_sets

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

def main():
    """メイン関数"""
    args = parse_arguments()
    print(f"=== タグファイルからセット形式のワイルドカードYAML生成 ===")

    # タグファイル取得
    tag_files = get_tag_files(args.input)
    if not tag_files:
        print(f"エラー: ディレクトリ '{args.input}' にタグファイルが見つかりません。")
        return

    # タグ分析
    print("タグを分析中...")
    categorized_tags, tag_sets, file_count = analyze_files(tag_files, args.threshold)

    # タグセット作成
    print("タグセットを作成中...")
    yaml_structure = create_tag_sets(categorized_tags, tag_sets, args.min_set_size, args.max_set_size, args.similarity)

    # YAML保存
    print(f"ワイルドカードYAML保存中... {args.output}")
    save_yaml(yaml_structure, args.output)

    print(f"完了しました。YAML出力: {args.output}")

if __name__ == "__main__":
    main()
