// BRAKE Pro — Layout Component
// Design: Dark Financial × Neo-Brutalist
// Left sidebar (desktop) + Bottom tab nav (mobile)

import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShieldCheck,
  BookOpen,
  BookMarked,
  Bell,
  Settings,
  Activity,
  AlertTriangle,
  Clock,
  BarChart3,
  TrendingUp,
  Zap,
  Calendar,
  BarChart2,
  Target,
  User,
  Trophy,
  FlaskConical,
  Wifi,
  PiggyBank,
  Dumbbell,
  Microscope,
  SendHorizonal,
} from "lucide-react";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import HoldingDeadlineBanner from "@/components/HoldingDeadlineBanner";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "ホーム" },
  { href: "/check", icon: ShieldCheck, label: "チェック" },
  { href: "/dashboard", icon: Activity, label: "市場" },
  { href: "/trades", icon: BookOpen, label: "トレード" },
  { href: "/skip-log", icon: BookMarked, label: "見送り" },
  { href: "/goals", icon: Target, label: "目標" },
  { href: "/profile", icon: User, label: "プロフィール" },
  { href: "/titles", icon: Trophy, label: "称号" },
  { href: "/report", icon: BarChart3, label: "レポート" },
  { href: "/monthly", icon: Calendar, label: "月次" },
  { href: "/day-analysis", icon: TrendingUp, label: "曜日分析" },
  { href: "/comparison", icon: BarChart2, label: "比較分析" },
  { href: "/analysis", icon: TrendingUp, label: "銀柄分析" },
  { href: "/time-analysis", icon: Clock, label: "時間帯分析" },
  { href: "/alarms", icon: Bell, label: "アラーム" },
  { href: "/settings", icon: Settings, label: "設定" },
  { href: "/backtest", icon: TrendingUp, label: "バックテスト" },
  { href: "/paper", icon: FlaskConical, label: "模擬取引" },
  { href: "/connect", icon: Wifi, label: "moomoo接続" },
  { href: "/lead-lag",       icon: TrendingUp,     label: "日米リードラグ" },
  { href: "/stock-analysis", icon: Microscope,       label: "銘柄分析Pro" },
  { href: "/nisa",           icon: PiggyBank,       label: "NISA管理" },
  { href: "/grip",           icon: Dumbbell,        label: "握力選手権" },
  { href: "/notifications",  icon: Bell,            label: "通知設定" },
  { href: "/order-manager", icon: SendHorizonal,   label: "注文管理" },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { suspended, suspendedUntil, lossStreak, hrWarning, settings } = useApp();
  const { isConnected } = useUserAuth();

  const streakWarning = lossStreak.currentStreak >= settings.streakSuspend1Count;
  const hasAlert = suspended || hrWarning || streakWarning;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
        <div className="flex flex-col h-full border-r border-border/50 bg-sidebar">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-bold text-foreground text-sm tracking-wide">BRAKE Pro</h1>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  トレード心理管理
                  {isConnected && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
                      <Wifi className="w-2.5 h-2.5" />moomoo
                    </span>
                  )}
                </p>
              </div>
              <NotificationBell />
            </div>
          </div>

          {/* Alert Banner */}
          {hasAlert && (
            <div className={cn(
              "mx-3 mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2",
              suspended
                ? "bg-destructive/15 border border-destructive/30 text-destructive"
                : hrWarning
                ? "bg-warning/15 border border-warning/30 text-warning"
                : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
            )}>
              {suspended ? (
                <>
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>トレード停止中</span>
                </>
              ) : hrWarning ? (
                <>
                  <Activity className="w-3 h-3 shrink-0" />
                  <span>心拍数警告</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{lossStreak.currentStreak}連敗注意</span>
                </>
              )}
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.href === "/alarms" && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Streak indicator */}
          <div className="px-4 py-4 border-t border-border/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>連敗ストリーク</span>
              <span className={cn(
                "font-mono font-bold",
                lossStreak.currentStreak >= settings.streakSuspend2Count ? "text-destructive" :
                lossStreak.currentStreak >= settings.streakSuspend1Count ? "text-warning" :
                "text-foreground"
              )}>
                {lossStreak.currentStreak} / {settings.streakSuspend2Count}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  lossStreak.currentStreak >= settings.streakSuspend2Count ? "bg-destructive" :
                  lossStreak.currentStreak >= settings.streakSuspend1Count ? "bg-warning" :
                  "bg-primary"
                )}
                style={{ width: `${Math.min(100, (lossStreak.currentStreak / settings.streakSuspend2Count) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:pl-60 pb-20 lg:pb-0 min-h-screen">
        <HoldingDeadlineBanner />
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border/50 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.slice(0, 6).map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
