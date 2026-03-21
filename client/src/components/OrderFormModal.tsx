// BRAKE Pro — OrderFormModal
// Goal-based order wizard modal.
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import OrderWizardContainer from "./OrderWizard/OrderWizardContainer";

interface OrderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (orderResult: any) => void;
  ticker: string;
  name?: string;
  side: "BUY" | "SELL";
}

export default function OrderFormModal({
  open,
  onClose,
  onSuccess,
  ticker,
  name,
  side,
}: OrderFormModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full max-w-2xl bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  side === "BUY" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                }`}>
                  {side === "BUY" ? "買い" : "売り"}
                </span>
                <span className="font-display font-bold text-lg text-foreground">{ticker}</span>
                {name && <span className="text-xs text-muted-foreground">{name}</span>}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">
                Order Wizard — Secure Execution
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Wizard Content */}
          <div className="max-h-[80vh] overflow-y-auto">
            <OrderWizardContainer
              ticker={ticker}
              side={side}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
