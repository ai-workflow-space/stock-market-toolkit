# Architecture Documentation

## Overview

The Stock Market Toolkit is a **microservices-style full-stack application** with a React frontend, FastAPI Python backend, and PostgreSQL database. The architecture follows a **client-server model** with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                           │
│                     React 19 + TypeScript + Vite                     │
│                         Recharts Visualization                       │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTP/HTTPS (REST API)
                                  │ JWT Authentication
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend Service                              │
│              FastAPI (Python 3.12+) — Port 8001                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   /api/auth  │  │  /api/stocks │  │   /health    │              │
│  │   (Auth)     │  │   (Stocks)   │  │  (Health)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Rate Limiting (SlowAPI)                    │  │
│  │                   IP-based request throttling                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │   Yahoo Finance  │  │     Cache        │
│   (User Data)    │  │   (Stock Data)   │  │   (In-Memory)    │
│   Port 5432      │  │   External API   │  │   5-min TTL      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## System Components

### Frontend (React + TypeScript)

**Technology**: React 19, TypeScript, Vite, Recharts

**Responsibilities**:
- User interface and visualization
- State management (React Context)
- API communication with backend
- Authentication state handling
- Chart rendering (Recharts)

**Key Components**:
```
frontend/src/
├── App.tsx              # Main application with routing
├── api/stockApi.ts      # API client functions
├── pages/
│   ├── LoginPage.tsx    # Authentication
│   └── RegisterPage.tsx # User registration
├── context/
│   └── AuthContext.tsx  # Auth state management
└── types/index.ts       # TypeScript interfaces
```

### Backend (FastAPI + Python)

**Technology**: FastAPI, Python 3.12+, SQLAlchemy (async), Pydantic

**Responsibilities**:
- RESTful API endpoints
- Authentication (JWT)
- Data validation (Pydantic)
- Database operations (async SQLAlchemy)
- External API integration (Yahoo Finance)
- Rate limiting (SlowAPI)

**Application Structure**:
```
backend/app/
├── main.py              # FastAPI app initialization
├── config.py            # Settings from environment
├── database.py          # Async database session
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic validation schemas
├── auth.py              # JWT utilities
└── routes/
    ├── auth.py          # Auth endpoints
    └── stocks.py        # Stock data endpoints
```

### Database (PostgreSQL)

**Technology**: PostgreSQL 16

**Schema**:
```sql
users
├── id              (String, PK)
├── email           (String, Unique, Indexed)
├── username        (String, Unique, Indexed)
├── hashed_password (String)
├── is_active       (Boolean)
└── created_at      (DateTime)

watchlists
├── id         (Integer, PK, Auto-increment)
├── user_id    (String, FK → users.id)
├── symbol     (String)
└── created_at (DateTime)
```

## Data Flow

### 1. User Authentication Flow

```
User → POST /api/auth/login → FastAPI → PostgreSQL (verify)
                                           ↓
                                    JWT Access + Refresh Tokens
                                           ↓
                                    User receives tokens
                                           ↓
                         Subsequent requests include Authorization header
```

### 2. Stock Data Flow

```
User Request → Frontend → GET /api/stock/{symbol} → FastAPI
                                                    │
                                    Check cache (5-min TTL per endpoint)
                                                    │
                            ┌───────────────────────┼───────────────────────┐
                            │                       │                       │
                            ▼                       ▼                       ▼
                    Yahoo Finance            Return cached           yfinance.fetch()
                    (cached)                 data                    │
                            │                       │                       │
                            └───────────────────────┼───────────────────────┘
                                                    │
                                                    ▼
                                            Clean & validate data
                                                    │
                                                    ▼
                                            Return StockDataResponse
                                                    │
                                                    ▼
                                            Frontend renders chart
```

### 3. Technical Indicators Calculation

```
Yahoo Finance Data → pandas_ta library → Calculated Indicators
                                              │
                                              ├── SMA (20, 50, 200)
                                              ├── EMA (12, 26)
                                              ├── RSI (14)
                                              ├── MACD (12, 26, 9)
                                              ├── Bollinger Bands (20, 2)
                                              └── ATR (14)
```

## Security Architecture

### Authentication
- **JWT Tokens** with HS256 algorithm
- Access token: 30-minute expiry
- Refresh token: 7-day expiry
- Tokens contain user ID (`sub` claim)

### Password Security
- **bcrypt** hashing with automatic salt
- Minimum 8-character password requirement

### Rate Limiting
- **SlowAPI** for IP-based rate limiting
- Protects against abuse and API throttling

### CORS Policy
- Configured origins only
- Credentials allowed
- All HTTP methods permitted

### Input Validation
- **Pydantic** models for all request/response
- Email format validation
- Username alphanumeric validation (underscores allowed)
- Query parameter validation

## Deployment Architecture

### Docker Compose Setup

```yaml
Services:
├── postgres     # Database (port 5432)
├── backend      # API (port 8001)
└── frontend     # Static files (port 3000)
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `sqlite+aiosqlite:///./stocktoolkit.db` |
| `SECRET_KEY` | JWT signing key | Dev key (must change in production) |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |

### Production Considerations

1. **Database**: Use managed PostgreSQL (AWS RDS, Cloud SQL)
2. **SECRET_KEY**: Generate with `openssl rand -hex 64`
3. **HTTPS**: Enable TLS termination at load balancer
4. **Rate Limiting**: Adjust limits based on Yahoo Finance API constraints
5. **Caching**: Consider Redis for multi-instance deployments

## Performance Characteristics

### Backend
- **Async I/O**: All database and HTTP operations are async
- **Connection Pooling**: SQLAlchemy pool_size=10, max_overflow=20
- **Cache TTL**: 5 minutes for stock data endpoints

### Frontend
- **Code Splitting**: Vite handles automatic chunking
- **Debounced Search**: 300ms debounce on symbol search
- **Parallel API Calls**: Stock data, indicators, and info loaded concurrently

## Error Handling

### Backend Error Responses
```json
{
  "detail": "Error message describing the issue"
}
```

### HTTP Status Codes
- `200` — Success
- `201` — Created (user registration)
- `400` — Bad Request (validation error)
- `401` — Unauthorized (invalid/missing token)
- `403` — Forbidden (inactive user)
- `404` — Not Found (stock not found)
- `429` — Too Many Requests (rate limited)
- `500` — Internal Server Error

### Global Exception Handler
All unhandled exceptions return a generic 500 response with the error logged server-side.

## Future Architecture Considerations

- **WebSocket Support**: Real-time price updates
- **Redis Cache**: Distributed caching across instances
- **Background Jobs**: Celery for scheduled data refresh
- **Watchlist Sync**: Database-backed watchlists (already modeled)
- **Sector Analysis**: Aggregated sector performance data
- **Custom Indicators**: User-defined indicator configurations