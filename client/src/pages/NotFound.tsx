import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">ページが見つかりません</p>
        <Button onClick={() => navigate("/")} className="mt-6 bg-primary hover:bg-primary/90">
          ホームに戻る
        </Button>
      </div>
    </div>
  );
}
