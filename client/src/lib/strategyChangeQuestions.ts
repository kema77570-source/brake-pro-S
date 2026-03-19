// BRAKE Pro — Strategy Change Question Flows
import type { HoldingCategory } from "./types";

export interface StrategyQuestion {
  id: string;
  text: string;
  placeholder: string;
  warningTriggers?: string[]; // keywords that increase danger score if present
  safeTriggers?: string[];    // keywords that decrease danger score
}

export interface TransitionFlow {
  fromCategory: HoldingCategory;
  toCategory: HoldingCategory;
  stage1Questions: StrategyQuestion[];
  stage2Questions: StrategyQuestion[];
}

// ── Shared helper questions ──
const Q_NEW_INFO: StrategyQuestion = {
  id: "new_info",
  text: "下がったからではなく、新たに何が分かりましたか？",
  placeholder: "新しく得た情報や気づきを具体的に…",
  warningTriggers: ["下がった", "戻る", "反発", "そのうち", "待てば"],
};
const Q_FRESH_BUY: StrategyQuestion = {
  id: "fresh_buy",
  text: "今この銘柄を持っていない状態でも、新規で同じ戦略で買いますか？",
  placeholder: "はい / いいえ とその理由…",
  warningTriggers: ["わからない", "難しい", "今は無理", "買わない"],
  safeTriggers: ["買う", "新規でも", "はい"],
};
const Q_EMOTION_CHECK: StrategyQuestion = {
  id: "emotion_check",
  text: "その判断は、分析の更新ですか？それとも損失確定を避けたい感情ですか？",
  placeholder: "正直に答えてください…",
  warningTriggers: ["損切り", "回避", "怖い", "感情", "認めたくない", "戻ってから"],
};
const Q_EXIT_CONDITION: StrategyQuestion = {
  id: "exit_condition",
  text: "撤退条件（損切りライン）はどこですか？",
  placeholder: "例: -10%以下、〇〇円割れ、決算が悪化したら…",
  warningTriggers: ["未定", "決めていない", "わからない"],
};

// ── Transition flows ──
const FLOWS: TransitionFlow[] = [
  // any → long
  {
    fromCategory: "day", toCategory: "long",
    stage1Questions: [
      Q_NEW_INFO,
      Q_FRESH_BUY,
      { id: "hold_years", text: "何年単位で保有する想定ですか？", placeholder: "例: 3〜5年",
        warningTriggers: ["わからない", "とりあえず", "戻ったら"] },
      Q_EMOTION_CHECK,
    ],
    stage2Questions: [
      Q_NEW_INFO,
      { id: "company_value", text: "この企業の企業価値の根拠は何ですか？", placeholder: "売上成長・利益率・競争優位など…",
        warningTriggers: ["わからない", "有名", "人気"] },
      { id: "value_basis", text: "その根拠は売上成長・利益率・市場シェア・競争優位のどれに基づいていますか？", placeholder: "具体的に…" },
      { id: "hold_years2", text: "何年単位で保有する想定ですか？", placeholder: "例: 3〜5年",
        warningTriggers: ["わからない", "戻ったら", "とりあえず"] },
      { id: "check_metric", text: "その保有年数の間に、何を確認指標にしますか？", placeholder: "例: 四半期売上、EPS成長率…",
        warningTriggers: ["未定", "わからない"] },
      { id: "why_not_from_start", text: "なぜ最初からその戦略で入らなかったのですか？", placeholder: "",
        warningTriggers: ["デイトレで入った", "短期で入った"] },
      Q_FRESH_BUY,
      { id: "stop_loss_change", text: "長期保有に切り替えることで、損切りルールはどう変わりますか？", placeholder: "",
        warningTriggers: ["広げる", "なくす", "不要", "なし"] },
      Q_EMOTION_CHECK,
      Q_EXIT_CONDITION,
    ],
  },
  // day → short
  {
    fromCategory: "day", toCategory: "short",
    stage1Questions: [
      { id: "day_reason_valid", text: "当初のデイトレ根拠は何でしたか？その根拠は引け後も有効ですか？", placeholder: "",
        warningTriggers: ["無効", "変わった", "崩れた"] },
      { id: "overnight_exit", text: "持ち越し後の撤退条件はどこですか？", placeholder: "",
        warningTriggers: ["未定", "決めていない"] },
      Q_EMOTION_CHECK,
      Q_FRESH_BUY,
    ],
    stage2Questions: [
      { id: "day_reason", text: "当初のデイトレ根拠は何でしたか？", placeholder: "" },
      { id: "valid_after_close", text: "その根拠は引け後も有効と言えますか？", placeholder: "",
        warningTriggers: ["無効", "崩れた", "変わった"] },
      { id: "gap_risk", text: "持ち越すことで増えるギャップリスクを理解していますか？", placeholder: "",
        warningTriggers: ["わからない", "大丈夫", "問題ない"] },
      { id: "edge", text: "翌営業日まで保有する明確な優位性は何ですか？", placeholder: "",
        warningTriggers: ["わからない", "なんとなく"] },
      { id: "new_info_overnight", text: "その優位性は、場中に見えていなかった新しい情報ですか？", placeholder: "",
        warningTriggers: ["いいえ", "特にない", "なし"] },
      { id: "regret", text: "それとも、決済できなかったことへの未練ですか？", placeholder: "",
        warningTriggers: ["そうかも", "少し", "正直"] },
      Q_EXIT_CONDITION,
      { id: "gap_accept", text: "明日の寄りで不利な価格になっても、そのリスクを受け入れますか？", placeholder: "",
        warningTriggers: ["受け入れられない", "無理", "嫌"] },
      Q_FRESH_BUY,
      Q_EMOTION_CHECK,
    ],
  },
  // day → swing
  {
    fromCategory: "day", toCategory: "swing",
    stage1Questions: [
      { id: "swing_material", text: "この銘柄を数日〜数週間持つ材料は何ですか？", placeholder: "",
        warningTriggers: ["わからない", "戻る", "反発"] },
      { id: "swing_period", text: "想定保有期間は何日〜何週間ですか？", placeholder: "例: 3〜5日",
        warningTriggers: ["未定", "わからない"] },
      Q_FRESH_BUY,
      Q_EMOTION_CHECK,
    ],
    stage2Questions: [
      { id: "day_vs_swing", text: "デイトレの根拠とスイングの根拠は別物ですが、その違いを説明できますか？", placeholder: "" },
      { id: "swing_material2", text: "この銘柄を数日〜数週間持つ材料は何ですか？", placeholder: "",
        warningTriggers: ["わからない", "反発待ち"] },
      { id: "multi_day_theme", text: "その材料は、今日の値動きではなく複数日にまたがるテーマですか？", placeholder: "",
        warningTriggers: ["いいえ", "そうでもない"] },
      { id: "support_line", text: "テクニカル上、スイングで持つならどの支持線・無効化ラインを見ますか？", placeholder: "",
        warningTriggers: ["未定", "わからない"] },
      { id: "swing_days", text: "想定保有期間は何日〜何週間ですか？", placeholder: "",
        warningTriggers: ["未定", "わからない"] },
      { id: "check_event", text: "その期間中に確認するイベントや指標は何ですか？", placeholder: "",
        warningTriggers: ["なし", "未定"] },
      { id: "abandon_day", text: "もともとのデイトレ計画を破棄する理由は何ですか？", placeholder: "" },
      Q_EMOTION_CHECK,
      Q_FRESH_BUY,
      { id: "loss_expansion", text: "スイングに変更することで、損失許容額が勝手に広がっていませんか？", placeholder: "",
        warningTriggers: ["広がった", "そうかも", "多少"] },
    ],
  },
  // short → swing
  {
    fromCategory: "short", toCategory: "swing",
    stage1Questions: [
      { id: "why_extend", text: "その期間を延ばす理由は何ですか？", placeholder: "",
        warningTriggers: ["戻る", "反発", "待つ", "そのうち"] },
      Q_NEW_INFO,
      Q_FRESH_BUY,
      Q_EMOTION_CHECK,
    ],
    stage2Questions: [
      { id: "original_days", text: "当初の短期保有の想定期間は何日でしたか？", placeholder: "" },
      { id: "why_extend2", text: "その期間を延ばす理由は何ですか？", placeholder: "",
        warningTriggers: ["戻る", "反発", "待つ"] },
      Q_NEW_INFO,
      { id: "info_quality", text: "その情報は、保有期間を延ばすほどの質の高い根拠ですか？", placeholder: "",
        warningTriggers: ["わからない", "たぶん", "感覚"] },
      { id: "just_bounce", text: "単なる反発待ちではありませんか？", placeholder: "",
        warningTriggers: ["そうかも", "正直", "少し"] },
      { id: "swing_target", text: "スイングとして見た場合の目標価格はどこですか？", placeholder: "",
        warningTriggers: ["未定", "わからない"] },
      Q_EXIT_CONDITION,
      Q_FRESH_BUY,
      { id: "admit_broken", text: "最初の短期戦略が崩れたことを認めていますか？", placeholder: "",
        warningTriggers: ["認めていない", "崩れていない", "まだ"] },
      Q_EMOTION_CHECK,
    ],
  },
  // short → medium
  {
    fromCategory: "short", toCategory: "medium",
    stage1Questions: [
      { id: "new_fact", text: "当初の短期視点から中期視点へ変わるだけの新事実は何ですか？", placeholder: "",
        warningTriggers: ["わからない", "下がった", "株価が"] },
      Q_FRESH_BUY,
      { id: "which_event", text: "中期で持つなら、どの決算・イベントまで追いますか？", placeholder: "",
        warningTriggers: ["未定", "わからない"] },
      Q_EMOTION_CHECK,
    ],
    stage2Questions: [
      { id: "quarter_view", text: "中期で持つなら、何を四半期分の変化として見たいのですか？", placeholder: "",
        warningTriggers: ["わからない", "回復", "戻る"] },
      { id: "growth_story", text: "この企業や資産の成長ストーリーは何ですか？", placeholder: "",
        warningTriggers: ["わからない", "有名", "人気"] },
      { id: "data_support", text: "そのストーリーを裏付ける定量データはありますか？", placeholder: "",
        warningTriggers: ["ない", "わからない"] },
      { id: "new_fact2", text: "当初の短期視点から中期視点へ変わるだけの新事実は何ですか？", placeholder: "",
        warningTriggers: ["下がった", "株価が", "特にない"] },
      { id: "not_price_drop", text: "それは株価が下がったこと以外の話ですか？", placeholder: "",
        warningTriggers: ["いいえ", "関係ある", "そうでもない"] },
      { id: "which_event2", text: "中期で持つなら、どの決算・イベントまで追いますか？", placeholder: "",
        warningTriggers: ["未定", "わからない"] },
      { id: "when_exit", text: "逆に、どの条件が出たら中期仮説を撤回しますか？", placeholder: "",
        warningTriggers: ["未定", "わからない", "なし"] },
      Q_FRESH_BUY,
      Q_EMOTION_CHECK,
      { id: "wait_rescue", text: "\"助かるまで待つ\"を中期投資と呼んでいませんか？", placeholder: "",
        warningTriggers: ["そうかも", "正直", "少し", "待てば"] },
    ],
  },
];

const GENERIC_STAGE1: StrategyQuestion[] = [Q_NEW_INFO, Q_FRESH_BUY, Q_EXIT_CONDITION, Q_EMOTION_CHECK];
const GENERIC_STAGE2: StrategyQuestion[] = [
  Q_NEW_INFO, Q_FRESH_BUY,
  { id: "period_reason", text: "保有期間を延ばす具体的な根拠は何ですか？", placeholder: "",
    warningTriggers: ["わからない", "戻る", "反発"] },
  { id: "new_target", text: "新しい目標価格・撤退条件はどこですか？", placeholder: "",
    warningTriggers: ["未定"] },
  Q_EXIT_CONDITION, Q_EMOTION_CHECK,
];

export function getTransitionFlow(from: HoldingCategory, to: HoldingCategory): {
  stage1: StrategyQuestion[];
  stage2: StrategyQuestion[];
} {
  const flow = FLOWS.find(f => f.fromCategory === from && f.toCategory === to);
  if (flow) return { stage1: flow.stage1Questions, stage2: flow.stage2Questions };
  // For any→long not explicitly listed
  const toLong = FLOWS.find(f => f.fromCategory === "day" && f.toCategory === "long");
  if (to === "long" && toLong) return { stage1: toLong.stage1Questions, stage2: toLong.stage2Questions };
  return { stage1: GENERIC_STAGE1, stage2: GENERIC_STAGE2 };
}

// ── Scoring ──
export function scoreAnswers(answers: Record<string, string>, questions: StrategyQuestion[]): number {
  let dangerPoints = 0;
  let safePoints = 0;
  for (const q of questions) {
    const answer = (answers[q.id] ?? "").toLowerCase();
    if (!answer || answer.length < 5) { dangerPoints += 10; continue; }
    for (const trigger of q.warningTriggers ?? []) {
      if (answer.includes(trigger)) dangerPoints += 15;
    }
    for (const trigger of q.safeTriggers ?? []) {
      if (answer.includes(trigger)) safePoints += 10;
    }
    if (answer.length > 30) safePoints += 5; // detailed answer = less emotional
  }
  return Math.min(100, Math.max(0, dangerPoints - safePoints));
}

export function scoreToVerdict(score: number): {
  verdict: "strategy_update" | "delay" | "emotional" | "insufficient";
  dangerLevel: "low" | "medium" | "high";
  recommendedAction: string;
} {
  if (score < 25) return {
    verdict: "strategy_update",
    dangerLevel: "low",
    recommendedAction: "そのまま継続",
  };
  if (score < 50) return {
    verdict: "strategy_update",
    dangerLevel: "medium",
    recommendedAction: "条件を書き直して再確認",
  };
  if (score < 75) return {
    verdict: "delay",
    dangerLevel: "high",
    recommendedAction: "5分待機 → 損切りルールを再設定",
  };
  return {
    verdict: "emotional",
    dangerLevel: "high",
    recommendedAction: "今回は見送り",
  };
}

export const VERDICT_LABELS: Record<string, string> = {
  strategy_update: "戦略更新の可能性あり",
  delay: "先延ばしの可能性あり",
  emotional: "感情判断の可能性が高い",
  insufficient: "根拠不足のため再確認推奨",
};
