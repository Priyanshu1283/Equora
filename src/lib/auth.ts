import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import { sendWelcomeEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/app-url";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const providers: any[] = [];

// Google Provider (active when env credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (
        typeof credentials?.email !== "string" ||
        typeof credentials.password !== "string"
      ) {
        return null;
      }

      await connectToDatabase();
      const email = credentials.email.toLowerCase().trim();
      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user?.passwordHash || !(await compare(credentials.password, user.passwordHash))) {
        return null;
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  })
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET || "fallback_secret_for_local_testing_equora",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectToDatabase();
          if (!user.email) return false;

          let dbUser = await User.findOne({ email: user.email.toLowerCase() });
          if (!dbUser) {
            dbUser = await User.create({
              email: user.email.toLowerCase(),
              name: user.name || "User",
              image: user.image || "",
              defaultCurrency: "INR",
            });

            const appUrl = getAppBaseUrl();
            try {
              await sendWelcomeEmail({
                to: dbUser.email,
                name: dbUser.name,
                loginLink: new URL("/dashboard", appUrl).toString(),
              });
            } catch (error) {
              console.error("[Welcome email error]", error);
            }
          }
          user.id = dbUser._id.toString();
          return true;
        } catch (error) {
          console.error("Error saving user on signIn:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
