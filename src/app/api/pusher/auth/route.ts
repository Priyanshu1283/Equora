import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pusher = getPusherServer();
    if (!pusher) {
      return NextResponse.json({ error: "Pusher not configured" }, { status: 503 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // Only allow the user to subscribe to their own private channel
    const expectedChannel = `private-user-${user.id}`;
    if (channelName !== expectedChannel) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error("[Pusher Auth] Error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
