import { describe, it, expect } from "vitest";
import { calculateEqualSplit } from "../split";
import {
  calculateGroupBalances,
  calculateSuggestedSettlements,
  type ExpenseRecord,
  type SettlementRecord,
} from "../balance";

describe("Financial Precision Engine", () => {
  describe("calculateEqualSplit", () => {
    it("should split ₹1,000 evenly among 3 participants with exact 1-paise remainder distribution", () => {
      // ₹1,000.00 = 100,000 paise
      const totalAmountPaise = 100000;
      const participants = ["user-1", "user-2", "user-3"];

      const splits = calculateEqualSplit(totalAmountPaise, participants);

      expect(splits).toHaveLength(3);
      // 100,000 / 3 = 33,333 remainder 1
      // User 1 gets 33,334; User 2 & 3 get 33,333
      expect(splits[0]).toEqual({ userId: "user-1", sharePaise: 33334 });
      expect(splits[1]).toEqual({ userId: "user-2", sharePaise: 33333 });
      expect(splits[2]).toEqual({ userId: "user-3", sharePaise: 33333 });

      const sum = splits.reduce((acc, curr) => acc + curr.sharePaise, 0);
      expect(sum).toBe(totalAmountPaise);
    });

    it("should split cleanly when divisible without remainder", () => {
      const totalAmountPaise = 90000; // ₹900.00
      const participants = ["user-1", "user-2", "user-3"];

      const splits = calculateEqualSplit(totalAmountPaise, participants);

      expect(splits[0].sharePaise).toBe(30000);
      expect(splits[1].sharePaise).toBe(30000);
      expect(splits[2].sharePaise).toBe(30000);
      expect(splits.reduce((a, b) => a + b.sharePaise, 0)).toBe(90000);
    });

    it("should handle custom subset of members where some members are excluded", () => {
      // 5 members in group, but only 2 participated in ₹500 (50000 paise)
      const splits = calculateEqualSplit(50000, ["user-1", "user-2"]);
      expect(splits).toHaveLength(2);
      expect(splits[0].sharePaise).toBe(25000);
      expect(splits[1].sharePaise).toBe(25000);
    });

    it("should throw error when zero participants are provided", () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
    });
  });

  describe("calculateGroupBalances & calculateSuggestedSettlements", () => {
    it("calculates exact balances and suggested minimal settlement payments", () => {
      /**
       * Scenario from prompt:
       * 5 members: Rahul (U1), Priyanshu (U2), Amit (U3), Rohit (U4), Vikas (U5).
       * Rahul spends ₹1,000 (100,000 paise) on dinner.
       * Only Rahul, Priyanshu, and Amit participated.
       * Splits: Rahul = 33,334; Priyanshu = 33,333; Amit = 33,333.
       * Rohit and Vikas = 0.
       */
      const memberIds = ["rahul", "priyanshu", "amit", "rohit", "vikas"];

      const expenses: ExpenseRecord[] = [
        {
          _id: "exp-1",
          paidBy: "rahul",
          amountPaise: 100000,
          splits: [
            { userId: "rahul", sharePaise: 33334 },
            { userId: "priyanshu", sharePaise: 33333 },
            { userId: "amit", sharePaise: 33333 },
          ],
        },
      ];

      const balances = calculateGroupBalances(memberIds, expenses, []);

      // Rahul paid 100,000. Share is 33,334. Net = +66,666 (to receive)
      const rahul = balances.get("rahul")!;
      expect(rahul.totalPaidPaise).toBe(100000);
      expect(rahul.totalExpenseSharePaise).toBe(33334);
      expect(rahul.netBalancePaise).toBe(66666);
      expect(rahul.amountToReceivePaise).toBe(66666);
      expect(rahul.amountToPayPaise).toBe(0);

      // Priyanshu paid 0. Share is 33,333. Net = -33,333 (to pay)
      const priyanshu = balances.get("priyanshu")!;
      expect(priyanshu.netBalancePaise).toBe(-33333);
      expect(priyanshu.amountToPayPaise).toBe(33333);

      // Amit paid 0. Share is 33,333. Net = -33,333 (to pay)
      const amit = balances.get("amit")!;
      expect(amit.netBalancePaise).toBe(-33333);
      expect(amit.amountToPayPaise).toBe(33333);

      // Rohit and Vikas should be 0
      expect(balances.get("rohit")!.netBalancePaise).toBe(0);
      expect(balances.get("vikas")!.netBalancePaise).toBe(0);

      // Conservation of balances: sum(netBalances) === 0
      const sumNet = Array.from(balances.values()).reduce(
        (sum, m) => sum + m.netBalancePaise,
        0
      );
      expect(sumNet).toBe(0);

      // Suggested settlements
      const suggestions = calculateSuggestedSettlements(balances);
      // Both Priyanshu and Amit owe Rahul 33,333 paise each
      expect(suggestions).toHaveLength(2);
      expect(suggestions.find((s) => s.fromUserId === "priyanshu")).toEqual({
        fromUserId: "priyanshu",
        toUserId: "rahul",
        amountPaise: 33333,
        status: "PENDING",
      });
      expect(suggestions.find((s) => s.fromUserId === "amit")).toEqual({
        fromUserId: "amit",
        toUserId: "rahul",
        amountPaise: 33333,
        status: "PENDING",
      });
    });

    it("settlement updates balance correctly when recorded", () => {
      const memberIds = ["rahul", "priyanshu"];
      const expenses: ExpenseRecord[] = [
        {
          _id: "exp-1",
          paidBy: "rahul",
          amountPaise: 50000, // ₹500
          splits: [
            { userId: "rahul", sharePaise: 25000 },
            { userId: "priyanshu", sharePaise: 25000 },
          ],
        },
      ];

      // Priyanshu settles by paying ₹250 to Rahul
      const settlements: SettlementRecord[] = [
        {
          _id: "set-1",
          paidBy: "priyanshu",
          paidTo: "rahul",
          amountPaise: 25000,
          status: "CONFIRMED",
        },
      ];

      const balances = calculateGroupBalances(memberIds, expenses, settlements);
      expect(balances.get("rahul")!.netBalancePaise).toBe(0);
      expect(balances.get("priyanshu")!.netBalancePaise).toBe(0);

      const suggestions = calculateSuggestedSettlements(balances);
      expect(suggestions).toHaveLength(0);
    });
  });
});
