-- Strike Markets Schema (Idempotent — safe to re-run on every deploy)
-- Uses IF NOT EXISTS so existing data is never dropped

-- Users table (Synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- matches auth.users.id
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_claim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to handle new user signups from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  first_user BOOLEAN;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) = 0 INTO first_user FROM public.users;
  
  INSERT INTO public.users (id, email, username, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    first_user
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'canceled')),
  outcome_resolved UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  image_url TEXT DEFAULT ''
);

-- Market Options table (multi-choice)
CREATE TABLE IF NOT EXISTS market_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pool_coins NUMERIC(14, 2) NOT NULL DEFAULT 10.00,
  total_shares_issued NUMERIC(14, 4) NOT NULL DEFAULT 0
);

-- User positions per option
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID NOT NULL REFERENCES markets(id),
  option_id UUID NOT NULL REFERENCES market_options(id),
  shares NUMERIC(14, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, market_id, option_id)
);

-- Transaction log
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  market_id UUID REFERENCES markets(id),
  option_id UUID REFERENCES market_options(id),
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'redeem', 'claim_daily', 'resolution_payout', 'deposit', 'withdrawal')),
  amount_coins NUMERIC(14, 4) NOT NULL DEFAULT 0,
  amount_shares NUMERIC(14, 4) NOT NULL DEFAULT 0,
  price_per_share NUMERIC(14, 6) NOT NULL DEFAULT 0,
  fee_coins NUMERIC(14, 4) NOT NULL DEFAULT 0,
  house_profit NUMERIC(14, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M-Pesa Deposits
CREATE TABLE IF NOT EXISTS mpesa_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL,
  phone_number TEXT NOT NULL,
  reference TEXT UNIQUE,
  checkout_request_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'initiated',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System stats (key-value store for house tracking)
CREATE TABLE IF NOT EXISTS system_stats (
  key TEXT PRIMARY KEY,
  value NUMERIC(14, 4) NOT NULL DEFAULT 0
);

-- Seed system stats (ON CONFLICT: skip if row already exists — never resets live counters)
INSERT INTO system_stats (key, value) VALUES
  ('total_volume', 0),
  ('total_fees', 0),
  ('total_spread_profit', 0),
  ('total_resolution_rake', 0),
  ('total_house_profit', 0)
ON CONFLICT (key) DO NOTHING;

-- Price history for probability charts
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES market_options(id) ON DELETE CASCADE,
  fair_price NUMERIC(10, 6) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS supported via DO block)
CREATE INDEX IF NOT EXISTS idx_market_options_market ON market_options(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_market ON transactions(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_price_history_market ON price_history(market_id, recorded_at);
