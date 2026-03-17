# AI Investment Portfolio Advisor

An AI-powered investment portfolio tracker and advisor featuring real-time market data, sentiment analysis, and LangChain-driven chat recommendations.

## Project Structure

```
AI-Investment-Portfolio-Advisor/
├── frontend/
│   ├── index.html          # Portfolio tracker + chat UI
│   ├── styles.css          # Enhanced dark-mode styling
│   ├── app.js              # Portfolio management & market data
│   └── ai-advisor.js       # AI chat interactions
├── backend/
│   ├── server.js           # Express server
│   ├── routes/
│   │   ├── chat.js         # Chatbot (LangChain)
│   │   ├── sentiment.js    # Sentiment analysis
│   │   ├── recommendations.js  # AI recommendations
│   │   ├── market.js       # Market data
│   │   └── portfolio.js    # Portfolio CRUD endpoints
│   ├── services/
│   │   ├── langchain.js    # LangChain / OpenAI integration
│   │   ├── huggingface.js  # FinBERT sentiment via HuggingFace
│   │   ├── openbb.js       # Alpha Vantage financial data
│   │   ├── publicApis.js   # CoinGecko crypto + Fear & Greed index
│   │   └── newsApi.js      # Financial news (NewsAPI)
│   ├── config/
│   │   └── config.js       # API configuration
│   ├── utils/
│   │   ├── logger.js       # Winston logger
│   │   └── errorHandler.js # Centralised error handling
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Features

- **Portfolio Management** – Buy/sell stocks, track holdings, P&L, and cash balance
- **Real-Time Market Data** – Stock quotes via Alpha Vantage, crypto prices via CoinGecko
- **AI Chat Advisor** – Conversational advisor powered by LangChain + GPT-4o mini
- **Sentiment Analysis** – Financial news sentiment using HuggingFace FinBERT
- **AI Recommendations** – Per-stock buy/hold/sell recommendations
- **Market Overview** – Fear & Greed index, top cryptos, financial headlines

## Quick Start

### Prerequisites

- Node.js 18+
- API keys (see `.env.example`)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your API keys
npm run dev
```

### Frontend

Open `frontend/index.html` in your browser, or serve it with any static file server:

```bash
npx serve frontend
```

> The frontend connects to `http://localhost:3000` by default.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (for AI chat) | OpenAI API key |
| `HUGGINGFACE_API_KEY` | Optional | HuggingFace API key for FinBERT sentiment |
| `NEWS_API_KEY` | Optional | NewsAPI key for financial headlines |
| `ALPHA_VANTAGE_API_KEY` | Optional | Alpha Vantage key for stock quotes |

> The app runs in mock-data mode for any missing API keys, so you can try it without all keys configured.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Chat with AI advisor |
| `GET` | `/api/sentiment/stock/:symbol` | News sentiment for a stock |
| `POST` | `/api/sentiment/analyze` | Analyze custom text sentiment |
| `POST` | `/api/recommendations` | Portfolio-wide AI analysis |
| `GET` | `/api/recommendations/stock/:symbol` | Single stock recommendation |
| `GET` | `/api/market/quote/:symbol` | Stock quote |
| `GET` | `/api/market/history/:symbol` | Historical price data |
| `GET` | `/api/market/crypto` | Top cryptocurrencies |
| `GET` | `/api/market/sentiment` | Market Fear & Greed index |
| `GET` | `/api/portfolio/:userId` | Get user portfolio |
| `POST` | `/api/portfolio/:userId/buy` | Buy shares |
| `POST` | `/api/portfolio/:userId/sell` | Sell shares |

## License

MIT