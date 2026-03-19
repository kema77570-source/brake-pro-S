// BRAKE Pro — Dashboard Page
// Design: Dark Financial × Neo-Brutalist
// Market Fear&Greed (Crypto + Stock), VIX, Asset Heat Map

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fetchCryptoFearGreed, fetchStockFearGreed, fetchVix, fetchAllAssets, invalidateCache } from "@/lib/marketApi";
import type { MarketFearGreed, VixData, AssetHeatData } from "@/lib/types";
import { useApp } from "@/contexts/AppContext";

function FearGreedGauge({ data, label }: { data: MarketFearGreed | null; label: string }) {
  if (!data) return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded mb-4 w-1/2" />
      <div className="h-20 bg-white/10 rounded" />
    </div>
  );

  const color =
    data.value <= 24 ? "oklch(0.62 0.22 240)" :
    data.value <= 44 ? "oklch(0.65 0.18 160)" :
    data.value <= 55 ? "oklch(0.75 0.15 60)" :
    data.value <= 74 ? "oklch(0.75 0.18 80)" :
    "oklch(0.6 0.22 25)";

  const textColor =
    data.value <= 24 ? "text-primary" :
    data.value <= 44 ? "text-success" :
    data.value <= 55 ? "text-yellow-400" :
    data.value <= 74 ? "text-warning" :
    "text-destructive";

  const circumference = 2 * Math.PI * 40;

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">{label}</p>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="oklch(1 0 0 / 10%)" strokeWidth="7" />
            <motion.circle
              cx="48" cy="48" r="40" fill="none"
              stroke={color}
              strokeWidth="7" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (circumference * data.value) / 100 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-display font-bold text-xl num", textColor)}>{data.value}</span>
          </div>
        </div>
        <div>
          <p className={cn("font-display font-bold text-lg", textColor)}>{data.label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(data.timestamp).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 更新
          </p>
        </div>
      </div>
    </div>
  );
}

function VixCard({ data }: { data: VixData | null }) {
  if (!data) return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded mb-4 w-1/3" />
      <div className="h-12 bg-white/10 rounded" />
    </div>
  );

  const level = data.value >= 35 ? "critical" : data.value >= 25 ? "high" : data.value >= 20 ? "medium" : "low";
  const colors = {
    critical: "text-destructive border-destructive/30 bg-destructive/5",
    high: "text-warning border-warning/30 bg-warning/5",
    medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    low: "text-success border-success/30 bg-success/5",
  };
  const labels = { critical: "極度の恐怖", high: "恐怖", medium: "注意", low: "平穏" };

  return (
    <div className={cn("rounded-xl border p-5", colors[level])}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-3">VIX（恐怖指数）</p>
      <div className="flex items-end gap-3">
        <span className="font-display font-bold text-3xl num">{data.value}</span>
        <div className="flex items-center gap-1 mb-1">
          {data.change > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : data.change < 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          <span className="text-sm font-mono">{data.change > 0 ? "+" : ""}{data.change}%</span>
        </div>
      </div>
      <p className="text-sm font-medium mt-1 opacity-80">{labels[level]}</p>
    </div>
  );
}

function AssetCard({ asset }: { asset: AssetHeatData }) {
  const heatColors = {
    High: "border-destructive/30 bg-destructive/5",
    Medium: "border-warning/30 bg-warning/5",
    Low: "border-border/30 bg-card/50",
  };
  const heatDot = {
    High: "bg-destructive",
    Medium: "bg-warning",
    Low: "bg-success",
  };

  return (
    <div className={cn("rounded-xl border p-4 transition-all hover:border-border/60", heatColors[asset.heatLevel])}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full shrink-0", heatDot[asset.heatLevel])} />
            <span className="font-display font-bold text-sm text-foreground">{asset.symbol}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{asset.name}</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-medium text-sm text-foreground">
            {asset.currency}{asset.price.toLocaleString()}
          </p>
          <p className={cn(
            "text-xs font-mono font-medium",
            asset.change24h >= 0 ? "text-success" : "text-destructive"
          )}>
            {asset.change24h >= 0 ? "+" : ""}{asset.change24h}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">RSI</p>
          <p className={cn(
            "font-mono font-medium",
            asset.rsi >= 70 ? "text-destructive" : asset.rsi <= 30 ? "text-success" : "text-foreground"
          )}>{asset.rsi}</p>
        </div>
        <div>
          <p className="text-muted-foreground">MA乖離</p>
          <p className={cn(
            "font-mono font-medium",
            Math.abs(asset.maDeviation) >= 10 ? "text-warning" : "text-foreground"
          )}>{asset.maDeviation > 0 ? "+" : ""}{asset.maDeviation}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">出来高</p>
          <p className={cn(
            "font-mono font-medium",
            asset.volumeIncrease >= 100 ? "text-warning" : "text-foreground"
          )}>{asset.volumeIncrease > 0 ? "+" : ""}{asset.volumeIncrease}%</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { settings } = useApp();
  const [cryptoFG, setCryptoFG] = useState<MarketFearGreed | null>(null);
  const [stockFG, setStockFG] = useState<MarketFearGreed | null>(null);
  const [vix, setVix] = useState<VixData | null>(null);
  const [assets, setAssets] = useState<AssetHeatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (forceRefresh = false) => {
    setLoading(true);
    setError(false);
    if (forceRefresh) invalidateCache();
    try {
      const [cfg, sfg, vixData, assetData] = await Promise.allSettled([
        fetchCryptoFearGreed(),
        fetchStockFearGreed(),
        fetchVix(),
        fetchAllAssets(),
      ]);
      if (cfg.status === "fulfilled") setCryptoFG(cfg.value);
      if (sfg.status === "fulfilled") setStockFG(sfg.value);
      if (vixData.status === "fulfilled") setVix(vixData.value);
      if (assetData.status === "fulfilled") setAssets(assetData.value);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cryptoAssets = assets.filter((a) => a.type === "crypto");
  const usStocks = assets.filter((a) => a.type === "stock_us");
  const jpStocks = assets.filter((a) => a.type === "stock_jp");
  const commodities = assets.filter((a) => a.type === "commodity");

  const vixWarning = vix && vix.value >= settings.vixWarningLevel;
  const vixCritical = vix && vix.value >= settings.vixCriticalLevel;

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">市場の過熱度</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lastUpdated
              ? `${lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 更新`
              : "読み込み中…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <WifiOff className="w-4 h-4 text-destructive" />
          ) : (
            <Wifi className="w-4 h-4 text-success" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            更新
          </Button>
        </div>
      </div>

      {/* VIX Warning */}
      {vixCritical && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 mb-6">
          <p className="font-display font-bold text-destructive text-sm">
            VIX {vix?.value} — 市場が極度の恐怖状態です。新規エントリーは慎重に。
          </p>
        </div>
      )}
      {vixWarning && !vixCritical && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 mb-6">
          <p className="font-display font-bold text-warning text-sm">
            VIX {vix?.value} — 市場のボラティリティが上昇しています。
          </p>
        </div>
      )}

      {/* Fear & Greed + VIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <FearGreedGauge data={cryptoFG} label="暗号資産 Fear & Greed" />
        <FearGreedGauge data={stockFG} label="株式市場 Fear & Greed" />
        <VixCard data={vix} />
      </div>

      {/* Asset Heat Map */}
      <div>
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
          銘柄ヒートマップ
        </h2>
        <Tabs defaultValue="crypto">
          <TabsList className="bg-card/50 border border-border/30 mb-6">
            <TabsTrigger value="crypto">暗号資産</TabsTrigger>
            <TabsTrigger value="us">米国株</TabsTrigger>
            <TabsTrigger value="jp">日本株</TabsTrigger>
            <TabsTrigger value="commodity">コモディティ</TabsTrigger>
          </TabsList>

          {[
            { value: "crypto", data: cryptoAssets },
            { value: "us", data: usStocks },
            { value: "jp", data: jpStocks },
            { value: "commodity", data: commodities },
          ].map(({ value, data }) => (
            <TabsContent key={value} value={value}>
              {loading && data.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-border/30 bg-card/50 p-4 animate-pulse h-32" />
                  ))}
                </div>
              ) : data.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">データがありません</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.map((asset) => (
                    <motion.div
                      key={asset.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AssetCard asset={asset} />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
