#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import numpy as np
from PIL import Image
import onnxruntime as ort
import pandas as pd

# テスト対象の画像パス
TEST_IMAGE = "downloaded_images/item_1744566345_001.jpg"
OUTPUT_FILE = "single_image_result.txt"
THRESHOLD = 0.05  # 閾値を0.05に下げる

def preprocess_image(img_path):
    """画像を読み込み、前処理する"""
    print(f"画像読み込み: {img_path}")
    img = Image.open(img_path).convert('RGB')
    print(f"元の画像サイズ: {img.size}")

    # リサイズ (448x448)
    img_resized = img.resize((448, 448), resample=Image.LANCZOS)
    print(f"リサイズ後: {img_resized.size}")

    # NumPy配列に変換 & 正規化
    img_array = np.array(img_resized).astype(np.float32) / 255.0
    print(f"配列形状: {img_array.shape}, 値範囲: {img_array.min():.3f}〜{img_array.max():.3f}")

    # バッチ次元を追加
    img_array = np.expand_dims(img_array, axis=0)

    return img_array

def tag_single_image():
    """1枚の画像にタグを付ける"""
    # モデルとCSVのパス
    model_dir = "tagger_data"
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    # タグリストを読み込む
    print(f"タグ定義読み込み: {csv_path}")
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()
    print(f"利用可能なタグ数: {len(labels)}")

    # モデルをロード
    print(f"モデルロード: {model_path}")
    providers = ['CPUExecutionProvider']
    session = ort.InferenceSession(model_path, providers=providers)

    # 入出力の情報取得
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    input_shape = session.get_inputs()[0].shape
    print(f"モデル入力形状: {input_shape}")

    # 画像の前処理
    img_array = preprocess_image(TEST_IMAGE)

    # モデルに合わせて形状調整（NHWC→NCHW）
    if len(input_shape) == 4 and input_shape[1] == 3:
        print("CHW形式に変換")
        img_array = np.transpose(img_array, (0, 3, 1, 2))

    # 推論実行
    print("推論実行中...")
    probs = session.run([output_name], {input_name: img_array})[0]

    # タグと確率をペアにする
    tags_with_scores = [(labels[i], float(probs[0][i])) for i in range(len(labels))]
    tags_with_scores.sort(key=lambda x: x[1], reverse=True)

    # 閾値以上のタグのみフィルタリング
    filtered_tags = [(tag, score) for tag, score in tags_with_scores if score >= THRESHOLD]

    # 簡易的なカテゴリ分け
    categories = {
        "キャラクター特性": ["1girl", "girl", "female", "male", "1boy", "boy", "woman", "man", "loli", "shota"],
        "衣装": ["dress", "shirt", "skirt", "pants", "uniform", "costume", "swimsuit", "bikini", "naked", "nude"],
        "髪": ["long_hair", "short_hair", "blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair", "white_hair", "red_hair", "ponytail", "twintails"],
        "顔": ["smile", "open_mouth", "closed_eyes", "blush", "looking_at_viewer", "expressionless"],
        "体": ["small_breasts", "medium_breasts", "large_breasts", "breasts", "ass", "thighs"],
        "ポーズ": ["standing", "sitting", "lying", "kneeling", "bent_over", "arms_up", "hands_up"],
        "背景": ["indoors", "outdoors", "sky", "night", "day", "city", "beach", "forest", "water"],
        "画質": ["highres", "absurdres", "lowres", "jpeg_artifacts", "blurry"],
        "スタイル": ["anime", "manga", "realistic", "3d", "sketch", "painting", "drawing"]
    }

    categorized = {}
    uncategorized = []

    # タグを分類
    for tag, score in filtered_tags:
        assigned = False
        for category, keywords in categories.items():
            if tag in keywords:
                if category not in categorized:
                    categorized[category] = []
                categorized[category].append((tag, score))
                assigned = True
                break

        if not assigned:
            uncategorized.append((tag, score))

    # 結果を保存
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # 元の画像情報
        f.write(f"画像: {TEST_IMAGE}\n")
        f.write(f"閾値: {THRESHOLD}\n")
        f.write(f"検出タグ数: {len(filtered_tags)}\n")
        f.write("\n")

        # すべてのタグ（上位30個）
        f.write("=== 上位30個のタグ ===\n")
        for i, (tag, score) in enumerate(filtered_tags[:30]):
            f.write(f"{i+1:2d}. {tag}: {score:.6f}\n")
        f.write("\n")

        # カテゴリ別
        f.write("=== カテゴリ別 ===\n")
        for category, tags in categorized.items():
            if tags:
                f.write(f"\n■ {category}:\n")
                for tag, score in sorted(tags, key=lambda x: x[1], reverse=True):
                    f.write(f"  - {tag}: {score:.6f}\n")

        if uncategorized:
            f.write("\n■ その他:\n")
            # 上位50個だけ表示
            for tag, score in uncategorized[:50]:
                f.write(f"  - {tag}: {score:.6f}\n")

    # 結果を表示
    print(f"\n合計 {len(filtered_tags)} 個のタグが見つかりました (閾値 {THRESHOLD})")
    print("\n上位10個のタグ:")
    for i, (tag, score) in enumerate(filtered_tags[:10]):
        print(f"{i+1:2d}. {tag}: {score:.6f}")

    print(f"\n結果は {OUTPUT_FILE} に保存されました")

if __name__ == "__main__":
    tag_single_image()
