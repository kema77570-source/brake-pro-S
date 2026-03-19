import { useParams } from "wouter";
import { useStockPrice, useKlineData, useOrderBook } from "@/hooks/useMooMooAPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

interface KlineChartProps {
  data: any[];
}

function KlineChart({ data }: KlineChartProps) {
  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No chart data available</AlertDescription>
      </Alert>
    );
  }

  // Simple ASCII chart representation
  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice;

  return (
    <div className="space-y-4">
      <div className="h-64 bg-surface rounded-lg p-4 flex flex-col justify-between">
        <div className="flex items-end justify-between gap-1">
          {data.slice(-30).map((d, i) => {
            const height =
              range > 0
                ? ((d.close - minPrice) / range) * 100
                : 50;
            return (
              <div
                key={i}
                className="flex-1 bg-primary/50 rounded-t"
                style={{ height: `${height}%`, minHeight: "4px" }}
                title={`${d.time_key}: ¥${d.close.toFixed(2)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>¥{minPrice.toFixed(2)}</span>
          <span>¥{maxPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-sm text-muted">
        Showing last 30 days of data
      </div>
    </div>
  );
}

interface OrderBookDisplayProps {
  data: any;
}

function OrderBookDisplay({ data }: OrderBookDisplayProps) {
  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No order book data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bid Side */}
      <div>
        <h4 className="font-semibold text-foreground mb-3">Buy Orders</h4>
        <div className="space-y-1">
          {data.bid?.slice(0, 5).map((order: any, i: number) => (
            <div
              key={i}
              className="flex justify-between text-sm p-2 bg-success/10 rounded"
            >
              <span className="text-success font-semibold">
                ¥{order.price.toFixed(2)}
              </span>
              <span className="text-muted">{order.volume}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ask Side */}
      <div>
        <h4 className="font-semibold text-foreground mb-3">Sell Orders</h4>
        <div className="space-y-1">
          {data.ask?.slice(0, 5).map((order: any, i: number) => (
            <div
              key={i}
              className="flex justify-between text-sm p-2 bg-error/10 rounded"
            >
              <span className="text-error font-semibold">
                ¥{order.price.toFixed(2)}
              </span>
              <span className="text-muted">{order.volume}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StockDetail() {
  const params = useParams();
  const code = params?.code as string;

  const { data: quote, isLoading: isLoadingQuote, error: quoteError } =
    useStockPrice(code);
  const { data: klines, isLoading: isLoadingKlines } = useKlineData(code);
  const { data: orderbook, isLoading: isLoadingOrderbook } = useOrderBook(code);

  if (!code) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No stock code provided</AlertDescription>
      </Alert>
    );
  }

  if (isLoadingQuote) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (quoteError || !quote) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load stock data for {code}</AlertDescription>
      </Alert>
    );
  }

  const isPositive = quote.change_rate >= 0;
  const changeColor = isPositive ? "text-success" : "text-error";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">{code}</h1>
            <p className="text-muted">Stock Details</p>
          </div>
          {isPositive ? (
            <TrendingUp className="h-8 w-8 text-success" />
          ) : (
            <TrendingDown className="h-8 w-8 text-error" />
          )}
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">Current Price</p>
              <p className="text-3xl font-bold text-foreground">
                ¥{quote.price.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">Change</p>
              <p className={`text-3xl font-bold ${changeColor}`}>
                {isPositive ? "+" : ""}
                {quote.change_val.toFixed(2)}
              </p>
              <p className={`text-sm ${changeColor}`}>
                {isPositive ? "+" : ""}
                {quote.change_rate.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">High / Low</p>
              <p className="text-lg font-bold text-foreground">
                ¥{quote.high.toFixed(2)} / ¥{quote.low.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">Volume</p>
              <p className="text-lg font-bold text-foreground">
                {(quote.volume / 1000000).toFixed(2)}M
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chart */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Price Chart</h2>
        <Card className="border border-border">
          <CardContent className="p-6">
            {isLoadingKlines ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : (
              <KlineChart data={klines || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Book */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Order Book</h2>
        <Card className="border border-border">
          <CardContent className="p-6">
            {isLoadingOrderbook ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : (
              <OrderBookDisplay data={orderbook} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Details</h2>
        <Card className="border border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted mb-2">Turnover</p>
                <p className="font-semibold text-foreground">
                  ¥{(quote.turnover / 1000000000).toFixed(2)}B
                </p>
              </div>
              <div>
                <p className="text-sm text-muted mb-2">Last Updated</p>
                <p className="font-semibold text-foreground text-sm">
                  {new Date(quote.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted mb-2">Market</p>
                <p className="font-semibold text-foreground">
                  {code.split(".")[0]}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted mb-2">Status</p>
                <p className="font-semibold text-success">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
