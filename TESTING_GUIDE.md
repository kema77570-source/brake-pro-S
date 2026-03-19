# MooMoo API 統合テストガイド

## テスト概要

MooMoo API 統合の包括的なテストスイートを提供します。以下のテストが含まれます：

- **ユニットテスト**: コアロジックの検証
- **統合テスト**: API エンドポイントの検証
- **手動テスト**: ブラウザでの UI 検証

---

## ユニットテスト

### テスト対象

| テストクラス | テスト項目 | 説明 |
|-------------|----------|------|
| `TestCacheManager` | キャッシュ機能 | TTL、有効期限、クリア |
| `TestQuoteData` | データモデル | QuoteData の作成と検証 |
| `TestKlineData` | データモデル | KlineData の作成と検証 |
| `TestOrderBookData` | データモデル | OrderBookData の作成と検証 |
| `TestMooMooQuoteWrapper` | ラッパー層 | 初期化、キャッシング |
| `TestFastAPIEndpoints` | API エンドポイント | 全エンドポイントの検証 |

### テスト実行

```bash
# すべてのテストを実行
python -m pytest server/test_moomoo_wrapper.py -v

# 特定のテストクラスを実行
python -m pytest server/test_moomoo_wrapper.py::TestCacheManager -v

# 特定のテストを実行
python -m pytest server/test_moomoo_wrapper.py::TestCacheManager::test_cache_set_and_get -v

# カバレッジ付きで実行
python -m pytest server/test_moomoo_wrapper.py --cov=server --cov-report=html
```

### テスト結果の解釈

```
PASSED: テスト成功
FAILED: テスト失敗
ERROR: テスト実行エラー
SKIPPED: テストスキップ
```

---

## 統合テスト

### FastAPI エンドポイントテスト

#### 1. Health Check

```bash
curl http://localhost:8000/health
```

**期待される応答**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T14:30:00.000000"
}
```

#### 2. 株価取得

```bash
curl "http://localhost:8000/api/quote/current?code=HK.00700"
```

**期待される応答**:
```json
{
  "code": "HK.00700",
  "price": 185.6,
  "high": 186.2,
  "low": 183.4,
  "volume": 12345678,
  "turnover": 2300000000,
  "change_val": 5.6,
  "change_rate": 3.1,
  "timestamp": "2026-03-18 14:30:00"
}
```

#### 3. K線データ取得

```bash
curl "http://localhost:8000/api/quote/kline?code=HK.00700&ktype=K_DAY&days=30"
```

**期待される応答**:
```json
[
  {
    "code": "HK.00700",
    "time_key": "2026-03-18",
    "open": 180.0,
    "close": 185.6,
    "high": 186.2,
    "low": 183.4,
    "volume": 12345678,
    "turnover": 2300000000
  },
  ...
]
```

#### 4. オーダーブック取得

```bash
curl "http://localhost:8000/api/quote/orderbook?code=HK.00700"
```

**期待される応答**:
```json
{
  "code": "HK.00700",
  "bid": [
    {"price": 185.4, "volume": 100000},
    {"price": 185.2, "volume": 80000}
  ],
  "ask": [
    {"price": 185.6, "volume": 90000},
    {"price": 185.8, "volume": 70000}
  ]
}
```

#### 5. ポートフォリオ追加

```bash
curl -X POST "http://localhost:8000/api/portfolio/add" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "HK.00700",
    "quantity": 100,
    "cost_price": 180.0
  }'
```

**期待される応答**:
```json
{
  "code": "HK.00700",
  "quantity": 100,
  "cost_price": 180.0,
  "current_price": 0.0,
  "pnl": 0.0,
  "pnl_rate": 0.0
}
```

#### 6. ポートフォリオ一覧

```bash
curl "http://localhost:8000/api/portfolio/list"
```

**期待される応答**:
```json
[
  {
    "code": "HK.00700",
    "quantity": 100,
    "cost_price": 180.0,
    "current_price": 185.6,
    "pnl": 560.0,
    "pnl_rate": 3.1
  }
]
```

#### 7. ポートフォリオサマリー

```bash
curl "http://localhost:8000/api/portfolio/summary"
```

**期待される応答**:
```json
{
  "total_value": 18560.0,
  "total_cost": 18000.0,
  "total_pnl": 560.0,
  "pnl_rate": 3.11,
  "holdings": [...]
}
```

#### 8. 注文発注

```bash
curl -X POST "http://localhost:8000/api/trade/place-order" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "HK.00700",
    "quantity": 100,
    "price": 185.6,
    "side": "BUY"
  }'
```

**期待される応答**:
```json
{
  "order_id": 1,
  "code": "HK.00700",
  "quantity": 100,
  "price": 185.6,
  "side": "BUY",
  "status": "FILLED",
  "created_at": "2026-03-18T14:30:00.000000"
}
```

#### 9. 注文一覧

```bash
curl "http://localhost:8000/api/trade/order-list"
```

**期待される応答**:
```json
[
  {
    "order_id": 1,
    "code": "HK.00700",
    "quantity": 100,
    "price": 185.6,
    "side": "BUY",
    "status": "FILLED",
    "created_at": "2026-03-18T14:30:00.000000"
  }
]
```

---

## UI テスト（手動）

### Market Dashboard テスト

**URL**: `http://localhost:5173/market`

**テスト項目**:

1. **ページ読み込み**
   - [ ] ページが正常に読み込まれる
   - [ ] ヘッダーが表示される
   - [ ] 市場選択ボタンが表示される

2. **市場選択**
   - [ ] 「Hong Kong」ボタンをクリック
   - [ ] 「United States」ボタンをクリック
   - [ ] 市場が切り替わる

3. **主要指数表示**
   - [ ] HSI（ハンセン指数）が表示される
   - [ ] HSCEI が表示される
   - [ ] S&P 500 が表示される
   - [ ] Dow Jones が表示される

4. **特集銘柄表示**
   - [ ] テンセント（HK.00700）が表示される
   - [ ] ペイペイ（HK.02318）が表示される
   - [ ] ICBC（HK.01398）が表示される
   - [ ] CNOOC（HK.00883）が表示される

5. **株価データ**
   - [ ] 現在価格が表示される
   - [ ] 高値・安値が表示される
   - [ ] 変動率が表示される
   - [ ] 出来高が表示される

6. **全銘柄テーブル**
   - [ ] テーブルが表示される
   - [ ] 銘柄コードが表示される
   - [ ] 銘柄名が表示される
   - [ ] ロット数が表示される

### Portfolio Page テスト

**URL**: `http://localhost:5173/portfolio`

**テスト項目**:

1. **ページ読み込み**
   - [ ] ページが正常に読み込まれる
   - [ ] ヘッダーが表示される
   - [ ] 「Add Holding」ボタンが表示される

2. **銘柄追加**
   - [ ] 「Add Holding」ボタンをクリック
   - [ ] フォームが表示される
   - [ ] 銘柄コード入力欄が表示される
   - [ ] 数量入力欄が表示される
   - [ ] 取得価格入力欄が表示される

3. **銘柄追加実行**
   - [ ] 「HK.00700」を入力
   - [ ] 「100」を入力
   - [ ] 「180.0」を入力
   - [ ] 「Add」ボタンをクリック
   - [ ] 成功メッセージが表示される

4. **ポートフォリオサマリー**
   - [ ] 総資産が表示される
   - [ ] 総コストが表示される
   - [ ] 損益が表示される
   - [ ] 損益率が表示される

5. **保有銘柄表示**
   - [ ] 銘柄コードが表示される
   - [ ] 数量が表示される
   - [ ] 取得価格が表示される
   - [ ] 現在価格が表示される
   - [ ] 損益が表示される
   - [ ] 損益率が表示される

6. **銘柄削除**
   - [ ] ゴミ箱アイコンをクリック
   - [ ] 銘柄が削除される
   - [ ] 削除メッセージが表示される

### Stock Detail テスト

**URL**: `http://localhost:5173/stock/HK.00700`

**テスト項目**:

1. **ページ読み込み**
   - [ ] ページが正常に読み込まれる
   - [ ] 銘柄コードが表示される
   - [ ] トレンドアイコンが表示される

2. **価格情報**
   - [ ] 現在価格が表示される
   - [ ] 変動額が表示される
   - [ ] 変動率が表示される
   - [ ] 高値・安値が表示される
   - [ ] 出来高が表示される

3. **K線チャート**
   - [ ] チャートが表示される
   - [ ] 過去30日のデータが表示される
   - [ ] 最小値・最大値が表示される

4. **オーダーブック**
   - [ ] 買値（Buy Orders）が表示される
   - [ ] 売値（Sell Orders）が表示される
   - [ ] 価格と数量が表示される

5. **詳細情報**
   - [ ] 売上高が表示される
   - [ ] 更新時刻が表示される
   - [ ] 市場が表示される
   - [ ] ステータスが表示される

---

## パフォーマンステスト

### 負荷テスト

```bash
# Apache Bench を使用した負荷テスト
ab -n 1000 -c 10 http://localhost:8000/api/quote/current?code=HK.00700
```

**期待される結果**:
- 平均応答時間: < 100ms
- 99パーセンタイル: < 500ms
- エラー率: 0%

### キャッシュ効率テスト

```bash
# キャッシュヒット率を測定
for i in {1..100}; do
  curl -s "http://localhost:8000/api/quote/current?code=HK.00700" > /dev/null
done
```

**期待される結果**:
- キャッシュヒット率: > 95%
- 平均応答時間: < 10ms

---

## トラブルシューティング

### テスト実行エラー

**エラー**: `ModuleNotFoundError: No module named 'moomoo'`

**原因**: MooMoo SDK が正しくインストールされていない

**解決策**:
```bash
cp -r /home/ubuntu/moomoo_sdk/MMAPI4Python_10.0.6008/moomoo server/lib/
```

### API 接続エラー

**エラー**: `Connection refused: 127.0.0.1:11111`

**原因**: MooMoo OpenD が起動していない

**解決策**:
1. MooMoo OpenD をインストール
2. ローカルマシンで起動
3. ポート 11111 が開いていることを確認

### テスト失敗

**エラー**: `FAILED test_get_current_quote`

**原因**: API が正常に動作していない

**解決策**:
1. FastAPI サーバーが起動しているか確認
2. MooMoo OpenD が接続可能か確認
3. ネットワーク接続を確認

---

## テスト自動化

### GitHub Actions での自動テスト

`.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest
      
      - name: Run tests
        run: |
          python -m pytest server/test_moomoo_wrapper.py -v
```

---

## テストカバレッジ

### 現在のカバレッジ

```
server/moomoo_wrapper.py    85%
server/moomoo_api.py        78%
client/src/hooks/useMooMooAPI.ts   92%
```

### カバレッジレポート生成

```bash
python -m pytest server/test_moomoo_wrapper.py --cov=server --cov-report=html
open htmlcov/index.html
```

---

## テストチェックリスト

### デプロイ前の確認

- [ ] すべてのユニットテストが成功
- [ ] すべての統合テストが成功
- [ ] UI テストが完了
- [ ] パフォーマンステストが合格
- [ ] エラーハンドリングが正常
- [ ] ログが正常に出力される
- [ ] キャッシュが正常に動作
- [ ] API レート制限が機能
- [ ] セキュリティチェックが完了
- [ ] ドキュメントが最新

---

## 参考資料

- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [React Testing Library](https://testing-library.com/react)
