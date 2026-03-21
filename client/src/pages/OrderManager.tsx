// BRAKE Pro — OrderManager Page
// Comprehensive moomoo OpenAPI order management with goal-based OrderWizard.
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";
import TickerSearchDropdown from "@/components/TickerSearchDropdown";
import OrderWizardContainer from "@/components/OrderWizard/OrderWizardContainer";
import OrderList from "@/components/OrderList";

import type {
  OrderFormState, SecurityInfo, Market, PlacedOrder,
} from "@/lib/orderSystem/types";
import { DEFAULT_ORDER_FORM } from "@/lib/orderSystem/types";
import { getCapability, getOperations } from "@/lib/orderSystem/capabilityMatrix";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function OrderManager() {
  const [form, setForm] = useState<OrderFormState>(DEFAULT_ORDER_FORM);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrders, setShowOrders] = useState(true);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/trade/orders`);
      setOrders(res.data);
    } catch {
      toast.error("注文一覧の取得に失敗しました");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 30000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">注文管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            目的ベースの注文ウィザードで、安全かつ高度な発注を実現します。
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Order Wizard Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border/30 bg-card/50 p-6">
              <label className="block text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                1. 銘柄を選択
              </label>
              <TickerSearchDropdown
                value={form.security?.ticker ?? ""}
                onChange={(ticker, name) => {
                  if (ticker) {
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
                    setForm(prev => ({ ...prev, security: sec }));
                  }
                }}
              />
              {form.security && (
                <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-background/50 border border-border/30">
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 font-bold">
                    {form.security.market}
                  </span>
                  <span className="text-xs font-bold text-foreground">{form.security.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{form.security.code}</span>
                </div>
              )}
            </div>

            {form.security ? (
              <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
                <OrderWizardContainer
                  ticker={form.security.code}
                  side={form.side}
                  onClose={() => setForm(prev => ({ ...prev, security: null }))}
                  onSuccess={fetchOrders}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/50 bg-card/20 p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-muted-foreground animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">銘柄を選択してください</p>
                  <p className="text-xs text-muted-foreground/60">
                    上の検索ボックスから銘柄を選ぶと、注文ウィザードが開始されます。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Orders Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-border/30 bg-card/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-sm text-foreground">
                  当日注文一覧
                </h2>
                <button
                  onClick={() => fetchOrders()}
                  className="p-1.5 hover:bg-accent rounded-md transition-colors"
                >
                  <RefreshCw className={cn("w-4 h-4 text-muted-foreground", ordersLoading && "animate-spin")} />
                </button>
              </div>
              
              <OrderList
                orders={orders}
                onCancel={handleCancel}
                onRefresh={fetchOrders}
                loading={ordersLoading}
              />
            </div>

            {/* Capability info */}
            {form.security && (
              <div className="rounded-2xl border border-border/30 bg-card/50 p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  銘柄の取引制約
                </p>
                {(() => {
                  const mkt = (form.security!.market ?? "US") as Market;
                  const cap = getCapability(mkt, form.security!.type);
                  const ops = getOperations(mkt, form.security!.type);
                  return (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">対応注文タイプ</span>
                        <span className="text-foreground font-bold">{cap.supportedOrderTypes.length} 種類</span>
                      </div>
                      {[
                        ["訂正", ops.modify], ["取消", ops.cancel],
                        ["有効化", ops.enable], ["無効化", ops.disable],
                      ].map(([label, ok]) => (
                        <div key={String(label)} className="flex justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <span className={cn("font-bold", ok ? "text-success" : "text-muted-foreground/40")}>
                            {ok ? "✓ 可能" : "— 不可"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
