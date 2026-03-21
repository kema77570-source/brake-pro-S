import React from 'react';
import { RefreshCw, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlacedOrder } from '@/lib/orderSystem/types';

interface OrderListProps {
  orders: PlacedOrder[];
  onCancel: (id: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function OrderList({ orders, onCancel, onRefresh, loading }: OrderListProps) {
  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">注文を取得中...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">本日の注文はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div 
          key={order.order_id} 
          className="p-4 rounded-xl border border-border/30 bg-background/40 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                order.side === 'BUY' ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
              )}>
                {order.side === 'BUY' ? '買い' : '売り'}
              </span>
              <span className="text-xs font-bold">{order.code}</span>
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              order.status === 'FILLED' ? "text-success" : 
              order.status === 'CANCELLED' ? "text-muted-foreground" : "text-primary"
            )}>
              {order.status}
            </span>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-mono">{order.order_id}</p>
              <p className="text-xs font-medium">
                {order.qty} 株 @ {order.price || '成行'}
              </p>
            </div>
            
            {['SUBMITTED', 'PENDING', 'PARTIAL_FILLED'].includes(order.status) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onCancel(order.order_id)}
                className="h-7 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-3 h-3 mr-1" />
                取り消し
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
