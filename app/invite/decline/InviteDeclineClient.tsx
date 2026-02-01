"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Props = {
  token: string | null;
};

export default function InviteDeclineClient({ token }: Props) {
  const declineInvite = useMutation(api.invites.declineWithToken);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Declining invite...");

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }
    declineInvite({ token })
      .then(() => {
        if (cancelled) return;
        setStatus("success");
        setMessage("Invite declined. You can ignore this email.");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Invite could not be declined.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [declineInvite, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 sm:p-8 anim-pop">
        <h1 className="text-2xl font-semibold">
          {status === "success" ? "Invite declined" : "Invite status"}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        >
          Go to Shelf
        </Link>
      </div>
    </div>
  );
}
