-- FinanceIQ — Initial Schema
-- Run via: supabase db push

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Plaid Items (linked institutions) ─────────────────────────────────────────
create table plaid_items (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users not null,
  plaid_item_id   text unique not null,
  access_token    text not null,  -- store encrypted in production
  institution_id  text,
  institution_name text,
  created_at      timestamptz default now(),
  last_synced_at  timestamptz
);

alter table plaid_items enable row level security;
create policy "Users can only see their own items"
  on plaid_items for all using (auth.uid() = user_id);

-- ── Accounts ──────────────────────────────────────────────────────────────────
create table accounts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users not null,
  plaid_item_id       uuid references plaid_items,
  plaid_account_id    text unique not null,
  name                text not null,
  official_name       text,
  type                text not null,   -- checking | savings | brokerage | retirement | credit_card | loan | mortgage
  subtype             text,
  balance_current     numeric(14,2) not null default 0,
  balance_available   numeric(14,2),
  currency            text default 'USD',
  last_updated        timestamptz default now()
);

alter table accounts enable row level security;
create policy "Users can only see their own accounts"
  on accounts for all using (auth.uid() = user_id);

-- ── Transactions ───────────────────────────────────────────────────────────────
create table transactions (
  id                    uuid primary key default uuid_generate_v4(),
  account_id            uuid references accounts not null,
  user_id               uuid references auth.users not null,
  plaid_transaction_id  text unique not null,
  amount                numeric(14,2) not null,
  date                  date not null,
  name                  text not null,
  merchant_name         text,
  category              text[],
  pending               boolean default false,
  created_at            timestamptz default now()
);

alter table transactions enable row level security;
create policy "Users can only see their own transactions"
  on transactions for all using (auth.uid() = user_id);

create index idx_transactions_user_date on transactions(user_id, date desc);

-- ── Holdings ───────────────────────────────────────────────────────────────────
create table holdings (
  id                  uuid primary key default uuid_generate_v4(),
  account_id          uuid references accounts not null,
  user_id             uuid references auth.users not null,
  ticker              text not null,
  name                text,
  quantity            numeric(18,6) not null,
  cost_basis          numeric(14,2) not null,
  current_price       numeric(14,4),
  current_value       numeric(14,2),
  unrealized_gain_loss numeric(14,2),
  purchase_date       date,
  last_updated        timestamptz default now()
);

alter table holdings enable row level security;
create policy "Users can only see their own holdings"
  on holdings for all using (auth.uid() = user_id);

-- ── Debts ──────────────────────────────────────────────────────────────────────
create table debts (
  id                      uuid primary key default uuid_generate_v4(),
  account_id              uuid references accounts not null,
  user_id                 uuid references auth.users not null,
  name                    text not null,
  balance                 numeric(14,2) not null,
  apr                     numeric(6,4) not null,
  minimum_payment         numeric(10,2) not null,
  payoff_date_estimated   date,
  last_updated            timestamptz default now()
);

alter table debts enable row level security;
create policy "Users can only see their own debts"
  on debts for all using (auth.uid() = user_id);

-- ── Recommendations ────────────────────────────────────────────────────────────
create table recommendations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users not null,
  category        text not null,  -- invest | debt | tax | rebalance | contribution
  priority        text not null,  -- high | medium | low
  title           text not null,
  description     text not null,
  action          text not null,
  estimated_impact text,
  dismissed       boolean default false,
  created_at      timestamptz default now()
);

alter table recommendations enable row level security;
create policy "Users can only see their own recommendations"
  on recommendations for all using (auth.uid() = user_id);

-- ── User Profiles ──────────────────────────────────────────────────────────────
create table profiles (
  id                    uuid primary key references auth.users,
  full_name             text,
  risk_tolerance        text default 'moderate',  -- conservative | moderate | aggressive
  tax_filing_status     text default 'single',     -- single | married_joint | married_separate | head_of_household
  target_allocation     jsonb default '{"stocks": 80, "bonds": 15, "cash": 5}'::jsonb,
  -- 2025 contribution limits (update annually)
  annual_income_estimate numeric(14,2),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can only see their own profile"
  on profiles for all using (auth.uid() = id);

-- ── Net Worth Snapshots (historical) ──────────────────────────────────────────
create table net_worth_snapshots (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users not null,
  snapshot_date   date not null,
  total_assets    numeric(14,2) not null,
  total_liabilities numeric(14,2) not null,
  net_worth       numeric(14,2) not null,
  created_at      timestamptz default now(),
  unique(user_id, snapshot_date)
);

alter table net_worth_snapshots enable row level security;
create policy "Users can only see their own snapshots"
  on net_worth_snapshots for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
