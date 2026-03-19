// BRAKE Pro — Capability Matrix
// Defines which order types and operations are available per market × product.
// Keeps UI from allowing impossible combinations before hitting the API.

import type { CapabilityMatrix, Market, MooOrderType, ProductCategory, TimeInForce } from "./types";

const ALL_TIF: TimeInForce[] = ["DAY", "GTC", "GTD", "IOC", "FOK"];
const BASIC_TIF: TimeInForce[] = ["DAY", "GTC", "IOC"];

const US_STOCK_TYPES: MooOrderType[] = [
  "MARKET", "LIMIT", "STOP", "STOP_LIMIT",
  "MARKET_IF_TOUCHED", "LIMIT_IF_TOUCHED",
  "TRAILING_STOP", "TRAILING_STOP_LIMIT",
];

const HK_STOCK_TYPES: MooOrderType[] = [
  "LIMIT", "MARKET",
  "AT_AUCTION_LIMIT", "AT_AUCTION_MARKET",
  "ABSOLUTE_LIMIT", "SPECIAL_LIMIT",
  "STOP", "STOP_LIMIT",
  "MARKET_IF_TOUCHED", "LIMIT_IF_TOUCHED",
  "TRAILING_STOP", "TRAILING_STOP_LIMIT",
];

// HK options do not support market orders
const HK_OPTION_TYPES: MooOrderType[] = [
  "LIMIT", "STOP_LIMIT", "LIMIT_IF_TOUCHED", "TRAILING_STOP_LIMIT",
];

const MATRIX: CapabilityMatrix[] = [
  // ── US Securities ─────────────────────────────────────────────────────────
  {
    market: "US", productType: "stock",
    supportedOrderTypes: US_STOCK_TYPES,
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: true, supportsSession: true,
    supportsTimeInForce: ALL_TIF,
  },
  {
    market: "US", productType: "etf",
    supportedOrderTypes: US_STOCK_TYPES,
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: true, supportsSession: true,
    supportsTimeInForce: ALL_TIF,
  },
  {
    market: "US", productType: "stock_option",
    supportedOrderTypes: US_STOCK_TYPES,
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: BASIC_TIF,
  },
  {
    market: "US", productType: "index_option",
    supportedOrderTypes: US_STOCK_TYPES,
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: BASIC_TIF,
  },
  // ── HK Securities ─────────────────────────────────────────────────────────
  {
    market: "HK", productType: "stock",
    supportedOrderTypes: HK_STOCK_TYPES,
    canModify: true, canCancel: true, canEnable: true, canDisable: true, canDelete: true,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: ["DAY", "GTC"],
  },
  {
    market: "HK", productType: "etf",
    supportedOrderTypes: HK_STOCK_TYPES,
    canModify: true, canCancel: true, canEnable: true, canDisable: true, canDelete: true,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: ["DAY", "GTC"],
  },
  {
    market: "HK", productType: "warrant",
    supportedOrderTypes: ["LIMIT", "MARKET", "AT_AUCTION_LIMIT"],
    canModify: true, canCancel: true, canEnable: true, canDisable: true, canDelete: true,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: ["DAY"],
  },
  {
    market: "HK", productType: "stock_option",
    supportedOrderTypes: HK_OPTION_TYPES,
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: ["DAY", "GTC"],
  },
  // ── JP (via SH/SZ proxy for now) ──────────────────────────────────────────
  {
    market: "JP", productType: "stock",
    supportedOrderTypes: ["LIMIT", "MARKET", "STOP", "STOP_LIMIT"],
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: ["DAY", "GTC"],
  },
  {
    market: "JP", productType: "etf",
    supportedOrderTypes: ["LIMIT", "MARKET", "STOP", "STOP_LIMIT"],
    canModify: true, canCancel: true, canEnable: false, canDisable: false, canDelete: false,
    supportsFillOutsideRth: false, supportsSession: false,
    supportsTimeInForce: ["DAY", "GTC"],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return capability for a given market + product, or a safe default. */
export function getCapability(market: Market, productType: ProductCategory): CapabilityMatrix {
  const found = MATRIX.find(
    (m) => m.market === market && m.productType === productType
  );
  // Safe default: US stock
  return found ?? MATRIX[0];
}

export function getSupportedOrderTypes(market: Market, productType: ProductCategory): MooOrderType[] {
  return getCapability(market, productType).supportedOrderTypes;
}

export function getOperations(market: Market, productType: ProductCategory) {
  const c = getCapability(market, productType);
  return {
    modify: c.canModify,
    cancel: c.canCancel,
    enable: c.canEnable,
    disable: c.canDisable,
    delete: c.canDelete,
  };
}

// ── Order type metadata ───────────────────────────────────────────────────────
export interface OrderTypeMeta {
  value: MooOrderType;
  label: string;
  labelJa: string;
  needsPrice: boolean;
  needsAuxPrice: boolean;
  needsTrail: boolean;
  needsTrailSpread: boolean;
  isMarket: boolean;
  riskLevel: "low" | "medium" | "high";
}

export const ORDER_TYPE_META: Record<MooOrderType, OrderTypeMeta> = {
  MARKET: {
    value: "MARKET", label: "Market", labelJa: "成行",
    needsPrice: false, needsAuxPrice: false, needsTrail: false, needsTrailSpread: false,
    isMarket: true, riskLevel: "high",
  },
  LIMIT: {
    value: "LIMIT", label: "Limit", labelJa: "指値",
    needsPrice: true, needsAuxPrice: false, needsTrail: false, needsTrailSpread: false,
    isMarket: false, riskLevel: "low",
  },
  STOP: {
    value: "STOP", label: "Stop (Market)", labelJa: "逆指値（成行）",
    needsPrice: false, needsAuxPrice: true, needsTrail: false, needsTrailSpread: false,
    isMarket: true, riskLevel: "high",
  },
  STOP_LIMIT: {
    value: "STOP_LIMIT", label: "Stop Limit", labelJa: "逆指値（指値）",
    needsPrice: true, needsAuxPrice: true, needsTrail: false, needsTrailSpread: false,
    isMarket: false, riskLevel: "medium",
  },
  MARKET_IF_TOUCHED: {
    value: "MARKET_IF_TOUCHED", label: "Market If Touched", labelJa: "トリガー（成行）",
    needsPrice: false, needsAuxPrice: true, needsTrail: false, needsTrailSpread: false,
    isMarket: true, riskLevel: "high",
  },
  LIMIT_IF_TOUCHED: {
    value: "LIMIT_IF_TOUCHED", label: "Limit If Touched", labelJa: "トリガー（指値）",
    needsPrice: true, needsAuxPrice: true, needsTrail: false, needsTrailSpread: false,
    isMarket: false, riskLevel: "medium",
  },
  TRAILING_STOP: {
    value: "TRAILING_STOP", label: "Trailing Stop", labelJa: "トレールストップ（成行）",
    needsPrice: false, needsAuxPrice: false, needsTrail: true, needsTrailSpread: false,
    isMarket: true, riskLevel: "high",
  },
  TRAILING_STOP_LIMIT: {
    value: "TRAILING_STOP_LIMIT", label: "Trailing Stop Limit", labelJa: "トレールストップ（指値）",
    needsPrice: false, needsAuxPrice: false, needsTrail: true, needsTrailSpread: true,
    isMarket: false, riskLevel: "medium",
  },
  AT_AUCTION_LIMIT: {
    value: "AT_AUCTION_LIMIT", label: "At Auction Limit", labelJa: "競売（指値）",
    needsPrice: true, needsAuxPrice: false, needsTrail: false, needsTrailSpread: false,
    isMarket: false, riskLevel: "low",
  },
  AT_AUCTION_MARKET: {
    value: "AT_AUCTION_MARKET", label: "At Auction Market", labelJa: "競売（成行）",
    needsPrice: false, needsAuxPrice: false, needsTrail: false, needsTrailSpread: false,
    isMarket: true, riskLevel: "medium",
  },
  ABSOLUTE_LIMIT: {
    value: "ABSOLUTE_LIMIT", label: "Absolute Limit", labelJa: "絶対指値（HK）",
    needsPrice: true, needsAuxPrice: false, needsTrail: false, needsTrailSpread: false,
    isMarket: false, riskLevel: "low",
  },
  SPECIAL_LIMIT: {
    value: "SPECIAL_LIMIT", label: "Special Limit", labelJa: "特別指値（HK）",
    needsPrice: true, needsAuxPrice: false, needsTrail: false, needsTrailSpread: false,
    isMarket: false, riskLevel: "low",
  },
};
