// ペーパートレード（模擬取引）— localStorage ベース実装

export interface PaperOrder {
  id: string;
  code: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt?: string;
  closePrice?: number;
  pnl?: number;
}

export interface PaperAccount {
  balance: number;       // 仮想残高（JPY）
  initialBalance: number;
  orders: PaperOrder[];
}

const KEY = "brake_paper_trade";
const DEFAULT_BALANCE = 1_000_000;

export function getPaperAccount(): PaperAccount {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: DEFAULT_BALANCE, initialBalance: DEFAULT_BALANCE, orders: [] };
}

function save(account: PaperAccount) {
  localStorage.setItem(KEY, JSON.stringify(account));
}

export function placePaperOrder(
  code: string,
  name: string,
  side: "BUY" | "SELL",
  quantity: number,
  price: number
): { ok: boolean; message: string } {
  const account = getPaperAccount();
  const cost = quantity * price;

  if (side === "BUY") {
    if (account.balance < cost) {
      return { ok: false, message: `残高不足: 必要 ¥${cost.toLocaleString()}、残高 ¥${account.balance.toLocaleString()}` };
    }
    account.balance -= cost;
  } else {
    const holding = getHolding(account, code);
    if (!holding || holding.quantity < quantity) {
      return { ok: false, message: `保有株不足: ${code} を ${quantity} 株保有していません` };
    }
  }

  const order: PaperOrder = {
    id: `paper_${Date.now()}`,
    code, name, side, quantity, price,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };
  account.orders.push(order);
  save(account);
  return { ok: true, message: `${side === "BUY" ? "買い" : "売り"}注文を執行しました` };
}

export function closePaperOrder(orderId: string, closePrice: number): { ok: boolean; message: string } {
  const account = getPaperAccount();
  const order = account.orders.find((o) => o.id === orderId && o.status === "OPEN");
  if (!order) return { ok: false, message: "注文が見つかりません" };

  const pnl = order.side === "BUY"
    ? (closePrice - order.price) * order.quantity
    : (order.price - closePrice) * order.quantity;

  order.status = "CLOSED";
  order.closedAt = new Date().toISOString();
  order.closePrice = closePrice;
  order.pnl = pnl;

  // 売り側の決済で残高を戻す
  if (order.side === "BUY") {
    account.balance += closePrice * order.quantity;
  } else {
    account.balance += order.price * order.quantity + pnl;
  }

  save(account);
  return { ok: true, message: `決済完了: PnL ¥${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}` };
}

export function resetPaperAccount() {
  save({ balance: DEFAULT_BALANCE, initialBalance: DEFAULT_BALANCE, orders: [] });
}

interface Holding { code: string; quantity: number; avgPrice: number }

export function getHoldings(account?: PaperAccount): Holding[] {
  const acc = account ?? getPaperAccount();
  const map: Record<string, { quantity: number; totalCost: number }> = {};
  for (const o of acc.orders) {
    if (o.status !== "OPEN") continue;
    if (!map[o.code]) map[o.code] = { quantity: 0, totalCost: 0 };
    if (o.side === "BUY") {
      map[o.code].quantity += o.quantity;
      map[o.code].totalCost += o.price * o.quantity;
    }
  }
  return Object.entries(map)
    .filter(([, v]) => v.quantity > 0)
    .map(([code, v]) => ({ code, quantity: v.quantity, avgPrice: v.totalCost / v.quantity }));
}

function getHolding(account: PaperAccount, code: string): Holding | null {
  return getHoldings(account).find((h) => h.code === code) ?? null;
}
