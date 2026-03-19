// BRAKE Pro — Payload Mapper
// Converts OrderFormState into the exact POST body for /api/trade/place-order.
// Centralised so UI never constructs raw payloads directly.

import type { OrderFormState } from "./types";
import { ORDER_TYPE_META } from "./capabilityMatrix";

const MAX_REMARK_BYTES = 64;

function truncateToBytes(str: string, maxBytes: number): string {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const bytes = enc.encode(str);
  if (bytes.length <= maxBytes) return str;
  return dec.decode(bytes.slice(0, maxBytes));
}

export interface MoomooPayload {
  code: string;
  quantity: number;
  side: "BUY" | "SELL";
  order_type: string;
  // Conditionally present:
  price?: number;
  trigger_price?: number;
  trail_amount?: number;
  trail_type?: "AMOUNT" | "PERCENT";
  limit_offset?: number;
  trd_env?: "REAL" | "SIMULATE";
  time_in_force?: string;
  fill_outside_rth?: boolean;
  remark?: string;
  acc_id?: string;
}

export function mapToPayload(form: OrderFormState): MoomooPayload {
  if (!form.security) throw new Error("No security selected");

  const meta = ORDER_TYPE_META[form.orderType];
  const qty = parseInt(form.qty);
  if (isNaN(qty) || qty <= 0) throw new Error("Invalid quantity");

  const payload: MoomooPayload = {
    code: form.security.code,
    quantity: qty,
    side: form.side,
    order_type: form.orderType,
    trd_env: form.tradeEnv,
    time_in_force: form.timeInForce,
    remark: form.remark ? truncateToBytes(form.remark, MAX_REMARK_BYTES) : undefined,
    acc_id: form.accId || undefined,
  };

  // Price — also send 0 for market orders (moomoo SDK safety requirement)
  if (meta?.needsPrice && form.price) {
    payload.price = parseFloat(form.price);
  } else if (meta?.isMarket) {
    // Explicitly send price=0 for market orders per moomoo SDK convention
    payload.price = 0;
  }

  // Trigger price (aux_price in moomoo terms)
  if (meta?.needsAuxPrice && form.auxPrice) {
    payload.trigger_price = parseFloat(form.auxPrice);
  }

  // Trail
  if (meta?.needsTrail && form.trailValue) {
    payload.trail_amount = parseFloat(form.trailValue);
    payload.trail_type = form.trailType;
  }

  // Trail spread (limit offset for TRAILING_STOP_LIMIT)
  if (meta?.needsTrailSpread && form.trailSpread) {
    payload.limit_offset = parseFloat(form.trailSpread);
  }

  // Session-related (US only)
  if (form.fillOutsideRth) {
    payload.fill_outside_rth = true;
  }

  return payload;
}
