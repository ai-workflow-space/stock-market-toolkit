# API Reference

Complete reference documentation for the Stock Market Toolkit REST API.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local Development | `http://localhost:8001` |
| Production | `https://your-domain.com` |

## Authentication

Most endpoints require JWT authentication. Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Authentication Flow

1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login` → Receive `access_token` and `refresh_token`
3. **Use Token**: Include `access_token` in Authorization header
4. **Refresh**: `POST /api/auth/refresh` when access token expires

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Health check |
| `GET` | `/` | No | API root info |
| `POST` | `/api/auth/register` | No | User registration |
| `POST` | `/api/auth/login` | No | User login |
| `POST` | `/api/auth/refresh` | No | Refresh tokens |
| `POST` | `/api/auth/logout` | Yes | Logout |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `GET` | `/api/stock/{symbol}` | Yes | Get stock OHLCV data |
| `GET` | `/api/stock/{symbol}/indicators` | Yes | Get technical indicators |
| `GET` | `/api/stock/{symbol}/info` | Yes | Get company info |
| `POST` | `/api/compare` | Yes | Compare multiple stocks |
| `GET` | `/api/search` | Yes | Search stock symbols |

---

## Health & Info

### `GET /health`

Health check endpoint. Does not require authentication.

**Response** `200 OK`:
```json
{
  "status": "ok",
  "service": "stock-market-toolkit-api",
  "version": "1.0.0"
}
```

### `GET /`

API root information.

**Response** `200 OK`:
```json
{
  "name": "Stock Market Toolkit API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

---

## Authentication Endpoints

### `POST /api/auth/register`

Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Fields**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `username` | string | Yes | 3-100 chars, alphanumeric + underscores |
| `password` | string | Yes | 8-128 chars |

**Response** `201 Created`:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Email or username already registered

---

### `POST /api/auth/login`

Authenticate and receive JWT tokens.

**Request Body**:
```json
{
  "email_or_username": "user@example.com",
  "password": "securepassword123"
}
```

**Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid credentials

---

### `POST /api/auth/refresh`

Refresh access token using refresh token.

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token

---

### `POST /api/auth/logout`

Logout current user (client should discard tokens).

**Headers**: `Authorization: Bearer <access_token>`

**Response** `200 OK`:
```json
{
  "message": "Logged out successfully"
}
```

---

### `GET /api/auth/me`

Get current authenticated user info.

**Headers**: `Authorization: Bearer <access_token>`

**Response** `200 OK`:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Stock Data Endpoints

### `GET /api/stock/{symbol}`

Get OHLCV (Open, High, Low, Close, Volume) data for a stock symbol.

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Stock ticker symbol (e.g., "AAPL", "TSLA") |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `1mo` | Data period: `1d`, `5d`, `1w`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`, `max` |

**Example Request**:
```
GET /api/stock/AAPL?period=1mo
```

**Response** `200 OK`:
```json
{
  "symbol": "AAPL",
  "period": "1mo",
  "timestamp": [
    "2024-01-02T00:00:00",
    "2024-01-03T00:00:00",
    "2024-01-04T00:00:00"
  ],
  "open": [185.50, 186.20, 184.75],
  "high": [186.10, 187.50, 185.90],
  "low": [184.90, 185.40, 184.10],
  "close": [185.85, 186.80, 184.95],
  "volume": [45000000, 52000000, 48000000]
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Ticker symbol (uppercase) |
| `period` | string | Requested period |
| `timestamp` | array[string] | ISO 8601 datetime strings |
| `open` | array[number\|null] | Opening prices |
| `high` | array[number\|null] | High prices |
| `low` | array[number\|null] | Low prices |
| `close` | array[number\|null] | Closing prices |
| `volume` | array[number\|null] | Volume (shares) |

**Error Responses**:
- `400 Bad Request`: Invalid period parameter
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: No data available for symbol

---

### `GET /api/stock/{symbol}/indicators`

Get technical indicators for a stock symbol.

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Stock ticker symbol |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `3mo` | Data period |

**Example Request**:
```
GET /api/stock/AAPL/indicators?period=3mo
```

**Response** `200 OK`:
```json
{
  "symbol": "AAPL",
  "period": "3mo",
  "timestamp": ["2024-01-02T00:00:00", "..."],
  "sma20": [null, null, ..., 185.45, 186.20],
  "sma50": [null, null, ..., 183.30, 183.85],
  "sma200": [null, null, ..., 175.50, 176.20],
  "ema12": [null, ..., 186.10, 186.80],
  "ema26": [null, ..., 184.90, 185.50],
  "rsi": [null, ..., 58.45, 61.20],
  "macd": [null, ..., 2.35, 2.80],
  "macd_signal": [null, ..., 1.90, 2.10],
  "macd_hist": [null, ..., 0.45, 0.70],
  "bb_upper": [null, ..., 191.50, 192.30],
  "bb_middle": [null, ..., 185.45, 186.20],
  "bb_lower": [null, ..., 179.40, 180.10],
  "atr": [null, ..., 2.85, 2.95]
}
```

**Indicator Details**:
| Indicator | Period | Description |
|-----------|--------|-------------|
| `sma20` | 20 | Simple Moving Average (20 periods) |
| `sma50` | 50 | Simple Moving Average (50 periods) |
| `sma200` | 200 | Simple Moving Average (200 periods) |
| `ema12` | 12 | Exponential Moving Average (12 periods) |
| `ema26` | 26 | Exponential Moving Average (26 periods) |
| `rsi` | 14 | Relative Strength Index |
| `macd` | 12,26,9 | MACD line |
| `macd_signal` | 12,26,9 | Signal line |
| `macd_hist` | 12,26,9 | MACD histogram |
| `bb_upper` | 20,2 | Bollinger Bands Upper |
| `bb_middle` | 20,2 | Bollinger Bands Middle (SMA) |
| `bb_lower` | 20,2 | Bollinger Bands Lower |
| `atr` | 14 | Average True Range |

**Note**: Leading `null` values indicate insufficient data for calculation.

---

### `GET /api/stock/{symbol}/info`

Get company information and fundamentals.

**Headers**: `Authorization: Bearer <access_token>`

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Stock ticker symbol |

**Example Request**:
```
GET /api/stock/AAPL/info
```

**Response** `200 OK`:
```json
{
  "symbol": "AAPL",
  "short_name": "APPLE INC",
  "long_name": "Apple Inc.",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "price": 185.75,
  "currency": "USD",
  "market_cap": 2900000000000,
  "sharesOutstanding": 15400000000,
  "trailing_pe": 29.85,
  "forward_pe": 25.40,
  "dividend_yield": 0.0055,
  "avg_volume": 52000000,
  "beta": 1.28,
  "week_52_high": 199.62,
  "week_52_low": 164.08
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Ticker symbol |
| `short_name` | string | Short company name |
| `long_name` | string\|null | Full company name |
| `sector` | string\|null | Business sector |
| `industry` | string\|null | Industry classification |
| `price` | number | Current/last price |
| `currency` | string\|null | Price currency |
| `market_cap` | number\|null | Market capitalization |
| `sharesOutstanding` | number\|null | Shares outstanding |
| `trailing_pe` | number\|null | Trailing P/E ratio |
| `forward_pe` | number\|null | Forward P/E ratio |
| `dividend_yield` | number\|null | Annual dividend yield (decimal) |
| `avg_volume` | number\|null | Average daily volume |
| `beta` | number\|null | Beta coefficient |
| `week_52_high` | number\|null | 52-week high price |
| `week_52_low` | number\|null | 52-week low price |

---

### `POST /api/compare`

Compare multiple stocks side-by-side.

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:
```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "period": "1mo"
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `symbols` | array[string] | Yes | 2-5 ticker symbols |
| `period` | string | No | Data period (default: `1mo`) |

**Example Request**:
```
POST /api/compare
Content-Type: application/json

{
  "symbols": ["AAPL", "TSLA"],
  "period": "3mo"
}
```

**Response** `200 OK`:
```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "timestamp": ["2024-01-02T00:00:00", "..."],
      "close": [185.50, 186.20, ...],
      "volume": [45000000, 52000000, ...]
    },
    {
      "symbol": "TSLA",
      "timestamp": ["2024-01-02T00:00:00", "..."],
      "close": [248.50, 251.20, ...],
      "volume": [120000000, 115000000, ...]
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: 2-5 symbols required
- `404 Not Found`: No data for one or more symbols

---

### `GET /api/search`

Search for stock symbols by name or ticker.

**Headers**: `Authorization: Bearer <access_token>`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 char) |

**Example Request**:
```
GET /api/search?q=apple
```

**Response** `200 OK`:
```json
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "exchange": "NASDAQ"
  },
  {
    "symbol": "APLE",
    "name": "Apple Hospitality REIT Inc.",
    "exchange": "NYSE"
  }
]
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Ticker symbol |
| `name` | string | Company name |
| `exchange` | string | Exchange name |

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Standard HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | OK | Successful request |
| `201` | Created | User registration |
| `400` | Bad Request | Invalid input, validation failure |
| `401` | Unauthorized | Missing, invalid, or expired token |
| `403` | Forbidden | Account disabled |
| `404` | Not Found | Stock symbol not found |
| `422` | Unprocessable Entity | Pydantic validation failure |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

---

## Rate Limiting

The API implements IP-based rate limiting via SlowAPI. Default limits:

- **General**: 100 requests per minute
- **Stock Data**: 60 requests per minute
- **Search**: 30 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## Interactive Documentation

### Swagger UI

Full interactive API documentation available at:
```
http://localhost:8001/docs
```

Features:
- Try out endpoints directly
- View request/response schemas
- Authentication support

### ReDoc

Alternative documentation view at:
```
http://localhost:8001/redoc
```

Features:
- Clean three-panel layout
- Searchable endpoints
- Schema documentation

---

## Code Examples

### cURL - Login

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email_or_username": "admin", "password": "Admin@1234"}'
```

### cURL - Get Stock Data

```bash
curl -X GET "http://localhost:8001/api/stock/AAPL?period=1mo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Python - API Client

```python
import requests

BASE_URL = "http://localhost:8001"

# Login
response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email_or_username": "admin", "password": "Admin@1234"}
)
tokens = response.json()
access_token = tokens["access_token"]

# Get stock data
response = requests.get(
    f"{BASE_URL}/api/stock/AAPL",
    params={"period": "1mo"},
    headers={"Authorization": f"Bearer {access_token}"}
)
stock_data = response.json()
```

### JavaScript - Fetch API

```javascript
const BASE_URL = "http://localhost:8001";

// Login
const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email_or_username: "admin",
    password: "Admin@1234"
  })
});
const { access_token } = await loginResponse.json();

// Get stock data
const stockResponse = await fetch(`${BASE_URL}/api/stock/AAPL?period=1mo`, {
  headers: { "Authorization": `Bearer ${access_token}` }
});
const stockData = await stockResponse.json();
```