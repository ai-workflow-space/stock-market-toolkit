# Stock Market Toolkit

A full-stack stock market analysis tool with a React frontend and Python FastAPI backend.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite (Recharts for charting)
- **Backend**: FastAPI (Python) + yfinance for stock data
- **Data Source**: Yahoo Finance

## Features

- Real-time stock price charts (candlestick + line)
- Technical indicators: SMA, EMA, RSI, MACD, Bollinger Bands
- Multi-ticker comparison
- Stock info cards (price, volume, market cap, etc.)
- Multiple timeframe support (1D, 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y)

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## API Endpoints

- `GET /health` — Health check
- `GET /api/stock/{symbol}?period=1mo` — Stock OHLCV data
- `GET /api/stock/{symbol}/indicators?period=1mo` — Technical indicators
- `GET /api/stock/{symbol}/info` — Company info
- `POST /api/compare` — Compare multiple tickers

## Environment

Backend runs on port **8001**, frontend proxies `/api/*` to it via Vite config.# Test
