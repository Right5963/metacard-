#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import glob
import numpy as np
from PIL import Image
import onnxruntime as ort
import time
from tqdm import tqdm

def preprocess_image(img_path, target_size=(448, 448)):
    """画像を読み込み、前処理を行う"""
    # 画像の読み込み
    img = Image.open(img_path).convert('RGB')

    # 高品質なリサイズ（LANCZOS法を使用）
    img_resized = img.resize(target_size, resample=Image.LANCZOS)

    # NumPy配列に変換
    img_array = np.array(img_resized).astype(np.float32) / 255.0

    # バッチ次元を追加 (1, H, W, C)
    img_array = np.expand_dims(img_array, axis=0)

    return img_array, img.size

def tag_few_images(input_dir, output_dir, max_images=5):
    """少数の画像にタグを付ける"""
    # 出力ディレクトリを作成
    os.makedirs(output_dir, exist_ok=True)

    # モデルパスとCSVパス
    model_dir = "tagger_data"
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    # CSVからタグを読み込む
    import pandas as pd
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()
    print(f"タグ数: {len(labels)}")

    # ONNXランタイムセッションの作成（CPUのみ使用）
    session_options = ort.SessionOptions()
    session_options.enable_profiling = False
    session_options.enable_mem_pattern = True
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    print(f"モデルをロード中... {model_path}")
    session = ort.InferenceSession(model_path, sess_options=session_options, providers=['CPUExecutionProvider'])

    # 入力/出力名を取得
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    input_shape = session.get_inputs()[0].shape
    print(f"モデルの入力形状: {input_shape}")

    # 画像ファイルの検索
    extensions = ["jpg", "jpeg", "png", "webp"]
    image_files = []

    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(input_dir, f"*.{ext}")))

    # 指定枚数に制限
    image_files = image_files[:max_images]
    print(f"{len(image_files)}枚の画像を処理します")

    # 各画像を処理
    for img_path in tqdm(image_files, desc="タグ付け中"):
        try:
            # 画像の前処理
            img_array, orig_size = preprocess_image(img_path)

            # モデルが期待する形式に変換（NHWC→NCHW）
            if len(input_shape) == 4 and input_shape[1] == 3:
                img_array = np.transpose(img_array, (0, 3, 1, 2))

            # 推論実行
            probs = session.run([output_name], {input_name: img_array})[0]

            # タグと確率をペアにする（閾値0.4以上）
            threshold = 0.4
            tags_with_scores = [(labels[i], float(probs[0][i])) for i in range(len(labels)) if probs[0][i] >= threshold]
            tags_with_scores.sort(key=lambda x: x[1], reverse=True)

            # 結果をテキストファイルに保存
            base_name = os.path.splitext(os.path.basename(img_path))[0]
            txt_path = os.path.join(output_dir, f"{base_name}.txt")

            with open(txt_path, 'w', encoding='utf-8') as f:
                for tag, score in tags_with_scores:
                    f.write(f"{tag}, {score:.6f}\n")

            print(f"画像 {base_name} には {len(tags_with_scores)} 個のタグがつきました")

            # 最初の10個のタグを表示
            print("上位10個のタグ:")
            for tag, score in tags_with_scores[:10]:
                print(f"  {tag}: {score:.4f}")
            print("")

        except Exception as e:
            print(f"エラー ({img_path}): {e}")

    print(f"処理完了。結果は {output_dir} に保存されました。")

if __name__ == "__main__":
    # ディレクトリの指定
    input_dir = "downloaded_images"
    output_dir = "test_few_results"
    max_images = 5  # 処理する最大画像数

    # 実行
    tag_few_images(input_dir, output_dir, max_images)
