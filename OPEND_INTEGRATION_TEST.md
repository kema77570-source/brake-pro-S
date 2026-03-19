# MooMoo OpenD 統合テストガイド

## 概要

このガイドでは、MooMoo OpenD、FastAPI バックエンド、React フロントエンドの統合テストを実施する手順を説明します。

---

## 前提条件

- ✅ MooMoo OpenD がセットアップ済み
- ✅ FastAPI サーバーが起動可能
- ✅ React 開発サーバーが起動可能
- ✅ Python 3.11+ インストール済み
- ✅ requests ライブラリがインストール済み

---

## テスト構成

統合テストは以下の4つのフェーズで構成されています：

### フェーズ 1: ヘルスチェック
- OpenD が正常に起動しているか確認
- FastAPI サーバーが正常に起動しているか確認

### フェーズ 2: Quote API テスト
- 現在価格取得 API
- K線データ取得 API
- オーダーブック取得 API

### フェーズ 3: ポートフォリオ管理テスト
- ポートフォリオへの銘柄追加
- ポートフォリオ一覧取得
- ポートフォリオサマリー取得

### フェーズ 4: パフォーマンステスト
- API 応答時間測定
- 複数リクエストの処理

---

## ステップ 1: 環境準備

### 1.1 OpenD を起動

**GUI版:**
```bash
# Windows
C:\Users\YourUsername\moomoo_opend\GUI\moomoo_OpenD-GUI_10.0.6018_Windows.exe

# GUI で以下を確認:
# - ユーザーID、パスワードを入力
# - 「Start」ボタンをクリック
# - ステータスが「Connected」に変わる
```

**CLI版:**
```bash
# Windows
cd C:\Users\YourUsername\moomoo_opend\CLI\
OpenD.exe

# 期待される出力:
# [INFO] OpenD Server started on 127.0.0.1:11111
# [INFO] Connected to MooMoo API
```

### 1.2 FastAPI サーバーを起動

```bash
# ターミナル 1
cd brake-pro

# 仮想環境を有効化
venv\Scripts\activate

# FastAPI サーバーを起動
python server\moomoo_api.py

# 期待される出力:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 1.3 React 開発サーバーを起動（オプション）

```bash
# ターミナル 2
cd brake-pro

# React サーバーを起動
pnpm dev
# または
npm run dev

# 期待される出力:
# ➜  Local:   http://localhost:5173/
```

---

## ステップ 2: 統合テストの実行

### 2.1 テストスクリプトの実行

```bash
# ターミナル 3
cd brake-pro

# 仮想環境を有効化
venv\Scripts\activate

# テストスクリプトを実行
python test_opend_integration.py
```

### 2.2 期待される出力

```
============================================================
        MooMoo OpenD Integration Test Suite
============================================================

============================================================
                 Phase 1: Health Checks
============================================================

Test: OpenD Health Check
✓ OpenD is running on http://127.0.0.1:11111
ℹ Response: {'status': 'ok'}

Test: FastAPI Health Check
✓ FastAPI is running on http://localhost:8000
ℹ Status: ok
ℹ Timestamp: 2026-03-18T14:30:00.000000

============================================================
                Phase 2: Quote API Tests
============================================================

Test: Get Current Quote for HK.00700
✓ Quote retrieved for HK.00700
ℹ Price: 123.45
ℹ Change: 1.23 (1.01%)
ℹ Timestamp: 2026-03-18T14:30:00

... (more tests) ...

============================================================
                    Test Summary
============================================================

PASS - OpenD Health
PASS - FastAPI Health
PASS - Quote Current - HK.00700
PASS - Quote Current - HK.00001
PASS - Quote K-line - HK.00700
PASS - Quote OrderBook - HK.00700
PASS - Portfolio Operations
PASS - Performance

ℹ Results: 8/8 tests passed
✓ All tests passed!
```

---

## ステップ 3: 手動テスト

### 3.1 ブラウザでテスト

```
http://localhost:5173/market
```

**確認項目:**
- [ ] ページが読み込まれる
- [ ] 市場選択ボタンが表示される
- [ ] 主要指数が表示される
- [ ] 特集銘柄が表示される
- [ ] リアルタイムデータが更新される

### 3.2 API エンドポイントをテスト

```bash
# 現在価格を取得
curl "http://localhost:8000/api/quote/current?code=HK.00700"

# K線データを取得
curl "http://localhost:8000/api/quote/kline?code=HK.00700&period=day&count=5"

# オーダーブックを取得
curl "http://localhost:8000/api/quote/orderbook?code=HK.00700"

# ポートフォリオに銘柄を追加
curl -X POST http://localhost:8000/api/portfolio/add \
  -H "Content-Type: application/json" \
  -d '{"code": "HK.00700", "quantity": 100}'

# ポートフォリオを取得
curl "http://localhost:8000/api/portfolio/list"
```

---

## テスト結果の解釈

### 成功の場合

```
✓ All tests passed!
Results: 8/8 tests passed
```

**意味**: すべてのテストが成功し、OpenD、FastAPI、React が正常に統合されています。

### 失敗の場合

#### エラー 1: OpenD に接続できない

```
✗ Cannot connect to OpenD at http://127.0.0.1:11111
⚠ Make sure OpenD is running on port 11111
```

**解決策**:
1. OpenD が起動しているか確認
2. ポート 11111 が使用中でないか確認
3. ファイアウォール設定を確認

#### エラー 2: FastAPI に接続できない

```
✗ Cannot connect to FastAPI at http://localhost:8000
⚠ Make sure FastAPI server is running on port 8000
```

**解決策**:
1. FastAPI サーバーが起動しているか確認
2. ポート 8000 が使用中でないか確認
3. 仮想環境が有効化されているか確認

#### エラー 3: API が 500 エラーを返す

```
✗ API returned status code 500
ℹ Response: {"detail": "Internal server error"}
```

**解決策**:
1. FastAPI サーバーのログを確認
2. OpenD が正常に接続されているか確認
3. 設定ファイルを確認

---

## パフォーマンス基準

### 応答時間

| 指標 | 基準値 | 評価 |
|------|--------|------|
| 平均応答時間 | < 100ms | 優秀 |
| 平均応答時間 | 100-500ms | 良好 |
| 平均応答時間 | > 500ms | 要改善 |

### テスト出力例

```
Test: API Performance Test
✓ 10 requests completed
ℹ Average response time: 45.23ms
ℹ Min response time: 32.15ms
ℹ Max response time: 78.91ms
✓ Performance is excellent
```

---

## トラブルシューティング

### 問題 1: テストが途中で止まる

**症状**: テストが実行中に応答がなくなる

**解決策**:
```bash
# 1. OpenD のログを確認
# OpenD CLI の出力を確認

# 2. FastAPI のログを確認
# FastAPI サーバーのターミナルを確認

# 3. ネットワーク接続を確認
ping 127.0.0.1

# 4. ポート接続をテスト
curl http://127.0.0.1:11111/health
curl http://localhost:8000/health
```

### 問題 2: データが表示されない

**症状**: API は成功しているが、データが空

**解決策**:
```bash
# 1. OpenD が接続されているか確認
# OpenD GUI/CLI で "Connected" ステータスを確認

# 2. MooMoo アカウント情報を確認
# OpenD.xml でアカウント情報が正しいか確認

# 3. デモアカウントの制限を確認
# デモアカウントはリアルタイムデータの更新頻度が制限される場合があります
```

### 問題 3: ポート競合

**症状**: `Address already in use`

**解決策**:
```bash
# 1. ポート 11111 を使用しているプロセスを確認
netstat -ano | findstr :11111

# 2. ポート 8000 を使用しているプロセスを確認
netstat -ano | findstr :8000

# 3. プロセスを終了
taskkill /PID <PID> /F
```

---

## 詳細テスト

### API エンドポイント別テスト

#### Quote API

```bash
# 現在価格
curl "http://localhost:8000/api/quote/current?code=HK.00700"

# K線データ
curl "http://localhost:8000/api/quote/kline?code=HK.00700&period=day&count=10"

# オーダーブック
curl "http://localhost:8000/api/quote/orderbook?code=HK.00700"

# 基本情報
curl "http://localhost:8000/api/quote/basic?code=HK.00700"
```

#### Portfolio API

```bash
# ポートフォリオに追加
curl -X POST http://localhost:8000/api/portfolio/add \
  -H "Content-Type: application/json" \
  -d '{"code": "HK.00700", "quantity": 100}'

# ポートフォリオ一覧
curl "http://localhost:8000/api/portfolio/list"

# ポートフォリオサマリー
curl "http://localhost:8000/api/portfolio/summary"

# ポートフォリオから削除
curl -X DELETE "http://localhost:8000/api/portfolio/remove?code=HK.00700"
```

#### Trade API

```bash
# 注文発注
curl -X POST http://localhost:8000/api/trade/order \
  -H "Content-Type: application/json" \
  -d '{
    "code": "HK.00700",
    "order_type": "BUY",
    "price": 120.00,
    "quantity": 100
  }'

# 注文一覧
curl "http://localhost:8000/api/trade/orders"
```

---

## 継続的テスト

### 定期的なテスト実行

```bash
# 毎日午前9時に実行
# Windows タスクスケジューラで以下を設定:
# - トリガー: 毎日 9:00
# - 操作: python test_opend_integration.py
# - 出力: test_results.log に保存
```

### テスト結果の記録

```bash
# テスト結果をファイルに保存
python test_opend_integration.py > test_results_$(date +%Y%m%d_%H%M%S).log

# ログを確認
type test_results_20260318_143000.log
```

---

## チェックリスト

テスト実行前に以下を確認してください：

- [ ] OpenD が起動している
- [ ] FastAPI サーバーが起動している
- [ ] ポート 11111 が使用可能
- [ ] ポート 8000 が使用可能
- [ ] インターネット接続が正常
- [ ] MooMoo アカウント情報が正しい

テスト実行後に以下を確認してください：

- [ ] すべてのテストが PASSED
- [ ] 応答時間が基準値以下
- [ ] エラーが表示されていない
- [ ] ブラウザでデータが表示されている
- [ ] API エンドポイントが応答している

---

## 次のステップ

1. **テスト結果の確認**
   - すべてのテストが PASSED したか確認

2. **ブラウザでの動作確認**
   - http://localhost:5173/market にアクセス
   - リアルタイムデータが表示されるか確認

3. **本番環境へのデプロイ**
   - MOOMOO_FINAL_SUMMARY.md を参照

4. **継続的なモニタリング**
   - 定期的にテストを実行
   - ログを記録・分析

---

## サポート

- **セットアップガイド**: [OPEND_SETUP_GUIDE.md](OPEND_SETUP_GUIDE.md)
- **テストガイド**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **GitHub Issues**: https://github.com/kema77570-source/brake-pro/issues

---

**作成日**: 2026-03-18  
**バージョン**: 1.0.0  
**対応OS**: Windows 10 以上
