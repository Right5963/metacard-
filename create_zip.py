#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import zipfile
import os
from pathlib import Path

def create_distribution_zip():
    """配布用ZIPファイルを作成"""
    base_dir = Path("C:/metacard/release")
    source_dir = base_dir / "プロンプト分類ツール_v1.0"
    zip_path = base_dir / "プロンプト分類ツール_v1.0.zip"

    print(f"Creating ZIP archive: {zip_path}")

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Walk through all files and directories
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = Path(root) / file
                # Calculate relative path for the archive
                arcname = file_path.relative_to(source_dir.parent)
                print(f"Adding: {arcname}")
                zipf.write(file_path, arcname)

    print(f"\nZIP archive created successfully: {zip_path}")
    print(f"Archive size: {zip_path.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    create_distribution_zip()
