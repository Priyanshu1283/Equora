import nodemailer from "nodemailer";

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  loginLink: string;
}

interface SendInviteEmailParams {
  to: string;
  groupName: string;
  inviterName: string;
  inviteLink: string;
}

interface SendExpenseEmailParams {
  to: string;
  groupName: string;
  expenseTitle: string;
  amountFormatted: string;
  paidByName: string;
  shareFormatted: string;
  groupLink: string;
}

interface SendSettlementEmailParams {
  to: string;
  groupName: string;
  payerName: string;
  amountFormatted: string;
  groupLink: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

const DEFAULT_FROM = process.env.SMTP_FROM || "Equora <noreply@equora.local>";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

/**
 * Sends a rich invitation email to a friend
 */
export async function sendInvitationEmail({
  to,
  groupName,
  inviterName,
  inviteLink,
}: SendInviteEmailParams): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Invitation email] SMTP is not configured; email was not sent.");
    return false;
  }

  const safeGroupName = escapeHtml(groupName);
  const safeInviterName = escapeHtml(inviterName);
  const safeInviteLink = escapeHtml(inviteLink);
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .card { background-color: #ffffff; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .brand { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }
          .badge { display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
          h2 { font-size: 22px; margin-top: 0; margin-bottom: 12px; color: #0f172a; line-height: 1.3; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
          .link-fallback { word-break: break-all; font-family: monospace; font-size: 11px; background-color: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">⚖️ Equora</div>
          <div class="badge">Group Invitation</div>
          <h2>Join "${safeGroupName}" on Equora</h2>
          <p>
            <strong>${safeInviterName}</strong> has invited you to join the group <strong>"${safeGroupName}"</strong> to easily share and split expenses with mathematical accuracy.
          </p>
          <div class="btn-container">
            <a href="${safeInviteLink}" class="btn">Accept Invitation & Join Group</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            If the button above does not work, copy and paste this link into your browser:
          </p>
          <div class="link-fallback">${safeInviteLink}</div>
          <div class="footer">
            Equora – Production Group Expense Manager.<br>This invitation link expires in 7 days.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `${inviterName} invited you to join "${groupName}" on Equora`,
      html: htmlContent,
      text: `${inviterName} invited you to join "${groupName}". Join here: ${inviteLink}`,
    });
    console.log(`✅ [Nodemailer] Invitation email delivered successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ [Nodemailer] Failed to send email to ${to}:`, error);
    return false;
  }
}

/**
 * Sends notification email when a new expense is added
 */
export async function sendExpenseNotificationEmail({
  to,
  groupName,
  expenseTitle,
  amountFormatted,
  paidByName,
  shareFormatted,
  groupLink,
}: SendExpenseEmailParams): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
      <h2>New Expense Added in "${groupName}"</h2>
      <p><strong>${paidByName}</strong> just added a new expense: <strong>${expenseTitle}</strong>.</p>
      <ul>
        <li><strong>Total Amount:</strong> ${amountFormatted}</li>
        <li><strong>Your Share:</strong> ${shareFormatted}</li>
      </ul>
      <p><a href="${groupLink}" style="background:#0f172a;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;display:inline-block;">View in Group Dashboard</a></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `New expense in ${groupName}: ${expenseTitle} (${shareFormatted})`,
      html: htmlContent,
    });
    return true;
  } catch (err) {
    console.error("Failed to send expense email:", err);
    return false;
  }
}

/**
 * Sends notification email when a settlement is recorded
 */
export async function sendSettlementNotificationEmail({
  to,
  groupName,
  payerName,
  amountFormatted,
  groupLink,
}: SendSettlementEmailParams): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
      <h2>Payment Received in "${groupName}"</h2>
      <p><strong>${payerName}</strong> recorded a payment of <strong>${amountFormatted}</strong> to you.</p>
      <p>Your balances in <strong>${groupName}</strong> have been updated.</p>
      <p><a href="${groupLink}" style="background:#059669;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;display:inline-block;">View Updated Balances</a></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Payment recorded: ${payerName} paid you ${amountFormatted}`,
      html: htmlContent,
    });
    return true;
  } catch (err) {
    console.error("Failed to send settlement email:", err);
    return false;
  }
}


/**
 * Sends a beautiful welcome email when a new user creates an account.
 */
export async function sendWelcomeEmail({
  to,
  name,
  loginLink,
}: SendWelcomeEmailParams): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Welcome email] SMTP is not configured; email was not sent.");
    return false;
  }

  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(loginLink);
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .card { background-color: #ffffff; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .brand { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }
          h2 { font-size: 22px; margin-top: 0; margin-bottom: 12px; color: #0f172a; line-height: 1.3; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; }
          .features { background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .features ul { margin: 8px 0 0 0; padding-left: 20px; }
          .features li { font-size: 13px; color: #475569; padding: 4px 0; }
          .features li strong { color: #0f172a; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">⚖️ Equora</div>
          <h2>Welcome to Equora, ${safeName}! 🎉</h2>
          <p>
            Your account has been created successfully. Equora makes managing shared expenses
            with roommates, friends, and travel groups effortless and accurate.
          </p>

          <div class="features">
            <p style="font-weight: 600; margin-bottom: 8px; color: #0f172a;">Here's what you can do:</p>
            <ul>
              <li><strong>Create Groups</strong> — Organize expenses by trips, homes, or events</li>
              <li><strong>Add Expenses</strong> — Split costs equally with mathematical paise precision</li>
              <li><strong>Track Balances</strong> — See who owes whom at a glance</li>
              <li><strong>Settle Up</strong> — Record payments and clear debts</li>
              <li><strong>Invite Friends</strong> — Share a link and they're in</li>
            </ul>
          </div>

          <div class="btn-container">
            <a href="${safeLink}" class="btn">Go to Equora →</a>
          </div>

          <div class="footer">
            Equora – Group Expense Manager<br>
            All amounts stored with integer paise precision. No rounding surprises.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: DEFAULT_FROM,
      to,
      subject: `Welcome to Equora, ${name}! 🎉`,
      html: htmlContent,
      text: `Welcome to Equora, ${name}! Start managing shared expenses at: ${loginLink}`,
    });
    console.log(`✅ [Nodemailer] Welcome email delivered to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ [Nodemailer] Failed to send welcome email to ${to}:`, error);
    return false;
  }
}
