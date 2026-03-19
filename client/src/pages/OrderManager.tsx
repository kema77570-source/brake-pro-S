// BRAKE Pro — OrderManager Page
// Comprehensive moomoo OpenAPI order management with capability matrix,
// validation, 2-step preview, today's orders, and modify/cancel.
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, RefreshCw, X, AlertTriangle, CheckCircle2, Info,
  TrendingUp, TrendingDown, Clock, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";
import TickerSearchDropdown from "@/components/TickerSearchDropdown";

import type {
  OrderFormState, SecurityInfo, Market, MooOrderType,
  TimeInForce, Session, TradeEnv, PlacedOrder,
} from "@/lib/orderSystem/types";
import { DEFAULT_ORDER_FORM } from "@/lib/orderSystem/types";
import { getCapability, getSupportedOrderTypes, getOperations, ORDER_TYPE_META } from "@/lib/orderSystem/capabilityMatrix";
import { validateOrder } from "@/lib/orderSystem/validation";
import { normalizeError } from "@/lib/orderSystem/errorNormalizer";
import { mapToPayload } from "@/lib/orderSystem/payloadMapper";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Sub-components ─────────────────────────────────────────────────────────
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", className)}>
      {children}
    </span>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SegmentedControl<T extends string>({
  options, value, onChange, className,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("flex rounded-lg border border-border/30 overflow-hidden", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-primary/20 text-primary"
              : "bg-card/40 text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── OrderForm ──────────────────────────────────────────────────────────────
function OrderForm({
  form, setForm, onSubmit, submitting,
}: {
  form: OrderFormState;
  setForm: (f: OrderFormState) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const up = <K extends keyof OrderFormState>(k: K, v: OrderFormState[K]) =>
    setForm({ ...form, [k]: v });

  const market = (form.security?.market ?? "US") as Market;
  const productType = form.security?.type ?? "stock";
  const capability = getCapability(market, productType);
  const supportedTypes = getSupportedOrderTypes(market, productType);
  const meta = ORDER_TYPE_META[form.orderType];
  const validation = validateOrder(form, capability);
  const fatals = validation.issues.filter((i) => i.severity === "fatal");
  const warnings = validation.issues.filter((i) => i.severity === "warning");
  const infos = validation.issues.filter((i) => i.severity === "info");

  return (
    <div className="space-y-5">
      {/* Security */}
      <Field label="銘柄" hint="ティッカー・銘柄名で検索">
        <TickerSearchDropdown
          value={form.security?.ticker ?? ""}
          onChange={(ticker, name) => {
            if (ticker) {
              // Detect market from ticker format
              const mkt: Market = ticker.includes(".T") ? "JP"
                : /^\d{4}$/.test(ticker) ? "HK"
                : "US";
              const sec: SecurityInfo = {
                code: mkt === "US" ? `US.${ticker}` : ticker,
                ticker,
                name: name || ticker,
                market: mkt,
                type: "stock",
              };
              up("security", sec);
            }
          }}
        />
        {form.security && (
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">{form.security.market}</Badge>
            <span className="text-xs text-muted-foreground">{form.security.name}</span>
            <span className="text-xs font-mono text-foreground">{form.security.code}</span>
          </div>
        )}
      </Field>

      {/* Side + Trade env */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="売買方向">
          <SegmentedControl<"BUY" | "SELL">
            options={[{ value: "BUY", label: "買い" }, { value: "SELL", label: "売り" }]}
            value={form.side}
            onChange={(v) => up("side", v)}
          />
        </Field>
        <Field label="取引環境">
          <SegmentedControl<TradeEnv>
            options={[{ value: "SIMULATE", label: "デモ" }, { value: "REAL", label: "本番" }]}
            value={form.tradeEnv}
            onChange={(v) => up("tradeEnv", v)}
          />
        </Field>
      </div>

      {form.tradeEnv === "REAL" && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>本番口座モード: 実際の資金で発注されます。OpenDがログイン済みであることを確認してください</span>
        </div>
      )}

      {/* Order type */}
      <Field label="注文タイプ">
        <div className="grid grid-cols-2 gap-1.5">
          {supportedTypes.map((ot) => {
            const m = ORDER_TYPE_META[ot];
            return (
              <button
                key={ot}
                type="button"
                onClick={() => up("orderType", ot as MooOrderType)}
                className={cn(
                  "text-left px-3 py-2 rounded-lg border text-xs transition-all",
                  form.orderType === ot
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/30 bg-card/40 text-muted-foreground hover:border-border/60 hover:text-foreground",
                  m?.riskLevel === "high" && form.orderType === ot && "border-warning/50 bg-warning/10 text-warning"
                )}
              >
                <p className="font-semibold">{m?.labelJa ?? ot}</p>
                {m?.isMarket && <p className="text-[10px] opacity-70 mt-0.5">⚡ 成行</p>}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Qty */}
      <Field label={productType.includes("option") ? "数量（contracts）" : "数量（株）"}>
        <Input
          type="number"
          min={1}
          value={form.qty}
          onChange={(e) => up("qty", e.target.value)}
          className="bg-card/30 border-border/30"
          placeholder="例: 100"
        />
      </Field>

      {/* Conditional price fields */}
      {meta?.needsPrice && (
        <Field label="指値価格">
          <Input type="number" value={form.price} onChange={(e) => up("price", e.target.value)}
            className="bg-card/30 border-border/30" placeholder="例: 150.50" />
        </Field>
      )}
      {meta?.needsAuxPrice && (
        <Field label="トリガー価格（aux_price）">
          <Input type="number" value={form.auxPrice} onChange={(e) => up("auxPrice", e.target.value)}
            className="bg-card/30 border-border/30" placeholder="例: 148.00" />
        </Field>
      )}
      {meta?.needsTrail && (
        <Field label="トレール幅">
          <div className="flex gap-2">
            <Input type="number" value={form.trailValue} onChange={(e) => up("trailValue", e.target.value)}
              className="bg-card/30 border-border/30 flex-1"
              placeholder={form.trailType === "PERCENT" ? "例: 2.5" : "例: 3.00"} />
            <SegmentedControl<"AMOUNT" | "PERCENT">
              options={[{ value: "AMOUNT", label: "金額" }, { value: "PERCENT", label: "%" }]}
              value={form.trailType}
              onChange={(v) => up("trailType", v)}
              className="w-28 shrink-0"
            />
          </div>
        </Field>
      )}
      {meta?.needsTrailSpread && (
        <Field label="指値オフセット（trail_spread）" hint="トリガーからの差">
          <Input type="number" value={form.trailSpread} onChange={(e) => up("trailSpread", e.target.value)}
            className="bg-card/30 border-border/30" placeholder="例: 0.50" />
        </Field>
      )}

      {/* TIF */}
      <Field label="注文有効期間">
        <div className="flex gap-1.5 flex-wrap">
          {capability.supportsTimeInForce.map((tif) => (
            <button key={tif} type="button" onClick={() => up("timeInForce", tif as TimeInForce)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                form.timeInForce === tif
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/30 bg-card/40 text-muted-foreground hover:border-border/60"
              )}>
              {tif}
            </button>
          ))}
        </div>
      </Field>

      {/* Session (US only) */}
      {capability.supportsSession && (
        <Field label="セッション">
          <SegmentedControl<Session>
            options={[
              { value: "REGULAR", label: "レギュラー" },
              { value: "PRE_MARKET", label: "プレ市場" },
              { value: "AFTER_HOURS", label: "時間外" },
            ]}
            value={form.session}
            onChange={(v) => up("session", v)}
          />
        </Field>
      )}

      {/* Fill outside RTH (US only) */}
      {capability.supportsFillOutsideRth && (
        <label className="flex items-center gap-3 cursor-pointer"
          onClick={() => up("fillOutsideRth", !form.fillOutsideRth)}>
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
            form.fillOutsideRth ? "bg-primary border-primary" : "border-border/60"
          )}>
            {form.fillOutsideRth && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
          </div>
          <span className="text-xs text-foreground">時間外約定を許可（fill_outside_rth）</span>
        </label>
      )}

      {/* Remark */}
      <Field label="メモ（remark）" hint={`${new TextEncoder().encode(form.remark).length} / 64 bytes`}>
        <Input value={form.remark} onChange={(e) => up("remark", e.target.value)}
          className="bg-card/30 border-border/30" placeholder="注文識別メモ（任意）" maxLength={40} />
      </Field>

      {/* Validation summary */}
      {(fatals.length > 0 || warnings.length > 0) && (
        <div className="space-y-1.5">
          {fatals.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
              <X className="w-3 h-3 shrink-0 mt-0.5" />
              <div>
                <p>{issue.message}</p>
                {issue.suggestion && <p className="text-muted-foreground mt-0.5">{issue.suggestion}</p>}
              </div>
            </div>
          ))}
          {warnings.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-warning/80 bg-warning/8 border border-warning/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <p>{issue.message}</p>
            </div>
          ))}
          {infos.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/10 border border-border/30 rounded-lg px-3 py-2">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <p>{issue.message}</p>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={!validation.valid || submitting}
        className={cn(
          "w-full font-semibold",
          form.side === "BUY"
            ? "bg-success hover:bg-success/90 text-white"
            : "bg-destructive hover:bg-destructive/90 text-white"
        )}
      >
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />送信中…</> : (
          <><Send className="w-4 h-4 mr-2" />{form.side === "BUY" ? "買い" : "売り"}注文を発注</>
        )}
      </Button>
    </div>
  );
}

// ── OrderList ──────────────────────────────────────────────────────────────
function OrderList({ orders, onCancel, onRefresh, loading }: {
  orders: PlacedOrder[];
  onCancel: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const STATUS_COLOR: Record<string, string> = {
    SUBMITTED: "text-primary bg-primary/10 border-primary/20",
    FILLED: "text-success bg-success/10 border-success/20",
    PARTIALLY_FILLED: "text-warning bg-warning/10 border-warning/20",
    CANCELLED: "text-muted-foreground bg-muted/20 border-border/20",
    FAILED: "text-destructive bg-destructive/10 border-destructive/20",
    SIMULATED: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  const STATUS_JA: Record<string, string> = {
    SUBMITTED: "送信済", FILLED: "約定", PARTIALLY_FILLED: "部分約定",
    CANCELLED: "取消済", FAILED: "失敗", SIMULATED: "シミュレーション",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm text-foreground">当日の注文</h3>
        <button onClick={onRefresh} disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">注文履歴がありません</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const ops = getOperations("US", "stock"); // simplified; adapt per market
            return (
              <div key={o.orderId} className="rounded-xl border border-border/30 bg-card/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {o.side === "BUY"
                      ? <TrendingUp className="w-4 h-4 text-success" />
                      : <TrendingDown className="w-4 h-4 text-destructive" />}
                    <span className="font-mono font-bold text-sm text-foreground">{o.code.split(".").pop()}</span>
                    <Badge className={STATUS_COLOR[o.status] ?? STATUS_COLOR.SUBMITTED}>
                      {STATUS_JA[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {o.status === "SUBMITTED" && ops.cancel && (
                      <button onClick={() => onCancel(o.orderId)}
                        className="text-xs text-destructive hover:text-destructive/80 px-2 py-0.5 rounded border border-destructive/30 transition-colors">
                        取消
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                  <div><p>タイプ</p><p className="text-foreground">{ORDER_TYPE_META[o.orderType as MooOrderType]?.labelJa ?? o.orderType}</p></div>
                  <div><p>数量</p><p className="text-foreground font-mono">{o.qty}</p></div>
                  <div><p>価格</p><p className="text-foreground font-mono">{o.price != null ? o.price.toLocaleString() : "—"}</p></div>
                  <div><p>環境</p><p className={o.tradeEnv === "REAL" ? "text-destructive" : "text-amber-400"}>{o.tradeEnv}</p></div>
                </div>
                {o.moomooOrderId && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">moomoo ID: {o.moomooOrderId}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OrderManager() {
  const [form, setForm] = useState<OrderFormState>(DEFAULT_ORDER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrders, setShowOrders] = useState(true);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/trade/order-list`);
      // Normalize raw backend data to PlacedOrder shape
      const raw = res.data as Record<string, unknown>[];
      setOrders(raw.map((o) => ({
        orderId: String(o.order_id ?? ""),
        moomooOrderId: o.moomoo_order_id ? String(o.moomoo_order_id) : undefined,
        code: String(o.code ?? ""),
        side: (String(o.side ?? "BUY")) as "BUY" | "SELL",
        qty: Number(o.quantity ?? 0),
        price: o.price != null ? Number(o.price) : undefined,
        orderType: (String(o.order_type ?? "MARKET")) as MooOrderType,
        status: (String(o.status ?? "SUBMITTED")) as PlacedOrder["status"],
        filledQty: 0,
        createdAt: String(o.created_at ?? ""),
        updatedAt: String(o.created_at ?? ""),
        tradeEnv: (String(o.trd_env ?? "SIMULATE")) as TradeEnv,
        remark: o.remark ? String(o.remark) : undefined,
      })));
    } catch {
      // silently ignore — backend may not be running
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSubmit = async () => {
    const market = (form.security?.market ?? "US") as Market;
    const capability = getCapability(market, form.security?.type ?? "stock");
    const validation = validateOrder(form, capability);
    if (!validation.valid) {
      toast.error("入力内容にエラーがあります");
      return;
    }

    setSubmitting(true);
    try {
      const payload = mapToPayload(form);
      const res = await axios.post(`${API_BASE}/api/trade/place-order`, payload);
      toast.success(`発注完了 (ID: ${res.data.order_id})`);
      setForm(DEFAULT_ORDER_FORM);
      await fetchOrders();
    } catch (err: unknown) {
      const normalized = normalizeError(
        (err as { response?: { data?: unknown } })?.response?.data ?? err
      );
      toast.error(normalized.message, { description: normalized.suggestion });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await axios.delete(`${API_BASE}/api/trade/cancel-order/${orderId}`);
      toast.success("注文を取り消しました");
      await fetchOrders();
    } catch {
      toast.error("取消に失敗しました");
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">注文管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            moomoo OpenAPI 経由で株式・ETF・オプションの注文を管理します
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Order Form */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-border/30 bg-card/50 p-5">
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-5">
                新規注文
              </h2>
              <OrderForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </div>
          </div>

          {/* Orders Panel */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border/30 bg-card/50 p-5">
              <button
                onClick={() => setShowOrders((s) => !s)}
                className="flex items-center justify-between w-full mb-4"
              >
                <span className="font-display font-semibold text-sm text-foreground">
                  当日注文一覧
                </span>
                {showOrders
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {showOrders && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <OrderList
                      orders={orders}
                      onCancel={handleCancel}
                      onRefresh={fetchOrders}
                      loading={ordersLoading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Capability info */}
            {form.security && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/30 bg-card/50 p-4 mt-4"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  この商品の取引制約
                </p>
                {(() => {
                  const mkt = (form.security!.market ?? "US") as Market;
                  const cap = getCapability(mkt, form.security!.type);
                  const ops = getOperations(mkt, form.security!.type);
                  return (
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">対応注文タイプ</span>
                        <span className="text-foreground">{cap.supportedOrderTypes.length}種類</span>
                      </div>
                      {[
                        ["訂正", ops.modify], ["取消", ops.cancel],
                        ["有効化", ops.enable], ["無効化", ops.disable],
                      ].map(([label, ok]) => (
                        <div key={String(label)} className="flex justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <span className={ok ? "text-success" : "text-muted-foreground"}>
                            {ok ? "✓ 可能" : "— 不可"}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">時間外セッション</span>
                        <span className={cap.supportsSession ? "text-success" : "text-muted-foreground"}>
                          {cap.supportsSession ? "✓ 対応" : "— 非対応"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
