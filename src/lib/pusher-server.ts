import Pusher from "pusher";

// Singleton instance – created once per cold start
let pusherServer: Pusher | null = null;

function getPusherServer(): Pusher | null {
  if (!process.env.PUSHER_APP_ID) return null; // graceful when creds missing

  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

/**
 * Trigger a Pusher event on a private user channel.
 * Never throws – logs the error and returns false if Pusher is unavailable.
 */
export async function triggerUserNotification(
  userId: string,
  eventName: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const pusher = getPusherServer();
  if (!pusher) {
    console.warn("[Pusher] Server not configured – skipping real-time event");
    return false;
  }

  try {
    await pusher.trigger(`private-user-${userId}`, eventName, data);
    return true;
  } catch (err) {
    console.error("[Pusher] Failed to trigger event:", err);
    return false;
  }
}

export { getPusherServer };
