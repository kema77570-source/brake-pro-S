// BRAKE Pro — Account Manager Page
// Deposit/withdrawal tracking, balance history, and PnL comparison
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Plus, Trash2, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Wifi, WifiOff, RefreshCw, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getTransactions, saveTransaction, deleteTransaction, getTrades } from "@/lib/storage";
import type { AccountTransaction } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AccountManager() {
  const [transactions, setTransactions] = useState<AccountTransaction[]>(() =>
    getTransactions()
  );
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [moomooSyncing, setMoomooSyncing] = useState(false);
  const [moomooStatus, setMoomooStatus] = useState<"idle" | "success" | "error" | "offline">("idle");

  const refresh = () => setTransactions(getTransactions());

  const syncFromMooMoo = async () => {
    setMoomooSyncing(true);
    setMoomooStatus("idle");
    try {
      const res = await fetch("/api/moomoo/fund-info");
      if (!res.ok) throw new Error("offline");
      const data = await res.json();
      // If we got fund data, record as a snapshot note
      if (data.cash !== undefined) {
        const note = `MooMoo残高スナップショット: ¥${Number(data.cash).toLocaleString()}`;
        toast.success(note);
        setMoomooStatus("success");
      }
    } catch {
      setMoomooStatus("offline");
      toast.error("moomoo OpenDに接続できません。moomoo接続設定を確認してください。");
    }
    setMoomooSyncing(false);
  };

  const handleAdd = () => {
    const num = parseFloat(amount.replace(/,/g, ""));
    if (!num || num <= 0) {
      toast.error("金額を正しく入力してください");
      return;
    }
    const newTx: AccountTransaction = {
      id: nanoid(),
      date: new Date().toISOString(),
      type,
      amount: num,
      note: note.trim() || undefined,
    };
    saveTransaction(newTx);
    refresh();
    setAmount("");
    setNote("");
    toast.success(`${type === "deposit" ? "入金" : "出金"} ¥${num.toLocaleString()} を記録しました`);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    refresh();
    toast.info("記録を削除しました");
  };

  // Calculate running balance for chart
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let balance = 0;
    return sorted.map((tx) => {
      balance += tx.type === "deposit" ? tx.amount : -tx.amount;
      return {
        date: new Date(tx.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
        balance,
        type: tx.type,
      };
    });
  }, [transactions]);

  // Current balance
  const currentBalance = transactions.reduce(
    (acc, tx) => acc + (tx.type === "deposit" ? tx.amount : -tx.amount),
    0
  );

  // Realized PnL from closed trades
  const realizedPnl = useMemo(() => {
    const trades = getTrades();
    return trades
      .filter((t) => t.status === "closed" && t.pnl !== undefined)
      .reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  }, []);

  const totalDeposit = transactions
    .filter((t) => t.type === "deposit")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawal = transactions
    .filter((t) => t.type === "withdrawal")
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      {/* MooMoo sync banner */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {moomooStatus === "offline" ? (
              <WifiOff className="w-4 h-4 text-amber-400" />
            ) : (
              <Wifi className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">MooMoo証券と連動</p>
            <p className="text-xs text-muted-foreground">
              {moomooStatus === "success" ? "同期しました" :
               moomooStatus === "offline" ? "moomoo OpenDが起動していません" :
               "moomoo OpenDが起動中の場合、残高を取得できます"}
            </p>
          </div>
        </div>
        <button
          onClick={syncFromMooMoo}
          disabled={moomooSyncing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary/15 border border-primary/30 text-primary rounded-lg hover:bg-primary/25 disabled:opacity-50 transition-colors shrink-0"
        >
          {moomooSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          同期する
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">資金管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">入出金の記録と残高推移</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        {[
          { label: "現在残高", value: currentBalance, color: currentBalance >= 0 ? "text-success" : "text-destructive" },
          { label: "実現PnL合計", value: realizedPnl, color: realizedPnl >= 0 ? "text-success" : "text-destructive" },
          { label: "総入金", value: totalDeposit, color: "text-blue-400" },
          { label: "総出金", value: totalWithdrawal, color: "text-amber-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border/30 bg-card/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={cn("font-mono font-bold text-lg", card.color)}>
              ¥{card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Balance Chart */}
      {chartData.length >= 2 && (
        <div className="rounded-xl border border-border/30 bg-card/50 p-4 mb-6">
          <p className="text-sm font-medium text-foreground mb-3">残高推移</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: number) => [`¥${v.toLocaleString()}`, "残高"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#balanceGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add Form */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 mb-6">
        <p className="text-sm font-medium text-foreground mb-3">記録を追加</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setType("deposit")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
              type === "deposit"
                ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                : "border-border/30 bg-card/30 text-muted-foreground hover:border-border/60"
            )}
          >
            <ArrowDownCircle className="w-4 h-4" />入金
          </button>
          <button
            onClick={() => setType("withdrawal")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
              type === "withdrawal"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-border/30 bg-card/30 text-muted-foreground hover:border-border/60"
            )}
          >
            <ArrowUpCircle className="w-4 h-4" />出金
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="金額（円）"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-card/50 border-border/40 flex-1"
          />
          <Input
            placeholder="メモ（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-card/50 border-border/40 flex-1"
          />
          <Button onClick={handleAdd} className="gap-1.5 bg-primary hover:bg-primary/90 shrink-0">
            <Plus className="w-4 h-4" />追加
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground mb-3">取引履歴</p>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">取引記録がありません</p>
          </div>
        ) : (
          transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/50 p-3"
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                tx.type === "deposit" ? "bg-blue-500/10" : "bg-amber-500/10"
              )}>
                {tx.type === "deposit"
                  ? <ArrowDownCircle className="w-4 h-4 text-blue-400" />
                  : <ArrowUpCircle className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {tx.type === "deposit" ? "入金" : "出金"}
                  <span className={cn(
                    "ml-2 font-mono font-bold",
                    tx.type === "deposit" ? "text-blue-400" : "text-amber-400"
                  )}>
                    ¥{tx.amount.toLocaleString()}
                  </span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(tx.date).toLocaleDateString("ja-JP")}</span>
                  {tx.note && <span className="truncate">· {tx.note}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(tx.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* PnL Comparison */}
      {transactions.length > 0 && (
        <div className="mt-6 rounded-xl border border-border/30 bg-card/50 p-4">
          <p className="text-sm font-medium text-foreground mb-3">入出金 vs 実現PnL</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />純入金（入金−出金）
              </span>
              <span className="font-mono font-bold text-foreground">
                ¥{(totalDeposit - totalWithdrawal).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {realizedPnl >= 0
                  ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                  : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                実現PnL合計
              </span>
              <span className={cn("font-mono font-bold", realizedPnl >= 0 ? "text-success" : "text-destructive")}>
                {realizedPnl >= 0 ? "+" : ""}¥{realizedPnl.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-border/30 pt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">資産合計推定</span>
              <span className={cn(
                "font-mono font-bold text-base",
                (currentBalance + realizedPnl) >= 0 ? "text-success" : "text-destructive"
              )}>
                ¥{(currentBalance + realizedPnl).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
