export interface MemberFinancialSummary {
  userId: string;
  name?: string;
  email?: string;
  image?: string;
  totalPaidPaise: number;
  totalExpenseSharePaise: number;
  netBalancePaise: number;
  amountToReceivePaise: number;
  amountToPayPaise: number;
}

export interface SuggestedPayment {
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
  status: "PENDING";
}

export interface ExpenseRecord {
  _id: string;
  paidBy: string; // userId
  amountPaise: number;
  splits: Array<{
    userId: string;
    sharePaise: number;
  }>;
  date?: Date | string;
}

export interface SettlementRecord {
  _id: string;
  paidBy: string; // sender userId
  paidTo: string; // receiver userId
  amountPaise: number;
  date?: Date | string;
  status?: string;
}

/**
 * Computes individual member balances across a list of expenses and confirmed settlements.
 *
 * Formula for each member M:
 * Total Paid = Sum of expenses where M is payer + Sum of settlements where M is sender
 * Total Share = Sum of splits where M is participant + Sum of settlements where M is recipient
 * Net Balance = Total Paid - Total Share
 */
export function calculateGroupBalances(
  memberUserIds: string[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[] = []
): Map<string, MemberFinancialSummary> {
  const summaryMap = new Map<string, MemberFinancialSummary>();

  for (const uid of memberUserIds) {
    summaryMap.set(uid, {
      userId: uid,
      totalPaidPaise: 0,
      totalExpenseSharePaise: 0,
      netBalancePaise: 0,
      amountToReceivePaise: 0,
      amountToPayPaise: 0,
    });
  }

  // 1. Process Expenses
  for (const exp of expenses) {
    const payerSummary = summaryMap.get(exp.paidBy.toString());
    if (payerSummary) {
      payerSummary.totalPaidPaise += exp.amountPaise;
    }

    for (const split of exp.splits) {
      const partSummary = summaryMap.get(split.userId.toString());
      if (partSummary) {
        partSummary.totalExpenseSharePaise += split.sharePaise;
      }
    }
  }

  // 2. Process Settlements (Confirmed transfers)
  for (const set of settlements) {
    if (set.status && set.status !== "CONFIRMED") continue;

    // Payer sent money -> increases their total paid (reduces their debt)
    const sender = summaryMap.get(set.paidBy.toString());
    if (sender) {
      sender.totalPaidPaise += set.amountPaise;
    }

    // Receiver received money -> increases their total share (reduces what they are owed)
    const receiver = summaryMap.get(set.paidTo.toString());
    if (receiver) {
      receiver.totalExpenseSharePaise += set.amountPaise;
    }
  }

  // 3. Compute net balances & receivables/payables
  for (const summary of summaryMap.values()) {
    summary.netBalancePaise =
      summary.totalPaidPaise - summary.totalExpenseSharePaise;

    if (summary.netBalancePaise > 0) {
      summary.amountToReceivePaise = summary.netBalancePaise;
      summary.amountToPayPaise = 0;
    } else if (summary.netBalancePaise < 0) {
      summary.amountToPayPaise = Math.abs(summary.netBalancePaise);
      summary.amountToReceivePaise = 0;
    } else {
      summary.amountToReceivePaise = 0;
      summary.amountToPayPaise = 0;
    }
  }

  return summaryMap;
}

/**
 * Computes suggested minimal settlement transactions between debtors and creditors.
 * Uses a greedy minimum cash flow algorithm.
 *
 * IMPORTANT: These are merely suggested instructions for users to settle up manually.
 * No transaction is marked completed automatically.
 */
export function calculateSuggestedSettlements(
  balances: Map<string, MemberFinancialSummary>
): SuggestedPayment[] {
  interface Account {
    userId: string;
    balance: number; // positive = creditor, negative = debtor
  }

  const creditors: Account[] = [];
  const debtors: Account[] = [];

  for (const [userId, summary] of balances.entries()) {
    if (summary.netBalancePaise > 0) {
      creditors.push({ userId, balance: summary.netBalancePaise });
    } else if (summary.netBalancePaise < 0) {
      debtors.push({ userId, balance: summary.netBalancePaise });
    }
  }

  // Sort descending by absolute amount
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance); // largest negative first

  const suggestions: SuggestedPayment[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const debtAmount = Math.abs(debtor.balance);
    const creditAmount = creditor.balance;

    const settledAmount = Math.min(debtAmount, creditAmount);

    if (settledAmount > 0) {
      suggestions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountPaise: settledAmount,
        status: "PENDING",
      });
    }

    creditor.balance -= settledAmount;
    debtor.balance += settledAmount;

    if (creditor.balance === 0) i++;
    if (debtor.balance === 0) j++;
  }

  return suggestions;
}
