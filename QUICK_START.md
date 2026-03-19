# MooMoo API 統合 - クイックスタートガイド

**5分で始める MooMoo API 統合プロジェクト**

---

## 前提条件

- ✅ Python 3.11+
- ✅ Node.js 22+
- ✅ Git
- ✅ GitHub アカウント

---

## ステップ1: リポジトリをクローン

```bash
git clone https://github.com/kema77570-source/brake-pro.git
cd brake-pro
```

---

## ステップ2: 自動セットアップスクリプトを実行

### Windows

```bash
setup_windows.bat
```

### macOS / Linux

```bash
bash setup_unix.sh
```

**スクリプトが自動的に以下を実行します:**
- Python 仮想環境の作成
- Python 依存関係のインストール
- Node.js 依存関係のインストール
- .env ファイルの作成

---

## ステップ3: MooMoo SDK をセットアップ

```bash
# 1. MMAPI4Python_10.0.6008.7z を解凍

# Windows: 7-Zip または WinRAR を使用
# macOS: The Unarchiver を使用
# Linux: 7z x MMAPI4Python_10.0.6008.7z

# 2. moomoo フォルダを server/lib/ にコピー

# Windows:
xcopy /E /I MMAPI4Python_10.0.6008\moomoo server\lib\moomoo

# macOS / Linux:
cp -r MMAPI4Python_10.0.6008/moomoo server/lib/

# 3. 確認
python -c "from moomoo.quote import OpenQuoteContext; print('OK')"
```

---

## ステップ4: サーバーを起動

### ターミナル 1: FastAPI サーバー

```bash
# Windows
venv\Scripts\activate
python server\moomoo_api.py

# macOS / Linux
source venv/bin/activate
python server/moomoo_api.py

# 出力:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### ターミナル 2: React 開発サーバー

```bash
pnpm dev
# または
npm run dev

# 出力:
# ➜  Local:   http://localhost:5173/
```

---

## ステップ5: ブラウザでアクセス

```
http://localhost:5173/market
```

✅ **完了！** アプリケーションが起動しました。

---

## 主要URL

| URL | 説明 |
|-----|------|
| http://localhost:5173/market | Market Dashboard |
| http://localhost:5173/portfolio | Portfolio Management |
| http://localhost:5173/stock/HK.00700 | Stock Detail |
| http://localhost:8000/docs | FastAPI Swagger UI |
| http://localhost:8000/health | ヘルスチェック |

---

## テストを実行

```bash
# ユニットテスト
python -m pytest server/test_moomoo_wrapper.py -v

# 期待される結果:
# ====== 16 passed in 0.42s ======
```

---

## トラブルシューティング

### ポート 8000 が既に使用されている

```bash
# Windows
netstat -ano | findstr :8000

# macOS / Linux
lsof -i :8000

# プロセスを終了
# Windows: taskkill /PID <PID> /F
# macOS / Linux: kill -9 <PID>
```

### MooMoo SDK が見つからない

```bash
# 確認
ls server/lib/moomoo

# テスト
python -c "from moomoo.quote import OpenQuoteContext; print('OK')"
```

### Node.js モジュールが見つからない

```bash
pnpm install
# または
npm install
```

---

## 次のステップ

1. **ドキュメントを読む**
   - [TESTING_GUIDE.md](TESTING_GUIDE.md) - テスト手順
   - [SETUP_LOCAL_PC.md](SETUP_LOCAL_PC.md) - 詳細セットアップ

2. **アプリケーションを探索**
   - Market Dashboard で株価を確認
   - Portfolio Page でポートフォリオを管理
   - Stock Detail で銘柄詳細を表示

3. **API を試す**
   - http://localhost:8000/docs で Swagger UI を開く
   - エンドポイントをテスト

4. **MooMoo OpenD をセットアップ（オプション）**
   - https://www.moomoo.com/us/support/download-center からダウンロード
   - ローカルマシンにインストール
   - ポート 11111 で起動

---

## よくある質問

**Q: MooMoo OpenD は必須ですか？**  
A: いいえ。テスト環境ではモックデータを使用できます。

**Q: Windows で仮想環境を有効化するには？**  
A: `venv\Scripts\activate`

**Q: ポートを変更できますか？**  
A: はい。.env ファイルで `API_PORT` と `REACT_APP_API_URL` を変更してください。

**Q: コードをプッシュするには？**  
A: 
```bash
git add .
git commit -m "feat: description"
git push origin main
```

---

## サポート

- **ドキュメント**: [SETUP_LOCAL_PC.md](SETUP_LOCAL_PC.md)
- **テストガイド**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **GitHub Issues**: https://github.com/kema77570-source/brake-pro/issues

---

**作成日**: 2026-03-18  
**対応OS**: Windows, macOS, Linux  
**対応Python**: 3.11+  
**対応Node.js**: 22+
