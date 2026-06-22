# Stock Market Toolkit Documentation

Welcome to the **Stock Market Toolkit** documentation. This is a full-stack stock market analysis platform providing real-time market data, technical indicators, and multi-ticker comparison capabilities.

## 📋 Documentation Overview

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System design, components, and data flow |
| [External Services](external-services.md) | Yahoo Finance integration and data sources |
| [Tech Stack](tech-stack.md) | Complete list of libraries and dependencies |
| [Setup Guide](setup.md) | Local development and deployment instructions |
| [API Reference](api-reference.md) | Complete API endpoint documentation |

## 🌟 Features

- **Real-time Stock Charts** — Interactive price charts with candlestick visualization
- **Technical Indicators** — SMA, EMA, RSI, MACD, Bollinger Bands, ATR
- **Multi-Ticker Comparison** — Compare up to 5 stocks side-by-side
- **Stock Info Cards** — Comprehensive company data including market cap, P/E ratio, dividends
- **Multiple Timeframes** — 1D, 5D, 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y, MAX
- **User Authentication** — Secure JWT-based authentication system

## 🏗️ Project Structure

```
stock-market-toolkit/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── main.py          # Application entry point
│   │   ├── config.py        # Configuration management
│   │   ├── database.py      # Database setup & session
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── auth.py          # Authentication utilities
│   │   └── routes/
│   │       ├── auth.py      # Auth endpoints
│   │       └── stocks.py    # Stock data endpoints
│   ├── requirements.txt
│   └── main.py
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx          # Main application component
│   │   ├── api/             # API client
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context (Auth)
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── docs/                     # This documentation
├── docker-compose.yml        # Docker orchestration
└── README.md
```

## 🚀 Quick Start

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

## 📊 Data Source

All stock data is sourced from **Yahoo Finance** via the `yfinance` library. Data includes:
- OHLCV (Open, High, Low, Close, Volume) prices
- Company information and fundamentals
- Real-time market data

## 🔐 Authentication

The API uses JWT-based authentication with access and refresh tokens:
- Access token expires in 30 minutes
- Refresh token expires in 7 days

## 🐳 Deployment

The application can be deployed using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database on port 5432
- Backend API on port 8001
- Frontend on port 3000

## 📝 License

See the main [README.md](../README.md) for project details and licensing information.