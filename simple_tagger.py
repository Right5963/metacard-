#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import glob
import numpy as np
from PIL import Image
import onnxruntime as ort
import pandas as pd
import argparse
from tqdm import tqdm

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
    parser = argparse.ArgumentParser(description='EVA02タガーで一括タグ付けとカテゴリ分け')
    parser.add_argument('--input', '-i', type=str, required=True, help='入力画像ディレクトリ')
    parser.add_argument('--output', '-o', type=str, required=True, help='出力ディレクトリ')
    parser.add_argument('--threshold', '-t', type=float, default=0.05, help='タグの閾値 (0.0-1.0)')
    parser.add_argument('--model-dir', '-m', type=str, default='tagger_data', help='モデルディレクトリ')
    return parser.parse_args()

def get_image_files(input_dir):
    """指定ディレクトリから画像ファイルのリストを取得"""
    extensions = ['*.jpg', '*.jpeg', '*.png', '*.webp', '*.bmp']
    files = []

    for ext in extensions:
        files.extend(glob.glob(os.path.join(input_dir, ext)))
        files.extend(glob.glob(os.path.join(input_dir, ext.upper())))

    return sorted(files)

def preprocess_image(img_path):
    """画像を読み込み、前処理する"""
    try:
        img = Image.open(img_path).convert('RGB')

        # リサイズ (448x448)
        img_resized = img.resize((448, 448), resample=Image.LANCZOS)

        # NumPy配列に変換 & 正規化
        img_array = np.array(img_resized).astype(np.float32) / 255.0

        # バッチ次元を追加
        img_array = np.expand_dims(img_array, axis=0)

        return img_array
    except Exception as e:
        print(f"画像前処理エラー {img_path}: {e}")
        return None

def load_model_and_tags(model_dir):
    """モデルとタグリストを読み込む"""
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    # タグリストを読み込む
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()

    # モデルをロード
    providers = ['CPUExecutionProvider']
    session = ort.InferenceSession(model_path, providers=providers)

    return session, labels

def categorize_tags(tags_with_scores):
    """タグをカテゴリごとに分類"""
    categorized = {}
    uncategorized = []

    for tag, score in tags_with_scores:
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
        f.write("=== 上位30個のタグ ===\n")
        for i, (tag, score) in enumerate(tags_with_scores[:30]):
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

    # モデルとタグリストの読み込み
    print(f"モデルとタグ定義を読み込んでいます: {args.model_dir}")
    try:
        session, labels = load_model_and_tags(args.model_dir)

        # 入出力の情報取得
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        input_shape = session.get_inputs()[0].shape
        print(f"モデル入力形状: {input_shape}")
        print(f"利用可能なタグ数: {len(labels)}")
    except Exception as e:
        print(f"モデル読み込みエラー: {e}")
        return

    # 画像ファイルのリスト取得
    image_files = get_image_files(args.input)
    if not image_files:
        print(f"エラー: ディレクトリ '{args.input}' に画像ファイルが見つかりません。")
        return

    print(f"処理する画像数: {len(image_files)}")
    print(f"タグ閾値: {args.threshold}")

    # 画像処理
    results = []
    for image_file in tqdm(image_files, desc="画像処理"):
        try:
            # 画像の前処理
            img_array = preprocess_image(image_file)
            if img_array is None:
                continue

            # モデルに合わせて形状調整（NHWC→NCHW）
            if len(input_shape) == 4 and input_shape[1] == 3:
                img_array = np.transpose(img_array, (0, 3, 1, 2))

            # 推論実行
            probs = session.run([output_name], {input_name: img_array})[0]

            # タグと確率をペアにする
            tags_with_scores = [(labels[i], float(probs[0][i])) for i in range(len(labels))]
            tags_with_scores.sort(key=lambda x: x[1], reverse=True)

            # 閾値以上のタグのみフィルタリング
            filtered_tags = [(tag, score) for tag, score in tags_with_scores if score >= args.threshold]

            # タグを保存
            output_file = save_tags_to_file(image_file, filtered_tags, args.output, args.threshold)
            results.append((image_file, len(filtered_tags), output_file))

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
    print("=== EVA02 Tagger 一括処理 ===")
    tag_images_batch(args)
    print("完了しました。")

if __name__ == "__main__":
    main()
