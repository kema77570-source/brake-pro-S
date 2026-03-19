# MooMoo API 統合プロジェクト - ローカルPC セットアップガイド

## 前提条件

- ✅ Python 3.11 インストール済み
- ✅ Node.js 22 インストール済み
- ✅ Git インストール済み
- ✅ GitHub アカウント所持

---

## Step 1: リポジトリのクローン

### Windows / macOS / Linux 共通

```bash
# 1. 任意のディレクトリに移動
cd ~/Projects  # または任意のフォルダ

# 2. リポジトリをクローン
git clone https://github.com/kema77570-source/brake-pro.git

# 3. プロジェクトディレクトリに移動
cd brake-pro

# 4. ブランチ確認（main ブランチにいることを確認）
git branch
# * main
#   develop
```

---

## Step 2: Python 環境のセットアップ

### Windows

```bash
# 1. Python バージョン確認
python --version
# Python 3.11.x

# 2. 仮想環境を作成
python -m venv venv

# 3. 仮想環境を有効化
venv\Scripts\activate

# 4. pip をアップグレード
python -m pip install --upgrade pip

# 5. 依存関係をインストール
pip install fastapi uvicorn pydantic python-dotenv pandas simplejson pycryptodome pytest pytest-cov pytest-mock

# 6. requirements.txt を作成（オプション）
pip freeze > requirements.txt
```

### macOS / Linux

```bash
# 1. Python バージョン確認
python3 --version
# Python 3.11.x

# 2. 仮想環境を作成
python3 -m venv venv

# 3. 仮想環境を有効化
source venv/bin/activate

# 4. pip をアップグレード
python -m pip install --upgrade pip

# 5. 依存関係をインストール
pip install fastapi uvicorn pydantic python-dotenv pandas simplejson pycryptodome pytest pytest-cov pytest-mock

# 6. requirements.txt を作成（オプション）
pip freeze > requirements.txt
```

---

## Step 3: Node.js 環境のセットアップ

### Windows / macOS / Linux 共通

```bash
# 1. Node.js バージョン確認
node --version
# v22.x.x

# 2. npm バージョン確認
npm --version
# 10.x.x

# 3. pnpm をインストール（グローバル）
npm install -g pnpm

# 4. pnpm バージョン確認
pnpm --version
# 9.x.x

# 5. プロジェクトの依存関係をインストール
pnpm install

# または npm を使用する場合
npm install
```

---

## Step 4: MooMoo SDK のセットアップ

### すべてのOS共通

```bash
# 1. MooMoo SDK ファイルを解凍
# MMAPI4Python_10.0.6008.7z を以下に解凍

# Windows: 7-Zip または WinRAR を使用
# macOS: The Unarchiver または Keka を使用
# Linux: p7zip-full をインストール
#   sudo apt-get install p7zip-full
#   7z x MMAPI4Python_10.0.6008.7z

# 2. 解凍後、server/lib/ ディレクトリを作成
mkdir -p server/lib

# 3. 解凍した moomoo フォルダを server/lib/ にコピー
# Windows:
#   xcopy /E /I MMAPI4Python_10.0.6008\moomoo server\lib\moomoo

# macOS / Linux:
#   cp -r MMAPI4Python_10.0.6008/moomoo server/lib/

# 4. インストール確認
python -c "from moomoo.quote import OpenQuoteContext; print('MooMoo SDK OK')"
```

---

## Step 5: 環境変数の設定

### Windows

```bash
# 1. .env ファイルを作成
# プロジェクトルートに .env ファイルを作成

# 内容:
MOOMOO_HOST=127.0.0.1
MOOMOO_PORT=11111
API_HOST=0.0.0.0
API_PORT=8000
REACT_APP_API_URL=http://localhost:8000
NODE_ENV=development

# 2. .env ファイルを保存
```

### macOS / Linux

```bash
# 1. .env ファイルを作成
cat > .env << EOF
MOOMOO_HOST=127.0.0.1
MOOMOO_PORT=11111
API_HOST=0.0.0.0
API_PORT=8000
REACT_APP_API_URL=http://localhost:8000
NODE_ENV=development
EOF

# 2. 確認
cat .env
```

---

## Step 6: FastAPI サーバーの起動

### Windows

```bash
# 1. 仮想環境を有効化（まだの場合）
venv\Scripts\activate

# 2. FastAPI サーバーを起動
python server/moomoo_api.py

# 期待される出力:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### macOS / Linux

```bash
# 1. 仮想環境を有効化（まだの場合）
source venv/bin/activate

# 2. FastAPI サーバーを起動
python server/moomoo_api.py

# 期待される出力:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## Step 7: React 開発サーバーの起動

### Windows / macOS / Linux 共通

```bash
# 1. 新しいターミナルを開く（FastAPI サーバーはそのまま実行）

# 2. プロジェクトルートに移動
cd brake-pro

# 3. React 開発サーバーを起動
pnpm dev

# または npm を使用する場合
npm run dev

# 期待される出力:
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

---

## Step 8: ブラウザでアクセス

### アプリケーションへのアクセス

```
Market Dashboard:  http://localhost:5173/market
Portfolio Page:    http://localhost:5173/portfolio
Stock Detail:      http://localhost:5173/stock/HK.00700

FastAPI Swagger:   http://localhost:8000/docs
FastAPI ReDoc:     http://localhost:8000/redoc
```

---

## Step 9: テストの実行

### ユニットテスト

```bash
# 1. 仮想環境を有効化
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 2. テストを実行
python -m pytest server/test_moomoo_wrapper.py -v

# 期待される結果:
# ====== 16 passed in 0.42s ======
```

### 統合テスト

```bash
# 1. FastAPI サーバーが起動していることを確認
# http://localhost:8000/health にアクセス

# 2. 別のターミナルで統合テストを実行
# Windows:
bash integration_test.sh

# macOS / Linux:
bash integration_test.sh
```

---

## トラブルシューティング

### 問題1: Python モジュールが見つからない

```
ModuleNotFoundError: No module named 'fastapi'
```

**解決策**:
```bash
# 仮想環境が有効化されていることを確認
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# 依存関係を再インストール
pip install fastapi uvicorn pydantic python-dotenv pandas simplejson pycryptodome
```

### 問題2: ポート 8000 が既に使用されている

```
Address already in use
```

**解決策**:
```bash
# Windows: ポート 8000 を使用しているプロセスを確認
netstat -ano | findstr :8000

# macOS / Linux: ポート 8000 を使用しているプロセスを確認
lsof -i :8000

# プロセスを終了
# Windows: taskkill /PID <PID> /F
# macOS / Linux: kill -9 <PID>

# または別のポートで起動
python server/moomoo_api.py --port 8001
```

### 問題3: Node.js モジュールが見つからない

```
Error: Cannot find module 'react'
```

**解決策**:
```bash
# 依存関係を再インストール
pnpm install

# または npm を使用
npm install

# キャッシュをクリア
pnpm store prune
```

### 問題4: MooMoo SDK が見つからない

```
ModuleNotFoundError: No module named 'moomoo'
```

**解決策**:
```bash
# 1. server/lib/moomoo が存在することを確認
ls server/lib/moomoo

# 2. PYTHONPATH を設定
# Windows:
set PYTHONPATH=%PYTHONPATH%;%CD%\server\lib

# macOS / Linux:
export PYTHONPATH=$PYTHONPATH:$(pwd)/server/lib

# 3. テストして確認
python -c "from moomoo.quote import OpenQuoteContext; print('OK')"
```

### 問題5: Git クローンが失敗

```
fatal: unable to access 'https://github.com/...'
```

**解決策**:
```bash
# 1. インターネット接続を確認
ping github.com

# 2. Git 認証情報を設定
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 3. SSH キーを設定（オプション）
ssh-keygen -t ed25519 -C "your.email@example.com"

# 4. 再度クローンを試行
git clone https://github.com/kema77570-source/brake-pro.git
```

---

## ディレクトリ構成

セットアップ完了後、以下のディレクトリ構成になります：

```
brake-pro/
├── server/
│   ├── lib/
│   │   └── moomoo/              # MooMoo SDK
│   ├── moomoo_wrapper.py        # API ラッパー層
│   ├── moomoo_api.py            # FastAPI バックエンド
│   └── test_moomoo_wrapper.py   # ユニットテスト
│
├── client/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useMooMooAPI.ts  # React Query フック
│   │   ├── pages/
│   │   │   ├── MarketDashboard.tsx
│   │   │   ├── PortfolioPage.tsx
│   │   │   └── StockDetail.tsx
│   │   └── App.tsx
│   └── package.json
│
├── .env                         # 環境変数
├── venv/                        # Python 仮想環境
├── node_modules/                # Node.js 依存関係
│
├── TESTING_GUIDE.md             # テストガイド
├── TESTING_DETAILED_GUIDE.md    # 詳細テストガイド
├── MOOMOO_INTEGRATION_DESIGN.md # 設計ドキュメント
└── README.md
```

---

## 次のステップ

### 1. アプリケーションの動作確認

```bash
# Market Dashboard にアクセス
http://localhost:5173/market

# ページが読み込まれることを確認
# - ヘッダーが表示される
# - 市場選択ボタンが表示される
# - 主要指数が表示される
```

### 2. API の動作確認

```bash
# ヘルスチェック
curl http://localhost:8000/health

# 期待される応答
# {"status":"ok","timestamp":"2026-03-18T14:30:00.000000"}
```

### 3. テストの実行

```bash
# ユニットテストを実行
python -m pytest server/test_moomoo_wrapper.py -v

# 期待される結果
# ====== 16 passed in 0.42s ======
```

### 4. MooMoo OpenD のセットアップ（オプション）

リアルタイムデータを取得するには、MooMoo OpenD が必要です：

1. https://www.moomoo.com/us/support/download-center から OpenD をダウンロード
2. ローカルマシンにインストール
3. ポート 11111 で起動
4. アプリケーションが自動的に接続します

---

## よくある質問（FAQ）

### Q1: MooMoo OpenD なしで動作しますか？

**A**: はい。テスト環境ではモック（ダミーデータ）を使用できるため、OpenD がなくても基本的なテストと UI 検証は可能です。

### Q2: Windows での仮想環境の有効化方法は？

**A**: 
```bash
# 作成
python -m venv venv

# 有効化
venv\Scripts\activate

# 無効化
venv\Scripts\deactivate
```

### Q3: ポート 8000 と 5173 を変更できますか？

**A**: はい。
```bash
# FastAPI ポートを変更
python server/moomoo_api.py --port 8001

# React ポートを変更
pnpm dev -- --port 3000
```

### Q4: 本番環境へのデプロイ方法は？

**A**: MOOMOO_FINAL_SUMMARY.md の「今後の拡張予定」セクションを参照してください。

### Q5: GitHub にコードをプッシュするには？

**A**:
```bash
# 1. 変更を確認
git status

# 2. 変更をステージング
git add .

# 3. コミット
git commit -m "feat: Add new feature"

# 4. プッシュ
git push origin main
```

---

## サポート

### ドキュメント

- [TESTING_GUIDE.md](TESTING_GUIDE.md) - テスト手順
- [TESTING_DETAILED_GUIDE.md](TESTING_DETAILED_GUIDE.md) - 詳細テスト手順
- [MOOMOO_INTEGRATION_DESIGN.md](MOOMOO_INTEGRATION_DESIGN.md) - アーキテクチャ設計
- [MOOMOO_IMPLEMENTATION_GUIDE.md](MOOMOO_IMPLEMENTATION_GUIDE.md) - 実装ガイド

### 公式リソース

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [MooMoo API Documentation](https://www.moomoo.com/api)

### GitHub Issues

問題が発生した場合は、GitHub Issues で報告してください：
https://github.com/kema77570-source/brake-pro/issues

---

## セットアップ完了チェックリスト

- [ ] リポジトリをクローン
- [ ] Python 仮想環境を作成・有効化
- [ ] Python 依存関係をインストール
- [ ] Node.js 依存関係をインストール
- [ ] MooMoo SDK をセットアップ
- [ ] .env ファイルを作成
- [ ] FastAPI サーバーを起動
- [ ] React 開発サーバーを起動
- [ ] ブラウザで http://localhost:5173 にアクセス
- [ ] ユニットテストを実行
- [ ] すべてのテストが PASSED

---

**セットアップガイド作成日**: 2026-03-18  
**対応OS**: Windows, macOS, Linux  
**対応Python**: 3.11+  
**対応Node.js**: 22+
