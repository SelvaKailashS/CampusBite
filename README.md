# 🍽️ CampusBite
**Skip the line. Grab a token. Eat happy.**
A full-stack multi-canteen ordering platform built for **Nehru Institute of Engineering & Technology, Coimbatore**. Students can browse menus from 4 campus canteens, place orders with real-time tokens, and get their food via pickup or desk delivery — while canteen admins manage their own outlet's orders and menu through a dedicated dashboard.
🌐 **Live site:** [campus-bite-iota.vercel.app](https://campus-bite-iota.vercel.app)
---
## ✨ Features
### 👨‍🎓 For Students
- 🔐 **Real account system** — register with any email, secure password hashing
- 🏛️ **4 real campus canteens** — Spicy, Cafeteria, Nehru Food Spot & Fresh Juice
- 🍔 **35+ dishes** across snacks, meals, and drinks with photos
- 🔍 **Smart filters** — Veg/Non-Veg, Popular, Under ₹50, category filters
- 💪 **Health filters** — High Protein, Diabetes Safe, Exam Focus, Light Diet, Jain
- 🎟️ **Digital tokens** — unique tokens per canteen (e.g., S-047, N-023)
- 🚚 **Two order modes** — Token Pickup or Desk Delivery (Block · Room · Row · Desk)
- 💳 **4 payment methods** — UPI, Card, Campus Wallet (₹450 starter), or Pay at Counter
- ✨ **AI Concierge** — ask "I have ₹50, suggest something" and get real recommendations
- 📊 **Order tracker** — 6-stage animated pipeline from confirmation to delivery
- 📱 **Responsive** — works on mobile, tablet, and desktop
### 🛡️ For Admins
- 🔒 **Role-based access** with pre-defined passcodes
  - Canteen admins: `niet2006`
  - Super Admin: `pkdas`
- 📈 **Live KPI dashboard** — revenue, order count, live orders, top dishes
- 🍽️ **Menu management** — add/edit/remove items, toggle signature dishes, change prices inline
- 📦 **Order pipeline** — advance stages (Accept → Preparing → Ready → Runner → Delivering → Delivered)
- 💰 **Cancel & refund** — auto-refunds to wallet if paid via wallet
- 🏛️ **Canteen status control** — toggle Open / Busy / Closed
- 👥 **Student directory** — spend history and account info
- 🔐 **Data isolation** — each canteen admin only sees their own canteen's data (super admin sees everything)
---
## 🏗️ Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS 4 |
| **Backend** | Vercel Serverless Functions (Node.js) |
| **Database** | PostgreSQL on [Neon](https://neon.tech) |
| **ORM** | [Prisma](https://www.prisma.io) |
| **Auth** | JWT tokens · bcryptjs password hashing |
| **Hosting** | [Vercel](https://vercel.com) (frontend + API) |
| **Version Control** | Git · GitHub |
---
## 🗂️ Project Structure
```
CampusBite/
├── api/                  # Vercel serverless API endpoints
│   ├── auth/
│   │   ├── login.js       # POST — sign in / register
│   │   └── me.js          # GET/PATCH — get / update profile
│   ├── admin/
│   │   ├── kpis.js        # GET — dashboard analytics (scoped)
│   │   ├── orders.js      # GET/PATCH/DELETE — order management
│   │   └── students.js    # GET — student directory
│   ├── canteens.js        # GET/PATCH — list & update status
│   ├── foods.js           # GET/POST — menu items
│   ├── foods/[id].js      # PATCH/DELETE — edit single item
│   ├── orders.js          # POST — place a new order
│   ├── orders/mine.js     # GET — student's own orders
│   ├── orders/[id].js     # GET — track single order
│   └── health.js          # GET — API + DB health check
├── lib/
│   ├── prisma.js          # Prisma client singleton
│   └── auth.js            # JWT signing + auth middleware
├── prisma/
│   ├── schema.prisma      # Database schema (User, Canteen, Food, Order, OrderItem)
│   └── seed.js            # Seeds 4 canteens + 35 dishes
├── src/
│   ├── App.tsx            # Main React app
│   ├── api.ts             # Frontend API client
│   ├── data.ts            # Static UI data (colors, filters)
│   ├── types.ts           # TypeScript types
│   └── main.tsx           # Entry point
├── public/
│   └── logos/             # Canteen & college logos
├── vercel.json            # Vercel build config
└── package.json
```
---
## 🚀 Local Development
### Prerequisites
- Node.js 18+
- A free [Neon](https://neon.tech) PostgreSQL database
### Setup
```bash
# Clone the repo
git clone https://github.com/SelvaKailashS/CampusBite.git
cd CampusBite
# Install dependencies
npm install
# Create .env file with your Neon connection string
echo 'DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"' > .env
# Push schema to database
npx prisma db push
# Seed canteens & food items
npm run seed
# Start dev server
npm run dev
```
Visit `http://localhost:5173`.
---
## 🌐 Deployment (Vercel)
1. Push your repo to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add these **Environment Variables** in Vercel settings:
| Key | Description |
|---|---|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `JWT_SECRET` | Any 32+ character random string for signing tokens |
| `CANTEEN_ADMIN_PASSCODE` | Passcode for canteen admins (e.g., `niet2006`) |
| `SUPER_ADMIN_PASSCODE` | Passcode for super admin (e.g., `pkdas`) |
4. Deploy 🚀
Vercel auto-runs `prisma generate && prisma db push && vite build` on every push.
---
## 🔒 Security
- Passwords hashed with **bcrypt** (never stored in plain text)
- **JWT tokens** with 7-day expiry for session persistence
- **Canteen scoping enforced server-side** — a Spicy admin cannot access Nehru orders even by tampering with requests
- **Rate limiting** on login attempts (10 per 15 min per IP)
- **Prices validated server-side** — students can't submit fake ₹1 orders
- Environment secrets never bundled into client code
---
## 🎨 Design
- **Warm cream palette** (`#F6F2EA`) — inviting and food-appropriate
- **Forest green primary** (`#14532D`) — trust, freshness, appetite
- **Butter yellow accents** (`#FCECC5`) — attention-grabbing CTAs
- **Tomato red** (`#D64545`) — italic display accents
- **Typography** — Plus Jakarta Sans (UI) + Instrument Serif (italic display) + JetBrains Mono (tokens & prices)
---
## 📄 License
Built as a student project for Nehru Institute of Engineering & Technology, Coimbatore.  
© 2026 CampusBite — Built with care for students.
---
## 🙌 Credits
- Food photography from [Pexels](https://pexels.com)
- Icons and emoji from native OS emoji sets
- Built with ❤️ for hungry students trying to skip the queue
