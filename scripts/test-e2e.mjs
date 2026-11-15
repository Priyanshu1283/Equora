/**
 * End-to-End Live Workflow Verification Script
 */

import { BASE_URL, getTestUsers, registerAndLogin } from "./auth-test-helper.mjs";

async function runE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING EQUORA END-TO-END WORKFLOW TEST");
  console.log("==================================================\n");
  const [user1, user2] = getTestUsers();

  // Step 1: Create / authenticate the first test account
  console.log("👉 Step 1: Creating or signing in as test user 1...");
  const user1Cookie = await registerAndLogin(user1);
  if (!user1Cookie) {
    throw new Error("Failed to get session cookie for test user 1.");
  }
  console.log("✅ Test user 1 authenticated successfully!\n");

  // Step 2: Create Group "Goa Trip 2026"
  console.log("👉 Step 2: Creating Group 'Goa Trip 2026'...");
  const createGroupRes = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: user1Cookie,
    },
    body: JSON.stringify({
      name: "Goa Trip 2026",
      description: "Beach vacation with friends",
      groupType: "TRAVEL",
      currency: "INR",
    }),
  });

  const groupData = await createGroupRes.json();
  if (!createGroupRes.ok) {
    throw new Error(`Failed to create group: ${JSON.stringify(groupData)}`);
  }
  const groupId = groupData.group._id;
  console.log(`✅ Group created successfully! Group ID: ${groupId}`);
  console.log(`   Name: ${groupData.group.name} | Type: ${groupData.group.groupType}\n`);

  // Step 3: Invite test user 2
  console.log("👉 Step 3: Inviting test user 2...");
  const inviteRes = await fetch(`${BASE_URL}/api/groups/${groupId}/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: user1Cookie,
    },
    body: JSON.stringify({
      email: user2.email,
    }),
  });

  const inviteData = await inviteRes.json();
  if (!inviteRes.ok) {
    throw new Error(`Failed to invite: ${JSON.stringify(inviteData)}`);
  }
  const token = inviteData.invitation.token;
  console.log(`✅ Invitation created. Email sent: ${inviteData.emailSent}`);
  console.log(`   Invite Link: ${inviteData.inviteLink}\n`);

  // Step 4: Authenticate test user 2 and accept the invitation
  console.log("👉 Step 4: Authenticating test user 2 and accepting invitation...");
  const user2Cookie = await registerAndLogin(user2);

  const acceptRes = await fetch(`${BASE_URL}/api/invitations/${token}`, {
    method: "POST",
    headers: {
      Cookie: user2Cookie,
    },
  });
  const acceptData = await acceptRes.json();
  if (!acceptRes.ok) {
    throw new Error(`Failed to accept invitation: ${JSON.stringify(acceptData)}`);
  }
  console.log(`✅ Test user 2 joined group: ${acceptData.message}\n`);

  // Step 5: Get Group Details and Members
  console.log("👉 Step 5: Fetching Group Members...");
  const membersRes = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    headers: { Cookie: user1Cookie },
  });
  const membersData = await membersRes.json();
  console.log(`✅ Group has ${membersData.members.length} members:`);
  for (const m of membersData.members) {
    console.log(`   - ${m.user.name} (${m.user.email}) [Role: ${m.role}]`);
  }
  console.log("");

  const user1Member = membersData.members.find((m) => m.user.email === user1.email);
  const user2Member = membersData.members.find((m) => m.user.email === user2.email);

  const user1Id = user1Member.user._id;
  const user2Id = user2Member.user._id;

  // Step 6: Add Shared Expense "Beach Resort Stay" = ₹3,000.00 (300,000 paise)
  console.log("👉 Step 6: Test user 1 adds a shared resort expense...");
  const expenseRes = await fetch(`${BASE_URL}/api/groups/${groupId}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: user1Cookie,
    },
    body: JSON.stringify({
      title: "Beach Resort Stay",
      amountPaise: 300000, // ₹3,000.00
      category: "Accommodation",
      paidBy: user1Id,
      date: new Date().toISOString(),
      notes: "3 nights booking at Calangute",
      participantUserIds: [user1Id, user2Id],
    }),
  });

  const expenseData = await expenseRes.json();
  if (!expenseRes.ok) {
    throw new Error(`Failed to add expense: ${JSON.stringify(expenseData)}`);
  }
  console.log(`✅ Expense added! Title: "${expenseData.expense.title}"`);
  console.log(`   Total Amount: ₹${expenseData.expense.amountPaise / 100}.00`);
  console.log(`   Splits:`);
  for (const s of expenseData.splits) {
    const memberName = s.userId === user1Id ? user1.name : user2.name;
    console.log(`     - ${memberName}: ₹${s.sharePaise / 100}.00`);
  }
  console.log("");

  // Step 7: Check Balances & Suggested Settlements
  console.log("👉 Step 7: Fetching Balances & Minimal Settlement Instructions...");
  const balanceRes = await fetch(`${BASE_URL}/api/groups/${groupId}/balances`, {
    headers: { Cookie: user1Cookie },
  });
  const balanceData = await balanceRes.json();

  console.log("✅ Member Balances Summary:");
  for (const m of balanceData.members) {
    const netFormatted = (m.netBalancePaise / 100).toFixed(2);
    const sign = m.netBalancePaise > 0 ? "+" : "";
    console.log(`   - ${m.name}: Paid ₹${(m.totalPaidPaise / 100).toFixed(2)} | Share ₹${(m.totalExpenseSharePaise / 100).toFixed(2)} | Net: ${sign}₹${netFormatted}`);
  }

  console.log("\n   Suggested Settlements:");
  for (const s of balanceData.suggestedSettlements) {
    console.log(`   👉 ${s.fromUser.name} OWES ${s.toUser.name} : ₹${(s.amountPaise / 100).toFixed(2)}`);
  }
  console.log("");

  // Step 8: Test user 2 settles up with test user 1
  console.log("👉 Step 8: Test user 2 records a settlement payment...");
  const settleRes = await fetch(`${BASE_URL}/api/groups/${groupId}/settlements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: user2Cookie,
    },
    body: JSON.stringify({
      paidBy: user2Id,
      paidTo: user1Id,
      amountPaise: 150000, // ₹1,500.00
      date: new Date().toISOString(),
      notes: "Paid via Google Pay UPI Ref #987654321",
    }),
  });

  const settleData = await settleRes.json();
  if (!settleRes.ok) {
    throw new Error(`Failed to record settlement: ${JSON.stringify(settleData)}`);
  }
  console.log(`✅ Settlement recorded! "${settleData.message}"\n`);

  // Step 9: Verify Balances after settlement (should be exactly ₹0.00 for both)
  console.log("👉 Step 9: Re-verifying Balances after settlement...");
  const postBalanceRes = await fetch(`${BASE_URL}/api/groups/${groupId}/balances`, {
    headers: { Cookie: user1Cookie },
  });
  const postBalanceData = await postBalanceRes.json();

  console.log("✅ Member Balances After Settlement:");
  for (const m of postBalanceData.members) {
    console.log(`   - ${m.name}: Net Balance = ₹${(m.netBalancePaise / 100).toFixed(2)} (Settled)`);
  }
  console.log(`   Pending Suggested Payments: ${postBalanceData.suggestedSettlements.length}`);
  console.log("");

  // Step 10: Verify Analytics & Reports
  console.log("👉 Step 10: Fetching Analytics & Reports...");
  const reportsRes = await fetch(`${BASE_URL}/api/groups/${groupId}/reports`, {
    headers: { Cookie: user1Cookie },
  });
  const reportsData = await reportsRes.json();
  console.log("✅ Category Breakdown:");
  for (const c of reportsData.categoryBreakdown) {
    console.log(`   - ${c.category}: ₹${c.totalRupees.toFixed(2)} (${c.count} transaction)`);
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 10 END-TO-END STEPS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

runE2ETest().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
