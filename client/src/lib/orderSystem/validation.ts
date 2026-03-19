// BRAKE Pro — Order Validation Engine
// Validates OrderFormState against capability matrix before submitting.
// Returns fatal/warning/info issues so UI can block or warn appropriately.

import type { OrderFormState, ValidationResult, ValidationIssue, CapabilityMatrix } from "./types";
import { ORDER_TYPE_META } from "./capabilityMatrix";

function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function validateOrder(
  form: OrderFormState,
  capability: CapabilityMatrix
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (issue: ValidationIssue) => issues.push(issue);

  // ── Security ──────────────────────────────────────────────────────────────
  if (!form.security) {
    add({ field: "security", message: "銘柄を選択してください", severity: "fatal", retryable: false });
  }

  // ── Quantity ──────────────────────────────────────────────────────────────
  const qtyNum = parseInt(form.qty);
  if (!form.qty || isNaN(qtyNum) || qtyNum <= 0) {
    add({ field: "qty", message: "数量は1以上の整数を入力してください", severity: "fatal", retryable: false });
  } else if (form.security?.type === "stock_option" || form.security?.type === "index_option") {
    if (qtyNum > 100) {
      add({
        field: "qty",
        message: "オプションは通常1〜100 contractsの範囲で発注します",
        severity: "warning",
        retryable: true,
        suggestion: "数量が多い場合は分割発注をご検討ください",
      });
    }
  }

  // ── Order type supported ───────────────────────────────────────────────────
  if (!capability.supportedOrderTypes.includes(form.orderType)) {
    add({
      field: "orderType",
      message: `この市場・商品では「${ORDER_TYPE_META[form.orderType]?.labelJa ?? form.orderType}」は使用できません`,
      severity: "fatal",
      retryable: false,
      suggestion: `利用可能な注文タイプ: ${capability.supportedOrderTypes.map(t => ORDER_TYPE_META[t]?.labelJa ?? t).join("・")}`,
    });
  }

  const meta = ORDER_TYPE_META[form.orderType];

  // ── Price ─────────────────────────────────────────────────────────────────
  if (meta?.needsPrice) {
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0) {
      add({ field: "price", message: "指値価格を入力してください（0より大きい値）", severity: "fatal", retryable: false });
    }
  }

  // ── Aux price (trigger) ───────────────────────────────────────────────────
  if (meta?.needsAuxPrice) {
    const ap = parseFloat(form.auxPrice);
    if (!form.auxPrice || isNaN(ap) || ap <= 0) {
      add({ field: "auxPrice", message: "トリガー価格を入力してください（0より大きい値）", severity: "fatal", retryable: false });
    }
  }

  // ── Trail ─────────────────────────────────────────────────────────────────
  if (meta?.needsTrail) {
    const tv = parseFloat(form.trailValue);
    if (!form.trailValue || isNaN(tv) || tv <= 0) {
      add({ field: "trailValue", message: "トレール幅を入力してください", severity: "fatal", retryable: false });
    }
    if (form.trailType === "PERCENT" && tv > 50) {
      add({
        field: "trailValue",
        message: "トレール幅が50%を超えています",
        severity: "warning",
        retryable: true,
        suggestion: "一般的なトレール幅は1〜10%程度です",
      });
    }
  }

  if (meta?.needsTrailSpread) {
    const ts = parseFloat(form.trailSpread);
    if (!form.trailSpread || isNaN(ts) || ts <= 0) {
      add({ field: "trailSpread", message: "指値オフセット（trail_spread）を入力してください", severity: "fatal", retryable: false });
    }
  }

  // ── Market order risk ─────────────────────────────────────────────────────
  if (meta?.isMarket) {
    add({
      field: "orderType",
      message: "成行注文は市場価格で即時執行されます。スリッページリスクに注意してください",
      severity: "warning",
      retryable: true,
      suggestion: "流動性の低い銘柄では指値注文の使用を推奨します",
    });
  }

  // ── Session / fill_outside_rth ────────────────────────────────────────────
  if (form.session !== "REGULAR" && !capability.supportsSession) {
    add({
      field: "session",
      message: "この市場・商品では時間外セッションは使用できません",
      severity: "fatal",
      retryable: false,
    });
  }
  if (form.fillOutsideRth && !capability.supportsFillOutsideRth) {
    add({
      field: "fillOutsideRth",
      message: "この市場・商品では時間外約定は対応していません",
      severity: "fatal",
      retryable: false,
    });
  }
  if ((form.session !== "REGULAR" || form.fillOutsideRth) && meta?.isMarket) {
    add({
      field: "session",
      message: "時間外の成行注文は特に価格変動リスクが高くなります",
      severity: "warning",
      retryable: true,
    });
  }

  // ── Time in force ─────────────────────────────────────────────────────────
  if (!capability.supportsTimeInForce.includes(form.timeInForce)) {
    add({
      field: "timeInForce",
      message: `この市場では「${form.timeInForce}」有効期間は使用できません`,
      severity: "fatal",
      retryable: false,
      suggestion: `利用可能: ${capability.supportsTimeInForce.join("・")}`,
    });
  }

  // ── Remark byte limit ─────────────────────────────────────────────────────
  if (form.remark && utf8ByteLength(form.remark) > 64) {
    add({
      field: "remark",
      message: "メモは64バイト以内で入力してください",
      severity: "fatal",
      retryable: false,
      suggestion: "日本語1文字は3バイトです",
    });
  }

  // ── Live trading warning ───────────────────────────────────────────────────
  if (form.tradeEnv === "REAL") {
    add({
      field: "tradeEnv",
      message: "本番口座への発注です。moomoo OpenDが起動・ログイン済みであることを確認してください",
      severity: "info",
      retryable: true,
    });
  }

  const hasFatal = issues.some((i) => i.severity === "fatal");
  return { valid: !hasFatal, issues };
}
