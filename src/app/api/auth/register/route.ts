import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import { registerUserSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid account details." },
      { status: 400 }
    );
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    await connectToDatabase();

    const existingUser = await User.findOne({ email }).select("+passwordHash");
    if (existingUser) {
      if (existingUser.passwordHash) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please sign in with its existing credentials.",
          },
          { status: 409 }
        );
      }

      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            error:
              "This email already has an account. Sign in with its existing authentication method.",
          },
          { status: 409 }
        );
      }

      existingUser.name = name;
      existingUser.passwordHash = await hash(password, 12);
      await existingUser.save();
    } else {
      const passwordHash = await hash(password, 12);
      await User.create({ name, email, passwordHash });
    }

    // Send welcome email (fire-and-forget – don't block registration)
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    sendWelcomeEmail({
      to: email,
      name,
      loginLink: `${origin}/dashboard`,
    }).catch((err) => console.error("[Welcome email error]", err));

    return NextResponse.json(
      { message: "Account created successfully." },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Unable to create your account right now. Please try again." },
      { status: 500 }
    );
  }
}
