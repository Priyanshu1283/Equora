export interface SplitResult {
  userId: string;
  sharePaise: number;
}

/**
 * Calculates equal splits for an expense among participants using exact integer paise arithmetic.
 * Ensures that sum(splits) === totalAmountPaise by allocating any remainder (R = total % N)
 * 1 paise at a time to the first R participants.
 *
 * @param totalAmountPaise Total expense in integer paise (e.g. ₹1000 = 100000)
 * @param participantUserIds List of distinct user IDs sharing the expense
 * @returns Array of { userId, sharePaise }
 */
export function calculateEqualSplit(
  totalAmountPaise: number,
  participantUserIds: string[]
): SplitResult[] {
  if (participantUserIds.length === 0) {
    throw new Error("Cannot split expense with zero participants.");
  }

  if (totalAmountPaise <= 0) {
    throw new Error("Total expense amount must be greater than zero.");
  }

  const n = participantUserIds.length;
  const baseShare = Math.floor(totalAmountPaise / n);
  const remainder = totalAmountPaise % n;

  const splits: SplitResult[] = participantUserIds.map((userId, index) => {
    // First 'remainder' participants get 1 extra paise
    const sharePaise = index < remainder ? baseShare + 1 : baseShare;
    return {
      userId,
      sharePaise,
    };
  });

  // Verify invariant
  const sumOfShares = splits.reduce((acc, curr) => acc + curr.sharePaise, 0);
  if (sumOfShares !== totalAmountPaise) {
    throw new Error(
      `Mathematical invariant violated: sum(${sumOfShares}) != total(${totalAmountPaise})`
    );
  }

  return splits;
}
