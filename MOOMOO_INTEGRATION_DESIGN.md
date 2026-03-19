# BRAKE Pro × MooMoo API 統合設計書

## 概要

BRAKE Proの既存トレード管理・称号システムに対して、MooMoo APIからのリアルタイム株価データ取得機能を追加する。これにより、ユーザーは以下の機能を利用できるようになる。

- **リアルタイム株価データ取得**：HK（香港株）、US（米国株）、SZ/SH（中国株）の現在価格・K線データ
- **ポートフォリオ管理**：保有銘柄の時価評価、ポジション管理
- **マーケット分析**：オーダーブック、ティッカー、ブローカーキュー情報
- **取引シミュレーション**：デモアカウントでの注文発注テスト

---

## アーキテクチャ設計

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│              BRAKE Pro クライアント (React)              │
│  - ダッシュボード（株価表示）                           │
│  - ポートフォリオ画面                                   │
│  - マーケット分析画面                                   │
│  - 取引シミュレーション画面                             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST API
                       ↓
┌─────────────────────────────────────────────────────────┐
│        FastAPI バックエンド（Python）                   │
│  - /api/quote/* : 株価データAPI                         │
│  - /api/portfolio/* : ポートフォリオAPI                 │
│  - /api/market/* : マーケット分析API                    │
│  - /api/trade/* : 取引シミュレーションAPI               │
└──────────────────────┬──────────────────────────────────┘
                       │ TCP/IP (Protocol Buffer)
                       ↓
┌─────────────────────────────────────────────────────────┐
│      MooMoo API ラッパー層（Python）                    │
│  - OpenQuoteContext: 株価データ取得                     │
│  - OpenHKTradeContext: 香港株取引                       │
│  - キャッシング・エラーハンドリング                     │
└──────────────────────┬──────────────────────────────────┘
                       │ TCP/IP
                       ↓
┌─────────────────────────────────────────────────────────┐
│     MooMoo OpenD（ローカルサーバー）                    │
│     ポート: 11111                                       │
└─────────────────────────────────────────────────────────┘
```

### データフロー

#### 1. リアルタイム株価取得フロー

```
クライアント
  ↓ GET /api/quote/current?code=HK.00700
FastAPI
  ↓ キャッシュ確認
  ↓ キャッシュミス → MooMoo API呼び出し
MooMoo API
  ↓ OpenQuoteContext.get_cur_kline()
  ↓ Protocol Buffer応答
FastAPI
  ↓ キャッシュ保存（TTL: 5秒）
  ↓ JSON変換
クライアント
  ↓ UI更新
```

#### 2. ポートフォリオ管理フロー

```
クライアント: ユーザーが銘柄追加
  ↓ POST /api/portfolio/add
FastAPI
  ↓ ユーザーのポートフォリオDBに保存
  ↓ 各銘柄の現在価格を取得
  ↓ 時価評価額を計算
  ↓ JSON応答
クライアント
  ↓ ポートフォリオ画面に表示
```

---

## バックエンド実装設計

### FastAPI エンドポイント一覧

#### Quote API（株価データ）

| メソッド | エンドポイント | 説明 | 戻り値 |
|---------|---------------|------|--------|
| GET | `/api/quote/current` | 現在の株価取得 | `{code, price, high, low, volume, change_rate}` |
| GET | `/api/quote/kline` | K線データ取得 | `[{time, open, close, high, low, volume}]` |
| GET | `/api/quote/orderbook` | オーダーブック取得 | `{bid: [], ask: []}` |
| GET | `/api/quote/ticker` | ティッカーデータ取得 | `[{price, volume, time}]` |
| POST | `/api/quote/subscribe` | リアルタイム購読 | WebSocket接続 |

#### Portfolio API（ポートフォリオ）

| メソッド | エンドポイント | 説明 | 戻り値 |
|---------|---------------|------|--------|
| GET | `/api/portfolio/list` | ポートフォリオ一覧 | `[{code, qty, cost, current_price, pnl}]` |
| POST | `/api/portfolio/add` | 銘柄追加 | `{id, code, qty}` |
| PUT | `/api/portfolio/update` | ポジション更新 | `{id, qty}` |
| DELETE | `/api/portfolio/{id}` | ポジション削除 | `{success}` |
| GET | `/api/portfolio/summary` | ポートフォリオサマリー | `{total_value, total_pnl, pnl_rate}` |

#### Market API（マーケット分析）

| メソッド | エンドポイント | 説明 | 戻り値 |
|---------|---------------|------|--------|
| GET | `/api/market/top-gainers` | 上昇銘柄TOP | `[{code, change_rate}]` |
| GET | `/api/market/top-losers` | 下落銘柄TOP | `[{code, change_rate}]` |
| GET | `/api/market/hotlist` | ホットリスト | `[{code, volume, change_rate}]` |
| GET | `/api/market/sector` | セクター分析 | `[{sector, change_rate}]` |

#### Trade Simulation API（取引シミュレーション）

| メソッド | エンドポイント | 説明 | 戻り値 |
|---------|---------------|------|--------|
| POST | `/api/trade/place-order` | 注文発注（シミュレーション） | `{order_id, status}` |
| GET | `/api/trade/order-list` | 注文一覧 | `[{order_id, code, qty, price, status}]` |
| GET | `/api/trade/position-list` | ポジション一覧 | `[{code, qty, avg_price, current_price}]` |

### MooMoo API ラッパー層

**ファイル**: `server/moomoo_wrapper.py`

```python
class MooMooQuoteWrapper:
    """株価データ取得ラッパー"""
    def __init__(self, host='127.0.0.1', port=11111):
        self.ctx = OpenQuoteContext(host=host, port=port)
    
    def get_current_price(self, code: str) -> dict:
        """現在価格取得"""
        ret, data = self.ctx.get_cur_kline(code, 1, SubType.K_1M, AuType.QFQ)
        if ret == RET_OK:
            return self._format_quote(data)
        raise Exception(f"Failed to get quote: {data}")
    
    def get_kline(self, code: str, days: int = 30) -> list:
        """K線データ取得"""
        ret, data = self.ctx.request_history_kline(
            code, start=None, end=None, ktype=KLType.K_DAY, autype=AuType.QFQ
        )
        if ret == RET_OK:
            return self._format_klines(data)
        raise Exception(f"Failed to get kline: {data}")
    
    def get_orderbook(self, code: str) -> dict:
        """オーダーブック取得"""
        ret, data = self.ctx.get_order_book(code)
        if ret == RET_OK:
            return self._format_orderbook(data)
        raise Exception(f"Failed to get orderbook: {data}")
    
    def _format_quote(self, data) -> dict:
        """データフォーマット"""
        return {
            'code': data['code'].iloc[0],
            'price': float(data['close'].iloc[0]),
            'high': float(data['high'].iloc[0]),
            'low': float(data['low'].iloc[0]),
            'volume': int(data['volume'].iloc[0]),
            'timestamp': data['time_key'].iloc[0]
        }
```

### キャッシング戦略

**ファイル**: `server/cache.py`

- **株価データ**: TTL 5秒（リアルタイム性と負荷のバランス）
- **K線データ**: TTL 1分（日足・週足は変更頻度が低い）
- **ポートフォリオ**: TTL 10秒（ユーザー固有データ）
- **マーケットデータ**: TTL 30秒

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CacheManager:
    def __init__(self):
        self.cache = {}
        self.ttl = {}
    
    def get(self, key: str):
        if key in self.cache:
            if datetime.now() < self.ttl[key]:
                return self.cache[key]
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value, ttl_seconds: int):
        self.cache[key] = value
        self.ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)
```

---

## クライアント実装設計

### 新規ページ一覧

#### 1. Market Dashboard（マーケットダッシュボード）

**ルート**: `/market`

**機能**:
- リアルタイム株価表示（複数銘柄）
- 上昇・下落銘柄ランキング
- セクター別パフォーマンス
- ホットリスト（出来高ランキング）

**UI構成**:
```
┌─────────────────────────────────────────┐
│ Market Dashboard                        │
├─────────────────────────────────────────┤
│ 📊 主要指数                             │
│ ┌──────────┬──────────┬──────────────┐ │
│ │ HK.HSI   │ US.SPX  │ SZ.000001   │ │
│ │ 18,500   │ 5,200   │ 3,100       │ │
│ │ +1.2%    │ -0.5%   │ +0.8%       │ │
│ └──────────┴──────────┴──────────────┘ │
│                                        │
│ 📈 上昇銘柄TOP 5                       │
│ ┌─────────────────────────────────────┐│
│ │ HK.02318 | +5.2% | 8,500 → 8,942  ││
│ │ HK.00700 | +3.1% | 180 → 185.6    ││
│ │ ...                                ││
│ └─────────────────────────────────────┘│
│                                        │
│ 📉 下落銘柄TOP 5                       │
│ ┌─────────────────────────────────────┐│
│ │ HK.01398 | -2.8% | 5,200 → 5,054  ││
│ │ ...                                ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

#### 2. Portfolio（ポートフォリオ管理）

**ルート**: `/portfolio`

**機能**:
- 保有銘柄一覧
- 時価評価額・損益表示
- 銘柄追加・削除
- ポートフォリオサマリー

**UI構成**:
```
┌─────────────────────────────────────────┐
│ Portfolio                               │
├─────────────────────────────────────────┤
│ 💼 ポートフォリオサマリー               │
│ 総資産: ¥5,000,000 | 損益: +¥250,000   │
│ 損益率: +5.0% | 保有銘柄数: 8          │
│                                        │
│ 📋 保有銘柄                             │
│ ┌─────────────────────────────────────┐│
│ │ HK.00700 (テンセント)               ││
│ │ 数量: 100株 | 平均: ¥180            ││
│ │ 現在: ¥185.6 | 損益: +¥560 (+3.1%) ││
│ │ ────────────────────────────────── ││
│ │ HK.02318 (ペイペイ)                 ││
│ │ ...                                ││
│ └─────────────────────────────────────┘│
│                                        │
│ [+ 銘柄追加]                           │
└─────────────────────────────────────────┘
```

#### 3. Stock Detail（銘柄詳細）

**ルート**: `/stock/:code`

**機能**:
- リアルタイム株価チャート
- K線データ表示（日足・週足・月足）
- オーダーブック表示
- ティッカー情報
- 基本情報（PER、PBR等）

**UI構成**:
```
┌─────────────────────────────────────────┐
│ HK.00700 - Tencent                      │
├─────────────────────────────────────────┤
│ 📊 チャート                             │
│ ┌─────────────────────────────────────┐│
│ │                                     ││
│ │     ╱╲    ╱╲                        ││
│ │    ╱  ╲  ╱  ╲  ╱╲                   ││
│ │   ╱    ╲╱    ╲╱  ╲                  ││
│ │                                     ││
│ └─────────────────────────────────────┘│
│ 現在: ¥185.6 | 高: ¥186.2 | 安: ¥183.4│
│ 出来高: 12,345,678 | 売上: ¥2.3B      │
│                                        │
│ 📋 オーダーブック                       │
│ ┌──────────┬──────────┬──────────────┐│
│ │ 買値     │ 数量     │ 売値        ││
│ │ 185.4    │ 100,000  │ 185.6       ││
│ │ 185.2    │ 80,000   │ 185.8       ││
│ │ 185.0    │ 60,000   │ 186.0       ││
│ └──────────┴──────────┴──────────────┘│
└─────────────────────────────────────────┘
```

#### 4. Trade Simulator（取引シミュレーション）

**ルート**: `/simulator`

**機能**:
- デモアカウントでの注文発注
- 注文一覧表示
- ポジション管理
- 損益計算

**UI構成**:
```
┌─────────────────────────────────────────┐
│ Trade Simulator                         │
├─────────────────────────────────────────┤
│ 💰 デモアカウント残高: ¥1,000,000       │
│                                        │
│ 📝 新規注文                             │
│ ┌─────────────────────────────────────┐│
│ │ 銘柄: [HK.00700        ]            ││
│ │ 方向: [買い ▼]                      ││
│ │ 数量: [100            ]             ││
│ │ 価格: [185.6          ]             ││
│ │ 注文種別: [成行 ▼]                  ││
│ │ [発注]                              ││
│ └─────────────────────────────────────┘│
│                                        │
│ 📋 注文一覧                             │
│ ┌─────────────────────────────────────┐│
│ │ 注文#001 | HK.00700 | 買 100株      ││
│ │ 価格: ¥185.6 | ステータス: 約定    ││
│ │ 時刻: 2026-03-18 14:30:45           ││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### React コンポーネント設計

#### 新規コンポーネント

| コンポーネント | 用途 | 親コンポーネント |
|--------------|------|-----------------|
| `QuoteCard` | 株価表示カード | Market, Portfolio |
| `KlineChart` | K線チャート | StockDetail |
| `OrderBook` | オーダーブック表示 | StockDetail |
| `PortfolioSummary` | ポートフォリオサマリー | Portfolio |
| `TradeForm` | 注文フォーム | TradeSimulator |
| `OrderList` | 注文一覧 | TradeSimulator |

#### API統合パターン

```typescript
// hooks/useQuote.ts
import { useQuery } from '@tanstack/react-query';

export function useQuote(code: string) {
  return useQuery({
    queryKey: ['quote', code],
    queryFn: async () => {
      const res = await fetch(`/api/quote/current?code=${code}`);
      return res.json();
    },
    refetchInterval: 5000, // 5秒ごとに更新
  });
}

// pages/Market.tsx
import { useQuote } from '@/hooks/useQuote';

export default function Market() {
  const { data: quote, isLoading } = useQuote('HK.00700');
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{quote.code}</h1>
      <p>Price: ¥{quote.price}</p>
      <p>Change: {quote.change_rate}%</p>
    </div>
  );
}
```

---

## データベーススキーマ

### テーブル一覧

#### portfolio_holdings（保有銘柄）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| user_id | UUID | ユーザーID |
| code | VARCHAR(20) | 銘柄コード（例：HK.00700） |
| quantity | INT | 保有数量 |
| cost_price | DECIMAL(10,2) | 平均取得価格 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### trade_simulations（取引シミュレーション）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| user_id | UUID | ユーザーID |
| code | VARCHAR(20) | 銘柄コード |
| side | ENUM | 買い/売り |
| quantity | INT | 注文数量 |
| price | DECIMAL(10,2) | 注文価格 |
| status | ENUM | 注文ステータス |
| executed_at | TIMESTAMP | 約定日時 |
| created_at | TIMESTAMP | 作成日時 |

#### market_cache（マーケットデータキャッシュ）

| カラム | 型 | 説明 |
|--------|-----|------|
| code | VARCHAR(20) | 銘柄コード |
| price | DECIMAL(10,2) | 現在価格 |
| high | DECIMAL(10,2) | 高値 |
| low | DECIMAL(10,2) | 安値 |
| volume | BIGINT | 出来高 |
| change_rate | DECIMAL(5,2) | 変動率 |
| updated_at | TIMESTAMP | 更新日時 |

---

## セキュリティ考慮事項

### 認証・認可

- **ユーザー認証**: 既存のBRAKE Pro認証システムを継承
- **API認可**: ユーザーは自身のポートフォリオのみアクセス可能
- **レート制限**: 1ユーザーあたり1分間に100リクエスト

### データ保護

- **暗号化**: HTTPS通信、パスワードはbcryptで暗号化
- **入力検証**: 銘柄コード、数量等の入力値を厳密に検証
- **SQL インジェクション対策**: Prepared Statementsを使用

### MooMoo API接続

- **ローカルのみ接続**: MooMoo OpenDはローカルホストのみ接続
- **接続タイムアウト**: 30秒
- **エラーハンドリング**: 接続失敗時は適切なエラーメッセージを返す

---

## 実装ロードマップ

### Phase 1: バックエンド基盤（Week 1-2）

- [ ] MooMoo API ラッパー層実装
- [ ] FastAPI エンドポイント実装（Quote API）
- [ ] キャッシング機構実装
- [ ] データベーススキーマ作成

### Phase 2: ポートフォリオ機能（Week 2-3）

- [ ] Portfolio API 実装
- [ ] ポートフォリオ管理UI
- [ ] 時価評価計算ロジック

### Phase 3: マーケット分析（Week 3-4）

- [ ] Market API 実装
- [ ] マーケットダッシュボード
- [ ] 銘柄詳細ページ

### Phase 4: 取引シミュレーション（Week 4-5）

- [ ] Trade Simulation API 実装
- [ ] シミュレーター UI
- [ ] 注文管理機能

### Phase 5: テスト・最適化（Week 5-6）

- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] パフォーマンス最適化
- [ ] ドキュメント作成

---

## トラブルシューティング

### MooMoo OpenD接続エラー

**症状**: `Connection refused: 127.0.0.1:11111`

**原因**: MooMoo OpenDが起動していない

**解決策**:
1. MooMoo OpenDをインストール
2. ローカルマシンで起動
3. ポート11111が開いていることを確認

### 株価データ取得失敗

**症状**: `Failed to get quote: RET_ERROR`

**原因**: 銘柄コードが無効、またはMooMoo APIの制限

**解決策**:
1. 銘柄コードを確認（例：HK.00700）
2. MooMoo APIのレート制限を確認
3. キャッシュをクリアして再試行

### パフォーマンス低下

**症状**: ページ読み込みが遅い

**原因**: MooMoo API呼び出しが多すぎる

**解決策**:
1. キャッシュTTLを増加
2. バッチリクエストを使用
3. WebSocketでリアルタイム配信に切り替え

---

## 参考資料

- [MooMoo API Python SDK Documentation](https://moomoo.com/api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [BRAKE Pro Design System](./TITLE_SYSTEM_DESIGN.md)
