#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import requests
import time
from pathlib import Path
import argparse
from PIL import Image
from tqdm import tqdm

# WebUI APIのURL
WEBUI_URL = "http://127.0.0.1:8500"

# カテゴリ定義
TAG_CATEGORIES = {
    "キャラクター特性": ["1girl", "girl", "female", "1boy", "boy", "male", "woman", "man", "loli", "shota", "solo"],
    "衣装": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude",
              "clothes", "hat", "shoes", "boots", "gloves", "coat", "jacket", "suit"],
    "髪": ["long_hair", "short_hair", "blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair",
            "white_hair", "red_hair", "ponytail", "twintails", "braid", "hair_ornament", "hairclip"],
    "顔": ["smile", "open_mouth", "closed_eyes", "blush", "looking_at_viewer", "expressionless",
           "eyebrows", "eyelashes", "eye_color", "heterochromia"],
    "体": ["small_breasts", "medium_breasts", "large_breasts", "breasts", "ass", "thighs", "legs",
            "tail", "wings", "animal_ears", "cat_ears", "cleavage", "collarbone", "navel"],
    "ポーズ": ["standing", "sitting", "lying", "kneeling", "bent_over", "arms_up", "hands_up",
                "hand_on_hip", "crossed_arms", "spread_legs", "walking", "running"],
    "背景": ["indoors", "outdoors", "sky", "night", "day", "city", "beach", "forest", "water",
              "mountains", "sunset", "room", "bed", "classroom", "street"],
    "画質": ["highres", "absurdres", "lowres", "jpeg_artifacts", "blurry", "monochrome", "grayscale",
              "sketch", "watermark", "simple_background"],
    "スタイル": ["anime", "manga", "realistic", "3d", "sketch", "painting", "drawing", "digital_art",
                 "traditional_media", "photorealistic"]
}

def parse_arguments():
    """コマンドライン引数のパース"""
    parser = argparse.ArgumentParser(description='Stable Diffusion WebUI Taggerで一括タグ付けとカテゴリ分け')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力画像ディレクトリ')
    parser.add_argument('--output', '-o', type=str, required=True, help='出力ディレクトリ')
    parser.add_argument('--threshold', '-t', type=float, default=0.05, help='タグの閾値 (0.0-1.0)')
    parser.add_argument('--batch-size', '-b', type=int, default=10, help='一度に処理する画像数')
    parser.add_argument('--interrogator', type=str, default='wd-EVA02-Large-v3', help='使用するインタロゲーター')
    return parser.parse_args()

def get_image_files(input_dir):
    """指定ディレクトリから画像ファイルのリストを取得"""
    extensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    files = []

    for ext in extensions:
        files.extend(list(Path(input_dir).glob(f'*{ext}')))
        files.extend(list(Path(input_dir).glob(f'*{ext.upper()}')))

    return sorted(files)

def check_webui_status():
    """WebUIが動作しているか確認"""
    try:
        response = requests.get(f"{WEBUI_URL}/internal/ping")
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def interrogate_image(image_path, threshold=0.05, interrogator='wd-EVA02-Large-v3'):
    """WebUI API経由で画像のタグを取得"""
    # 画像をbase64エンコード
    try:
        with open(image_path, 'rb') as img_file:
            image_data = img_file.read()
    except Exception as e:
        print(f"画像ファイルの読み込みエラー {image_path}: {e}")
        return {}

    url = f"{WEBUI_URL}/sdapi/v1/interrogate"

    payload = {
        "image": f"data:image/jpeg;base64,{requests.utils.quote(image_data)}",
        "model": interrogator,
        "threshold": threshold
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        return result.get("tags", {})
    except requests.exceptions.RequestException as e:
        print(f"APIリクエストエラー: {e}")
        return {}

def categorize_tags(tags_with_scores):
    """タグをカテゴリごとに分類"""
    categorized = {}
    uncategorized = []

    for tag, score in tags_with_scores.items():
        assigned = False
        for category, keywords in TAG_CATEGORIES.items():
            if tag in keywords:
                if category not in categorized:
                    categorized[category] = []
                categorized[category].append((tag, score))
                assigned = True
                break

        if not assigned:
            uncategorized.append((tag, score))

    # スコア順にソート
    for category in categorized:
        categorized[category].sort(key=lambda x: x[1], reverse=True)
    uncategorized.sort(key=lambda x: x[1], reverse=True)

    return categorized, uncategorized

def save_tags_to_file(image_path, tags_with_scores, output_path, threshold):
    """タグを分類してテキストファイルに保存"""
    categorized, uncategorized = categorize_tags(tags_with_scores)

    # 元のファイル名からテキストファイル名を生成
    base_name = os.path.basename(image_path)
    file_name_without_ext = os.path.splitext(base_name)[0]
    output_file = os.path.join(output_path, f"{file_name_without_ext}.txt")

    with open(output_file, 'w', encoding='utf-8') as f:
        # 画像情報
        f.write(f"画像: {base_name}\n")
        f.write(f"閾値: {threshold}\n")
        f.write(f"検出タグ数: {len(tags_with_scores)}\n")
        f.write("\n")

        # すべてのタグ（上位30個）
        all_tags = sorted(tags_with_scores.items(), key=lambda x: x[1], reverse=True)
        f.write("=== 上位30個のタグ ===\n")
        for i, (tag, score) in enumerate(all_tags[:30]):
            f.write(f"{i+1:2d}. {tag}: {score:.6f}\n")
        f.write("\n")

        # カテゴリ別
        f.write("=== カテゴリ別 ===\n")
        for category, tags in categorized.items():
            if tags:
                f.write(f"\n■ {category}:\n")
                for tag, score in tags:
                    f.write(f"  - {tag}: {score:.6f}\n")

        if uncategorized:
            f.write("\n■ その他:\n")
            # 上位50個だけ表示
            for tag, score in uncategorized[:50]:
                f.write(f"  - {tag}: {score:.6f}\n")

    return output_file

def tag_images_batch(args):
    """画像の一括処理"""
    # 出力ディレクトリの作成
    os.makedirs(args.output, exist_ok=True)

    # WebUIの状態確認
    if not check_webui_status():
        print("エラー: WebUIが起動していないか、接続できません。")
        print(f"WebUI URL: {WEBUI_URL} が正しいことを確認してください。")
        return

    # 画像ファイルのリスト取得
    image_files = get_image_files(args.input)
    if not image_files:
        print(f"エラー: ディレクトリ '{args.input}' に画像ファイルが見つかりません。")
        return

    print(f"処理する画像数: {len(image_files)}")
    print(f"インタロゲーター: {args.interrogator}")
    print(f"タグ閾値: {args.threshold}")

    # 画像処理
    results = []
    for image_file in tqdm(image_files, desc="画像処理"):
        try:
            # 画像のタグ取得
            tags = interrogate_image(
                image_file,
                threshold=args.threshold,
                interrogator=args.interrogator
            )

            if not tags:
                print(f"警告: {image_file} のタグ付けに失敗しました。")
                continue

            # タグを保存
            output_file = save_tags_to_file(image_file, tags, args.output, args.threshold)
            results.append((image_file, len(tags), output_file))

            # APIに負荷をかけないよう少し待機
            time.sleep(0.5)

        except Exception as e:
            print(f"処理エラー {image_file}: {e}")

    # 結果サマリー
    print("\n=== 処理結果 ===")
    print(f"処理した画像数: {len(results)}/{len(image_files)}")
    if results:
        avg_tags = sum(r[1] for r in results) / len(results)
        print(f"平均タグ数: {avg_tags:.1f}")
    print(f"出力ディレクトリ: {os.path.abspath(args.output)}")

def main():
    """メイン関数"""
    args = parse_arguments()
    print("=== WebUI Tagger 一括処理 ===")
    tag_images_batch(args)
    print("完了しました。")

if __name__ == "__main__":
    main()
