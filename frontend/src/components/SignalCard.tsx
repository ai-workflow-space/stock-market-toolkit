import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import type { Signal, SignalDirection, SignalType } from "@/types";
import { fmt } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  signal: Signal;
  onDismiss?: (id: string) => void;
}

const DIRECTION_ICON = { bullish: TrendingUp, bearish: TrendingDown, neutral: Minus };
const DIRECTION_CLASS: Record<SignalDirection, string> = {
  bullish: "text-up",
  bearish: "text-down",
  neutral: "text-neutral",
};

const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  rsi_oversold: "RSI oversold",
  rsi_overbought: "RSI overbought",
  macd_cross: "MACD cross",
  sma_cross: "SMA cross",
  bb_touch: "Bollinger band",
  volume_spike: "Volume spike",
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StrengthBar({ strength }: { strength: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${strength}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{strength}%</span>
    </div>
  );
}

export default function SignalCard({ signal, onDismiss }: SignalCardProps) {
  const Icon = DIRECTION_ICON[signal.direction];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("size-4", DIRECTION_CLASS[signal.direction])} />
            <span className="text-base font-semibold">{signal.symbol}</span>
            <Badge variant="secondary">{SIGNAL_TYPE_LABELS[signal.signal_type]}</Badge>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={() => onDismiss(signal.id)}
              aria-label="Dismiss signal"
            >
              <X />
            </Button>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="mb-0.5 text-xs uppercase text-muted-foreground">Price</p>
            <p className="font-mono font-semibold tabular-nums">${fmt(signal.price)}</p>
          </div>
          <div className="text-right">
            <p className="mb-0.5 text-xs uppercase text-muted-foreground">Signal strength</p>
            <StrengthBar strength={signal.strength} />
          </div>
        </div>

        <p className="mb-2 text-sm leading-relaxed text-muted-foreground">{signal.description}</p>
        <p className="text-xs text-muted-foreground">{formatTime(signal.timestamp)}</p>
      </CardContent>
    </Card>
  );
}
