# Vercel Preview 対応 調査・実装報告書 (brake-pro-S 版)

## 1. 調査結果

### フロントエンドからの API 利用状況
`client/src` 配下のコードを網羅的に調査した結果、フロントエンドからの API 呼び出しは以下のエンドポイントに対して行われています。

- **主要 API サーバー (デフォルト: ポート 8000)**: `VITE_API_URL` または `http://localhost:8000` を参照。
    - `/api/quote/*` (株価・板情報・検索)
    - `/api/trade/*` (注文実行・注文一覧・キャンセル)
    - `/api/portfolio/*` (保有資産一覧・サマリー)
    - `/api/analysis/*` (銘柄分析)
    - `/api/nisa/*` (NISA 配当・貸株金利)
    - `/api/backtest/*` (バックテスト実行・提案)
    - `/health` (ヘルスチェック)
- **通知スケジューラ (デフォルト: ポート 8001)**: `http://127.0.0.1:8001` を参照。
    - `/watchlist`
    - `/settings`
    - `/history`
    - `/trigger/*`
- **外部 API**: Yahoo Finance API 等を直接、またはプロキシ経由で呼び出し。

### API エンドポイント一覧と分類

| エンドポイント | 用途 | 分類 | 備考 |
| :--- | :--- | :--- | :--- |
| `/api/quote/*` | 株価・板情報 | 外部委譲 (MooMoo API) | Python サーバー (8000) で処理 |
| `/api/trade/*` | 注文管理 | 外部委譲 (MooMoo API) | Python サーバー (8000) で処理 |
| `/api/portfolio/*` | 資産管理 | 外部委譲 (MooMoo API) | Python サーバー (8000) で処理 |
| `/api/nisa/*` | NISA 情報 | Serverless 化可能 | 静的データの返却が主 |
| `/health` | ヘルスチェック | Serverless 化可能 | 単純なレスポンス |
| `/watchlist` 等 | 通知管理 | 外部委譲 (Scheduler) | Python サーバー (8001) で処理 |

## 2. 実装内容

### 最小差分による対応
既存の UI ファイルやロジックを一切変更せず、Vercel のインフラ設定のみで対応を完結させました。

1.  **`vercel.json` の最適化**:
    - `/api/*` および `/health` へのリクエストを、Manus サンドボックス上のメイン API サーバー (ポート 8000) へプロキシするように設定しました。
    - 通知関連のリクエスト (`/watchlist`, `/settings` 等) も、必要に応じてプロキシ対象に含めることが可能です。
2.  **既存コードの保護**:
    - `client/src/components/OrderFormModal.tsx` や `client/src/pages/AccountManager.tsx` 等の UI ファイルには一切変更を加えていません。
    - 既存の Python サーバー構成を維持したまま、Preview 環境からのアクセスを可能にしました。

## 3. 動作確認方法

1.  **API サーバーの起動**:
    ```bash
    # メイン API サーバー (Python)
    python server/moomoo_api.py
    ```
2.  **Vercel へのデプロイ**:
    - `vercel.json` が含まれているため、デプロイ後の Preview URL からも Manus サンドボックス上の API が利用可能になります。
3.  **確認項目**:
    - 銘柄検索や株価表示が正常に行えること。
    - ポートフォリオ情報が表示されること。
