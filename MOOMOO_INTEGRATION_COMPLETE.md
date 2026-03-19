# MooMoo API 統合実装完了レポート

## 概要

brake-proプロジェクトにMooMoo APIからのリアルタイム株価データ取得機能を完全に統合しました。ユーザーは香港株、米国株、中国株のリアルタイムデータを取得し、ポートフォリオを管理できるようになりました。

---

## 実装完了項目

### Phase 1: バックエンド基盤 ✅

#### 1. MooMoo API ラッパー層 (`server/moomoo_wrapper.py`)

**実装内容**:

- **MooMooQuoteWrapper クラス** (株価データ取得)
  - `get_current_price(code)` - リアルタイム株価
  - `get_kline(code, days, ktype)` - K線データ（日足、週足、月足対応）
  - `get_orderbook(code)` - オーダーブック（買値・売値）
  - `get_stock_basicinfo(market)` - 基本情報（銘柄一覧）

- **MooMooTradeWrapper クラス** (取引機能)
  - `unlock_trade(password)` - 取引ロック解除
  - `get_account_info()` - アカウント情報
  - `get_position_list()` - ポジション一覧

- **CacheManager クラス** (パフォーマンス最適化)
  - TTL付きインメモリキャッシュ
  - 株価: 5秒、K線: 1分、基本情報: 5分

**特徴**:
- 自動接続管理
- エラーハンドリング完備
- ロギング機構
- グローバルインスタンス管理

#### 2. FastAPI バックエンド (`server/moomoo_api.py`)

**実装エンドポイント** (12個):

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

**特徴**:
- Pydantic モデルによる型安全性
- CORS 対応
- エラーハンドリング
- ロギング機構
- ライフサイクル管理

### Phase 2: React Query フック実装 ✅

**ファイル**: `client/src/hooks/useMooMooAPI.ts`

**実装フック** (11個):

- **Quote API フック**
  - `useStockPrice(code)` - リアルタイム株価（5秒更新）
  - `useKlineData(code, ktype, days)` - K線データ（1分更新）
  - `useOrderBook(code)` - オーダーブック（5秒更新）
  - `useStockBasicInfo(market)` - 基本情報（5分更新）

- **Portfolio API フック**
  - `usePortfolioList()` - 保有銘柄一覧（10秒更新）
  - `usePortfolioSummary()` - ポートフォリオサマリー（10秒更新）
  - `useAddHolding()` - 銘柄追加
  - `useUpdateHolding()` - ポジション更新
  - `useDeleteHolding()` - ポジション削除

- **Trade API フック**
  - `usePlaceOrder()` - 注文発注
  - `useOrderList()` - 注文一覧（10秒更新）

- **ユーティリティ**
  - `useAPIHealth()` - API ヘルスチェック

**特徴**:
- 自動キャッシング
- 自動更新（refetchInterval）
- 自動無効化（invalidateQueries）
- TypeScript 型安全性

### Phase 3: UI コンポーネント実装 ✅

#### 1. Market Dashboard (`client/src/pages/MarketDashboard.tsx`)

**機能**:
- リアルタイム株価表示（複数銘柄）
- 主要指数表示（HSI、HSCEI、SPX等）
- 特集銘柄表示（テンセント、ペイペイ等）
- 全銘柄一覧表示（テーブル形式）
- 市場切り替え（香港株/米国株）

**UI構成**:
- ヘッダー（タイトル・説明）
- 市場選択ボタン
- 主要指数カード
- 特集銘柄グリッド
- 全銘柄テーブル

**特徴**:
- リアルタイム更新
- レスポンシブデザイン
- エラーハンドリング
- ローディング状態表示

#### 2. Portfolio Page (`client/src/pages/PortfolioPage.tsx`)

**機能**:
- ポートフォリオサマリー表示
  - 総資産、総コスト、損益、損益率
- 保有銘柄一覧
  - 銘柄コード、数量、平均取得価格
  - 現在価格、損益、損益率
- 銘柄追加フォーム
  - 銘柄コード入力
  - 数量入力
  - 取得価格入力
- 銘柄削除機能

**UI構成**:
- ヘッダー（タイトル・追加ボタン）
- 追加フォーム（条件付き表示）
- サマリーカード（4列グリッド）
- 保有銘柄リスト

**特徴**:
- リアルタイム損益計算
- 時価評価
- トースト通知
- エラーハンドリング

#### 3. Stock Detail (`client/src/pages/StockDetail.tsx`)

**機能**:
- 銘柄情報表示
  - 現在価格、変動額、変動率
  - 高値・安値、出来高
- K線チャート表示
  - 簡易ASCII チャート
  - 過去30日のデータ
- オーダーブック表示
  - 買値（Buy Orders）
  - 売値（Sell Orders）
- 詳細情報
  - 売上高、更新時刻、市場、ステータス

**UI構成**:
- ヘッダー（銘柄コード・トレンドアイコン）
- 価格情報カード（4列）
- K線チャート
- オーダーブック
- 詳細情報

**特徴**:
- リアルタイム更新
- ビジュアルチャート
- 詳細情報表示
- エラーハンドリング

### Phase 4: ルーティング統合 ✅

**ファイル**: `client/src/App.tsx`

**追加ルート**:
- `/market` - Market Dashboard
- `/portfolio` - Portfolio Page
- `/stock/:code` - Stock Detail

---

## ファイル構成

```
brake-pro/
├── server/
│   ├── moomoo_wrapper.py          # MooMoo API ラッパー層
│   ├── moomoo_api.py              # FastAPI バックエンド
│   └── lib/
│       └── moomoo/                # MooMoo SDK
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useMooMooAPI.ts     # React Query フック
│       ├── pages/
│       │   ├── MarketDashboard.tsx # マーケットダッシュボード
│       │   ├── PortfolioPage.tsx   # ポートフォリオ管理
│       │   └── StockDetail.tsx     # 銘柄詳細
│       └── App.tsx                # ルーティング更新
├── MOOMOO_INTEGRATION_DESIGN.md       # 設計ドキュメント
├── MOOMOO_IMPLEMENTATION_GUIDE.md     # 実装ガイド
└── MOOMOO_INTEGRATION_COMPLETE.md     # このファイル
```

---

## セットアップ手順

### 1. 依存関係のインストール

```bash
# Python 依存関係
pip install fastapi uvicorn pydantic python-dotenv pandas simplejson pycryptodome

# Node.js 依存関係（既にインストール済み）
# npm install または pnpm install
```

### 2. MooMoo OpenD のセットアップ

```bash
# MooMoo OpenD をインストール・起動
# ポート 11111 で起動確認
netstat -an | grep 11111
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

# React 環境変数
REACT_APP_API_URL=http://localhost:8000
```

### 4. サーバー起動

```bash
# FastAPI サーバー起動
python server/moomoo_api.py

# または
uvicorn server.moomoo_api:app --reload --host 0.0.0.0 --port 8000
```

### 5. クライアント起動

```bash
# React 開発サーバー起動
npm run dev
# または
pnpm dev
```

### 6. ブラウザアクセス

```
http://localhost:5173/market      # Market Dashboard
http://localhost:5173/portfolio   # Portfolio Page
http://localhost:5173/stock/HK.00700  # Stock Detail
```

---

## API ドキュメント

### FastAPI Swagger UI

```
http://localhost:8000/docs
```

### 使用例

#### 現在価格取得

```bash
curl "http://localhost:8000/api/quote/current?code=HK.00700"
```

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

#### ポートフォリオ追加

```bash
curl -X POST "http://localhost:8000/api/portfolio/add" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "HK.00700",
    "quantity": 100,
    "cost_price": 180.0
  }'
```

#### ポートフォリオサマリー取得

```bash
curl "http://localhost:8000/api/portfolio/summary"
```

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

## パフォーマンス最適化

### キャッシング戦略

| データ種別 | TTL | 理由 |
|-----------|-----|------|
| 株価 | 5秒 | リアルタイム性と負荷のバランス |
| K線 | 1分 | 日足・週足は変更頻度が低い |
| ポートフォリオ | 10秒 | ユーザー固有データ |
| 基本情報 | 5分 | 銘柄情報は変更頻度が低い |

### React Query 最適化

- **staleTime**: データが古いと判定される時間
- **refetchInterval**: 自動更新間隔
- **invalidateQueries**: ミューテーション後のキャッシュ無効化

### API レート制限

- 1ユーザーあたり1分間に100リクエスト
- バッチリクエストで効率化
- キャッシュで不要なリクエスト削減

---

## セキュリティ考慮事項

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

## トラブルシューティング

### エラー: `Connection refused: 127.0.0.1:11111`

**原因**: MooMoo OpenD が起動していない

**解決策**:
1. MooMoo OpenD をインストール
2. ローカルマシンで起動
3. ポート 11111 が開いていることを確認

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
2. バッチリクエストを使用
3. WebSocket でリアルタイム配信に切り替え

---

## 今後の拡張予定

### Phase 5: 高度な機能

- [ ] WebSocket リアルタイム配信
- [ ] テクニカル分析指標（MACD、RSI、ボリンジャーバンド等）
- [ ] アラート機能（価格アラート、ポートフォリオ変動アラート）
- [ ] ポートフォリオ最適化（効率的フロンティア）
- [ ] 取引シミュレーション（バックテスト）

### Phase 6: データベース統合

- [ ] ユーザーごとのポートフォリオ永続化
- [ ] 取引履歴の記録
- [ ] ウォッチリスト管理
- [ ] ユーザー設定の保存

### Phase 7: 分析機能

- [ ] ポートフォリオ分析
- [ ] セクター別分析
- [ ] 銘柄相関分析
- [ ] リスク分析

---

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| `MOOMOO_INTEGRATION_DESIGN.md` | 全体アーキテクチャ設計 |
| `MOOMOO_IMPLEMENTATION_GUIDE.md` | 実装ガイド・セットアップ手順 |
| `MOOMOO_INTEGRATION_COMPLETE.md` | このファイル（完了レポート） |

---

## ライセンスと参考資料

- [MooMoo API Documentation](https://moomoo.com/api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [BRAKE Pro Design System](./TITLE_SYSTEM_DESIGN.md)

---

## まとめ

MooMoo API の統合により、brake-pro は以下の機能を獲得しました：

1. **リアルタイム株価データ取得** - HK、US、SZ、SH の複数市場対応
2. **ポートフォリオ管理** - 保有銘柄の管理と時価評価
3. **マーケット分析** - 主要指数、特集銘柄、全銘柄表示
4. **銘柄詳細表示** - K線チャート、オーダーブック、詳細情報
5. **取引シミュレーション** - デモアカウントでの注文発注

これらの機能により、brake-pro はトレード管理だけでなく、マーケット分析とポートフォリオ管理の総合プラットフォームへと進化しました。

**実装完了日**: 2026-03-18
**バージョン**: 1.0.0
