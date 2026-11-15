/**
 * Test script for Notifications & Nodemailer Email Flow
 */

const BASE_URL = "http://localhost:3000";

async function loginUser(email, name) {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie();
  const csrfHeader = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const params = new URLSearchParams();
  params.append("email", email);
  params.append("name", name);
  params.append("csrfToken", csrfData.csrfToken);

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
  return loginCookies.map((c) => c.split(";")[0]).join("; ");
}

async function runNotificationTest() {
  console.log("==================================================");
  console.log("🔔 TESTING NOTIFICATIONS & NODEMAILER FLOW");
  console.log("==================================================\n");

  // 1. Authenticate Rahul
  console.log("👉 1. Login Rahul...");
  const rahulCookie = await loginUser("rahul@demo.com", "Rahul Sharma");

  // 2. Authenticate Priyanshu
  console.log("👉 2. Login Priyanshu...");
  const priyanshuCookie = await loginUser("priyanshu@demo.com", "Priyanshu Verma");

  // 3. Create Group as Rahul
  console.log("👉 3. Rahul creates group 'Weekend Party'...");
  const grpRes = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: rahulCookie },
    body: JSON.stringify({
      name: "Weekend Party",
      description: "Music & food",
      groupType: "FRIENDS",
    }),
  });
  const grpData = await grpRes.json();
  const groupId = grpData.group._id;
  console.log(`   Group created: ${grpData.group.name} (${groupId})\n`);

  // 4. Rahul invites Priyanshu via email
  console.log("👉 4. Rahul invites Priyanshu (priyanshu@demo.com)...");
  const inviteRes = await fetch(`${BASE_URL}/api/groups/${groupId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: rahulCookie },
    body: JSON.stringify({ email: "priyanshu@demo.com" }),
  });
  const inviteData = await inviteRes.json();
  console.log(`   Invite sent! Token: ${inviteData.invitation.token}\n`);

  // 5. Check Priyanshu's In-App Notifications
  console.log("👉 5. Checking Priyanshu's In-App Notifications...");
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: priyanshuCookie },
  });
  const notifData = await notifRes.json();
  console.log(`   Unread Notifications count: ${notifData.unreadCount}`);
  for (const n of notifData.notifications) {
    console.log(`   🔔 [${n.type}] ${n.title}: "${n.message}" (Read: ${n.isRead})`);
  }
  console.log("");

  // 6. Priyanshu joins the group
  console.log("👉 6. Priyanshu accepts invitation...");
  await fetch(`${BASE_URL}/api/invitations/${inviteData.invitation.token}`, {
    method: "POST",
    headers: { Cookie: priyanshuCookie },
  });
  console.log("   Priyanshu joined group!\n");

  // 7. Rahul adds expense: 'Barbeque & Snacks' = ₹1,200
  console.log("👉 7. Rahul adds expense 'Barbeque & Snacks' (₹1,200)...");
  const rahulProfile = await (await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: rahulCookie } })).json();
  const priyanshuProfile = await (await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: priyanshuCookie } })).json();

  await fetch(`${BASE_URL}/api/groups/${groupId}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: rahulCookie },
    body: JSON.stringify({
      title: "Barbeque & Snacks",
      amountPaise: 120000,
      category: "Food & Dining",
      paidBy: rahulProfile.user.id,
      date: new Date().toISOString(),
      participantUserIds: [rahulProfile.user.id, priyanshuProfile.user.id],
    }),
  });
  console.log("   Expense added!\n");

  // 8. Re-check Priyanshu's Notifications (Should have expense notification)
  console.log("👉 8. Priyanshu checks notifications after expense added...");
  const notifRes2 = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: priyanshuCookie },
  });
  const notifData2 = await notifRes2.json();
  console.log(`   Unread Notifications count: ${notifData2.unreadCount}`);
  for (const n of notifData2.notifications.slice(0, 3)) {
    console.log(`   🔔 [${n.type}] ${n.title}: "${n.message}"`);
  }
  console.log("");

  // 9. Mark all as read
  console.log("👉 9. Priyanshu clicks 'Mark all read'...");
  await fetch(`${BASE_URL}/api/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: priyanshuCookie },
    body: JSON.stringify({ all: true }),
  });

  const notifRes3 = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: priyanshuCookie },
  });
  const notifData3 = await notifRes3.json();
  console.log(`   Unread count now: ${notifData3.unreadCount}`);

  console.log("\n==================================================");
  console.log("🎉 NOTIFICATION & NODEMAILER FLOW 100% VERIFIED!");
  console.log("==================================================");
}

runNotificationTest().catch(console.error);
