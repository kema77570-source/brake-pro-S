import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ============================================================================
// Types
// ============================================================================

export interface QuoteData {
  code: string;
  price: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  change_val: number;
  change_rate: number;
  timestamp: string;
}

export interface KlineData {
  code: string;
  time_key: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
}

export interface OrderBookData {
  code: string;
  bid: Array<{ price: number; volume: number }>;
  ask: Array<{ price: number; volume: number }>;
}

export interface PortfolioHolding {
  code: string;
  quantity: number;
  cost_price: number;
  current_price: number;
  pnl: number;
  pnl_rate: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  pnl_rate: number;
  holdings: PortfolioHolding[];
}

export interface TradeOrder {
  order_id: number;
  code: string;
  quantity: number;
  price: number;
  side: "BUY" | "SELL";
  status: string;
  created_at: string;
}

// ============================================================================
// API Client
// ============================================================================

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ============================================================================
// Quote API Hooks
// ============================================================================

/**
 * Get current stock price
 */
export function useStockPrice(code: string) {
  return useQuery({
    queryKey: ["quote", "current", code],
    queryFn: async () => {
      const response = await apiClient.get<QuoteData>("/api/quote/current", {
        params: { code },
      });
      return response.data;
    },
    enabled: !!code,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000, // Consider data stale after 2 seconds
  });
}

/**
 * Get K-line data
 */
export function useKlineData(
  code: string,
  ktype: string = "K_DAY",
  days: number = 30
) {
  return useQuery({
    queryKey: ["quote", "kline", code, ktype, days],
    queryFn: async () => {
      const response = await apiClient.get<KlineData[]>("/api/quote/kline", {
        params: { code, ktype, days },
      });
      return response.data;
    },
    enabled: !!code,
    refetchInterval: 60000, // Refetch every 1 minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

/**
 * Get order book data
 */
export function useOrderBook(code: string) {
  return useQuery({
    queryKey: ["quote", "orderbook", code],
    queryFn: async () => {
      const response = await apiClient.get<OrderBookData>(
        "/api/quote/orderbook",
        {
          params: { code },
        }
      );
      return response.data;
    },
    enabled: !!code,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 2000,
  });
}

/**
 * Get basic stock information
 */
export function useStockBasicInfo(market: string = "HK") {
  return useQuery({
    queryKey: ["quote", "basicinfo", market],
    queryFn: async () => {
      const response = await apiClient.get("/api/quote/basicinfo", {
        params: { market },
      });
      return response.data;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000,
  });
}

// ============================================================================
// Portfolio API Hooks
// ============================================================================

/**
 * Get portfolio holdings list
 */
export function usePortfolioList() {
  return useQuery({
    queryKey: ["portfolio", "list"],
    queryFn: async () => {
      const response = await apiClient.get<PortfolioHolding[]>(
        "/api/portfolio/list"
      );
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });
}

/**
 * Get portfolio summary
 */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: async () => {
      const response = await apiClient.get<PortfolioSummary>(
        "/api/portfolio/summary"
      );
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });
}

/**
 * Add holding to portfolio
 */
export function useAddHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      quantity: number;
      cost_price: number;
    }) => {
      const response = await apiClient.post<PortfolioHolding>(
        "/api/portfolio/add",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

/**
 * Update holding in portfolio
 */
export function useUpdateHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      quantity: number;
      cost_price?: number;
    }) => {
      const response = await apiClient.put<PortfolioHolding>(
        `/api/portfolio/${data.code}`,
        {
          quantity: data.quantity,
          cost_price: data.cost_price,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

/**
 * Delete holding from portfolio
 */
export function useDeleteHolding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await apiClient.delete(`/api/portfolio/${code}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

// ============================================================================
// Trade API Hooks
// ============================================================================

/**
 * Place a trade order
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      quantity: number;
      price: number;
      side: "BUY" | "SELL";
    }) => {
      const response = await apiClient.post<TradeOrder>(
        "/api/trade/place-order",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade", "order-list"] });
    },
  });
}

/**
 * Get order list
 */
export function useOrderList() {
  return useQuery({
    queryKey: ["trade", "order-list"],
    queryFn: async () => {
      const response = await apiClient.get<TradeOrder[]>(
        "/api/trade/order-list"
      );
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });
}

// ============================================================================
// Health Check Hook
// ============================================================================

/**
 * Check API health
 */
export function useAPIHealth() {
  return useQuery({
    queryKey: ["api", "health"],
    queryFn: async () => {
      const response = await apiClient.get("/health");
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
}
