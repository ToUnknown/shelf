"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ActionStatusCard from "../../components/ActionStatusCard";

type Props = {
  token: string | null;
};

export default function VerifyEmailClient({ token }: Props) {
  const searchParams = useSearchParams();
  const tokenValue = token ?? searchParams.get("token");
  const verifyEmail = useMutation(api.users.verifyEmailWithToken);
  const [result, setResult] = useState<{
    status: "success" | "error" | null;
    message: string | null;
  }>({
    status: null,
    message: null,
  });

  useEffect(() => {
    if (!tokenValue) return;

    let cancelled = false;
    verifyEmail({ token: tokenValue })
      .then(() => {
        if (cancelled) return;
        setResult({
          status: "success",
          message: "Email verified. You can return to Shelf.",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({
          status: "error",
          message:
            error instanceof Error ? error.message : "Email verification failed.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tokenValue, verifyEmail]);

  const status: "loading" | "success" | "error" = !tokenValue
    ? "error"
    : result.status ?? "loading";
  const message = !tokenValue
    ? "Missing verification token."
    : result.message ?? "Verifying email...";

  return (
    <ActionStatusCard
      status={status}
      title="Verification status"
      loadingTitle="Verifying email"
      successTitle="Email verified"
      errorTitle="Verification issue"
      message={message}
      ctaLabel="Go to Shelf"
    />
  );
}
