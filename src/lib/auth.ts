import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/models/User";

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

// Dev Mode Credentials Provider (allows 1-click test user login for Rahul, Priyanshu, Amit)
if (process.env.ALLOW_DEV_LOGIN !== "false") {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        await connectToDatabase();
        const email = (credentials.email as string).toLowerCase().trim();
        const name = (credentials.name as string) || email.split("@")[0];

        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            email,
            name,
            image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            defaultCurrency: "INR",
          });
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
}

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
