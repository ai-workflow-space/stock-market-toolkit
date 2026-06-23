import type { Signal, SignalDirection, SignalType } from "../types";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

interface SignalCardProps {
  signal: Signal;
  onDismiss?: (id: string) => void;
}

const SIGNAL_ICONS: Record<SignalDirection, string> = {
  bullish: "\uD83D\uDCC8",
  bearish: "\uD83D\uDCC9",
  neutral: "\u2796",
};

const SIGNAL_COLORS: Record<SignalDirection, "default" | "destructive" | "secondary"> = {
  bullish: "default",
  bearish: "destructive",
  neutral: "secondary",
};

const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  rsi_oversold: "RSI Oversold",
  rsi_overbought: "RSI Overbought",
  macd_cross: "MACD Cross",
  sma_cross: "SMA Cross",
  bb_touch: "Bollinger Band",
  volume_spike: "Volume Spike",
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StrengthBar({ strength }: { strength: number }) {
  const color = strength >= 70 ? "bg-green-500" : strength >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-[60px] h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${strength}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{strength}%</span>
    </div>
  );
}

export default function SignalCard({ signal, onDismiss }: SignalCardProps) {
  const icon = SIGNAL_ICONS[signal.direction];
  const badgeVariant = SIGNAL_COLORS[signal.direction];
  const typeLabel = SIGNAL_TYPE_LABELS[signal.signal_type];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className="font-bold text-base">{signal.symbol}</span>
            <Badge variant={badgeVariant}>{typeLabel}</Badge>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={() => onDismiss(signal.id)}
              aria-label="Dismiss signal"
            >
              &times;
            </Button>
          )}
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-0.5">Price</p>
            <p className="font-semibold">${formatPrice(signal.price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase mb-0.5">Signal Strength</p>
            <StrengthBar strength={signal.strength} />
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
          {signal.description}
        </p>

        <p className="text-xs text-muted-foreground">
          {formatTime(signal.timestamp)}
        </p>
      </CardContent>
    </Card>
  );
}
