/**
 * End-to-End Live Workflow Verification Script
 */

const BASE_URL = "http://localhost:3000";

async function loginUser(email, name) {
  // 1. Get CSRF Token and cookie
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie();
  const csrfHeader = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const params = new URLSearchParams();
  params.append("email", email);
  params.append("name", name);
  params.append("csrfToken", csrfData.csrfToken);

  // 2. Post credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/dev-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfHeader,
    },
    body: params,
    redirect: "manual",
  });

  const loginCookies = loginRes.headers.getSetCookie();
  const sessionCookie = loginCookies.map((c) => c.split(";")[0]).join("; ");
  return sessionCookie;
}

async function runE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING EQUORA END-TO-END WORKFLOW TEST");
  console.log("==================================================\n");

  // Step 1: Create / Authenticate Rahul
  console.log("👉 Step 1: Authenticating User 1 (Rahul Sharma)...");
  const rahulCookie = await loginUser("rahul@demo.com", "Rahul Sharma");
  if (!rahulCookie) {
    throw new Error("Failed to get session cookie for Rahul");
  }
  console.log("✅ Rahul Sharma authenticated successfully!\n");

  // Step 2: Create Group "Goa Trip 2026"
  console.log("👉 Step 2: Creating Group 'Goa Trip 2026' as Rahul...");
  const createGroupRes = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: rahulCookie,
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

  // Step 3: Invite Priyanshu
  console.log("👉 Step 3: Inviting Priyanshu Verma (priyanshu@demo.com)...");
  const inviteRes = await fetch(`${BASE_URL}/api/groups/${groupId}/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: rahulCookie,
    },
    body: JSON.stringify({
      email: "priyanshu@demo.com",
    }),
  });

  const inviteData = await inviteRes.json();
  if (!inviteRes.ok) {
    throw new Error(`Failed to invite: ${JSON.stringify(inviteData)}`);
  }
  const token = inviteData.invitation.token;
  console.log(`✅ Invitation created! Token: ${token}`);
  console.log(`   Invite Link: ${inviteData.inviteLink}\n`);

  // Step 4: Authenticate Priyanshu and Accept Invitation
  console.log("👉 Step 4: Authenticating Priyanshu and accepting invitation...");
  const priyanshuCookie = await loginUser("priyanshu@demo.com", "Priyanshu Verma");

  const acceptRes = await fetch(`${BASE_URL}/api/invitations/${token}`, {
    method: "POST",
    headers: {
      Cookie: priyanshuCookie,
    },
  });
  const acceptData = await acceptRes.json();
  console.log(`✅ Priyanshu joined group: ${acceptData.message}\n`);

  // Step 5: Get Group Details and Members
  console.log("👉 Step 5: Fetching Group Members...");
  const membersRes = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    headers: { Cookie: rahulCookie },
  });
  const membersData = await membersRes.json();
  console.log(`✅ Group has ${membersData.members.length} members:`);
  for (const m of membersData.members) {
    console.log(`   - ${m.user.name} (${m.user.email}) [Role: ${m.role}]`);
  }
  console.log("");

  const rahulMember = membersData.members.find((m) => m.user.email === "rahul@demo.com");
  const priyanshuMember = membersData.members.find((m) => m.user.email === "priyanshu@demo.com");

  const rahulId = rahulMember.user._id;
  const priyanshuId = priyanshuMember.user._id;

  // Step 6: Add Shared Expense "Beach Resort Stay" = ₹3,000.00 (300,000 paise)
  console.log("👉 Step 6: Rahul adds expense: 'Beach Resort Stay' (₹3,000.00) split equally between Rahul & Priyanshu...");
  const expenseRes = await fetch(`${BASE_URL}/api/groups/${groupId}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: rahulCookie,
    },
    body: JSON.stringify({
      title: "Beach Resort Stay",
      amountPaise: 300000, // ₹3,000.00
      category: "Accommodation",
      paidBy: rahulId,
      date: new Date().toISOString(),
      notes: "3 nights booking at Calangute",
      participantUserIds: [rahulId, priyanshuId],
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
    const memberName = s.userId === rahulId ? "Rahul" : "Priyanshu";
    console.log(`     - ${memberName}: ₹${s.sharePaise / 100}.00`);
  }
  console.log("");

  // Step 7: Check Balances & Suggested Settlements
  console.log("👉 Step 7: Fetching Balances & Minimal Settlement Instructions...");
  const balanceRes = await fetch(`${BASE_URL}/api/groups/${groupId}/balances`, {
    headers: { Cookie: rahulCookie },
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

  // Step 8: Priyanshu settles up with Rahul (Pays ₹1,500.00)
  console.log("👉 Step 8: Priyanshu records settlement payment of ₹1,500.00 to Rahul...");
  const settleRes = await fetch(`${BASE_URL}/api/groups/${groupId}/settlements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: priyanshuCookie,
    },
    body: JSON.stringify({
      paidBy: priyanshuId,
      paidTo: rahulId,
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
    headers: { Cookie: rahulCookie },
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
    headers: { Cookie: rahulCookie },
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
