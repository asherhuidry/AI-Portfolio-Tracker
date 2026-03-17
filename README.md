# AI Investment Portfolio Advisor

An AI-powered investment portfolio tracker with real-time market data, sentiment analysis, and an interactive AI advisor chatbot.

## Features

- 📈 **Portfolio Tracker** – Add, track, and monitor your stock holdings with live prices
- 🤖 **AI Advisor Chat** – Ask investment questions powered by LangChain + OpenAI GPT
- 📊 **Sentiment Analysis** – FinBERT-based sentiment scoring for news articles via HuggingFace
- 💡 **AI Recommendations** – Personalised portfolio recommendations based on your holdings
- 📰 **Financial News** – Latest news aggregated via News API
- 🏦 **Market Data** – Real-time quotes via Alpha Vantage; fundamentals via OpenBB

## Project Structure

```
AI-Investment-Portfolio-Advisor/
├── frontend/
│   ├── index.html        # Portfolio tracker + chat UI
│   ├── styles.css        # Enhanced dark-mode styling
│   ├── app.js            # Portfolio management
│   └── ai-advisor.js     # Chat interactions & sentiment UI
├── backend/
│   ├── server.js         # Express server
│   ├── routes/
│   │   ├── chat.js           # POST /api/chat
│   │   ├── sentiment.js      # GET /api/sentiment/:symbol
│   │   ├── recommendations.js# POST /api/recommendations
│   │   ├── market.js         # GET /api/market/quote/:symbol
│   │   └── portfolio.js      # CRUD /api/portfolio/:userId
│   ├── services/
│   │   ├── langchain.js      # LangChain + OpenAI integration
│   │   ├── huggingface.js    # FinBERT sentiment via HuggingFace
│   │   ├── openbb.js         # OpenBB financial data
│   │   ├── publicApis.js     # Alpha Vantage market data
│   │   └── newsApi.js        # News API integration
│   ├── config/
│   │   └── config.js         # Centralised API configuration
│   ├── utils/
│   │   ├── logger.js         # Winston logger
│   │   └── errorHandler.js   # Express error middleware
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- API keys (see `.env.example`)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your API keys in .env
npm start
```

The API server starts on `http://localhost:3000`.

### Frontend

Open `frontend/index.html` in a browser, or serve it with any static file server:

```bash
npx serve frontend
```

### API Keys

| Service | Key Variable | Free Tier |
|---------|-------------|-----------|
| OpenAI | `OPENAI_API_KEY` | $5 credit |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | 25 req/day |
| News API | `NEWS_API_KEY` | 100 req/day |
| HuggingFace | `HUGGINGFACE_API_KEY` | Free inference |
| OpenBB | `OPENBB_PAT` | Free tier |

> The app still works without API keys – market data falls back to mock prices, and news/sentiment features are gracefully skipped.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send message to AI advisor |
| `GET`  | `/api/sentiment/:symbol` | News sentiment for a ticker |
| `POST` | `/api/sentiment` | Analyse arbitrary texts |
| `POST` | `/api/recommendations` | AI portfolio recommendations |
| `GET`  | `/api/market/quote/:symbol` | Real-time stock quote |
| `POST` | `/api/market/quotes` | Bulk quotes |
| `GET`  | `/api/market/search?q=` | Symbol search |
| `GET`  | `/api/portfolio/:userId` | Get portfolio |
| `POST` | `/api/portfolio/:userId/holdings` | Add/update holding |
| `DELETE` | `/api/portfolio/:userId/holdings/:symbol` | Remove holding |
| `GET`  | `/api/portfolio/:userId/value` | Portfolio market value |
| `GET`  | `/health` | Health check |

## Disclaimer

This tool is for **informational purposes only** and does not constitute professional financial advice. Always consult a qualified financial advisor before making investment decisions.