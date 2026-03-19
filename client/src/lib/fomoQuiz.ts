// FOMO詳細質問票ライブラリ
// 保有期間別10問 + 3軸スコア計算

export type FomoAxis = "urgency" | "social" | "rule";

export interface FomoQuestion {
  q: string;
  axis: FomoAxis;
}

export const MODE_QUESTIONS: Record<string, FomoQuestion[]> = {
  day: [
    { q: "急騰・急落チャートを見て焦ってエントリーを考えていますか？", axis: "urgency" },
    { q: "今すぐ入らないとチャンスを逃すと感じていますか？", axis: "urgency" },
    { q: "SNSや掲示板で話題になっているから注目しましたか？", axis: "social" },
    { q: "他のトレーダーが利益を出しているのを見て焦っていますか？", axis: "social" },
    { q: "損切りラインを決めずにエントリーしようとしていますか？", axis: "rule" },
    { q: "今日の監視リストに事前から入っていなかった銘柄ですか？", axis: "rule" },
    { q: "出来高・板の確認をしないままエントリーしようとしていますか？", axis: "rule" },
    { q: "今日すでに損失を出していて、取り返したいと思っていますか？", axis: "urgency" },
    { q: "RR（リスクリワード）を計算せずにエントリーしようとしていますか？", axis: "rule" },
    { q: "エントリー理由が「値動きが激しい」だけになっていますか？", axis: "rule" },
  ],
  swing: [
    { q: "直近の強い動きを見て追いかけようとしていますか？", axis: "urgency" },
    { q: "今週の相場を見逃したくないという気持ちがありますか？", axis: "urgency" },
    { q: "友人や投資コミュニティで話題になっているから買いたいですか？", axis: "social" },
    { q: "他の人がこの銘柄で利益を出したという報告を見ましたか？", axis: "social" },
    { q: "ターゲット価格（利確）を決めずに入ろうとしていますか？", axis: "rule" },
    { q: "週足・日足の環境確認をしていませんか？", axis: "rule" },
    { q: "このスイングのリスク額が資産の2%を超えていますか？", axis: "rule" },
    { q: "連敗後の「取り返し」でポジションサイズを大きくしていますか？", axis: "urgency" },
    { q: "エントリー理由がテクニカル以外（SNS・話題）になっていますか？", axis: "social" },
    { q: "保有期間中のイベント（決算・指標）を確認していませんか？", axis: "rule" },
  ],
  month: [
    { q: "最近のニュースや話題性に引っ張られて注目しましたか？", axis: "social" },
    { q: "上昇が始まってから「乗り遅れた」と感じて入ろうとしていますか？", axis: "urgency" },
    { q: "投資コミュニティやSNSの期待感に影響されていますか？", axis: "social" },
    { q: "損切り設定をしないまま入ろうとしていますか？", axis: "rule" },
    { q: "複数の情報源を参照せず、一つのソースで判断していますか？", axis: "rule" },
    { q: "カタリスト（材料の期日）を確認していませんか？", axis: "rule" },
    { q: "今月のポートフォリオ配分を超えるポジションを取ろうとしていますか？", axis: "rule" },
    { q: "この銘柄に「乗れなかったら損」という感覚はありますか？", axis: "urgency" },
    { q: "他の人が利益報告をしているのを見て動こうとしていますか？", axis: "social" },
    { q: "短期急騰後にモメンタムが続くと根拠なく信じていますか？", axis: "urgency" },
  ],
  months: [
    { q: "最近の株高・市場の盛り上がりに乗り遅れたと感じていますか？", axis: "urgency" },
    { q: "投資メディアや有名人の推薦に影響されていますか？", axis: "social" },
    { q: "友人・同僚がこの銘柄で利益を出していて焦っていますか？", axis: "social" },
    { q: "バリュエーション（PER・PBR等）を確認せずに入ろうとしていますか？", axis: "rule" },
    { q: "事業内容・ビジネスモデルを十分理解していませんか？", axis: "rule" },
    { q: "定量的な目標（目標株価・撤退基準）を設定していませんか？", axis: "rule" },
    { q: "ポートフォリオに占める割合を確認せずに入ろうとしていますか？", axis: "rule" },
    { q: "「今買わないと次のチャンスは来ない」と感じていますか？", axis: "urgency" },
    { q: "他の投資家が急いで買っているから自分も買わなければと思っていますか？", axis: "social" },
    { q: "財務諸表・業績トレンドを確認せずに投資しようとしていますか？", axis: "rule" },
  ],
  longterm: [
    { q: "最近の上昇相場に乗り遅れたという焦りがありますか？", axis: "urgency" },
    { q: "著名投資家や有名人の推薦に影響されていますか？", axis: "social" },
    { q: "周囲が資産を増やしているという話を聞いて不安になっていますか？", axis: "social" },
    { q: "この企業の長期ビジョン・競争優位性を理解していませんか？", axis: "rule" },
    { q: "財務健全性（負債・キャッシュフロー）を確認していませんか？", axis: "rule" },
    { q: "競合他社との比較分析をしていませんか？", axis: "rule" },
    { q: "定期積立・資産配分計画から外れたエントリーをしようとしていますか？", axis: "rule" },
    { q: "「今が底」「最後のチャンス」という感覚で買おうとしていますか？", axis: "urgency" },
    { q: "FOMO（取り残され不安）が主な購入動機になっていますか？", axis: "urgency" },
    { q: "月次・年次の資産目標から逸脱した買い増しを考えていますか？", axis: "rule" },
  ],
  undecided: [
    { q: "保有期間を決めずにとにかく入ろうとしていますか？", axis: "urgency" },
    { q: "計画のない取引をしようとしている自覚はありますか？", axis: "rule" },
    { q: "話題性や価格の動きだけで取引しようとしていますか？", axis: "social" },
    { q: "損切りの条件が決まっていないまま入ろうとしていますか？", axis: "rule" },
    { q: "エグジット戦略（出口）が全く決まっていませんか？", axis: "rule" },
    { q: "「とりあえず入ってから考える」という気持ちがありますか？", axis: "urgency" },
    { q: "他の人が儲けているのを見て焦っている気持ちがありますか？", axis: "social" },
    { q: "計画なしの取引で過去に失敗した経験を繰り返そうとしていますか？", axis: "rule" },
    { q: "この取引に明確な根拠を3つ言えない状態ですか？", axis: "rule" },
    { q: "FOMO（取り残され不安）が主な動機になっていますか？", axis: "urgency" },
  ],
};

export const AXIS_LABELS: Record<FomoAxis, string> = {
  urgency: "焦り・緊急性",
  social:  "他人比較・話題性",
  rule:    "ルール逸脱",
};

export const AXIS_COLORS: Record<FomoAxis, string> = {
  urgency: "hsl(0,65%,55%)",
  social:  "hsl(270,65%,60%)",
  rule:    "hsl(200,65%,55%)",
};

export function getMode(holdPeriodLabel: string, plannedHoldHours: number): string {
  if (!holdPeriodLabel || holdPeriodLabel.includes("未定") || plannedHoldHours === 0) return "undecided";
  if (plannedHoldHours <= 24) return "day";
  if (plannedHoldHours <= 168) return "swing";
  if (plannedHoldHours <= 720) return "month";
  if (plannedHoldHours <= 8760) return "months";
  return "longterm";
}

export interface FomoQuizScores {
  urgency: number;
  social: number;
  rule: number;
  total: number;
}

export function calcFomoQuizScores(answers: number[], questions: FomoQuestion[]): FomoQuizScores {
  if (!answers.length) return { urgency: 0, social: 0, rule: 0, total: 0 };

  const byAxis: Record<FomoAxis, number[]> = { urgency: [], social: [], rule: [] };
  questions.forEach((q, i) => {
    const val = answers[i];
    if (val > 0) byAxis[q.axis].push(val);
  });

  const axisScore = (vals: number[]) =>
    vals.length === 0 ? 0 : Math.round(((vals.reduce((s, v) => s + v, 0) / vals.length - 1) / 4) * 100);

  const urgency = axisScore(byAxis.urgency);
  const social  = axisScore(byAxis.social);
  const rule    = axisScore(byAxis.rule);
  const total   = Math.round(urgency * 0.35 + social * 0.30 + rule * 0.35);

  return { urgency, social, rule, total };
}

export const SCORE_OPTIONS = [
  { score: 1, label: "まったく当てはまらない" },
  { score: 2, label: "あまり当てはまらない" },
  { score: 3, label: "やや当てはまる" },
  { score: 4, label: "当てはまる" },
  { score: 5, label: "強く当てはまる" },
];
