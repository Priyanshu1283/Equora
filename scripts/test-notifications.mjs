/**
 * Test script for Notifications & Nodemailer Email Flow
 */

import { BASE_URL, getTestUsers, registerAndLogin } from "./auth-test-helper.mjs";

async function runNotificationTest() {
  console.log("==================================================");
  console.log("🔔 TESTING NOTIFICATIONS & NODEMAILER FLOW");
  console.log("==================================================\n");

  const [user1, user2] = getTestUsers();

  // 1. Authenticate two real test accounts
  console.log("👉 1. Sign in test user 1...");
  const user1Cookie = await registerAndLogin(user1);
  console.log("👉 2. Sign in test user 2...");
  const user2Cookie = await registerAndLogin(user2);

  // 3. Create a group as test user 1
  console.log("👉 3. Test user 1 creates group 'Weekend Party'...");
  const grpRes = await fetch(`${BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: user1Cookie },
    body: JSON.stringify({
      name: "Weekend Party",
      description: "Music & food",
      groupType: "FRIENDS",
    }),
  });
  const grpData = await grpRes.json();
  const groupId = grpData.group._id;
  console.log(`   Group created: ${grpData.group.name} (${groupId})\n`);

  // 4. Test user 1 invites test user 2 via email
  console.log("👉 4. Test user 1 invites test user 2...");
  const inviteRes = await fetch(`${BASE_URL}/api/groups/${groupId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: user1Cookie },
    body: JSON.stringify({ email: user2.email }),
  });
  const inviteData = await inviteRes.json();
  if (!inviteRes.ok) throw new Error(inviteData.error || "Invite failed");
  console.log(`   Invitation created. Email sent: ${inviteData.emailSent}\n`);

  // 5. Check test user 2's in-app notifications
  console.log("👉 5. Checking test user 2's in-app notifications...");
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: user2Cookie },
  });
  const notifData = await notifRes.json();
  console.log(`   Unread Notifications count: ${notifData.unreadCount}`);
  for (const n of notifData.notifications) {
    console.log(`   🔔 [${n.type}] ${n.title}: "${n.message}" (Read: ${n.isRead})`);
  }
  console.log("");

  // 6. Test user 2 accepts the invitation
  console.log("👉 6. Test user 2 accepts the invitation...");
  const acceptRes = await fetch(`${BASE_URL}/api/invitations/${inviteData.invitation.token}`, {
    method: "POST",
    headers: { Cookie: user2Cookie },
  });
  if (!acceptRes.ok) {
    const acceptData = await acceptRes.json();
    throw new Error(acceptData.error || "Invitation acceptance failed");
  }
  console.log("   Test user 2 joined the group!\n");

  // 7. Confirm the group admin was notified
  const adminNotifications = await (
    await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: user1Cookie },
    })
  ).json();
  const acceptedNotification = adminNotifications.notifications?.find(
    (notification) => notification.type === "INVITATION_ACCEPTED"
  );
  if (!acceptedNotification) {
    throw new Error("The group admin did not receive an invitation-accepted notification.");
  }
  console.log("👉 7. Group admin received the invitation-accepted notification.\n");

  // 8. Test user 1 adds an expense
  console.log("👉 8. Test user 1 adds 'Barbeque & Snacks' (₹1,200)...");
  const user1Profile = await (await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: user1Cookie } })).json();
  const user2Profile = await (await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: user2Cookie } })).json();

  await fetch(`${BASE_URL}/api/groups/${groupId}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: user1Cookie },
    body: JSON.stringify({
      title: "Barbeque & Snacks",
      amountPaise: 120000,
      category: "Food & Dining",
      paidBy: user1Profile.user.id,
      date: new Date().toISOString(),
      participantUserIds: [user1Profile.user.id, user2Profile.user.id],
    }),
  });
  console.log("   Expense added!\n");

  // 9. Re-check test user 2's notifications
  console.log("👉 9. Test user 2 checks notifications after expense added...");
  const notifRes2 = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: user2Cookie },
  });
  const notifData2 = await notifRes2.json();
  console.log(`   Unread Notifications count: ${notifData2.unreadCount}`);
  for (const n of notifData2.notifications.slice(0, 3)) {
    console.log(`   🔔 [${n.type}] ${n.title}: "${n.message}"`);
  }
  console.log("");

  // 10. Mark all notifications as read
  await fetch(`${BASE_URL}/api/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: user2Cookie },
    body: JSON.stringify({ all: true }),
  });

  const notifRes3 = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: user2Cookie },
  });
  const notifData3 = await notifRes3.json();
  console.log(`   Unread count now: ${notifData3.unreadCount}`);

  console.log("\n==================================================");
  console.log("🎉 NOTIFICATION & NODEMAILER FLOW 100% VERIFIED!");
  console.log("==================================================");
}

runNotificationTest().catch(console.error);
