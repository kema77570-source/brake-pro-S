import { useState } from "react";
import {
  usePortfolioSummary,
  usePortfolioList,
  useAddHolding,
  useDeleteHolding,
} from "@/hooks/useMooMooAPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface AddHoldingFormProps {
  onClose: () => void;
}

function AddHoldingForm({ onClose }: AddHoldingFormProps) {
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const addHolding = useAddHolding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !quantity || !costPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await addHolding.mutateAsync({
        code,
        quantity: parseInt(quantity),
        cost_price: parseFloat(costPrice),
      });
      toast.success(`Added ${quantity} shares of ${code}`);
      onClose();
    } catch (error) {
      toast.error("Failed to add holding");
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Add Holding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted mb-2 block">
              Stock Code
            </label>
            <Input
              placeholder="e.g., HK.00700"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted mb-2 block">
              Quantity
            </label>
            <Input
              type="number"
              placeholder="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted mb-2 block">
              Cost Price
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="180.00"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={addHolding.isPending}
            >
              {addHolding.isPending ? <Spinner /> : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface HoldingRowProps {
  code: string;
  quantity: number;
  costPrice: number;
  currentPrice: number;
  pnl: number;
  pnlRate: number;
  onDelete: (code: string) => void;
}

function HoldingRow({
  code,
  quantity,
  costPrice,
  currentPrice,
  pnl,
  pnlRate,
  onDelete,
}: HoldingRowProps) {
  const isPositive = pnl >= 0;
  const textColor = isPositive ? "text-success" : "text-error";
  const bgColor = isPositive ? "bg-success/10" : "bg-error/10";

  return (
    <div className={`border-b border-border p-4 hover:${bgColor} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold text-foreground">{code}</p>
          <p className="text-sm text-muted">
            {quantity} shares @ ¥{costPrice.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => onDelete(code)}
          className="p-2 hover:bg-error/20 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4 text-error" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted">Current Price</p>
          <p className="font-semibold text-foreground">¥{currentPrice.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted">Total Value</p>
          <p className="font-semibold text-foreground">
            ¥{(currentPrice * quantity).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-muted">P&L</p>
          <p className={`font-semibold ${textColor}`}>¥{pnl.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted">Return</p>
          <p className={`font-semibold ${textColor}`}>
            {isPositive ? "+" : ""}
            {pnlRate.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const { data: summary, isLoading: isLoadingSummary } = usePortfolioSummary();
  const { data: holdings, isLoading: isLoadingHoldings } = usePortfolioList();
  const deleteHolding = useDeleteHolding();

  const handleDelete = async (code: string) => {
    try {
      await deleteHolding.mutateAsync(code);
      toast.success(`Deleted ${code}`);
    } catch (error) {
      toast.error("Failed to delete holding");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Portfolio</h1>
          <p className="text-muted">Manage your stock holdings</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Holding
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddHoldingForm onClose={() => setShowAddForm(false)} />
      )}

      {/* Summary */}
      {isLoadingSummary ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">Total Value</p>
              <p className="text-3xl font-bold text-foreground">
                ¥{summary.total_value.toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">Total Cost</p>
              <p className="text-3xl font-bold text-foreground">
                ¥{summary.total_cost.toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">P&L</p>
              <p
                className={`text-3xl font-bold ${
                  summary.total_pnl >= 0 ? "text-success" : "text-error"
                }`}
              >
                ¥{summary.total_pnl.toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted mb-2">Return</p>
              <p
                className={`text-3xl font-bold ${
                  summary.pnl_rate >= 0 ? "text-success" : "text-error"
                }`}
              >
                {summary.pnl_rate >= 0 ? "+" : ""}
                {summary.pnl_rate.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Holdings List */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Holdings</h2>

        {isLoadingHoldings ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : !holdings || holdings.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No holdings yet. Add your first holding to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="border border-border">
            <div className="divide-y divide-border">
              {holdings.map((holding) => (
                <HoldingRow
                  key={holding.code}
                  code={holding.code}
                  quantity={holding.quantity}
                  costPrice={holding.cost_price}
                  currentPrice={holding.current_price}
                  pnl={holding.pnl}
                  pnlRate={holding.pnl_rate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
