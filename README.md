# FinanceIQ

A personal finance command center that connects your accounts, monitors markets, and surfaces AI-driven recommendations to help you invest smarter, eliminate debt faster, and keep more of what you earn.

> **Disclaimer:** FinanceIQ is not a registered investment advisor. All recommendations are informational only. Consult a licensed CFP or CPA before making financial decisions.

---

## Features

### Financial Data Aggregation
- Connect bank, brokerage, credit, and loan accounts via **Plaid**
- Real-time net worth dashboard — assets vs. liabilities
- 30-day net worth trend chart
- Cash flow tracking by category

### Investment Intelligence
- Portfolio overview — holdings, allocation %, unrealized gains/losses
- Allocation pie chart with long-term/short-term holding period badges
- Tax-loss harvesting panel — flags short-term positions with losses >$500
- Market data via **Polygon.io**

### Debt Payoff Planner
- Avalanche vs. snowball payoff simulator with full amortization
- Interactive extra monthly payment slider
- Payoff trajectory chart and estimated payoff date

### Tax Optimizer
- 2025 federal bracket ladder with your estimated bracket highlighted
- Contribution room tracker: 401(k) $23,500 / IRA $7,000 / HSA $4,300
- Short-term vs. long-term gains summary
- Harvestable loss counter

### Market News Feed
- Live headlines via **Finnhub**
- Sentiment tagging: bullish / bearish / neutral
- Impact tags: Fed Policy, Inflation, Earnings, Geopolitical, Rates, GDP/Growth
- Filter by sentiment

### AI Advisor (Claude)
- Personalized weekly action items powered by **Claude (claude-sonnet-4-6)**
- Recommendations across: invest, debt payoff, tax optimization, rebalancing, contributions
- Priority ranking (high / medium / low) with estimated dollar impact

### Account Management
- List all linked institutions with last-synced timestamp
- Sync all accounts on demand
- Remove institutions

### Settings
- Risk tolerance: conservative / moderate / aggressive
- Target allocation sliders (stocks / bonds / cash)
- Tax filing status and annual income estimate

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (Postgres + Auth) |
| Bank Data | Plaid API |
| Market Data | Polygon.io |
| News | Finnhub |
| AI | Anthropic Claude API |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Accounts on: [Supabase](https://supabase.com), [Plaid](https://plaid.com), [Anthropic](https://console.anthropic.com), [Polygon.io](https://polygon.io), [Finnhub](https://finnhub.io)

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/financeiq.git
cd financeiq

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Fill in your API keys (see Environment Variables below)

# 4. Push database schema
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# 5. Start dev server
npm run dev
# → http://localhost:3010
```

### Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3010

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Plaid (use sandbox for development)
PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-sandbox-secret
PLAID_ENV=sandbox

# Claude
ANTHROPIC_API_KEY=sk-ant-...

# Market Data
POLYGON_API_KEY=your-key
FINNHUB_API_KEY=your-key
```

---

## Database

Schema is managed via Supabase migrations in `supabase/migrations/`.

```bash
# Push schema to Supabase
npx supabase db push

# Generate TypeScript types from schema
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/database.types.ts
```

**Tables:** `plaid_items`, `accounts`, `transactions`, `holdings`, `debts`, `recommendations`, `profiles`, `net_worth_snapshots`

All tables have Row Level Security (RLS) enabled — users can only access their own data.

---

## Testing

```bash
# Unit + component tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright — requires dev server running)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Run everything
npm run test:all
```

**65 tests across:**
- Unit: payoff simulator, tax brackets, sentiment tagger, API routes
- Component: NetWorthCard, DebtWaterfall, login form
- E2E: auth flow, navigation guards (all dashboard routes)

---

## Project Structure

```
financeiq/
├── app/
│   ├── (auth)/login/          # Login / sign-up page
│   ├── (dashboard)/           # Protected dashboard pages
│   │   ├── page.tsx           # Overview / net worth
│   │   ├── portfolio/         # Holdings + allocation
│   │   ├── debt/              # Payoff simulator
│   │   ├── taxes/             # Tax optimizer
│   │   ├── news/              # Market news feed
│   │   ├── recommendations/   # AI advisor
│   │   ├── accounts/          # Linked accounts management
│   │   └── settings/          # User preferences
│   └── api/
│       ├── plaid/             # Link token, exchange, sync
│       ├── recommendations/   # Claude AI route
│       ├── news/              # Finnhub proxy
│       └── snapshot/          # Net worth snapshot
├── components/dashboard/      # Reusable dashboard components
├── lib/                       # Business logic + API clients
│   ├── payoff.ts              # Avalanche/snowball calculator
│   ├── tax.ts                 # 2025 bracket data + helpers
│   ├── sentiment.ts           # News sentiment tagger
│   ├── claude.ts              # AI recommendations engine
│   ├── plaid.ts               # Plaid client
│   ├── market.ts              # Polygon + Finnhub clients
│   └── supabase/              # Server + client Supabase instances
├── supabase/migrations/       # Database schema
└── tests/
    ├── unit/                  # Vitest unit tests
    ├── components/            # React Testing Library tests
    └── e2e/                   # Playwright E2E tests
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment instructions covering Supabase, Plaid, Vercel, and automated daily snapshots via cron.

Quick deploy to Vercel:

```bash
# Push to GitHub, then import at vercel.com
# Or via CLI:
npm i -g vercel
vercel --prod
```

---

## Roadmap

### MVP Remaining (Week 2–3)
- [ ] Rate Watch panel (Fed funds rate, 10Y treasury, mortgage rates)
- [ ] Economic event calendar (FOMC, CPI, earnings dates)
- [ ] Refinancing alerts
- [ ] Mobile responsive layout
- [ ] Plaid webhook for real-time account updates

### Post-MVP
- [ ] Crypto wallet integration
- [ ] Multi-currency support
- [ ] Shared household accounts
- [ ] Tax document export (CSV for CPA)
- [ ] Advisor portal

---

## License

[MIT](./LICENSE)

FinanceIQ is not affiliated with Plaid, Anthropic, Supabase, Polygon.io, or Finnhub.
