// BRAKE Pro — TickerSearchDropdown
// moomoo取り扱い銘柄のリアルタイム検索・予測変換コンポーネント
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface SecurityResult {
  code: string;
  ticker: string;
  name: string;
  market: string;
  type: string;
}

interface Props {
  value: string;
  onChange: (ticker: string, name: string) => void;
  placeholder?: string;
  className?: string;
}

const MARKET_BADGE: Record<string, string> = {
  US: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  HK: "bg-red-500/15 text-red-400 border-red-500/20",
  JP: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const TYPE_LABEL: Record<string, string> = {
  stock: "株式",
  etf: "ETF",
  warrant: "ワラント",
};

export default function TickerSearchDropdown({ value, onChange, placeholder, className }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SecurityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!selected) setQuery(value);
  }, [value, selected]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/quote/search`, { params: { q } });
      setSearchError(false);
      setResults(res.data.results ?? []);
      setOpen(true);
    } catch {
      setSearchError(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setSelected(false);
    setSearchError(false);
    // Propagate raw input immediately so parent tracks it
    onChange(val, "");
    // Debounce API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 280);
  };

  const handleSelect = (sec: SecurityResult) => {
    setQuery(sec.ticker);
    setSelected(true);
    setOpen(false);
    onChange(sec.ticker, sec.name);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "例: AAPL、7203、テンセント…"}
          className={cn(
            "w-full pl-9 pr-10 py-2.5 rounded-lg border border-border/40 bg-card/40",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary/50 focus:bg-card/60 transition-colors"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {searchError && !loading && (
        <div className="mt-1 flex items-center justify-between px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/5">
          <p className="text-xs text-destructive">検索に失敗しました</p>
          <button
            type="button"
            onClick={() => query.length >= 1 && search(query)}
            className="text-xs text-primary hover:text-primary/80 underline"
          >
            再試行
          </button>
        </div>
      )}

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {results.map((sec) => (
                <button
                  key={sec.code}
                  type="button"
                  onClick={() => handleSelect(sec)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground">{sec.ticker}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                        MARKET_BADGE[sec.market] ?? "bg-muted/20 text-muted-foreground border-border/20"
                      )}>
                        {sec.market}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {TYPE_LABEL[sec.type] ?? sec.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{sec.name}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border/20 bg-muted/5">
              <p className="text-[10px] text-muted-foreground">
                moomoo取り扱い銘柄 · {results.length}件
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
