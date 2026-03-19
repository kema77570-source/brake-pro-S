# MooMoo OpenD セットアップガイド - Windows

## 概要

MooMoo OpenD は、MooMoo API を使用するためのローカルサーバーです。このガイドでは、OpenD をセットアップし、brake-pro アプリケーションと統合する手順を説明します。

---

## 前提条件

- ✅ Windows 10 以上
- ✅ MooMoo OpenD 10.0.6018 ダウンロード済み
- ✅ MooMoo アカウント（デモアカウント可）
- ✅ Python 3.11+ インストール済み
- ✅ Node.js 22+ インストール済み

---

## ステップ 1: OpenD ファイルの解凍

### 1.1 ファイルの準備

```
moomoo_OpenD_10.0.6018_Windows.7z
```

### 1.2 解凍

**7-Zip または WinRAR を使用して解凍:**

```
moomoo_OpenD_10.0.6018_Windows.7z
  ├── moomoo_OpenD-GUI_10.0.6018_Windows/
  │   └── moomoo_OpenD-GUI_10.0.6018_Windows.exe  (GUI版)
  └── moomoo_OpenD_10.0.6018_Windows/
      ├── OpenD.exe                                 (CLI版)
      ├── OpenD.xml                                 (設定ファイル)
      └── その他DLL・ファイル
```

### 1.3 推奨フォルダ構成

```
C:\Users\YourUsername\moomoo_opend\
├── GUI/
│   └── moomoo_OpenD-GUI_10.0.6018_Windows.exe
└── CLI/
    ├── OpenD.exe
    ├── OpenD.xml
    └── その他ファイル
```

---

## ステップ 2: OpenD の設定

### 2.1 OpenD.xml の編集

**GUI版を使用する場合は、この手順をスキップしてください。**

CLI版を使用する場合は、`OpenD.xml` を編集します：

```xml
<!-- 基本設定 -->
<ip>127.0.0.1</ip>
<api_port>11111</api_port>

<!-- MooMoo アカウント情報 -->
<login_account>100000</login_account>        <!-- ユーザーID または 電話番号 -->
<login_pwd>123456</login_pwd>                <!-- パスワード（平文） -->

<!-- 言語設定 -->
<lang>en</lang>                              <!-- en: 英語, chs: 簡体字中文 -->

<!-- ログレベル -->
<log_level>info</log_level>                  <!-- no, debug, info, warning, error, fatal -->

<!-- プロトコル形式 -->
<push_proto_type>0</push_proto_type>         <!-- 0: Protocol Buffers, 1: JSON -->
```

### 2.2 重要な設定項目

| 項目 | 値 | 説明 |
|------|-----|------|
| `ip` | 127.0.0.1 | ローカルマシンのみアクセス可能 |
| `api_port` | 11111 | API リスニングポート |
| `login_account` | あなたのMooMooアカウント | ユーザーID、電話番号、またはメール |
| `login_pwd` | あなたのパスワード | 平文パスワード |
| `lang` | en または chs | 言語設定 |

---

## ステップ 3: OpenD の起動

### 方法 1: GUI版（推奨・初心者向け）

```bash
# 1. フォルダを開く
C:\Users\YourUsername\moomoo_opend\GUI\

# 2. moomoo_OpenD-GUI_10.0.6018_Windows.exe をダブルクリック

# 3. GUI が起動
# - ユーザーID、パスワードを入力
# - 「Start」ボタンをクリック
# - ステータスが「Connected」に変わることを確認
```

### 方法 2: CLI版（コマンドライン）

```bash
# 1. コマンドプロンプトを開く
# Windows キー + R → cmd → Enter

# 2. OpenD フォルダに移動
cd C:\Users\YourUsername\moomoo_opend\CLI\

# 3. OpenD を起動
OpenD.exe

# 期待される出力:
# [INFO] OpenD Server started on 127.0.0.1:11111
# [INFO] Connected to MooMoo API
```

### ステップ 3.1: 起動確認

```bash
# 別のコマンドプロンプトで接続テスト
curl http://127.0.0.1:11111/health

# 期待される応答:
# {"status":"ok"}
```

---

## ステップ 4: brake-pro との統合

### 4.1 環境変数の確認

`.env` ファイルで以下の設定を確認：

```bash
MOOMOO_HOST=127.0.0.1
MOOMOO_PORT=11111
API_HOST=0.0.0.0
API_PORT=8000
REACT_APP_API_URL=http://localhost:8000
NODE_ENV=development
```

### 4.2 FastAPI サーバーの起動

```bash
# 1. 仮想環境を有効化
venv\Scripts\activate

# 2. FastAPI サーバーを起動
python server\moomoo_api.py

# 期待される出力:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 4.3 React 開発サーバーの起動

```bash
# 別のターミナルで実行
pnpm dev
# または
npm run dev

# 期待される出力:
# ➜  Local:   http://localhost:5173/
```

---

## ステップ 5: 統合テスト

### 5.1 API ヘルスチェック

```bash
# FastAPI ヘルスチェック
curl http://localhost:8000/health

# 期待される応答:
# {"status":"ok","timestamp":"2026-03-18T14:30:00.000000"}
```

### 5.2 OpenD 接続テスト

```bash
# OpenD ヘルスチェック
curl http://127.0.0.1:11111/health

# 期待される応答:
# {"status":"ok"}
```

### 5.3 Market Dashboard テスト

```
ブラウザで以下にアクセス:
http://localhost:5173/market

期待される動作:
- ページが読み込まれる
- 市場選択ボタンが表示される
- 主要指数が表示される（リアルタイムデータ）
- 特集銘柄が表示される
```

### 5.4 API エンドポイントテスト

```bash
# 現在価格を取得
curl "http://localhost:8000/api/quote/current?code=HK.00700"

# 期待される応答:
# {
#   "code": "HK.00700",
#   "name": "Tencent",
#   "price": 123.45,
#   "change": 1.23,
#   "change_rate": 1.01,
#   "timestamp": "2026-03-18T14:30:00"
# }
```

### 5.5 ユニットテスト実行

```bash
# Python テストを実行
python -m pytest server\test_moomoo_wrapper.py -v

# 期待される結果:
# ====== 16 passed in 0.42s ======
```

---

## トラブルシューティング

### 問題 1: OpenD が起動しない

**症状**: `OpenD.exe` をダブルクリックしても何も起こらない

**解決策**:
```bash
# 1. コマンドプロンプトで実行して、エラーメッセージを確認
cd C:\Users\YourUsername\moomoo_opend\CLI\
OpenD.exe

# 2. 一般的なエラー:
# - "OpenD.xml not found" → OpenD.xml が同じフォルダにあることを確認
# - "Login failed" → アカウント情報が正しいことを確認
# - "Port already in use" → ポート 11111 が使用中
```

### 問題 2: ポート 11111 が既に使用されている

**症状**: `Address already in use`

**解決策**:
```bash
# 1. ポート 11111 を使用しているプロセスを確認
netstat -ano | findstr :11111

# 2. プロセスを終了
taskkill /PID <PID> /F

# 3. OpenD を再起動
```

### 問題 3: ログイン失敗

**症状**: `Login failed: Invalid account or password`

**解決策**:
```bash
# 1. MooMoo アカウント情報を確認
# - ユーザーID、電話番号、またはメール
# - パスワード（大文字小文字を区別）

# 2. OpenD.xml を編集
<login_account>your_account</login_account>
<login_pwd>your_password</login_pwd>

# 3. OpenD を再起動
```

### 問題 4: API が応答しない

**症状**: `curl http://localhost:8000/api/quote/current?code=HK.00700` が失敗

**解決策**:
```bash
# 1. FastAPI サーバーが起動していることを確認
# ターミナルで以下が表示されていることを確認:
# INFO:     Uvicorn running on http://0.0.0.0:8000

# 2. OpenD が起動していることを確認
curl http://127.0.0.1:11111/health

# 3. ファイアウォール設定を確認
# Windows Defender ファイアウォール → 詳細設定
# → 受信規則 → ポート 8000, 11111 が許可されていることを確認
```

### 問題 5: リアルタイムデータが表示されない

**症状**: Market Dashboard にデータが表示されない

**解決策**:
```bash
# 1. OpenD が接続されていることを確認
# OpenD GUI または CLI で "Connected" ステータスを確認

# 2. ブラウザコンソールでエラーを確認
# F12 キーを押して、Console タブでエラーメッセージを確認

# 3. ネットワークリクエストを確認
# Network タブで API リクエストが成功していることを確認

# 4. キャッシュをクリア
# Ctrl + Shift + Delete でブラウザキャッシュをクリア
```

---

## 詳細設定（オプション）

### WebSocket の有効化

リアルタイムデータ更新を高速化するために、WebSocket を有効化できます：

```xml
<!-- OpenD.xml -->
<websocket_ip>127.0.0.1</websocket_ip>
<websocket_port>33333</websocket_port>
```

### ログレベルの変更

デバッグ情報を詳細に取得する場合：

```xml
<!-- OpenD.xml -->
<log_level>debug</log_level>

<!-- ログファイルの場所を指定 -->
<log_path>C:\Users\YourUsername\moomoo_opend\logs</log_path>
```

### JSON プロトコルの使用

Protocol Buffers の代わりに JSON を使用する場合：

```xml
<!-- OpenD.xml -->
<push_proto_type>1</push_proto_type>
```

---

## パフォーマンス最適化

### 1. データ推送頻度の制限

```xml
<!-- OpenD.xml -->
<!-- 1秒ごとにデータを推送 -->
<qot_push_frequency>1000</qot_push_frequency>
```

### 2. ログレベルの最適化

```xml
<!-- 本番環境ではログレベルを低く設定 -->
<log_level>warning</log_level>
```

### 3. メモリ使用量の監視

```bash
# Windows タスクマネージャーで OpenD.exe のメモリ使用量を監視
# 通常: 50-150 MB
# 異常: 500 MB 以上
```

---

## セキュリティ設定

### 1. ファイアウォール設定

```bash
# Windows Defender ファイアウォール
# → 詳細設定
# → 受信規則
# → 新しい規則
# → ポート 11111, 8000 を許可
```

### 2. ローカルホストのみアクセス

```xml
<!-- OpenD.xml -->
<!-- 127.0.0.1 のみアクセス可能 -->
<ip>127.0.0.1</ip>
```

### 3. RSA 暗号化（オプション）

```xml
<!-- OpenD.xml -->
<rsa_private_key>C:\path\to\private_key</rsa_private_key>
```

---

## 監視とログ

### ログファイルの確認

```bash
# ログファイルの場所（デフォルト）
C:\Users\YourUsername\AppData\Local\moomoo_OpenD\logs\

# ログファイルを確認
type C:\Users\YourUsername\AppData\Local\moomoo_OpenD\logs\opend.log
```

### リアルタイムログの表示

```bash
# CLI版で起動した場合、コンソールにリアルタイムログが表示されます
OpenD.exe

# 出力例:
# [2026-03-18 14:30:00] [INFO] OpenD Server started
# [2026-03-18 14:30:01] [INFO] Connected to MooMoo API
# [2026-03-18 14:30:02] [INFO] Quote data received: HK.00700
```

---

## よくある質問（FAQ）

### Q1: GUI版と CLI版の違いは？

**A**:
| 項目 | GUI版 | CLI版 |
|------|-------|-------|
| 使いやすさ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| メモリ使用量 | 中程度 | 少ない |
| サーバー運用 | 不向き | 向き |
| 推奨用途 | 開発・テスト | 本番・長時間運用 |

### Q2: デモアカウントで動作しますか？

**A**: はい。デモアカウント（ID: 100000）で基本的な機能が使用できます。ただし、リアルタイムデータの更新頻度が制限される場合があります。

### Q3: 複数のアプリケーションから OpenD に接続できますか？

**A**: はい。OpenD は複数のクライアントからの同時接続をサポートしています。

### Q4: OpenD を自動起動するには？

**A**:
```bash
# Windows タスクスケジューラで設定
# 1. タスクスケジューラを開く
# 2. 基本タスクの作成
# 3. トリガー: コンピューター起動時
# 4. 操作: プログラムの開始
# 5. プログラム: C:\Users\YourUsername\moomoo_opend\CLI\OpenD.exe
```

### Q5: OpenD を停止するには？

**A**:
```bash
# GUI版: ウィンドウを閉じる

# CLI版: Ctrl + C を押す

# プロセスから強制終了:
taskkill /IM OpenD.exe /F
```

---

## チェックリスト

セットアップ完了時に以下を確認してください：

- [ ] OpenD ファイルを解凍
- [ ] OpenD.xml を編集（CLI版の場合）
- [ ] OpenD を起動
- [ ] ポート 11111 で接続確認
- [ ] FastAPI サーバーを起動
- [ ] React 開発サーバーを起動
- [ ] ブラウザで http://localhost:5173/market にアクセス
- [ ] Market Dashboard にリアルタイムデータが表示される
- [ ] ユニットテストが全て PASSED
- [ ] API エンドポイントが応答する

---

## 次のステップ

1. **アプリケーションを探索**
   - Market Dashboard で株価を確認
   - Portfolio Page でポートフォリオを管理
   - Stock Detail で銘柄詳細を表示

2. **テストを実行**
   - ユニットテスト: `python -m pytest server\test_moomoo_wrapper.py -v`
   - 統合テスト: `bash integration_test.sh`

3. **本番環境へのデプロイ**
   - MOOMOO_FINAL_SUMMARY.md を参照

---

## サポート

- **ドキュメント**: [SETUP_LOCAL_PC.md](SETUP_LOCAL_PC.md)
- **テストガイド**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **公式ドキュメント**: https://openapi.moomoo.com/moomoo-api-doc/
- **GitHub Issues**: https://github.com/kema77570-source/brake-pro/issues

---

**作成日**: 2026-03-18  
**バージョン**: OpenD 10.0.6018  
**対応OS**: Windows 10 以上
