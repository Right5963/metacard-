#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import numpy as np
from PIL import Image
import onnxruntime as ort
import pandas as pd
import argparse
import glob
import time

def parse_arguments():
    """コマンドライン引数のパース"""
    parser = argparse.ArgumentParser(description='EVA02タガーで1枚画像のテスト')
    parser.add_argument('--input', '-i', type=str, default='downloaded_images', help='入力画像ディレクトリ')
    parser.add_argument('--output', '-o', type=str, default='single_output', help='出力ディレクトリ')
    parser.add_argument('--threshold', '-t', type=float, default=0.05, help='タグの閾値 (0.0-1.0)')
    parser.add_argument('--model-dir', '-m', type=str, default='tagger_data', help='モデルディレクトリ')
    return parser.parse_args()

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

def save_tags_to_file(image_path, tags_with_scores, output_path, threshold):
    """タグをテキストファイルに保存"""
    # 元のファイル名からテキストファイル名を生成
    base_name = os.path.basename(image_path)
    file_name_without_ext = os.path.splitext(base_name)[0]
    output_file = os.path.join(output_path, f"{file_name_without_ext}.txt")

    with open(output_file, 'w', encoding='utf-8') as f:
        # 画像情報
        f.write(f"画像: {base_name}\n")
        f.write(f"閾値: {threshold}\n")
        f.write(f"検出タグ数: {len(tags_with_scores)}\n\n")

        # すべてのタグをスコア順に
        for i, (tag, score) in enumerate(tags_with_scores):
            f.write(f"{i+1:3d}. {tag}: {score:.6f}\n")

    return output_file

def tag_single_image(args):
    """1枚画像の処理"""
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
    extensions = ['*.jpg', '*.jpeg', '*.png', '*.webp', '*.bmp']
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(args.input, ext)))

    if not files:
        print(f"エラー: ディレクトリ '{args.input}' に画像ファイルが見つかりません。")
        return

    # 1枚目の画像を選択
    image_file = files[0]
    print(f"処理する画像: {os.path.basename(image_file)}")

    try:
        # 画像の前処理
        img_array = preprocess_image(image_file)
        if img_array is None:
            return

        # モデルに合わせて形状調整（NHWC→NCHW）
        if len(input_shape) == 4 and input_shape[1] == 3:
            img_array = np.transpose(img_array, (0, 3, 1, 2))

        # 推論実行
        start_time = time.time()
        probs = session.run([output_name], {input_name: img_array})[0]
        inference_time = time.time() - start_time

        # タグと確率をペアにする
        tags_with_scores = [(labels[i], float(probs[0][i])) for i in range(len(labels))]
        tags_with_scores.sort(key=lambda x: x[1], reverse=True)

        # 閾値以上のタグのみフィルタリング
        filtered_tags = [(tag, score) for tag, score in tags_with_scores if score >= args.threshold]

        # タグを保存
        output_file = save_tags_to_file(image_file, filtered_tags, args.output, args.threshold)

        print(f"\n推論時間: {inference_time:.3f}秒")
        print(f"検出タグ数: {len(filtered_tags)}")
        print(f"結果ファイル: {output_file}")

        # 上位10個のタグを表示
        print("\n=== 上位10個のタグ ===")
        for i, (tag, score) in enumerate(filtered_tags[:10]):
            print(f"{i+1:2d}. {tag}: {score:.6f}")

    except Exception as e:
        print(f"処理エラー {image_file}: {e}")

def main():
    """メイン関数"""
    args = parse_arguments()
    print("=== EVA02 Tagger 1枚画像テスト ===")
    tag_single_image(args)
    print("\n完了しました。")

if __name__ == "__main__":
    main()
