// BRAKE Pro — App Router
// Design: Dark Financial × Neo-Brutalist
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import Layout from "./components/Layout";

// Pages
import Home from "./pages/Home";
import CheckFlow from "./pages/CheckFlow";
import Dashboard from "./pages/Dashboard";
import TradeLog from "./pages/TradeLog";
import TradeDetail from "./pages/TradeDetail";
import SkipLog from "./pages/SkipLog";
import Alarms from "./pages/Alarms";
import Settings from "./pages/Settings";
import WeeklyReport from "./pages/WeeklyReport";
import TickerAnalysis from "./pages/TickerAnalysis";
import TimeOfDayAnalysis from "./pages/TimeOfDayAnalysis";
import MonthlyReport from "./pages/MonthlyReport";
import DayOfWeekAnalysis from "./pages/DayOfWeekAnalysis";
import ComparisonAnalysis from "./pages/ComparisonAnalysis";
import GoalTracking from "./pages/GoalTracking";
import Profile from "./pages/Profile";
import TitleShowcase from "./pages/TitleShowcase";
import MarketDashboard from "./pages/MarketDashboard";
import PortfolioPage from "./pages/PortfolioPage";
import StockDetail from "./pages/StockDetail";
import Connect from "./pages/Connect";
import Backtest from "./pages/Backtest";
import PaperTrade from "./pages/PaperTrade";
import LeadLagAnalysis from "./pages/LeadLagAnalysis";
import StockAnalysisPro from "./pages/StockAnalysisPro";
import NisaTracker from "./pages/NisaTracker";
import GripStrengthChampionship from "./pages/GripStrengthChampionship";
import NotificationSettings from "./pages/NotificationSettings";
import NotFound from "./pages/NotFound";
import StrategyReview from "./pages/StrategyReview";
import OrderManager from "./pages/OrderManager";
import AccountManager from "./pages/AccountManager";
import ChallengePage from "./pages/ChallengePage";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/check" component={CheckFlow} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/trades" component={TradeLog} />
        <Route path="/trades/:id" component={TradeDetail} />
        <Route path="/skip-log" component={SkipLog} />
        <Route path="/alarms" component={Alarms} />
        <Route path="/settings" component={Settings} />
        <Route path="/report" component={WeeklyReport} />
        <Route path="/analysis" component={TickerAnalysis} />
        <Route path="/time-analysis" component={TimeOfDayAnalysis} />
        <Route path="/monthly" component={MonthlyReport} />
        <Route path="/day-analysis" component={DayOfWeekAnalysis} />
        <Route path="/comparison" component={ComparisonAnalysis} />
        <Route path="/goals" component={GoalTracking} />
        <Route path="/profile" component={Profile} />
        <Route path="/titles" component={TitleShowcase} />
        <Route path="/market" component={MarketDashboard} />
        <Route path="/portfolio" component={PortfolioPage} />
        <Route path="/stock/:code" component={StockDetail} />
        <Route path="/connect" component={Connect} />
        <Route path="/backtest" component={Backtest} />
        <Route path="/paper" component={PaperTrade} />
        <Route path="/lead-lag" component={LeadLagAnalysis} />
        <Route path="/stock-analysis" component={StockAnalysisPro} />
        <Route path="/nisa" component={NisaTracker} />
        <Route path="/grip" component={GripStrengthChampionship} />
        <Route path="/notifications" component={NotificationSettings} />
        <Route path="/strategy-review/:tradeId" component={StrategyReview} />
        <Route path="/order-manager" component={OrderManager} />
        <Route path="/account" component={AccountManager} />
        <Route path="/challenge" component={ChallengePage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <UserAuthProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster richColors position="top-right" />
              <Router />
            </TooltipProvider>
          </AppProvider>
        </UserAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
