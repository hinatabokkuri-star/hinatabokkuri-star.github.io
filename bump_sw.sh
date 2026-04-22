#!/bin/bash
# sw.js の CACHE バージョンをタイムスタンプで bump するヘルパー
# 用途：push後に開きっぱなしのタブを強制リロードさせたい時
# 使い方: bash bump_sw.sh  → コミット&push込みで完結

cd "$(dirname "$0")"

NEW_VER="hina-$(date +%Y%m%d%H%M)"
sed -i "s/const CACHE = 'hina-[^']*'/const CACHE = '${NEW_VER}'/" sw.js

if git diff --quiet sw.js; then
  echo "sw.js unchanged, nothing to bump"
  exit 0
fi

git add sw.js
git commit -m "bump SW cache to ${NEW_VER}"
git push

echo "→ open tabs will auto-reload within 30s"
