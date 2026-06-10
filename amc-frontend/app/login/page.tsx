"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (token && status === "unauthenticated") {
      // Strip token from URL immediately to prevent exposure in browser history
      window.history.replaceState({}, "", "/login");
      handleTokenAuth(token);
    }
  }, [token, status]);

  const handleTokenAuth = async (authToken: string) => {
    setLoading(true);
    setError(null);

    try {
      // POST token in body — never in URL
      const res = await fetch(`${API_URL}/auth/exchange-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: authToken }),
      });

      if (!res.ok) {
        setError("Authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      const result = await res.json();
      const userData = result.data || result;

      const { token: serverToken, userId, name, email, role } = userData;

      if (!serverToken || !userId || !name) {
        setError("Invalid authentication data. Please try again.");
        setLoading(false);
        return;
      }

      // Pass validated user data to NextAuth
      const signInResult = await signIn("credentials", {
        token: serverToken,
        id: String(userId),
        remoteUserId: String(userId),
        name,
        email: email || "",
        role: role || "USER",
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push(callbackUrl);
      } else {
        setError("Authentication failed. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleLogin = () => {
    const authUrl =
      process.env.NEXT_PUBLIC_AUTH_URL || "https://access.spiderworks.org";
    const currentUrl = `${window.location.origin}/login`;
    window.location.href = `${authUrl}/login?type=WORKS&url=${encodeURIComponent(currentUrl)}`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Nexus Portal</CardTitle>
          <CardDescription>
            Sign in with your SpiderWorks account to manage your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button onClick={handleLogin} size="lg" className="w-full">
            Sign in with SpiderWorks
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You will be redirected to access.spiderworks.org to authenticate
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}