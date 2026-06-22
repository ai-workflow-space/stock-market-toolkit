# External Services Documentation

## Yahoo Finance Integration

The Stock Market Toolkit relies entirely on **Yahoo Finance** as its primary data source for all stock market information. This document details how the integration works, its limitations, and usage patterns.

## Yahoo Finance Data Provider

### Overview

**Yahoo Finance** is a free, publicly accessible financial data service provided by Yahoo (now owned by Verizon Media). The Stock Market Toolkit accesses this data through the **`yfinance`** Python library.

### Data Available

| Category | Data Points | Example |
|----------|-------------|---------|
| **Price Data** | OHLCV, adjusted close, splits | `Open`, `High`, `Low`, `Close`, `Volume` |
| **Company Info** | Name, sector, industry, CEO | `shortName`, `sector`, `industry` |
| **Fundamentals** | Market cap, P/E ratios, dividends | `marketCap`, `trailingPE`, `dividendYield` |
| **Statistics** | 52-week range, beta, avg volume | `fiftyTwoWeekHigh`, `beta`, `averageVolume` |

### yfinance Library

**Version**: `1.4.1`

**Installation**:
```bash
pip install yfinance==1.4.1
```

**Key Classes**:

```python
import yfinance as yf

# Create a ticker object
ticker = yf.Ticker("AAPL")

# Fetch historical data
df = ticker.history(period="1mo", interval="1d", auto_adjust=True)

# Get company info
info = ticker.info

# Search for symbols
results = yf.search("Apple")
```

## Implementation Details

### Stock Data Endpoint

**File**: `backend/app/routes/stocks.py`

```python
@router.get("/api/stock/{symbol}", response_model=StockDataResponse)
async def get_stock(symbol: str, period: str = Query("1mo")):
    ticker = yf.Ticker(symbol.upper())
    
    # Interval mapping for different periods
    interval_map = {"1d": "5m", "5d": "15m"}
    interval = interval_map.get(period, "1d")
    
    df = ticker.history(
        period=period,
        interval=interval,
        auto_adjust=True  # Adjusts for splits/dividends
    )
    
    return StockDataResponse(
        symbol=symbol.upper(),
        timestamp=df.index.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        open=df["Open"].tolist(),
        high=df["High"].tolist(),
        low=df["Low"].tolist(),
        close=df["Close"].tolist(),
        volume=df["Volume"].tolist(),
    )
```

### Interval Strategy

| Period | Internal Interval | Rationale |
|--------|------------------|-----------|
| `1d` | `5m` | Intraday needs higher resolution |
| `5d` | `15m` | Short-term with adequate data points |
| `1w` | `1d` | Weekly data at daily resolution |
| `1mo`+ | `1d` | Monthly+ uses daily candles |

### Data Adjustments

The `auto_adjust=True` parameter ensures:
- **Stock Splits**: Prices are split-adjusted
- **Dividends**: Yields are normalized
- **Corporate Actions**: Historical prices reflect current shares outstanding

### Technical Indicators Calculation

**Library**: `pandas-ta` (version `0.4.71b0`)

Indicators are calculated server-side using `pandas_ta`:

```python
import pandas_ta as ta
import pandas as pd

# Calculate indicators from close prices
close = df["Close"]

# SMA (Simple Moving Average)
ta.sma(close, length=20)

# EMA (Exponential Moving Average)  
ta.ema(close, length=12)

# RSI (Relative Strength Index)
ta.rsi(close, length=14)

# MACD (Moving Average Convergence Divergence)
ta.macd(close)

# Bollinger Bands
ta.bbands(close, length=20, std=2)

# ATR (Average True Range)
ta.atr(df["High"], df["Low"], df["Close"], length=14)
```

### Available Indicators

| Indicator | Parameters | Description |
|-----------|------------|-------------|
| **SMA 20** | length=20 | Simple Moving Average, 20 periods |
| **SMA 50** | length=50 | Simple Moving Average, 50 periods |
| **SMA 200** | length=200 | Simple Moving Average, 200 periods |
| **EMA 12** | length=12 | Exponential Moving Average, 12 periods |
| **EMA 26** | length=26 | Exponential Moving Average, 26 periods |
| **RSI** | length=14 | Relative Strength Index, 14 periods |
| **MACD** | 12, 26, 9 | MACD line, Signal line, Histogram |
| **Bollinger Bands** | 20, 2 | Upper, Middle, Lower bands |
| **ATR** | length=14 | Average True Range, 14 periods |

### Error Handling

#### No Data Available
```python
if df.empty:
    raise HTTPException(status_code=404, detail=f"No data for {symbol}")
```

#### Invalid Values
NaN and Inf values are cleaned before response:
```python
def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

def _clean_list(lst):
    return [_clean(v) for v in lst]
```

### Yahoo Finance API Limitations

#### Rate Limits
Yahoo Finance does not publish official rate limits. The toolkit implements:
- **5-minute cache** on all stock data endpoints
- **IP-based rate limiting** via SlowAPI (configurable)

#### Data Availability
- **Pre-market**: Data may be limited before market open
- **After-hours**: Extended hours data available for some symbols
- **Delisted Stocks**: Historical data available, no current quotes
- **International Markets**: Support varies by exchange

#### Data Freshness
| Interval | Data Delay |
|----------|-----------|
| Intraday (5m, 15m) | ~15 minutes |
| Daily | End of trading day |
| Weekly/Monthly | Calculated from daily |

## Symbol Search

The search endpoint uses `yfinance.search()`:

```python
@router.get("/api/search")
async def search_symbols(q: str = Query(..., min_length=1)):
    from yfinance import search
    results = search(q)
    return [
        {
            "symbol": r["symbol"],
            "name": r.get("longName", r.get("shortName", "")),
            "exchange": r.get("exchange", "")
        }
        for r in results.get("quotes", [])[:10]
    ]
```

Returns up to 10 matching symbols with:
- Ticker symbol
- Company name
- Exchange name

## Community Tools & Resources

### yfinance Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **PyPI Package** | https://pypi.org/project/yfinance/ | Official package page |
| **GitHub Repository** | https://github.com/ranaroussi/yfinance | Source code and issues |
| **Documentation** | https://github.com/ranaroussi/yfinance?tab=readme-ov-file#readme | Full API documentation |

### pandas-ta Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **PyPI Package** | https://pypi.org/project/pandas-ta/ | Technical analysis extension |
| **GitHub Repository** | https://github.com/twopirllc/pandas-ta | Indicator implementations |
| **Documentation** | https://twopirllc.github.io/pandas-ta/ | Usage guide and examples |

### Alternative Data Sources

For production applications requiring higher reliability:

| Provider | API Type | Notes |
|----------|----------|-------|
| **Alpha Vantage** | REST | Free tier available, requires API key |
| **Polygon.io** | REST/WebSocket | Real-time data, paid plans |
| **IEX Cloud** | REST | Pay-per-query pricing |
| **Finnhub** | REST/WebSocket | Free tier with limitations |
| **Tiingo** | REST | Free tier, requires registration |

## Data Freshness & Caching

### Cache Strategy

| Endpoint | TTL | Rationale |
|----------|-----|-----------|
| `/api/stock/{symbol}` | 5 min | Balance freshness vs API load |
| `/api/stock/{symbol}/indicators` | 5 min | Same as base stock data |
| `/api/stock/{symbol}/info` | 5 min | Fundamentals change slowly |
| `/api/search` | No cache | Fresh results needed |
| `/api/compare` | 5 min | Per-symbol caching |

### Production Considerations

For high-traffic deployments:

1. **Redis Cache**: Implement distributed caching
   ```python
   # Example: Redis cache wrapper
   @cache(ttl=300, redis_client=redis)
   async def get_stock(symbol: str, period: str):
       ...
   ```

2. **Multiple Instances**: yfinance is not thread-safe
   - Use async/await properly
   - Consider connection pooling for yfinance instances

3. **Fallback Data**: Cache last-known good data
   - Return stale data with warning header
   - Log discrepancies for monitoring

## Terms of Service

**Important**: Yahoo Finance's Terms of Service apply to usage. Key points:

- Data is provided "as-is" without warranty
- Commercial use may require Yahoo Finance Premium
- Automated scraping (vs API) may violate terms
- Rate limiting may be applied without notice

The `yfinance` library operates in a gray area regarding Yahoo's TOS. For production commercial use, consider official data providers.

## Data Accuracy

While Yahoo Finance is a widely-used data source:
- **Delayed Data**: Free tier has 15-minute delay for intraday
- **Accuracy**: Generally reliable but verify critical data
- **Corporate Actions**: May not always be immediate
- **Split History**: Generally accurate but verify independently

For algorithmic trading or financial decisions, validate data against primary sources.