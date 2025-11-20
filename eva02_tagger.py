#!/usr/bin/env python

import os
import sys
import argparse
import glob
import numpy as np
from PIL import Image
import onnxruntime as ort
from tqdm import tqdm
import pandas as pd
import requests
from pathlib import Path

def download_model(model_dir):
    """モデルとCSVファイルをダウンロードする"""
    print("wd-eva02-large-v3モデルをダウンロードします...")
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    model_url = "https://huggingface.co/SmilingWolf/wd-eva02-large-v3/resolve/main/model.onnx?download=true"
    csv_url = "https://huggingface.co/SmilingWolf/wd-eva02-large-v3/resolve/main/selected_tags.csv?download=true"

    headers = {"User-Agent": "Mozilla/5.0"}

    # モデルのダウンロード
    if not os.path.exists(model_path):
        print(f"モデルをダウンロード中: {model_url}")
        try:
            response = requests.get(model_url, stream=True, headers=headers)
            response.raise_for_status()
            with open(model_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"モデルを保存しました: {model_path}")
        except Exception as e:
            print(f"モデルダウンロード中にエラーが発生しました: {e}")
            return False
    else:
        print(f"モデルは既に存在します: {model_path}")

    # CSVのダウンロード
    if not os.path.exists(csv_path):
        print(f"タグ定義をダウンロード中: {csv_url}")
        try:
            response = requests.get(csv_url, stream=True, headers=headers)
            response.raise_for_status()
            with open(csv_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"タグ定義を保存しました: {csv_path}")
        except Exception as e:
            print(f"タグ定義ダウンロード中にエラーが発生しました: {e}")
            return False
    else:
        print(f"タグ定義は既に存在します: {csv_path}")

    return True

def tag_images(img_dir, output_dir, model_dir, threshold=0.35):
    """画像にタグを付ける"""
    # モデルとタグ定義の確認
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    if not os.path.exists(model_path) or not os.path.exists(csv_path):
        print("モデルファイルまたはタグ定義が見つかりません。")
        if not download_model(model_dir):
            return False

    # 出力ディレクトリを作成
    os.makedirs(output_dir, exist_ok=True)

    # タグ情報を読み込む
    print("タグ定義を読み込み中...")
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()

    # モデルをロード
    print("モデルをロード中...")
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

    # 画像ファイルの検索
    extensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp']
    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(img_dir, f"*.{ext}")))
        image_files.extend(glob.glob(os.path.join(img_dir, f"*.{ext.upper()}")))

    if not image_files:
        print(f"ディレクトリ {img_dir} に画像ファイルが見つかりません")
        return False

    print(f"合計 {len(image_files)} 個の画像ファイルを処理します")

    # 各画像を処理
    for img_path in tqdm(image_files, desc="タグ付け中"):
        try:
            # 画像の読み込み
            img = Image.open(img_path).convert('RGB')

            # リサイズ
            img = img.resize((448, 448))

            # 前処理
            img_array = np.array(img).astype(np.float32) / 255.0
            img_array = np.transpose(img_array, (2, 0, 1))  # HWC to CHW
            img_array = np.expand_dims(img_array, axis=0)

            # 推論
            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name
            probs = session.run([output_name], {input_name: img_array})[0]

            # 結果の保存
            base_name = os.path.splitext(os.path.basename(img_path))[0]
            out_path = os.path.join(output_dir, f"{base_name}.txt")

            with open(out_path, 'w', encoding='utf-8') as f:
                # 確率と対応するラベルを組み合わせてソート
                results = list(zip(labels, probs[0]))
                results.sort(key=lambda x: x[1], reverse=True)

                # 閾値以上の結果を保存
                for tag, prob in results:
                    if prob >= threshold:
                        f.write(f"{tag}, {prob:.6f}\n")

        except Exception as e:
            print(f"エラー ({img_path}): {e}")

    print("タグ付けが完了しました")
    return True

def main():
    parser = argparse.ArgumentParser(description='EVA02-Large-v3でタグ付け')
    parser.add_argument('--dir', required=True, help='画像ディレクトリ')
    parser.add_argument('--out', required=True, help='出力ディレクトリ')
    parser.add_argument('--model_dir', default='tagger_data', help='モデルディレクトリ')
    parser.add_argument('--threshold', type=float, default=0.35, help='タグの閾値')
    args = parser.parse_args()

    # モデルディレクトリの確認と作成
    os.makedirs(args.model_dir, exist_ok=True)

    # 画像にタグを付ける
    success = tag_images(args.dir, args.out, args.model_dir, args.threshold)

    if success:
        print(f"処理が完了しました。タグは {args.out} に保存されました。")
        return 0
    else:
        print("処理中にエラーが発生しました。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
