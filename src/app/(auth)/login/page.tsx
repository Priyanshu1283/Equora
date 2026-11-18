"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wallet, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromInvitation = params.get("email");
    if (emailFromInvitation) {
      setEmail(emailFromInvitation);
      setInvitedEmail(emailFromInvitation);
    }
    if (params.get("mode") === "register") setIsRegistering(true);

    fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((providers) => setGoogleEnabled(Boolean(providers.google)))
      .catch((providerError) => {
        console.error("Unable to load sign-in providers:", providerError);
      });
  }, []);

  const getReturnPath = () => {
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    if (!callbackUrl) return "/dashboard";

    try {
      const callback = new URL(callbackUrl, window.location.origin);
      if (callback.origin === window.location.origin) {
        return `${callback.pathname}${callback.search}${callback.hash}`;
      }
    } catch {
      return "/dashboard";
    }

    return "/dashboard";
  };

  const handleCredentialsSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setLoadingUser("credentials");
    setError("");

    try {
      if (isRegistering) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to create your account.");
          return;
        }
        if (data.welcomeEmailSent === false) {
          showToast({
            id: `welcome-email-${Date.now()}`,
            title: "Account created",
            message: "We couldn't send the welcome email. You can still continue to Equora.",
            type: "EMAIL",
          });
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok || result.error) {
        if (isRegistering) {
          setError(
            "Your account was created, but sign-in failed. Please sign in with your new credentials."
          );
        } else if (
          result?.code === "credentials" ||
          result?.error === "CredentialsSignin"
        ) {
          setError("Email or password is incorrect. Please check and try again.");
        } else {
          setError("Unable to sign in right now. Please try again.");
        }
        if (isRegistering) setIsRegistering(false);
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const session = await sessionResponse.json();
      if (!session?.user?.id) {
        setError("Sign-in could not be completed. Please try again.");
        return;
      }

      router.replace(getReturnPath());
      router.refresh();
    } catch (err) {
      console.error("Credential sign-in failed:", err);
      setError("Unable to continue right now. Please try again.");
    } finally {
      setLoadingUser(null);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { redirectTo: getReturnPath() });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRegistering ? "Create your Equora account" : "Sign in to Equora"}
          </h1>
          <p className="text-sm text-slate-500">
            {invitedEmail
              ? "Use the invited email to create your account and join the group."
              : "Manage shared expenses with roommates, trips, and friends effortlessly."}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          {googleEnabled && (
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 transition-all"
            >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
              Continue with Google
            </button>
          )}

          {googleEnabled && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 font-semibold text-slate-400">
                  Or use your email and password
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {isRegistering ? "Create your account" : "Sign in with email"}
            </h2>
            <form onSubmit={handleCredentialsSubmit} className="space-y-3">
              {isRegistering && (
                <Input
                  label="Name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              )}
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                disabled={Boolean(invitedEmail)}
                helperText={
                  invitedEmail
                    ? "This invitation can only be accepted with the invited email."
                    : undefined
                }
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={isRegistering ? 8 : undefined}
                maxLength={72}
                required
              />
              {error && (
                <p role="alert" className="text-sm text-rose-600">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loadingUser !== null}
              >
                {loadingUser === "credentials"
                  ? "Please wait..."
                  : isRegistering
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
            <p className="mt-3 text-center text-xs text-slate-500">
              {isRegistering ? "Already have an account?" : "New to Equora?"}{" "}
              <button
                type="button"
                className="font-semibold text-slate-900 hover:underline"
                onClick={() => {
                  setIsRegistering((current) => !current);
                  setError("");
                }}
              >
                {isRegistering ? "Sign in" : "Create an account"}
              </button>
            </p>
          </div>
        </div>

        {/* Security Reassurance */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Equora stores all financial records with integer paise precision.</span>
        </div>
      </div>
    </div>
  );
}
