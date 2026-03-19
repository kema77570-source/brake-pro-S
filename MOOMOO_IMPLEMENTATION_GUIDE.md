# MooMoo API 統合実装ガイド

## 実装完了項目

### Phase 1: バックエンド基盤 ✅

#### 1. MooMoo API ラッパー層 (`server/moomoo_wrapper.py`)

**実装内容**:

- **MooMooQuoteWrapper クラス**
  - `get_current_price(code)` - リアルタイム株価取得
  - `get_kline(code, days, ktype)` - K線データ取得
  - `get_orderbook(code)` - オーダーブック取得
  - `get_stock_basicinfo(market)` - 基本情報取得

- **MooMooTradeWrapper クラス**
  - `unlock_trade(password)` - 取引ロック解除
  - `get_account_info()` - アカウント情報取得
  - `get_position_list()` - ポジション一覧取得

- **CacheManager クラス**
  - TTL付きインメモリキャッシュ
  - 株価: 5秒
  - K線: 1分
  - 基本情報: 5分

**主な特徴**:
- エラーハンドリング完備
- ロギング機構
- グローバルインスタンス管理
- 自動接続管理

#### 2. FastAPI バックエンド (`server/moomoo_api.py`)

**実装エンドポイント**:

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/quote/current` | GET | 現在の株価取得 |
| `/api/quote/kline` | GET | K線データ取得 |
| `/api/quote/orderbook` | GET | オーダーブック取得 |
| `/api/quote/basicinfo` | GET | 基本情報取得 |
| `/api/portfolio/list` | GET | ポートフォリオ一覧 |
| `/api/portfolio/add` | POST | 銘柄追加 |
| `/api/portfolio/{code}` | PUT | ポジション更新 |
| `/api/portfolio/{code}` | DELETE | ポジション削除 |
| `/api/portfolio/summary` | GET | ポートフォリオサマリー |
| `/api/trade/place-order` | POST | 注文発注 |
| `/api/trade/order-list` | GET | 注文一覧 |
| `/health` | GET | ヘルスチェック |

**主な特徴**:
- Pydantic モデルによる型安全性
- CORS 対応
- エラーハンドリング
- ロギング機構
- ライフサイクル管理

---

## セットアップ手順

### 1. 依存関係のインストール

```bash
# Python 依存関係
pip install fastapi uvicorn pydantic python-dotenv

# MooMoo SDK 依存関係
pip install pandas simplejson pycryptodome
```

### 2. MooMoo OpenD のセットアップ

MooMoo API を使用するには、ローカルマシンで **MooMoo OpenD** が実行中である必要があります。

**インストール手順**:
1. MooMoo 公式サイトから OpenD をダウンロード
2. ローカルマシンにインストール
3. ポート 11111 で起動確認

**接続確認**:
```bash
# テスト接続
python server/moomoo_wrapper.py
```

### 3. 環境変数設定

`.env` ファイルを作成:

```env
# MooMoo API 接続設定
MOOMOO_HOST=127.0.0.1
MOOMOO_PORT=11111

# FastAPI サーバー設定
API_HOST=0.0.0.0
API_PORT=8000
```

### 4. FastAPI サーバー起動

```bash
# 開発環境
python server/moomoo_api.py

# または
uvicorn server.moomoo_api:app --reload --host 0.0.0.0 --port 8000
```

サーバーは `http://localhost:8000` で起動します。

**API ドキュメント**: `http://localhost:8000/docs`

---

## 使用例

### Python での直接使用

```python
from server.moomoo_wrapper import get_quote_wrapper

# 現在価格取得
wrapper = get_quote_wrapper()
quote = wrapper.get_current_price('HK.00700')
print(f"Price: {quote.price}")

# K線データ取得
klines = wrapper.get_kline('HK.00700', ktype='K_DAY')
for kline in klines:
    print(f"{kline.time_key}: O={kline.open} C={kline.close}")
```

### REST API での使用

```bash
# 現在価格取得
curl "http://localhost:8000/api/quote/current?code=HK.00700"

# K線データ取得
curl "http://localhost:8000/api/quote/kline?code=HK.00700&ktype=K_DAY"

# ポートフォリオ追加
curl -X POST "http://localhost:8000/api/portfolio/add" \
  -H "Content-Type: application/json" \
  -d '{"code":"HK.00700","quantity":100,"cost_price":180.0}'

# ポートフォリオサマリー取得
curl "http://localhost:8000/api/portfolio/summary"
```

### JavaScript/TypeScript での使用

```typescript
// React Query での使用
import { useQuery } from '@tanstack/react-query';

function useStockPrice(code: string) {
  return useQuery({
    queryKey: ['quote', code],
    queryFn: async () => {
      const res = await fetch(`/api/quote/current?code=${code}`);
      return res.json();
    },
    refetchInterval: 5000, // 5秒ごとに更新
  });
}

// コンポーネント内での使用
function StockPrice({ code }) {
  const { data, isLoading } = useStockPrice(code);
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{code}</h1>
      <p>Price: ¥{data.price}</p>
      <p>Change: {data.change_rate}%</p>
    </div>
  );
}
```

---

## トラブルシューティング

### エラー: `Connection refused: 127.0.0.1:11111`

**原因**: MooMoo OpenD が起動していない

**解決策**:
1. MooMoo OpenD をインストール
2. ローカルマシンで起動
3. ポート 11111 が開いていることを確認

```bash
# ポート確認
netstat -an | grep 11111
```

### エラー: `Failed to get quote: RET_ERROR`

**原因**: 銘柄コードが無効、またはデータが利用不可

**解決策**:
1. 銘柄コードを確認（例：HK.00700）
2. マーケットが営業時間内であることを確認
3. MooMoo API のレート制限を確認

### パフォーマンス低下

**原因**: API 呼び出しが多すぎる

**解決策**:
1. キャッシュ TTL を調整
   ```python
   # server/moomoo_wrapper.py
   self.cache.set(cache_key, quote, ttl_seconds=10)  # 10秒に増加
   ```

2. バッチリクエストを使用
   ```python
   codes = ['HK.00700', 'HK.02318', 'HK.01398']
   quotes = [wrapper.get_current_price(code) for code in codes]
   ```

3. WebSocket でリアルタイム配信に切り替え（将来実装）

---

## 次のステップ

### Phase 2: ポートフォリオ機能

- [ ] ユーザーごとのポートフォリオ管理（データベース連携）
- [ ] ポートフォリオ UI コンポーネント実装
- [ ] 時価評価チャート表示

### Phase 3: マーケット分析

- [ ] 上昇・下落銘柄ランキング
- [ ] セクター別分析
- [ ] ホットリスト表示

### Phase 4: 取引シミュレーション

- [ ] 本格的な注文管理
- [ ] ポジション管理
- [ ] 損益計算

### Phase 5: 高度な機能

- [ ] WebSocket リアルタイム配信
- [ ] テクニカル分析指標（MACD、RSI等）
- [ ] アラート機能
- [ ] ポートフォリオ最適化

---

## API リファレンス

### Quote API

#### GET `/api/quote/current`

現在の株価を取得します。

**パラメータ**:
- `code` (string, required): 銘柄コード（例：HK.00700）

**レスポンス**:
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

#### GET `/api/quote/kline`

K線データを取得します。

**パラメータ**:
- `code` (string, required): 銘柄コード
- `ktype` (string, optional): K線タイプ（デフォルト：K_DAY）
- `days` (integer, optional): 日数（デフォルト：30）

**レスポンス**:
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

### Portfolio API

#### GET `/api/portfolio/list`

ポートフォリオの保有銘柄一覧を取得します。

**レスポンス**:
```json
[
  {
    "code": "HK.00700",
    "quantity": 100,
    "cost_price": 180.0,
    "current_price": 185.6,
    "pnl": 560.0,
    "pnl_rate": 3.1
  },
  ...
]
```

#### POST `/api/portfolio/add`

ポートフォリオに銘柄を追加します。

**リクエストボディ**:
```json
{
  "code": "HK.00700",
  "quantity": 100,
  "cost_price": 180.0
}
```

#### GET `/api/portfolio/summary`

ポートフォリオのサマリーを取得します。

**レスポンス**:
```json
{
  "total_value": 5000000,
  "total_cost": 4750000,
  "total_pnl": 250000,
  "pnl_rate": 5.0,
  "holdings": [...]
}
```

---

## セキュリティに関する注意

### 本番環境での推奨事項

1. **認証の実装**
   - OAuth 2.0 または JWT による認証
   - ユーザーごとのポートフォリオ分離

2. **データベースの使用**
   - インメモリストレージではなく、PostgreSQL/MySQL を使用
   - ユーザーデータの暗号化

3. **API レート制限**
   - ユーザーごとのレート制限
   - IP ベースの制限

4. **HTTPS の使用**
   - SSL/TLS 証明書の設定
   - CORS の厳格な設定

5. **入力検証**
   - すべての入力値を検証
   - SQL インジェクション対策

---

## ライセンスと参考資料

- [MooMoo API Documentation](https://moomoo.com/api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
