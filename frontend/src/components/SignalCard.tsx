import type { Signal, SignalDirection, SignalType } from "../types";

interface SignalCardProps {
  signal: Signal;
  onDismiss?: (id: string) => void;
}

const SIGNAL_ICONS: Record<SignalDirection, string> = {
  bullish: "📈",
  bearish: "📉",
  neutral: "➖",
};

const SIGNAL_COLORS: Record<SignalDirection, { bg: string; border: string; text: string }> = {
  bullish: { bg: "rgba(34, 197, 94, 0.1)", border: "#22c55e", text: "#22c55e" },
  bearish: { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", text: "#ef4444" },
  neutral: { bg: "rgba(59, 130, 246, 0.1)", border: "#3b82f6", text: "#3b82f6" },
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
  const color = strength >= 70 ? "#22c55e" : strength >= 40 ? "#eab308" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div
        style={{
          width: "60px",
          height: "6px",
          background: "#334155",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${strength}%`,
            height: "100%",
            background: color,
            borderRadius: "3px",
          }}
        />
      </div>
      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{strength}%</span>
    </div>
  );
}

export default function SignalCard({ signal, onDismiss }: SignalCardProps) {
  const colors = SIGNAL_COLORS[signal.direction];
  const icon = SIGNAL_ICONS[signal.direction];
  const typeLabel = SIGNAL_TYPE_LABELS[signal.signal_type];

  return (
    <div
      className="signal-card"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#f1f5f9" }}>
            {signal.symbol}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: colors.text,
              textTransform: "uppercase",
              background: "rgba(255,255,255,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {typeLabel}
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(signal.id)}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "1rem",
              padding: "0",
              lineHeight: 1,
            }}
            aria-label="Dismiss signal"
          >
            ×
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.2rem" }}>
            Price
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9" }}>
            ${formatPrice(signal.price)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.2rem" }}>
            Signal Strength
          </div>
          <StrengthBar strength={signal.strength} />
        </div>
      </div>

      <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.4 }}>
        {signal.description}
      </div>

      <div style={{ fontSize: "0.72rem", color: "#475569" }}>
        {formatTime(signal.timestamp)}
      </div>
    </div>
  );
}