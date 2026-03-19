# BRAKE Pro デザインアイデア

## アプローチ1: ダーク・コックピット
<response>
<text>
**Design Movement**: インダストリアル・ミニマリズム × トレーディングルーム美学

**Core Principles**:
- 暗闇の中に光る計器盤のような視覚体験
- 情報の密度と余白のコントラストで緊張感を演出
- 赤・黄・緑のシグナルカラーが感情的判断を抑制する
- 「停止」「確認」「記録」という3動作を軸にした導線

**Color Philosophy**:
- 背景: 深い石炭色 (#0d0f14) — 集中力を促す暗闇
- アクセント: アンバー (#f59e0b) — 警告・注意を示す信号色
- 危険: 赤 (#ef4444)、安全: エメラルド (#10b981)
- テキスト: 冷たいグレー (#94a3b8)

**Layout Paradigm**:
- 左サイドバーにナビゲーション、右にコンテンツという非対称構造
- ダッシュボードはカード型ではなくデータパネル型
- モバイルではボトムナビゲーション

**Signature Elements**:
- 計器盤風のゲージ・メーター（FOMOスコア、RSI等）
- 細いボーダーラインとシャープなエッジ
- モノスペースフォントでの数値表示

**Interaction Philosophy**:
- 重要アクションには確認ステップを必ず挟む
- アニメーションは機能的（状態変化の視覚化）のみ

**Animation**:
- ゲージの針が動くアニメーション
- データ更新時のフラッシュエフェクト
- ページ遷移は水平スライド

**Typography System**:
- Display: Space Grotesk Bold — 数値・見出し
- Body: DM Sans — 本文
- Mono: JetBrains Mono — 価格・数値
</text>
<probability>0.08</probability>
</response>

## アプローチ2: 禅・ジャーナル
<response>
<text>
**Design Movement**: 日本の禅美学 × モダンジャーナリング

**Core Principles**:
- 余白こそが思考の空間
- 手書きノートのような温かみと記録性
- 「立ち止まる」という行為を美しく演出
- 感情と数字の両方を記録する二重構造

**Color Philosophy**:
- 背景: 和紙色 (#faf8f4) — 温かみのある白
- アクセント: 墨色 (#1a1a2e) と 朱色 (#c0392b)
- セカンダリ: 薄墨 (#6b7280)
- カード: クリーム (#fffef9)

**Layout Paradigm**:
- 縦スクロールのジャーナル形式
- 中央揃えのシングルカラムで集中を促す
- 各セクションは「ページをめくる」感覚

**Signature Elements**:
- 細い水平線による区切り
- 手書き風のアクセント文字
- 余白を活かした呼吸感のあるレイアウト

**Interaction Philosophy**:
- ゆっくりとしたアニメーションで「急がない」を体現
- 入力フォームはシンプルで圧迫感なし

**Animation**:
- フェードインのみ（スライドなし）
- タイプライター効果での質問表示

**Typography System**:
- Display: Noto Serif JP — 日本語見出し
- Body: Noto Sans JP — 本文
- Accent: 游明朝体系
</text>
<probability>0.06</probability>
</response>

## アプローチ3: ネオン・アラート（採用）
<response>
<text>
**Design Movement**: ダーク・ファイナンシャル × ネオ・ブルータリスト

**Core Principles**:
- 暗い背景に鮮やかなアクセントで「警告」の緊張感を演出
- 非対称レイアウトで視線を誘導し、衝動抑制を促す
- データと感情を同一画面で可視化する二層構造
- 「記録する」行為を儀式化するUI設計

**Color Philosophy**:
- 背景: 深夜の海 oklch(0.12 0.02 250) — 深い紺黒
- プライマリ: 電気ブルー oklch(0.65 0.2 240) — 信頼・冷静
- 警告: アンバー oklch(0.75 0.18 80) — 注意喚起
- 危険: 赤 oklch(0.6 0.22 25) — 損失・停止
- 安全: エメラルド oklch(0.65 0.18 160) — 承認・通過

**Layout Paradigm**:
- 左固定サイドバー（デスクトップ）＋ ボトムタブ（モバイル）
- ダッシュボードは非対称グリッド（2/3 + 1/3分割）
- チェックフローは全画面フォーカスモード

**Signature Elements**:
- 細いグロウエフェクト付きボーダー
- 半透明のガラスモーフィズムカード
- 数値表示にモノスペースフォント

**Interaction Philosophy**:
- 重要アクション前に必ず「一息つく」確認ステップ
- スワイプ・タップの物理的フィードバック
- 損失ストリーク時は画面全体が赤みがかる

**Animation**:
- カード出現: 下からフェードイン (0.3s ease-out)
- スコアゲージ: 1.2s ease-out で針が動く
- アラート: パルスアニメーション
- ページ遷移: 水平スライド (0.4s)

**Typography System**:
- Display: Space Grotesk 700 — 数値・見出し・ブランド
- Body: DM Sans 400/500 — 本文・ラベル
- Mono: JetBrains Mono — 価格・パーセンテージ
</text>
<probability>0.09</probability>
</response>
