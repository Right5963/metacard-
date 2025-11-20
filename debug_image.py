#!/usr/bin/env python

import os
import sys
import numpy as np
from PIL import Image

def analyze_image(image_path):
    """画像を分析して情報を表示"""
    try:
        # 画像の読み込み
        img = Image.open(image_path)
        print(f"元の画像情報: {image_path}")
        print(f"サイズ: {img.size}")
        print(f"モード: {img.mode}")
        print(f"フォーマット: {img.format}")

        # 画像をRGBに変換
        img_rgb = img.convert('RGB')
        print(f"RGB変換後のモード: {img_rgb.mode}")

        # 画像をリサイズ
        img_resized = img_rgb.resize((448, 448), resample=Image.BICUBIC)
        print(f"リサイズ後のサイズ: {img_resized.size}")

        # NumPy配列に変換
        arr = np.array(img_resized)
        print(f"NumPy配列の形状: {arr.shape}")
        print(f"NumPy配列の型: {arr.dtype}")
        print(f"チャネル別の平均値: R={arr[..., 0].mean():.1f}, G={arr[..., 1].mean():.1f}, B={arr[..., 2].mean():.1f}")

        # リサイズした画像を保存
        img_resized.save("debug_resized.jpg")

        # 変換用の配列を作成 (EVA02タガーと同じ処理)
        img_array = np.array(img_resized).astype(np.float32) / 255.0
        img_array_batch = np.expand_dims(img_array, axis=0)  # バッチ次元を追加
        print(f"EVA02入力配列の形状: {img_array_batch.shape}")
        print(f"EVA02入力配列の値範囲: min={img_array_batch.min():.3f}, max={img_array_batch.max():.3f}")

        # チャネル別情報を分析して画像が正しいか確認
        channels = ["赤", "緑", "青"]
        has_color = False
        for i in range(3):
            mean_val = img_array[..., i].mean()
            std_val = img_array[..., i].std()
            print(f"{channels[i]}チャネル - 平均: {mean_val:.3f}, 標準偏差: {std_val:.3f}")
            if std_val > 0.05:  # 標準偏差が小さすぎない場合は色情報がある
                has_color = True

        if has_color:
            print("画像はカラー情報を含んでいます")
        else:
            print("警告: 画像はほぼモノクロまたはフラットな色です")

        # 画像の保存と表示
        debug_dir = "debug_images"
        os.makedirs(debug_dir, exist_ok=True)

        # 元の画像を保存
        img_rgb.save(os.path.join(debug_dir, "original_rgb.jpg"))

        # リサイズした画像を保存
        img_resized.save(os.path.join(debug_dir, "resized.jpg"))

        # NumPy配列から画像に戻して保存（正規化処理後）
        img_from_array = Image.fromarray((img_array * 255).astype(np.uint8))
        img_from_array.save(os.path.join(debug_dir, "from_array.jpg"))

        print(f"デバッグ画像を {debug_dir} に保存しました")

    except Exception as e:
        print(f"エラー: {e}")
        return False

    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        image_path = "test_images/item_1744561599_001.jpg"  # デフォルトの画像パス

    analyze_image(image_path)
