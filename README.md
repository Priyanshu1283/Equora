# Equora – Production Group Expense Manager

Equora is a modern, responsive, precision-engineered **Group Expense Management Web Application** designed for roommates, friends, travel groups, and family shared finances.

---

## 🌟 Key Features

1. **Exact Integer Paise Engine**:
   - Zero floating-point rounding errors (`0.1 + 0.2 = 0.30000000000000004` is completely eliminated).
   - Equal splits with automated 1-paise remainder distribution (e.g., ₹1,000 split across 3 people = ₹333.34, ₹333.33, ₹333.33 -> Exact ₹1,000.00).

2. **Custom Participant Selection**:
   - **All Members (Default)**: Auto-divides equally across all group members.
   - **Custom Selection**: Select exact participants (e.g., only 3 out of 5 roommates participated in dinner).
   - Payer and participants are independent (payer does not need to be a consumer).

3. **Minimal Cash-Flow Settlement Engine**:
   - Greedy algorithm calculates the minimal transactions needed to clear all debts.
   - Real-time suggested payments (`Member A owes Member B ₹X`).
   - Manual confirmation safeguards: payments are never automatically assumed completed.

4. **Multi-Tab Group Dashboard**:
   - **Overview & Balances**: Member-wise breakdown (Total Paid, Total Share, Net Balance, Receivables, Payables).
   - **Expenses**: Category filter, payer filter, date filter, edit and delete actions.
   - **Analytics & Reports**: Visual Recharts breakdown (Category distribution and monthly trends).
   - **Settlements**: Complete log of confirmed repayments.
   - **Members & Safeguards**: Role management (Admin/Member), invite links, and balance-safe leave group guard.

5. **Human-Crafted UI**:
   - Warm slate & stone aesthetic.
   - Tabular monospace numbers for currency clarity.
   - Forest emerald accents for receivables (`+₹X.XX`) and warm terracotta for payables (`-₹X.XX`).

---

## 🚀 Getting Started

### 1. Environment Configuration

Create or update `.env.local`:

```env
# MongoDB Connection String (MongoDB Atlas or Local)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/equora?retryWrites=true&w=majority

# NextAuth / Auth.js
AUTH_SECRET=equora_development_secret_key_32_chars_long_minimum!
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (From Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Dev Fallback Login (Allows instant 1-click test user profiles: Rahul, Priyanshu, Amit)
ALLOW_DEV_LOGIN=true
```

### 2. Run the Development Server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests

```bash
pnpm test
```

### 4. Build for Production

```bash
pnpm run build
pnpm start
```

---

## 🏗️ Architecture

```
Equora/
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (auth)/login/         # Login Page (Google + Demo profiles)
│   │   ├── dashboard/            # Personal Financial Overview
│   │   ├── groups/               # Groups Directory & Group Dashboard
│   │   ├── join/                 # Group Invitation Join Portal
│   │   └── api/                  # Modular Route Handlers (Groups, Expenses, Balances, Settlements)
│   ├── components/
│   │   ├── ui/                   # Reusable clean UI primitives (Button, Modal, Input, Badge)
│   │   ├── layout/               # Navbar & Menus
│   │   ├── expenses/             # ExpenseModal (with live preview & participant toggle)
│   │   ├── balances/             # SettlementModal
│   │   └── groups/               # CreateGroupModal, InviteModal
│   ├── lib/
│   │   ├── calculations/         # Integer paise split & balance math + tests
│   │   ├── models/               # Mongoose multi-collection schemas (8 collections)
│   │   ├── db/                   # Connection singleton
│   │   ├── validations/          # Zod validation contracts
│   │   └── utils.ts              # Currency & format helpers
```
