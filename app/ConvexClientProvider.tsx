"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useMemo } from "react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const client = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, []);

  if (!convexUrl || !client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-100">
        Missing NEXT_PUBLIC_CONVEX_URL. Add it to `.env.local` and restart the
        dev server.
      </div>
    );
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
