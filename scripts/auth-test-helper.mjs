export const BASE_URL =
  process.env.EQUORA_TEST_URL || "http://localhost:3001";

function getTestUser(prefix, defaultName) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];

  if (!email || !password) {
    throw new Error(
      `Set ${prefix}_EMAIL and ${prefix}_PASSWORD to run this test.`
    );
  }

  return {
    name: process.env[`${prefix}_NAME`] || defaultName,
    email,
    password,
  };
}

export async function registerAndLogin(user) {
  const registration = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!registration.ok && registration.status !== 409) {
    throw new Error(`Account setup failed with HTTP ${registration.status}.`);
  }

  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfResponse.json();
  const csrfCookies = csrfResponse.headers.getSetCookie();
  const cookieHeader = csrfCookies.map((cookie) => cookie.split(";")[0]).join("; ");

  const form = new URLSearchParams({
    email: user.email,
    password: user.password,
    csrfToken: csrfData.csrfToken,
    callbackUrl: `${BASE_URL}/dashboard`,
  });

  const loginResponse = await fetch(
    `${BASE_URL}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader,
      },
      body: form,
      redirect: "manual",
    }
  );

  const loginCookies = loginResponse.headers.getSetCookie();
  const sessionCookie = loginCookies
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  if (!sessionCookie) {
    throw new Error("Sign-in failed; check the test account credentials.");
  }
  return sessionCookie;
}

export function getTestUsers() {
  return [
    getTestUser("EQUORA_TEST_USER1", "Test User One"),
    getTestUser("EQUORA_TEST_USER2", "Test User Two"),
  ];
}
