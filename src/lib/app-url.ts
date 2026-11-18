const PRODUCTION_APP_URL = "https://equora-fdom.vercel.app";

export function getAppBaseUrl(requestUrl?: string): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_URL;
  }

  const configuredUrl = process.env.NEXTAUTH_URL;
  if (configuredUrl) {
    const url = new URL(configuredUrl);
    return url.origin;
  }

  return requestUrl
    ? new URL(requestUrl).origin
    : "http://localhost:3000";
}
