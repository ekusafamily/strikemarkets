# Strike Markets

> A virtual prediction market platform — trade on real-world outcomes with virtual coins (VCoins). Built with **Next.js 16**, **PostgreSQL (Supabase)**, and a house-favored pari-mutuel pricing algorithm.

![Strike Markets](public/logo.png)

---

## Features

- **Multi-choice prediction markets** — not just yes/no, any number of outcomes
- **House-favored pricing algorithm**
  - 20% buy markup (users pay more than fair price per share)
  - 20% sell markdown (users receive less than fair value when selling)
  - 2% flat transaction fee on all trades
  - 20% resolution rake on all winnings
- **User accounts** — register with username, email & password
- **1,000 VCoins** starting balance
- **Leaderboard** — ranked by net worth (balance + portfolio)
- **Admin dashboard** at `/admin` (hidden from nav, direct URL access only)
  - Strike (resolve) markets — declare winner, distribute 80% to winners, 20% to house
  - Void markets — cancel and refund all users
  - View all platform stats: volume, fees, spread profit, resolution rake
  - Full transaction log

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Supabase) |
| Auth | Cookie-based sessions + bcryptjs |
| Styling | Vanilla CSS (no Tailwind) |
| Fonts | Fira Sans + Fira Code (Google Fonts) |

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/ekusafamily/strikemarkets.git
cd strikemarkets
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
```

> For Supabase, use the **Session Mode Pooler** URL:
> `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

### 4. Initialize the database

```bash
node init-db.js
```

This creates all tables and seeds the system stats counters.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **First registered user automatically becomes admin.** Go to `/admin` to manage markets.

---

## Deploying to Render.com

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "deploy"
git push origin main
```

### Step 2 — Create a new Web Service on Render

1. Go to [https://render.com](https://render.com) and sign in
2. Click **New → Web Service**
3. Connect your GitHub account and select the **strikemarkets** repository
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `strikemarkets` |
| **Region** | Choose nearest to your Supabase region |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter for always-on) |

> **Note:** `node init-db.js` runs automatically as part of `postbuild` — no shell access needed. The schema is idempotent (uses `IF NOT EXISTS`) so it never wipes existing data on redeployments.

### Step 3 — Add Environment Variables

In the Render dashboard, go to your service → **Environment** tab, and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Supabase pooler connection string |
| `NODE_ENV` | `production` |

> **Supabase Pooler URL format:**
> `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
>
> Find this in: Supabase Dashboard → Project → Settings → Database → Connection Pooling → **Session mode**

### Step 4 — Initialize the database

After your first deploy, open the Render **Shell** tab and run:

```bash
node init-db.js
```

Or run it locally with the production `DATABASE_URL` set:

```bash
DATABASE_URL=postgresql://... node init-db.js
```

### Step 5 — Deploy

Click **Deploy**. Render will build and start the app. Your site will be live at:

```
https://strikemarkets.onrender.com
```

---

## Admin Access

The admin panel is intentionally **not linked** in the navbar. Access it directly at:

```
https://your-domain.onrender.com/admin
```

The **first user to register** on the platform is automatically set as admin.

---

## Project Structure

```
strikemarkets/
├── public/
│   └── logo.png              # Site favicon & logo
├── src/
│   ├── app/
│   │   ├── admin/page.js     # Admin dashboard (hidden route)
│   │   ├── api/
│   │   │   ├── auth/         # Login / Register (bcrypt)
│   │   │   ├── markets/      # List & create markets
│   │   │   ├── trade/        # Buy & sell shares
│   │   │   ├── claim/        # Daily 100 VC claim
│   │   │   ├── resolve/      # Strike (resolve) a market
│   │   │   ├── admin/
│   │   │   │   ├── markets/  # All markets (admin view)
│   │   │   │   ├── stats/    # Platform profit metrics
│   │   │   │   └── cancel/   # Void & refund a market
│   │   │   └── leaderboard/  # User rankings
│   │   ├── create/page.js    # Create market form
│   │   ├── leaderboard/      # Leaderboard page
│   │   ├── market/[id]/      # Market detail & trading
│   │   ├── globals.css       # Design system
│   │   ├── layout.js         # Root layout + favicon
│   │   └── page.js           # Home / markets list
│   ├── components/
│   │   └── Navbar.js         # Shared navbar component
│   └── lib/
│       ├── db.js             # PostgreSQL connection pool
│       └── parimutuel.js     # House-favored pricing algorithm
├── schema.sql                # Database schema
├── init-db.js                # DB initialization script
└── .env.local                # 🔒 Never committed (in .gitignore)
```

---

## Pricing Algorithm

The platform uses a **House-Favored Pari-Mutuel** model:

```
Fair Price   = pool_i / total_pool
Buy Price    = min(0.95, fair × 1.20)   ← 20% overround
Sell Price   = fair × 0.80              ← 20% markdown
Tx Fee       = 2% of trade amount
Resolution   = 20% rake off total pool, 80% to winners
```

Users never see the internal fair price — only the displayed buy price is shown, making the spread invisible to traders.

---

## License

MIT
