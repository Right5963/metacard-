#!/usr/bin/env python

import os
import sys
import json
import numpy as np
from PIL import Image
import onnxruntime as ort
import pandas as pd

# テスト用の設定
TEST_IMAGE = "test_images/item_1744561599_001.jpg"  # テスト対象画像
MODEL_DIR = "tagger_data"  # モデルディレクトリ
OUTPUT_DIR = "test_eva02_output"  # 出力ディレクトリ
THRESHOLD = 0.35  # タグ検出の閾値

def test_tag_image(img_path, model_dir, output_dir, threshold=0.35):
    """画像にタグを付ける処理をテスト"""
    os.makedirs(output_dir, exist_ok=True)

    # モデルパスとCSVパスを定義
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    if not os.path.exists(model_path) or not os.path.exists(csv_path):
        print(f"モデルファイル({model_path})またはタグ定義({csv_path})が見つかりません。")
        return False

    # タグ情報を読み込む
    print(f"タグ定義を読み込み中... {csv_path}")
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()
    print(f"タグ数: {len(labels)}")

    # モデルをロード
    print(f"モデルをロード中... {model_path}")
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

    # デバッグ用のディレクトリ
    debug_dir = os.path.join(output_dir, "debug")
    os.makedirs(debug_dir, exist_ok=True)

    # 画像の処理方法を複数試す
    methods = [
        {"name": "方法1-標準", "resize_method": Image.BICUBIC, "normalize": True, "transpose": False},
        {"name": "方法2-転置あり", "resize_method": Image.BICUBIC, "normalize": True, "transpose": True},
        {"name": "方法3-リサンプル変更", "resize_method": Image.NEAREST, "normalize": True, "transpose": False}
    ]

    results = []
    for method in methods:
        print(f"\n===== {method['name']} =====")
        try:
            # 画像の読み込み
            img = Image.open(img_path).convert('RGB')
            print(f"元の画像: サイズ={img.size}, モード={img.mode}")

            # リサイズ
            img_resized = img.resize((448, 448), resample=method["resize_method"])
            base_name = os.path.splitext(os.path.basename(img_path))[0]
            img_resized.save(os.path.join(debug_dir, f"{base_name}_{method['name']}_resized.jpg"))

            # NumPy配列に変換
            img_array = np.array(img_resized).astype(np.float32)
            if method["normalize"]:
                img_array = img_array / 255.0

            # 転置が必要な場合
            if method["transpose"]:
                img_array = np.transpose(img_array, (2, 0, 1))  # HWC to CHW
                img_array = np.expand_dims(img_array, axis=0)  # CHW to BCHW
                print(f"転置後の形状: {img_array.shape}")
            else:
                img_array = np.expand_dims(img_array, axis=0)  # HWC to BHWC
                print(f"バッチ化後の形状: {img_array.shape}")

            # モデルのインプット形状を確認
            input_shape = session.get_inputs()[0].shape
            print(f"モデルの期待する入力形状: {input_shape}")

            # 推論
            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name
            probs = session.run([output_name], {input_name: img_array})[0]

            # 結果をタグと確率のペアにする
            tags_with_scores = [(labels[i], float(probs[0][i])) for i in range(len(labels)) if probs[0][i] >= threshold]
            tags_with_scores.sort(key=lambda x: x[1], reverse=True)

            # 結果を保存
            result_file = os.path.join(output_dir, f"{base_name}_{method['name']}.json")
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump({"method": method["name"], "tags": tags_with_scores}, f, ensure_ascii=False, indent=2)

            # 最初の10個のタグを表示
            print(f"検出されたタグ数: {len(tags_with_scores)}")
            print("上位10個のタグ:")
            for tag, score in tags_with_scores[:10]:
                print(f"  {tag}: {score:.6f}")

            results.append({
                "method": method["name"],
                "success": True,
                "tag_count": len(tags_with_scores),
                "top_tags": tags_with_scores[:5]
            })

        except Exception as e:
            print(f"エラー: {e}")
            results.append({
                "method": method["name"],
                "success": False,
                "error": str(e)
            })

    # 結果の比較
    print("\n===== 結果の比較 =====")
    for result in results:
        if result["success"]:
            print(f"{result['method']}: {result['tag_count']}個のタグ検出, 最上位タグ: {result['top_tags'][0][0] if result['top_tags'] else 'なし'}")
        else:
            print(f"{result['method']}: エラー - {result.get('error', 'Unknown error')}")

    return True

if __name__ == "__main__":
    # コマンドライン引数から画像パスを取得
    img_path = TEST_IMAGE
    if len(sys.argv) > 1:
        img_path = sys.argv[1]

    # テスト実行
    test_tag_image(img_path, MODEL_DIR, OUTPUT_DIR, THRESHOLD)
