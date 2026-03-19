// BRAKE Pro — Error Normalizer
// Converts raw moomoo / network errors into user-friendly Japanese messages.

export interface NormalizedError {
  message: string;
  retryable: boolean;
  suggestion: string;
}

const ERROR_MAP: Array<{ pattern: RegExp | string; result: NormalizedError }> = [
  {
    pattern: /connection refused|ECONNREFUSED|OpenD.*not.*reach|Cannot connect/i,
    result: {
      message: "moomoo OpenD に接続できません",
      retryable: true,
      suggestion: "OpenD アプリが起動・ログイン済みであることを確認し、ポート 11111 が開いているか確認してください",
    },
  },
  {
    pattern: /unlock.*required|trade.*locked|trading.*password/i,
    result: {
      message: "取引ロックが解除されていません",
      retryable: true,
      suggestion: "moomoo アプリで取引パスワードを入力してロックを解除してください",
    },
  },
  {
    pattern: /agreement.*not.*completed|questionnaire.*required|API.*agreement/i,
    result: {
      message: "OpenAPI 利用規約が未完了です",
      retryable: false,
      suggestion: "moomoo アプリの API Questionnaire / Agreements を完了してください",
    },
  },
  {
    pattern: /insufficient.*buying.*power|buying power|margin/i,
    result: {
      message: "購買力（余力）が不足しています",
      retryable: false,
      suggestion: "注文数量や価格を見直すか、口座へ入金してください",
    },
  },
  {
    pattern: /tick.*size|price.*increment|invalid.*price/i,
    result: {
      message: "価格が最小変動幅（ティックサイズ）の倍数ではありません",
      retryable: true,
      suggestion: "銘柄のティックサイズに合わせた価格を入力してください",
    },
  },
  {
    pattern: /unsupported.*order.*type|order.*type.*not.*support/i,
    result: {
      message: "この市場・商品では選択した注文タイプは使用できません",
      retryable: true,
      suggestion: "注文タイプを変更してください",
    },
  },
  {
    pattern: /unsupported.*session|session.*not.*support/i,
    result: {
      message: "この市場では時間外セッション発注は対応していません",
      retryable: true,
      suggestion: "セッションを「レギュラー」に変更してください",
    },
  },
  {
    pattern: /market.*auth|permission.*denied|no.*authority/i,
    result: {
      message: "この市場への取引権限がありません",
      retryable: false,
      suggestion: "moomoo アプリで対象市場の取引権限申請を行ってください",
    },
  },
  {
    pattern: /invalid.*option.*code|option.*code.*not.*found/i,
    result: {
      message: "オプションコードが無効です",
      retryable: true,
      suggestion: "オプションチェーンから正しいコードを選択してください",
    },
  },
  {
    pattern: /quantity.*limit|qty.*exceed|max.*qty/i,
    result: {
      message: "注文数量が上限を超えています",
      retryable: true,
      suggestion: "数量を分割して発注してください",
    },
  },
  {
    pattern: /amount.*limit|order.*amount.*exceed/i,
    result: {
      message: "注文金額が上限を超えています",
      retryable: true,
      suggestion: "注文金額を分割するか価格を見直してください",
    },
  },
  {
    pattern: /remark.*too.*long|remark.*exceed/i,
    result: {
      message: "メモ（remark）が64バイトを超えています",
      retryable: true,
      suggestion: "メモを短くしてください（日本語1文字=3バイト）",
    },
  },
  {
    pattern: /market.*closed|outside.*trading.*hours/i,
    result: {
      message: "現在市場は閉場中です",
      retryable: true,
      suggestion: "取引時間内に再度お試しください",
    },
  },
  {
    pattern: /timeout|timed out/i,
    result: {
      message: "接続がタイムアウトしました",
      retryable: true,
      suggestion: "ネットワーク接続を確認し、再度試みてください",
    },
  },
];

function extractMessage(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const detail = r.detail ?? r.message ?? r.error ?? r.msg;
    if (typeof detail === "string") return detail;
  }
  return String(raw);
}

export function normalizeError(raw: unknown): NormalizedError {
  const msg = extractMessage(raw);

  for (const { pattern, result } of ERROR_MAP) {
    if (typeof pattern === "string" ? msg.includes(pattern) : pattern.test(msg)) {
      return result;
    }
  }

  // Generic fallback
  return {
    message: "発注処理中にエラーが発生しました",
    retryable: true,
    suggestion: `詳細: ${msg.slice(0, 120)}`,
  };
}
