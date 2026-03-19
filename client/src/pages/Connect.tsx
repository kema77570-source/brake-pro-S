// BRAKE Pro — Connect Page
// ゲスト / moomoo 接続選択（既存UIスタイルを踏襲）

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ShieldCheck, Wifi, WifiOff, ExternalLink, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const MOOMOO_AFFILIATE_URL = import.meta.env.VITE_MOOMOO_AFFILIATE_URL || "https://www.moomoo.com/jp";

const GUEST_FEATURES = [
  "FOMO検知・チェックフロー",
  "トレード記録・振り返り",
  "週次・月次パフォーマンス分析",
  "曜日・時間帯別分析",
  "ペーパートレード（模擬取引）",
  "バックテスト（Yahooファイナンスデータ）",
  "目標設定・バッジ管理",
];

const MOOMOO_EXTRA = [
  "リアルタイム株価・板情報",
  "大口投資家動向・空売りデータ",
  "VWAP乖離・出来高急増アルゴリズム",
  "寄り付きレンジ・板変化検知",
  "自動売買シグナル通知",
  "moomoo口座データ連携",
];

export default function Connect() {
  const [, navigate] = useLocation();
  const { userType, setGuest, setMoomoo, disconnect, isConnected } = useUserAuth();
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"ok" | "error" | null>(null);

  async function handleMoomooConnect() {
    setChecking(true);
    setCheckResult(null);
    try {
      await axios.get(`${API_BASE}/health`, { timeout: 4000 });
      setMoomoo();
      setCheckResult("ok");
      setTimeout(() => navigate("/market"), 1000);
    } catch {
      setCheckResult("error");
    } finally {
      setChecking(false);
    }
  }

  function handleGuest() {
    setGuest();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">BRAKE Pro へようこそ</h1>
          <p className="text-muted-foreground text-sm">
            利用スタイルを選択してください。あとから変更できます。
          </p>
        </motion.div>

        {/* Options */}
        <div className="grid gap-4">
          {/* moomoo 接続 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "rounded-xl border p-5 space-y-4 transition-all",
              userType === "moomoo"
                ? "border-primary/50 bg-primary/10"
                : "border-border/50 bg-card hover:border-primary/30"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">moomoo証券と連携する</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    OpenD 経由でリアルタイムデータ・自動売買が使えます
                  </p>
                </div>
              </div>
              {userType === "moomoo" && (
                <span className="text-xs text-primary font-medium px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 shrink-0">
                  接続中
                </span>
              )}
            </div>

            <ul className="space-y-1.5">
              {[...GUEST_FEATURES, ...MOOMOO_EXTRA].slice(0, 5).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                  {f}
                </li>
              ))}
              {MOOMOO_EXTRA.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-primary">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="font-medium">{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2">
              {checkResult === "error" && (
                <p className="text-xs text-destructive">
                  OpenD に接続できません。moomoo OpenD が起動しているか確認してください（ポート 11111）。
                </p>
              )}
              {checkResult === "ok" && (
                <p className="text-xs text-primary">接続成功！ 市場ページへ移動します…</p>
              )}
              <Button
                onClick={handleMoomooConnect}
                disabled={checking}
                className="w-full"
                size="sm"
              >
                {checking ? "接続確認中…" : userType === "moomoo" ? "再接続する" : "moomoo OpenD に接続する"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              {userType === "moomoo" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => { disconnect(); }}
                >
                  接続を解除する
                </Button>
              )}
            </div>
          </motion.div>

          {/* ゲストモード */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "rounded-xl border p-5 space-y-4 transition-all",
              userType === "guest"
                ? "border-border bg-card"
                : "border-border/50 bg-card/50 hover:border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <h2 className="font-semibold text-foreground">moomooなしで使う</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  心理管理・記録・分析がすぐ使えます
                </p>
              </div>
            </div>

            <ul className="space-y-1.5">
              {GUEST_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button variant="outline" size="sm" className="w-full" onClick={handleGuest}>
              ゲストとして開始
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

          {/* アフィリエイト */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border/30 bg-card/30 p-4 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-medium text-foreground">moomooアカウントをお持ちでない方</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                新規口座開設でリアルタイムデータ連携が利用できます
              </p>
            </div>
            <a
              href={MOOMOO_AFFILIATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button variant="outline" size="sm" className="whitespace-nowrap gap-1">
                口座開設
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </motion.div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ログイン情報・パスワードはこのアプリに保存されません
        </p>
      </div>
    </div>
  );
}
