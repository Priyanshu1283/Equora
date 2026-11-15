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

# SMTP (required for invitation emails; see .env.example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Equora <your-email@gmail.com>
```

Create an account with a name, email, and password, then use those same credentials
to sign in after logging out. Passwords are stored as bcrypt hashes.

To invite someone, a group admin enters their email. Equora sends a time-limited
invitation link and also provides a link to share directly. The invitee creates an
account or signs in with that exact email, returns to the invitation, and accepts
it. Active group admins receive an in-app notification when they join. Configure
SMTP above for email delivery; without it, the link is still available to share.

### 2. Run the Development Server

```bash
pnpm run dev
```

Open the **Local** URL printed by Next.js. If port 3000 is already in use, Next.js
will select another port, such as 3001.

### 3. Run Automated Tests

```bash
pnpm test
```

The live workflow scripts in `scripts/` use two real test accounts. Set
`EQUORA_TEST_USER1_EMAIL`, `EQUORA_TEST_USER1_PASSWORD`,
`EQUORA_TEST_USER2_EMAIL`, and `EQUORA_TEST_USER2_PASSWORD` in your shell, and
set `EQUORA_TEST_URL` to the Local URL printed by Next.js before running them.

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
│   │   ├── (auth)/login/         # Email/password account creation and sign-in
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
