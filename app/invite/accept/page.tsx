"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function InviteAcceptPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const acceptInvite = useMutation(api.invites.acceptWithToken);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Accepting invite...");

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }
    acceptInvite({ token })
      .then(() => {
        if (cancelled) return;
        setStatus("success");
        setMessage("Invite accepted. You can now sign in as a member.");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Invite could not be accepted.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [acceptInvite, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 sm:p-8 anim-pop">
        <h1 className="text-2xl font-semibold">
          {status === "success" ? "Invite accepted" : "Invite status"}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          Go to Shelf
        </a>
      </div>
    </div>
  );
}
