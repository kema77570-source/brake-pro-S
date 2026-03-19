// BRAKE Pro — moomoo Order System: Type Definitions
// Covers all moomoo OpenAPI order types, markets, and account structures.

export type ProductCategory = "stock" | "etf" | "warrant" | "stock_option" | "index_option";
export type Market = "US" | "HK" | "SH" | "SZ" | "JP";
export type MooOrderType =
  | "MARKET"
  | "LIMIT"
  | "STOP"
  | "STOP_LIMIT"
  | "MARKET_IF_TOUCHED"
  | "LIMIT_IF_TOUCHED"
  | "TRAILING_STOP"
  | "TRAILING_STOP_LIMIT"
  | "AT_AUCTION_LIMIT"
  | "AT_AUCTION_MARKET"
  | "ABSOLUTE_LIMIT"
  | "SPECIAL_LIMIT";
export type TradeSide = "BUY" | "SELL";
export type TradeEnv = "REAL" | "SIMULATE";
export type TimeInForce = "DAY" | "GTC" | "GTD" | "IOC" | "FOK";
export type Session = "REGULAR" | "PRE_MARKET" | "AFTER_HOURS";
export type TrailType = "AMOUNT" | "PERCENT";
export type OrderStatus =
  | "SUBMITTED"
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "CANCELLED"
  | "FAILED"
  | "PENDING"
  | "SIMULATED";
export type ValidationSeverity = "fatal" | "warning" | "info";

// ── Security ──────────────────────────────────────────────────────────────────
export interface SecurityInfo {
  code: string;       // moomoo code e.g. "US.AAPL"
  ticker: string;     // display ticker e.g. "AAPL"
  name: string;
  market: Market;
  type: ProductCategory;
  lotSize?: number;   // minimum tradeable lot
}

// ── Order Form ────────────────────────────────────────────────────────────────
export interface OrderFormState {
  security: SecurityInfo | null;
  side: TradeSide;
  qty: string;
  orderType: MooOrderType;
  price: string;
  auxPrice: string;       // trigger price for STOP/TOUCHED orders
  trailType: TrailType;
  trailValue: string;     // trail width (amount or %)
  trailSpread: string;    // limit offset for TRAILING_STOP_LIMIT
  timeInForce: TimeInForce;
  session: Session;
  fillOutsideRth: boolean;
  tradeEnv: TradeEnv;
  remark: string;
  accId: string;
}

export const DEFAULT_ORDER_FORM: OrderFormState = {
  security: null,
  side: "BUY",
  qty: "100",
  orderType: "LIMIT",
  price: "",
  auxPrice: "",
  trailType: "AMOUNT",
  trailValue: "",
  trailSpread: "",
  timeInForce: "DAY",
  session: "REGULAR",
  fillOutsideRth: false,
  tradeEnv: "SIMULATE",
  remark: "",
  accId: "",
};

// ── Validation ────────────────────────────────────────────────────────────────
export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
  retryable: boolean;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;         // true only if no fatal issues
  issues: ValidationIssue[];
}

// ── Preview ───────────────────────────────────────────────────────────────────
export interface OrderPreview {
  security: SecurityInfo;
  side: TradeSide;
  qty: number;
  orderType: MooOrderType;
  price?: number;
  auxPrice?: number;
  trailValue?: number;
  trailSpread?: number;
  trailType?: TrailType;
  timeInForce: TimeInForce;
  session: Session;
  fillOutsideRth: boolean;
  tradeEnv: TradeEnv;
  remark: string;
  estimatedNotional?: number;   // qty × price where available
  canModify: boolean;
  canCancel: boolean;
}

// ── Placed Order ──────────────────────────────────────────────────────────────
export interface PlacedOrder {
  orderId: string;
  moomooOrderId?: string;
  code: string;
  side: TradeSide;
  qty: number;
  price?: number;
  orderType: MooOrderType;
  status: OrderStatus;
  filledQty: number;
  avgFillPrice?: number;
  createdAt: string;
  updatedAt: string;
  tradeEnv: TradeEnv;
  remark?: string;
}

// ── Account ───────────────────────────────────────────────────────────────────
export interface AccountInfo {
  accId: string;
  accType: string;
  currency: string;
  tradeEnv: TradeEnv;
  marketAuth: Market[];
}

// ── Capability Matrix ─────────────────────────────────────────────────────────
export interface CapabilityMatrix {
  market: Market;
  productType: ProductCategory;
  supportedOrderTypes: MooOrderType[];
  canModify: boolean;
  canCancel: boolean;
  canEnable: boolean;
  canDisable: boolean;
  canDelete: boolean;
  supportsFillOutsideRth: boolean;
  supportsSession: boolean;
  supportsTimeInForce: TimeInForce[];
}
