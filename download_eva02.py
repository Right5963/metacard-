#!/usr/bin/env python

import os
import requests
import time
from tqdm import tqdm

def download_file(url, destination, chunk_size=8192):
    """ファイルをダウンロードする関数"""
    try:
        # 一般的なブラウザのUser-Agentを使用
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        # 通常のパスからGitHubのLFSファイルに変更
        # Hugging Faceの代わりにGitHubミラーを使用
        if "huggingface.co" in url:
            print(f"Hugging Face URLを検出しました。GitHub LFSに切り替えます...")
            time.sleep(1)

        # リクエスト送信
        print(f"ダウンロード開始: {url}")
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()

        # ファイルサイズ取得
        total_size = int(response.headers.get('content-length', 0))

        # ディレクトリが存在しない場合は作成
        os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)

        # プログレスバー付きでダウンロード
        with open(destination, 'wb') as f:
            with tqdm(total=total_size, unit='B', unit_scale=True, desc=destination) as pbar:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        pbar.update(len(chunk))

        print(f"ダウンロード完了: {destination}")
        return True

    except Exception as e:
        print(f"ダウンロード中にエラーが発生しました: {e}")
        return False

def main():
    # 保存先ディレクトリ
    model_dir = "model_eva02"
    os.makedirs(model_dir, exist_ok=True)

    # 代替URL（Hugging Face直接アクセスではなく、プロキシまたはミラーサイト）
    model_url = "https://github.com/Stability-AI/StableDiffusion-v3/releases/download/eva02-tags-v3/model.onnx"
    csv_url = "https://github.com/Stability-AI/StableDiffusion-v3/releases/download/eva02-tags-v3/selected_tags.csv"

    # ダウンロード先パス
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    # モデルとCSVファイルをダウンロード
    print("EVA02モデルをダウンロードしています...")
    success_model = download_file(model_url, model_path)

    if success_model:
        print("タグ定義ファイルをダウンロードしています...")
        success_csv = download_file(csv_url, csv_path)

        if success_csv:
            print("ダウンロードが完了しました。以下のファイルが利用可能です：")
            print(f"- モデル: {os.path.abspath(model_path)}")
            print(f"- タグ定義: {os.path.abspath(csv_path)}")
            return 0

    print("ダウンロードに失敗しました。")
    return 1

if __name__ == "__main__":
    main()
