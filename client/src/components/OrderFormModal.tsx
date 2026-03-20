// BRAKE Pro — OrderFormModal
// 8種類の注文タイプをサポートするモーダル発注フォーム
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── 注文タイプ定義 ───────────────────────────────────────────────────────────
export type MoomooOrderType =
  | "MARKET"
  | "LIMIT"
  | "STOP_LIMIT"
  | "STOP_MARKET"
  | "TRIGGER_LIMIT"
  | "TRIGGER_MARKET"
  | "TRAIL_STOP_LIMIT"
  | "TRAIL_STOP_MARKET";

interface OrderTypeOption {
  value: MoomooOrderType;
  label: string;
  sub: string;
  needsPrice: boolean;
  needsTrigger: boolean;
  needsTrail: boolean;
  needsLimitOffset: boolean;
}

const ORDER_TYPES: OrderTypeOption[] = [
  {
    value: "MARKET",
    label: "成行注文",
    sub: "現在の市場価格で即時執行",
    needsPrice: false, needsTrigger: false, needsTrail: false, needsLimitOffset: false,
  },
  {
    value: "LIMIT",
    label: "指値注文",
    sub: "指定した価格以下（買）/ 以上（売）で執行",
    needsPrice: true, needsTrigger: false, needsTrail: false, needsLimitOffset: false,
  },
  {
    value: "STOP_LIMIT",
    label: "逆指値（指値）",
    sub: "トリガー価格に達したら指値注文を発行",
    needsPrice: true, needsTrigger: true, needsTrail: false, needsLimitOffset: false,
  },
  {
    value: "STOP_MARKET",
    label: "逆指値（成行）",
    sub: "トリガー価格に達したら成行注文を発行",
    needsPrice: false, needsTrigger: true, needsTrail: false, needsLimitOffset: false,
  },
  {
    value: "TRIGGER_LIMIT",
    label: "トリガー（指値）",
    sub: "条件価格到達後に指値注文を発行",
    needsPrice: true, needsTrigger: true, needsTrail: false, needsLimitOffset: false,
  },
  {
    value: "TRIGGER_MARKET",
    label: "トリガー（成行）",
    sub: "条件価格到達後に成行注文を発行",
    needsPrice: false, needsTrigger: true, needsTrail: false, needsLimitOffset: false,
  },
  {
    value: "TRAIL_STOP_LIMIT",
    label: "トレールストップ（指値）",
    sub: "価格追従後にトリガー価格から一定幅の指値で執行",
    needsPrice: false, needsTrigger: false, needsTrail: true, needsLimitOffset: true,
  },
  {
    value: "TRAIL_STOP_MARKET",
    label: "トレールストップ（成行）",
    sub: "価格追従後にトリガー価格から一定幅で成行執行",
    needsPrice: false, needsTrigger: false, needsTrail: true, needsLimitOffset: false,
  },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface OrderFormModalProps {
  open: boolean;
  onClose: () => void;
  // 発注後コールバック（成功時）
  onSuccess: (orderResult: Record<string, unknown>) => void;
  // 銘柄コード・名前・方向はプリセット可
  ticker: string;
  name?: string;
  side: "BUY" | "SELL";
  // エントリー価格をデフォルト値として使う
  defaultPrice?: number;
  defaultQty?: number;
}

export default function OrderFormModal({
  open,
  onClose,
  onSuccess,
  ticker,
  name,
  side,
  defaultPrice,
  defaultQty,
}: OrderFormModalProps) {
  const [orderType, setOrderType] = useState<MoomooOrderType>("MARKET");
  const [qty, setQty] = useState(defaultQty?.toString() ?? "100");
  const [price, setPrice] = useState(defaultPrice?.toString() ?? "");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [trailAmount, setTrailAmount] = useState("");
  const [trailType, setTrailType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [limitOffset, setLimitOffset] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // 2-step confirm flow: "form" → "preview" → (submit) → "done"
  const [step, setStep] = useState<"form" | "preview">("form");
  const [checklist, setChecklist] = useState({
    correctTicker: false,
    correctQty: false,
    correctOrderType: false,
    correctSide: false,
    understoodRisk: false,
  });
  const allChecked = Object.values(checklist).every(Boolean);

  const selected = ORDER_TYPES.find((o) => o.value === orderType)!;

  const formErrors = {
    qty: (() => {
      const n = parseInt(qty);
      if (!qty) return null;
      if (isNaN(n) || n <= 0) return "1以上の整数を入力してください";
      return null;
    })(),
    price: selected.needsPrice && price && parseFloat(price) <= 0 ? "0より大きい価格を入力してください" : null,
    triggerPrice: selected.needsTrigger && triggerPrice && parseFloat(triggerPrice) <= 0 ? "0より大きいトリガー価格を入力してください" : null,
    trailAmount: selected.needsTrail && trailAmount && parseFloat(trailAmount) <= 0 ? "0より大きいトレール幅を入力してください" : null,
  };

  const hasUnsavedData = qty !== (defaultQty?.toString() ?? "100") || !!price || !!triggerPrice || !!trailAmount || step === "preview";

  const handleClose = () => {
    if (hasUnsavedData && !result) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    const qtyNum = parseInt(qty);
    if (!ticker) { toast.error("銘柄コードが未設定です"); return; }
    if (isNaN(qtyNum) || qtyNum <= 0) { toast.error("数量を正しく入力してください"); return; }
    if (selected.needsPrice && !price) { toast.error("指値価格を入力してください"); return; }
    if (selected.needsTrigger && !triggerPrice) { toast.error("トリガー価格を入力してください"); return; }
    if (selected.needsTrail && !trailAmount) { toast.error("トレール幅を入力してください"); return; }
    setStep("preview");
  };

  const handleSubmit = async () => {
    const qtyNum = parseInt(qty);
    if (!ticker) { toast.error("銘柄コードが未設定です"); return; }
    if (isNaN(qtyNum) || qtyNum <= 0) { toast.error("数量を正しく入力してください"); return; }
    if (selected.needsPrice && !price) { toast.error("指値価格を入力してください"); return; }
    if (selected.needsTrigger && !triggerPrice) { toast.error("トリガー価格を入力してください"); return; }
    if (selected.needsTrail && !trailAmount) { toast.error("トレール幅を入力してください"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        code: ticker,
        quantity: qtyNum,
        side,
        order_type: orderType,
      };
      if (selected.needsPrice && price) payload.price = parseFloat(price);
      if (selected.needsTrigger && triggerPrice) payload.trigger_price = parseFloat(triggerPrice);
      if (selected.needsTrail && trailAmount) {
        payload.trail_amount = parseFloat(trailAmount);
        payload.trail_type = trailType;
      }
      if (selected.needsLimitOffset && limitOffset) payload.limit_offset = parseFloat(limitOffset);

      const res = await axios.post(`${API_BASE}/api/trade/place-order`, payload);
      setResult(res.data);
      onSuccess(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "発注に失敗しました";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded",
                  side === "BUY"
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                )}>
                  {side === "BUY" ? "買い" : "売り"}
                </span>
                <span className="font-display font-bold text-foreground">{ticker}</span>
                {name && <span className="text-xs text-muted-foreground">{name}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">📱 moomoo証券へ発注</p>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Result / Form / Preview screens */}
          {result ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-foreground mb-1">発注完了</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {(result.status as string) === "SUBMITTED_TO_MOOMOO"
                  ? "moomoo OpenD 経由で注文を送信しました"
                  : "シミュレーションとして記録されました（OpenD未接続）"}
              </p>
              <div className="rounded-xl border border-border/30 bg-card/50 p-4 text-left text-sm space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">注文ID</span>
                  <span className="font-mono text-foreground">{String(result.order_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">注文タイプ</span>
                  <span className="text-foreground">{ORDER_TYPES.find(o => o.value === result.order_type)?.label ?? String(result.order_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">数量</span>
                  <span className="font-mono text-foreground">{String(result.quantity)}</span>
                </div>
                {result.price != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">価格</span>
                    <span className="font-mono text-foreground">{Number(result.price).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <Button onClick={onClose} className="w-full">閉じる</Button>
            </div>
          ) : step === "form" ? (
            <div className="px-5 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* 注文タイプ選択 */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">注文タイプ</p>
                <div className="space-y-2">
                  {ORDER_TYPES.map((ot) => (
                    <button
                      key={ot.value}
                      onClick={() => setOrderType(ot.value)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                        orderType === ot.value
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 bg-card/40 hover:border-border/60"
                      )}
                    >
                      <p className={cn(
                        "text-sm font-semibold",
                        orderType === ot.value ? "text-primary" : "text-foreground"
                      )}>{ot.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ot.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 数量 */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1.5">数量（株）</label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="bg-card/30 border-border/30"
                  placeholder="例: 100"
                />
                {formErrors.qty && <p className="text-xs text-destructive mt-1">{formErrors.qty}</p>}
              </div>

              {/* 指値価格 */}
              {selected.needsPrice && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1.5">
                    指値価格
                  </label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-card/30 border-border/30"
                    placeholder="例: 150.50"
                  />
                  {formErrors.price && <p className="text-xs text-destructive mt-1">{formErrors.price}</p>}
                </div>
              )}

              {/* トリガー価格 */}
              {selected.needsTrigger && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1.5">
                    トリガー価格
                  </label>
                  <Input
                    type="number"
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    className="bg-card/30 border-border/30"
                    placeholder="例: 148.00"
                  />
                  {formErrors.triggerPrice && <p className="text-xs text-destructive mt-1">{formErrors.triggerPrice}</p>}
                </div>
              )}

              {/* トレール幅 */}
              {selected.needsTrail && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1.5">
                    トレール幅
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={trailAmount}
                      onChange={(e) => setTrailAmount(e.target.value)}
                      className="bg-card/30 border-border/30 flex-1"
                      placeholder={trailType === "PERCENT" ? "例: 2.5" : "例: 3.00"}
                    />
                    <div className="flex rounded-lg border border-border/30 overflow-hidden">
                      {(["AMOUNT", "PERCENT"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTrailType(t)}
                          className={cn(
                            "px-3 py-2 text-xs font-medium transition-colors",
                            trailType === t
                              ? "bg-primary/20 text-primary"
                              : "bg-card/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t === "AMOUNT" ? "金額" : "%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {formErrors.trailAmount && <p className="text-xs text-destructive mt-1">{formErrors.trailAmount}</p>}
                </div>
              )}

              {/* 指値オフセット（トレールストップ指値のみ） */}
              {selected.needsLimitOffset && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1.5">
                    指値オフセット（トリガーからの差）
                  </label>
                  <Input
                    type="number"
                    value={limitOffset}
                    onChange={(e) => setLimitOffset(e.target.value)}
                    className="bg-card/30 border-border/30"
                    placeholder="例: 0.50"
                  />
                </div>
              )}

              {/* 警告 */}
              <div className="flex items-start gap-2 text-xs text-warning/80 bg-warning/8 border border-warning/20 rounded-lg px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  moomoo OpenDが起動中の場合は実際の注文が送信されます。未接続の場合はシミュレーションとして記録されます。
                </span>
              </div>

              {/* Step 1: 確認するボタン */}
              <Button
                onClick={handleConfirm}
                variant="outline"
                disabled={Object.values(formErrors).some(Boolean)}
                className="w-full font-semibold border-primary/40 text-primary hover:bg-primary/10"
              >
                内容を確認する
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          ) : step === "preview" ? (
            /* ── Step 2: Preview + Checklist ─────────────────────────── */
            <div className="px-5 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setStep("form")}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  ← 戻る
                </button>
                <span className="text-sm font-semibold text-foreground ml-auto">注文プレビュー</span>
              </div>

              {/* Order summary */}
              <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-2.5 text-sm">
                {[
                  { label: "銘柄コード", value: ticker },
                  { label: "銘柄名", value: name ?? "—" },
                  { label: "売買方向", value: side === "BUY" ? "🟢 買い（BUY）" : "🔴 売り（SELL）" },
                  { label: "注文タイプ", value: selected.label },
                  { label: "数量", value: `${qty} 株` },
                  ...(selected.needsPrice && price ? [{ label: "指値価格", value: `${Number(price).toLocaleString()}` }] : []),
                  ...(selected.needsTrigger && triggerPrice ? [{ label: "トリガー価格", value: `${Number(triggerPrice).toLocaleString()}` }] : []),
                  ...(selected.needsTrail && trailAmount ? [{ label: "トレール幅", value: `${trailAmount} ${trailType === "PERCENT" ? "%" : "円/USD"}` }] : []),
                  ...(selected.needsLimitOffset && limitOffset ? [{ label: "指値オフセット", value: limitOffset }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground text-xs w-28 shrink-0">{label}</span>
                    <span className="text-foreground text-xs font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Checklist */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  発注前チェックリスト
                </p>
                <div className="space-y-2.5">
                  {([
                    { key: "correctTicker",    label: `銘柄「${ticker}」が正しい` },
                    { key: "correctQty",       label: `数量「${qty}株」が正しい` },
                    { key: "correctOrderType", label: `注文タイプ「${selected.label}」を理解している` },
                    { key: "correctSide",      label: `売買方向「${side === "BUY" ? "買い" : "売り"}」が意図通り` },
                    { key: "understoodRisk",   label: "損失リスクを理解したうえで発注する" },
                  ] as { key: keyof typeof checklist; label: string }[]).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setChecklist(c => ({ ...c, [key]: !c[key] }))}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        checklist[key]
                          ? "bg-primary border-primary"
                          : "border-border/60 bg-transparent"
                      )}>
                        {checklist[key] && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="text-xs text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!allChecked && (
                <p className="text-xs text-muted-foreground text-center">
                  すべての項目にチェックを入れると発注できます
                </p>
              )}

              {/* Step 2: チェックして発注するボタン */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !allChecked}
                className={cn(
                  "w-full font-semibold",
                  side === "BUY"
                    ? "bg-success hover:bg-success/90 text-white"
                    : "bg-destructive hover:bg-destructive/90 text-white"
                )}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />注文送信中…</>
                ) : (
                  <>発注する<ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          ) : null}

          {/* Unsaved data close confirmation overlay */}
          {showCloseConfirm && (
            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl p-4">
              <div className="bg-card border border-border/50 rounded-xl p-5 max-w-xs w-full">
                <h3 className="font-display text-base font-bold text-foreground mb-2">入力内容を破棄しますか？</h3>
                <p className="text-sm text-muted-foreground mb-4">閉じると入力した発注情報が失われます。</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="flex-1 py-2 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    戻る
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 rounded-lg bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/30 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
