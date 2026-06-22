import { useState, useEffect, useCallback } from "react";
import SignalCard from "../components/SignalCard";
import type { Signal } from "../types";

/* ─── Mock signals for demonstration ─── */
function generateMockSignals(symbols: string[]): Signal[] {
  const now = new Date();
  const signals: Signal[] = [];
  
  const signalTypes: Signal["signal_type"][] = [
    "rsi_oversold", "rsi_overbought", "macd_cross", "sma_cross", "bb_touch", "volume_spike"
  ];
  
  symbols.forEach((symbol, idx) => {
    const signalType = signalTypes[idx % signalTypes.length];
    let direction: Signal["direction"];
    
    if (signalType === "rsi_oversold") {
      direction = "bullish";
    } else if (signalType === "rsi_overbought") {
      direction = "bearish";
    } else if (signalType === "macd_cross") {
      direction = idx % 2 === 0 ? "bullish" : "bearish";
    } else if (signalType === "sma_cross") {
      direction = idx % 2 === 0 ? "bullish" : "bearish";
    } else if (signalType === "bb_touch") {
      direction = "neutral";
    } else {
      direction = idx % 3 === 0 ? "bullish" : idx % 3 === 1 ? "bearish" : "neutral";
    }
    
    signals.push({
      id: `sig-${idx}`,
      symbol,
      direction,
      signal_type: signalType,
      price: 150 + Math.random() * 100,
      timestamp: new Date(now.getTime() - idx * 3600000).toISOString(),
      strength: 40 + Math.floor(Math.random() * 60),
      description: getSignalDescription(signalType, direction),
    });
  });
  
  return signals;
}

function getSignalDescription(signalType: Signal["signal_type"], direction: Signal["direction"]): string {
  const descriptions: Record<Signal["signal_type"], { bullish: string; bearish: string; neutral: string }> = {
    rsi_oversold: {
      bullish: "RSI indicates oversold conditions, potential bounce expected",
      bearish: "RSI oversold but momentum remains weak",
      neutral: "RSI at oversold levels",
    },
    rsi_overbought: {
      bullish: "RSI overbought but bullish momentum continues",
      bearish: "RSI indicates overbought conditions, pullback likely",
      neutral: "RSI at overbought levels",
    },
    macd_cross: {
      bullish: "MACD line crossed above signal line, bullish momentum building",
      bearish: "MACD line crossed below signal line, bearish momentum building",
      neutral: "MACD crossing signal line",
    },
    sma_cross: {
      bullish: "Short-term SMA crossed above long-term SMA, golden cross formation",
      bearish: "Short-term SMA crossed below long-term SMA, death cross formation",
      neutral: "SMA crossover detected",
    },
    bb_touch: {
      bullish: "Price touched lower Bollinger Band, potential support bounce",
      bearish: "Price touched upper Bollinger Band, potential resistance",
      neutral: "Price at Bollinger Band boundary",
    },
    volume_spike: {
      bullish: "Unusual volume spike with price increase, institutional interest",
      bearish: "Unusual volume spike with price decrease, distribution day",
      neutral: "Unusual volume activity detected",
    },
  };
  
  return descriptions[signalType][direction];
}

/* ─── Dashboard Page ─── */
export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading signals
    const timer = setTimeout(() => {
      setSignals(generateMockSignals(["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"]));
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleDismissSignal = useCallback((id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id));
  }, []);

  const bullishSignals = signals.filter(s => s.direction === "bullish");
  const bearishSignals = signals.filter(s => s.direction === "bearish");
  const neutralSignals = signals.filter(s => s.direction === "neutral");

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="loading-screen">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#e2e8f0", fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Trading Signals
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Real-time signals based on technical indicators
          </p>
        </div>

        {/* Signal Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div className="info-card" style={{ borderLeft: "3px solid #22c55e" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Bullish Signals
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>
              {bullishSignals.length}
            </div>
          </div>
          <div className="info-card" style={{ borderLeft: "3px solid #ef4444" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Bearish Signals
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>
              {bearishSignals.length}
            </div>
          </div>
          <div className="info-card" style={{ borderLeft: "3px solid #3b82f6" }}>
            <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Neutral Signals
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>
              {neutralSignals.length}
            </div>
          </div>
        </div>

        {/* Signals Grid */}
        {signals.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
            <div style={{ color: "#94a3b8", marginBottom: "1rem" }}>No signals available</div>
            <p style={{ color: "#475569", fontSize: "0.875rem" }}>
              Signals will appear here when technical indicators trigger alerts
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {signals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onDismiss={handleDismissSignal}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: "2rem", padding: "1rem", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
            <strong>Disclaimer:</strong> These signals are generated by technical indicators and should not be considered financial advice. 
            Always do your own research before making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}