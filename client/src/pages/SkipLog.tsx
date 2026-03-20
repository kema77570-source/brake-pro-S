// BRAKE Pro — SkipLog Page
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Plus, BookMarked, CheckCircle, XCircle, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getSkipLog, addSkipEntry, updateSkipEntry, deleteSkipEntry } from "@/lib/storage";
import type { SkipLogEntry } from "@/lib/types";
import { toast } from "sonner";

const SKIP_REASONS = [
  "FOMO診断でリスクが高かった",
  "損切りラインを決められなかった",
  "リスクリワードが基準以下だった",
  "市場が過熱していた",
  "自分の感情が不安定だった",
  "十分な情報がなかった",
  "冷却時間後に興味が薄れた",
  "ルールに合致しなかった",
  "その他",
];

const VERDICT_OPTIONS = [
  { value: "good_skip", label: "見送り正解", icon: CheckCircle, color: "text-success border-success/30 bg-success/10" },
  { value: "missed_opportunity", label: "見送り失敗", icon: XCircle, color: "text-destructive border-destructive/30 bg-destructive/10" },
  { value: "neutral", label: "中立", icon: Minus, color: "text-muted-foreground border-border/30 bg-card/50" },
] as const;

export default function SkipLog() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefillTicker = params.get("ticker") ?? "";
  const prefillFomo = params.get("fomo") ?? "";

  const [entries, setEntries] = useState<SkipLogEntry[]>(() => getSkipLog());
  const [showAdd, setShowAdd] = useState(!!prefillTicker);
  const [selectedEntry, setSelectedEntry] = useState<SkipLogEntry | null>(null);

  // Add form state
  const [ticker, setTicker] = useState(prefillTicker);
  const [skipReason, setSkipReason] = useState("");
  const [infoSource, setInfoSource] = useState("");
  const [priceAtSkip, setPriceAtSkip] = useState("");
  const [fomoScore] = useState(prefillFomo ? parseInt(prefillFomo) : 0);

  // Reflection state
  const [reflection, setReflection] = useState("");
  const [priceAfter, setPriceAfter] = useState("");
  const [verdict, setVerdict] = useState<SkipLogEntry["verdict"]>(undefined);

  const refresh = () => setEntries(getSkipLog());

  const handleAdd = () => {
    if (!ticker || !skipReason) {
      toast.error("銘柄名と見送り理由を入力してください");
      return;
    }
    addSkipEntry({
      ticker,
      name: ticker,
      skipReason,
      infoSource,
      priceAtSkip,
      fomoScore,
    });
    refresh();
    setShowAdd(false);
    toast.success("見送りを記録しました");
    navigate("/skip-log");
  };

  const handleSaveReflection = () => {
    if (!selectedEntry) return;
    updateSkipEntry(selectedEntry.id, {
      reflection,
      priceAfter,
      verdict,
      reflectedAt: new Date().toISOString(),
    });
    refresh();
    setSelectedEntry(null);
    toast.success("振り返りを保存しました");
  };

  const handleDelete = (id: string) => {
    deleteSkipEntry(id);
    refresh();
    toast.info("記録を削除しました");
  };

  const openReflection = (entry: SkipLogEntry) => {
    setSelectedEntry(entry);
    setReflection(entry.reflection ?? "");
    setPriceAfter(entry.priceAfter ?? "");
    setVerdict(entry.verdict);
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">見送りログ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            見送った銘柄とその後の結果を記録する
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />記録する
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "見送り正解", value: entries.filter((e) => e.verdict === "good_skip").length, color: "text-success" },
          { label: "見送り失敗", value: entries.filter((e) => e.verdict === "missed_opportunity").length, color: "text-destructive" },
          { label: "未評価", value: entries.filter((e) => !e.verdict).length, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/30 bg-card/50 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={cn("font-display font-bold text-xl num", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <BookMarked className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">見送り記録がありません</p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            チェックフローで「見送りに記録」を選択すると自動で追加されます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const verdictInfo = VERDICT_OPTIONS.find((v) => v.value === entry.verdict);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/30 bg-card/50 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-foreground">{entry.ticker}</span>
                      {verdictInfo && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", verdictInfo.color)}>
                          {verdictInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.createdAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.fomoScore > 0 && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-mono",
                        entry.fomoScore >= 70 ? "bg-destructive/10 text-destructive" :
                        entry.fomoScore >= 50 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                      )}>
                        FOMO {entry.fomoScore}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground mb-3">{entry.skipReason}</p>
                {entry.priceAtSkip && (
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span>見送り時価格: <span className="font-mono text-foreground">{entry.priceAtSkip}</span></span>
                    {entry.priceAfter && (
                      <span>その後: <span className="font-mono text-foreground">{entry.priceAfter}</span></span>
                    )}
                  </div>
                )}
                {entry.reflection && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-border/30 pl-3 mb-3">
                    {entry.reflection}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReflection(entry)}
                    className="text-xs"
                  >
                    振り返りを記録
                  </Button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">見送りを記録</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">銘柄</label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="例: NVDA, BTC" className="bg-background/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">見送り理由</label>
              <div className="grid grid-cols-1 gap-1.5">
                {SKIP_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSkipReason(r)}
                    className={cn(
                      "text-left px-3 py-2 rounded-lg border text-sm transition-all",
                      skipReason === r
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/30 bg-background/30 text-muted-foreground hover:border-border/60"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">見送り時の価格（任意）</label>
              <Input value={priceAtSkip} onChange={(e) => setPriceAtSkip(e.target.value)} placeholder="例: 150.00" className="bg-background/50 font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">情報ソース（任意）</label>
              <Input value={infoSource} onChange={(e) => setInfoSource(e.target.value)} placeholder="例: Twitter, YouTube" className="bg-background/50" />
            </div>
            <Button onClick={handleAdd} className="w-full bg-primary hover:bg-primary/90">
              記録する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reflection Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="bg-card border-border/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedEntry?.ticker} の振り返り</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">その後の価格（任意）</label>
              <Input value={priceAfter} onChange={(e) => setPriceAfter(e.target.value)} placeholder="例: 180.00" className="bg-background/50 font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">評価</label>
              <div className="grid grid-cols-3 gap-2">
                {VERDICT_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setVerdict(v.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-medium transition-all",
                      verdict === v.value ? v.color : "border-border/30 bg-background/30 text-muted-foreground"
                    )}
                  >
                    <v.icon className="w-4 h-4" />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">振り返りメモ</label>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="見送って正解だったか？次回に活かせることは？"
                className="min-h-[100px] bg-background/50"
              />
            </div>
            <Button onClick={handleSaveReflection} className="w-full bg-primary hover:bg-primary/90">
              保存する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
