import { useState } from "react";
import { useStockPrice, useStockBasicInfo } from "@/hooks/useMooMooAPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

// Sample stock codes for display
const FEATURED_STOCKS = [
  { code: "HK.00700", name: "Tencent" },
  { code: "HK.02318", name: "Ping An" },
  { code: "HK.01398", name: "ICBC" },
  { code: "HK.00883", name: "CNOOC" },
];

interface StockCardProps {
  code: string;
  name: string;
}

function StockCard({ code, name }: StockCardProps) {
  const { data: quote, isLoading, error } = useStockPrice(code);

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardContent className="p-4 flex items-center justify-center h-32">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !quote) {
    return (
      <Card className="border border-border">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load {code}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isPositive = quote.change_rate >= 0;
  const changeColor = isPositive ? "text-success" : "text-error";
  const bgColor = isPositive ? "bg-success/10" : "bg-error/10";

  return (
    <Card className="border border-border hover:border-primary/50 transition-colors cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <p className="text-sm text-muted">{code}</p>
          </div>
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-success" />
          ) : (
            <TrendingDown className="h-5 w-5 text-error" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-3xl font-bold text-foreground">
            ¥{quote.price.toFixed(2)}
          </p>
          <p className={`text-sm font-semibold ${changeColor}`}>
            {isPositive ? "+" : ""}
            {quote.change_val.toFixed(2)} ({quote.change_rate.toFixed(2)}%)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted">High</p>
            <p className="font-semibold">¥{quote.high.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted">Low</p>
            <p className="font-semibold">¥{quote.low.toFixed(2)}</p>
          </div>
        </div>

        <div>
          <p className="text-muted text-xs">Volume</p>
          <p className="text-sm font-semibold">
            {(quote.volume / 1000000).toFixed(2)}M
          </p>
        </div>

        <p className="text-xs text-muted">
          Updated: {new Date(quote.timestamp).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

interface MarketIndicesProps {
  market: string;
}

function MarketIndices({ market }: MarketIndicesProps) {
  const indices: Record<string, string[]> = {
    HK: [
      { code: "HK.HSImain", name: "Hang Seng Index" },
      { code: "HK.HSCEI", name: "HSCEI" },
    ],
    US: [
      { code: "US.SPX", name: "S&P 500" },
      { code: "US.INDU", name: "Dow Jones" },
    ],
  };

  const marketIndices = indices[market] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {marketIndices.map((index) => (
        <StockCard
          key={index.code}
          code={index.code}
          name={index.name}
        />
      ))}
    </div>
  );
}

export default function MarketDashboard() {
  const [market, setMarket] = useState<"HK" | "US">("HK");
  const { data: basicInfo, isLoading: isLoadingBasicInfo } =
    useStockBasicInfo(market);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Market Dashboard
        </h1>
        <p className="text-muted">
          Real-time stock prices and market data from MooMoo API
        </p>
      </div>

      {/* Market Selection */}
      <div className="flex gap-2">
        {(["HK", "US"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              market === m
                ? "bg-primary text-background"
                : "bg-surface text-foreground hover:bg-surface/80"
            }`}
          >
            {m === "HK" ? "Hong Kong" : "United States"}
          </button>
        ))}
      </div>

      {/* Market Indices */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Market Indices
        </h2>
        <MarketIndices market={market} />
      </div>

      {/* Featured Stocks */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Featured Stocks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_STOCKS.map((stock) => (
            <StockCard
              key={stock.code}
              code={stock.code}
              name={stock.name}
            />
          ))}
        </div>
      </div>

      {/* Stock List */}
      {basicInfo && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            All Stocks ({market})
          </h2>
          {isLoadingBasicInfo ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-muted">
                      Code
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted">
                      Name
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-muted">
                      Lot Size
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {basicInfo.stocks?.slice(0, 20).map((stock: any) => (
                    <tr
                      key={stock.code}
                      className="border-b border-border hover:bg-surface/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Badge variant="outline">{stock.code}</Badge>
                      </td>
                      <td className="py-3 px-4">{stock.name}</td>
                      <td className="text-right py-3 px-4">{stock.lot_size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
