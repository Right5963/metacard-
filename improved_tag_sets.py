#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import yaml
import argparse
from pathlib import Path
from collections import defaultdict, Counter
import datetime
from typing import List, Dict, Set, Tuple, Counter as CounterType, Optional, Any, Union
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm

# カテゴリ定義
TAG_CATEGORIES = {
    "キャラクター": ["1girl", "girl", "female", "1boy", "male", "woman", "man", "loli", "shota", "solo", "2girls", "multiple girls"],
    "顔": ["face", "eyes", "blue_eyes", "red_eyes", "brown_eyes", "green_eyes", "heterochromia",
           "long_hair", "short_hair", "blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair",
           "white_hair", "red_hair", "ponytail", "twintails", "braid", "hair_ornament", "hairclip",
           "glasses", "sunglasses", "makeup", "lipstick", "fangs", "tongue", "tongue_out", "parted_lips"],
    "体": ["breasts", "small_breasts", "medium_breasts", "large_breasts", "huge_breasts", "flat_chest",
           "ass", "thighs", "legs", "tail", "wings", "animal_ears", "cat_ears", "cleavage", "collarbone",
           "navel", "midriff", "stomach", "armpits", "hip", "tattoo", "bare_shoulders", "back", "muscle",
           "slim", "plump", "tall", "short", "pale_skin", "dark_skin", "freckles", "nipples"],
    "衣装": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude",
             "clothes", "hat", "shoes", "boots", "gloves", "coat", "jacket", "suit", "maid", "school_uniform",
             "serafuku", "shorts", "hoodie", "tank_top", "pantyhose", "thighhighs", "lingerie", "underwear",
             "panties", "bra", "kimono", "apron", "scarf", "necktie", "bow", "bowtie", "overalls", "stockings",
             "sweater", "cardigan", "sweatshirt", "blazer", "leotard", "pajamas"],
    "ポーズ感情": ["standing", "sitting", "lying", "kneeling", "bent_over", "arms_up", "hands_up",
                   "hand_on_hip", "crossed_arms", "spread_legs", "walking", "running", "squatting",
                   "leaning", "jumping", "stretching", "sleeping", "hugging", "hand_holding",
                   "smile", "open_mouth", "closed_eyes", "blush", "frown", "pout", "wink", "tears", "crying",
                   "happy", "sad", "angry", "surprised", "embarrassed", "annoyed", "laughing", "grin", "smirk",
                   "serious", "worried", "disappointed", "confused", "excited", "scared", "closed_mouth"],
    "アングル": ["looking_at_viewer", "looking_back", "looking_away", "looking_down", "looking_up",
                 "from_above", "from_below", "from_side", "from_behind", "close-up", "wide_shot",
                 "profile", "dutch_angle", "pov", "bird's_eye_view", "worm's_eye_view", "selfie",
                 "over-the-shoulder", "low_angle", "high_angle", "medium_shot", "full_body", "half_body"],
    "背景": ["indoors", "outdoors", "sky", "night", "day", "city", "beach", "forest", "water",
             "mountains", "sunset", "room", "bed", "classroom", "street", "bathroom", "kitchen",
             "garden", "park", "building", "ruins", "cafe", "restaurant", "shop", "school",
             "train", "car", "vehicle", "rain", "snow", "winter", "autumn", "spring", "summer"],
    "スタイル": ["anime", "manga", "realistic", "3d", "sketch", "painting", "drawing", "digital_art",
                 "traditional_media", "photorealistic", "chibi", "comic", "illustration", "highres",
                 "absurdres", "monochrome", "grayscale", "colored"],
    "性的": ["breasts", "nipples", "ass", "thighs", "underwear", "bra", "panties", "nude", "naked",
            "topless", "no_bra", "bikini", "lingerie", "sexually_suggestive", "censored", "uncensored"]
}

# マッピングの作成（逆引き）
TAG_CATEGORY_MAP = {}
for category, tags in TAG_CATEGORIES.items():
    for tag in tags:
        TAG_CATEGORY_MAP[tag] = category

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
    default_output = f'wildcards_improved_{today}.yaml'
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

def read_tags_from_file(file_path: Union[str, Path], threshold: float = 0.6) -> List[str]:
    """タグファイルからタグを読み取り"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            # コンマ区切りのタグを処理
            tags = []
            if ',' in content:
                for tag in content.split(','):
                    tag = tag.strip()
                    if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                        tags.append(tag)
            # コロン区切りのタグを処理（スコア付き）
            elif '\n' in content:
                for line in content.split('\n'):
                    if ':' in line:
                        tag, score_str = line.split(':', 1)
                        tag = tag.strip()
                        if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                            try:
                                score = float(score_str.strip())
                                if score >= threshold:
                                    tags.append(tag)
                            except ValueError:
                                # スコア変換エラーの場合はスキップ
                                continue
                    else:
                        # スコアがない場合は追加
                        tag = line.strip()
                        if tag and tag.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                            tags.append(tag)
            else:
                # 単一行の場合
                if content and content.lower() not in [t.lower() for t in EXCLUDE_TAGS]:
                    tags.append(content)
            return tags
    except Exception as e:
        print(f"ファイル読み込みエラー {file_path}: {e}")
        return []

def categorize_tags(tags: List[str]) -> Dict[str, List[str]]:
    """タグをカテゴリ別に分類"""
    categorized = {
        "characterface": [],
        "characterbody": [],
        "clothing": [],
        "poseemotion": [],
        "angle": [],
        "backgrounds": [],
        "style": [],
        "sexual": [],
        "uncategorized": []
    }

    for tag in tags:
        tag_lower = tag.lower()

        # キャラクター主要属性をスキップ（これは別途処理）
        if tag in ["1girl", "solo", "girl", "female", "1boy", "male", "woman", "man"]:
            continue

        # 顔の特徴
        if any(keyword in tag_lower for keyword in ["hair", "eyes", "eyebrows", "eyelashes", "glasses",
                                                 "sunglasses", "makeup", "lipstick", "fangs", "face"]):
            categorized["characterface"].append(tag)
            continue

        # 体の特徴
        if any(keyword in tag_lower for keyword in ["breasts", "ass", "thighs", "legs", "tail", "wings",
                                                 "animal_ears", "cat_ears", "body", "skin"]):
            categorized["characterbody"].append(tag)
            continue

        # 衣装関連
        if any(keyword in tag_lower for keyword in ["dress", "shirt", "skirt", "pants", "uniform", "costume",
                                                 "swimsuit", "bikini", "naked", "nude", "clothes"]):
            categorized["clothing"].append(tag)
            continue

        # ポーズと感情
        if any(keyword in tag_lower for keyword in ["standing", "sitting", "lying", "smile", "mouth",
                                                 "eyes", "blush", "frown", "pose", "emotion"]):
            categorized["poseemotion"].append(tag)
            continue

        # アングル
        if any(keyword in tag_lower for keyword in ["looking", "from_above", "from_below", "angle",
                                                 "view", "viewer", "pov"]):
            categorized["angle"].append(tag)
            continue

        # 背景
        if any(keyword in tag_lower for keyword in ["indoors", "outdoors", "sky", "night", "day",
                                                 "city", "background"]):
            categorized["backgrounds"].append(tag)
            continue

        # スタイル
        if any(keyword in tag_lower for keyword in ["anime", "manga", "realistic", "3d", "sketch",
                                                 "painting", "style", "quality", "res"]):
            categorized["style"].append(tag)
            continue

        # 性的内容
        if any(keyword in tag_lower for keyword in ["breasts", "nipples", "ass", "underwear", "bra",
                                                 "panties", "nude", "naked", "sexually"]):
            categorized["sexual"].append(tag)
            continue

        # 上記のどれにも当てはまらない場合
        categorized["uncategorized"].append(tag)

    # 空のカテゴリを削除
    return {k: v for k, v in categorized.items() if v}

def create_tag_sets(tag_files: List[Path], min_set_size: int = 3, max_set_size: int = 10,
                    threshold: float = 0.6, similarity_threshold: float = 0.5) -> Dict[str, List[str]]:
    """タグファイルからカテゴリごとのセットを作成"""
    print(f"処理するファイル数: {len(tag_files)}")

    # 各ファイルごとの処理結果とカテゴリごとのタグを保持
    all_categorized_tags = {
        "characterface": [],
        "characterbody": [],
        "clothing": [],
        "poseemotion": [],
        "angle": [],
        "backgrounds": [],
        "style": [],
        "sexual": []
    }

    # ファイルごとのカテゴリ別タグリストを収集
    file_categorized_tags = []

    for file_path in tqdm(tag_files, desc="ファイル処理中"):
        tags = read_tags_from_file(file_path, threshold)
        if not tags:
            continue

        categorized = categorize_tags(tags)
        file_categorized_tags.append(categorized)

        # カテゴリごとのタグを追加
        for category, cat_tags in categorized.items():
            if category in all_categorized_tags:
                all_categorized_tags[category].extend(cat_tags)

    # カテゴリごとの出現頻度をカウント
    category_counts = {category: Counter(tags) for category, tags in all_categorized_tags.items()}

    # セットを作成
    result_sets = {}

    # character_mainは特別に処理
    result_sets["character_main"] = [
        "セット1: 1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__",
        "セット2: 2girls, multiple girls, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__"
    ]

    # 各カテゴリごとに共起解析を行い、セットを作成
    for category, counts in category_counts.items():
        # 出現回数でソートされたタグのリスト
        popular_tags = [tag for tag, count in counts.most_common() if count > 1]

        # カテゴリのセットリスト
        category_sets = []

        if len(popular_tags) < min_set_size:
            # タグが少ない場合はそのまま1セットとして追加
            if popular_tags:
                category_sets.append(", ".join(popular_tags))
        else:
            # 共起解析のためのデータ準備
            tag_cooccurrence = defaultdict(set)

            # ファイルごとの共起情報を収集
            for file_data in file_categorized_tags:
                if category in file_data and len(file_data[category]) > 1:
                    file_tags = set(file_data[category])
                    # 各タグの共起情報を更新
                    for tag in file_tags:
                        tag_cooccurrence[tag].update(file_tags - {tag})

            # 共起性に基づいてセットを生成
            remaining_tags = set(popular_tags)

            while remaining_tags and len(category_sets) < 10:  # 最大10セットまで
                # 最も人気のあるタグから開始
                if not remaining_tags:
                    break

                seed_tag = max(remaining_tags, key=lambda t: counts[t])
                remaining_tags.remove(seed_tag)

                current_set = {seed_tag}
                current_tags = list(remaining_tags)

                # 関連性の高いタグを追加
                for tag in current_tags:
                    # タグの共起スコアを計算
                    cooccur_score = len(tag_cooccurrence[seed_tag].intersection(tag_cooccurrence[tag])) / \
                                   max(1, len(tag_cooccurrence[seed_tag].union(tag_cooccurrence[tag])))

                    if cooccur_score >= similarity_threshold and len(current_set) < max_set_size:
                        current_set.add(tag)
                        remaining_tags.remove(tag)

                # 最小サイズ以上のセットのみ追加
                if len(current_set) >= min_set_size:
                    category_sets.append(", ".join(sorted(current_set)))

            # 残りのタグをその他セットとして追加
            if remaining_tags and len(remaining_tags) >= min_set_size:
                other_tags = sorted(list(remaining_tags))
                # 小さなグループに分割
                for i in range(0, len(other_tags), max_set_size):
                    group = other_tags[i:i+max_set_size]
                    if len(group) >= min_set_size:
                        category_sets.append(", ".join(group))

        # 結果に追加
        if category_sets:
            result_sets[category] = [f"セット{i+1}: {tag_set}" for i, tag_set in enumerate(category_sets)]

    return result_sets

def save_yaml(yaml_structure: Dict[str, List[str]], output_path: str) -> None:
    """YAMLファイルに保存（セクション間に空行を挿入）"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(yaml_structure.items()):
            # キーの書き出し
            f.write(f"{key}:\n")

            # 値の書き出し
            for value in values:
                # 値はダブルクォートで囲む
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

    # タグセット作成
    print(f"タグセットを作成中... 類似度しきい値: {args.similarity}, 最小セットサイズ: {args.min_set_size}")
    tag_sets = create_tag_sets(
        tag_files,
        min_set_size=args.min_set_size,
        max_set_size=args.max_set_size,
        threshold=args.threshold,
        similarity_threshold=args.similarity
    )

    # メインYAML保存
    print(f"ワイルドカードYAML保存中... {args.output}")
    save_yaml(tag_sets, args.output)

    # カテゴリごとのYAMLファイルも保存
    today = datetime.datetime.now().strftime("%Y%m%d")
    for category, sets in tag_sets.items():
        category_output = f'wildcards_{category}_{today}.yaml'
        print(f"カテゴリ別YAML保存中... {category_output}")
        category_structure = {category: sets}
        save_yaml(category_structure, category_output)

    print(f"完了しました。YAML出力: {args.output}")
    print(f"合計 {len(tag_files)} ファイルを処理しました。")
    print(f"生成されたセット数: {sum(len(sets) for sets in tag_sets.values())}")
    print(f"各カテゴリごとのYAMLファイルも保存しました。")

if __name__ == "__main__":
    main()
