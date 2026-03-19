// BRAKE Pro — Paper Trade Page
// ペーパートレード（模擬取引）— 既存UIスタイル踏襲

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, RefreshCw, TrendingUp, TrendingDown, DollarSign, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getPaperAccount, placePaperOrder, closePaperOrder, resetPaperAccount, getHoldings,
  type PaperOrder,
} from "@/lib/paperTrade";

export default function PaperTrade() {
  const [account, setAccount] = useState(getPaperAccount);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("100");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [closePrice, setClosePrice] = useState<Record<string, string>>({});

  const refresh = () => setAccount(getPaperAccount());

  function flash(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  function handlePlace() {
    if (!code || !price || !quantity) { flash("err", "コード・数量・価格を入力してください"); return; }
    const result = placePaperOrder(code, name || code, side, Number(quantity), Number(price));
    flash(result.ok ? "ok" : "err", result.message);
    if (result.ok) { setCode(""); setName(""); setPrice(""); setQuantity("100"); refresh(); }
  }

  function handleClose(orderId: string) {
    const cp = closePrice[orderId];
    if (!cp) { flash("err", "決済価格を入力してください"); return; }
    const result = closePaperOrder(orderId, Number(cp));
    flash(result.ok ? "ok" : "err", result.message);
    if (result.ok) { setClosePrice((p) => { const n = { ...p }; delete n[orderId]; return n; }); refresh(); }
  }

  function handleReset() {
    if (!confirm("模擬口座をリセットしますか？全ての記録が消えます。")) return;
    resetPaperAccount();
    refresh();
  }

  const holdings = useMemo(() => getHoldings(account), [account]);
  const openOrders = account.orders.filter((o) => o.status === "OPEN");
  const closedOrders = account.orders.filter((o) => o.status === "CLOSED").slice(-10).reverse();

  const totalPnL = account.orders
    .filter((o) => o.status === "CLOSED")
    .reduce((s, o) => s + (o.pnl ?? 0), 0);

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ペーパートレード</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            リセット
          </Button>
        </div>
        <p className="text-sm text-muted-foreground pl-11">模擬取引でリスクゼロの戦略検証</p>
      </motion.div>

      {/* 残高サマリー */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "仮想残高", value: `¥${account.balance.toLocaleString()}`, icon: DollarSign, positive: null },
          { label: "累計PnL", value: `${totalPnL >= 0 ? "+" : ""}¥${totalPnL.toLocaleString()}`, icon: totalPnL >= 0 ? TrendingUp : TrendingDown, positive: totalPnL >= 0 },
          { label: "ポジション数", value: String(openOrders.length), icon: BookOpen, positive: null },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={cn("w-4 h-4", kpi.positive === true ? "text-primary" : kpi.positive === false ? "text-destructive" : "text-muted-foreground")} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className={cn(
              "text-lg font-bold font-mono",
              kpi.positive === true ? "text-primary" :
              kpi.positive === false ? "text-destructive" : "text-foreground"
            )}>
              {kpi.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* フラッシュメッセージ */}
      {message && (
        <div className={cn(
          "rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 border",
          message.type === "ok"
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-destructive/10 border-destructive/30 text-destructive"
        )}>
          {message.type === "ok" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 注文パネル */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground">新規注文</h2>

          {/* BUY / SELL */}
          <div className="grid grid-cols-2 gap-2">
            {(["BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium border transition-all",
                  side === s
                    ? s === "BUY"
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-destructive/15 border-destructive/40 text-destructive"
                    : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                {s === "BUY" ? "買い (BUY)" : "売り (SELL)"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">銘柄コード</label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HK.00700" className="mt-1 h-8 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">銘柄名（任意）</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="TENCENT" className="mt-1 h-8 text-sm bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">数量</label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 h-8 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">執行価格</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="mt-1 h-8 text-sm bg-background" />
              </div>
            </div>
          </div>

          {price && quantity && (
            <p className="text-xs text-muted-foreground">
              概算金額: ¥{(Number(price) * Number(quantity)).toLocaleString()}
            </p>
          )}

          <Button onClick={handlePlace} className="w-full" size="sm">
            注文を執行する
          </Button>

          {/* 保有銘柄 */}
          {holdings.length > 0 && (
            <div className="pt-2 border-t border-border/30 space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">保有ポジション</h3>
              {holdings.map((h) => (
                <div key={h.code} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-foreground">{h.code}</span>
                  <span className="text-muted-foreground">{h.quantity}株 @ ¥{h.avgPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 注文履歴 */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/50 bg-card p-5 space-y-4"
        >
          {/* オープン注文 */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">オープン注文 ({openOrders.length})</h2>
            {openOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">オープン注文なし</p>
            ) : (
              openOrders.map((o) => (
                <div key={o.id} className="rounded-lg bg-background border border-border/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold", o.side === "BUY" ? "text-primary" : "text-destructive")}>
                      {o.side}
                    </span>
                    <span className="text-xs font-mono text-foreground">{o.code}</span>
                    <span className="text-xs text-muted-foreground">{o.quantity}株 @ ¥{o.price}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="決済価格"
                      value={closePrice[o.id] || ""}
                      onChange={(e) => setClosePrice((p) => ({ ...p, [o.id]: e.target.value }))}
                      className="h-7 text-xs bg-card"
                    />
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleClose(o.id)}>
                      決済
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* クローズ済み */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <h2 className="text-sm font-semibold text-foreground">決済済み（直近10件）</h2>
            {closedOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">決済済み注文なし</p>
            ) : (
              <div className="space-y-1.5">
                {closedOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-xs">
                    <span className={cn("font-bold", o.side === "BUY" ? "text-primary" : "text-destructive")}>
                      {o.side}
                    </span>
                    <span className="font-mono text-foreground">{o.code}</span>
                    <span className="text-muted-foreground">{o.quantity}株</span>
                    <span className={cn("font-mono font-bold", (o.pnl ?? 0) >= 0 ? "text-primary" : "text-destructive")}>
                      {(o.pnl ?? 0) >= 0 ? "+" : ""}¥{(o.pnl ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
