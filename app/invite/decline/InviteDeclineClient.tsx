"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ActionStatusCard from "../../../components/ActionStatusCard";

type Props = {
  token: string | null;
};

export default function InviteDeclineClient({ token }: Props) {
  const searchParams = useSearchParams();
  const tokenValue = token ?? searchParams.get("token");
  const declineInvite = useMutation(api.invites.declineWithToken);
  const [result, setResult] = useState<{
    status: "success" | "error" | null;
    message: string | null;
  }>({
    status: null,
    message: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!tokenValue) {
      return;
    }
    declineInvite({ token: tokenValue })
      .then(() => {
        if (cancelled) return;
        setResult({
          status: "success",
          message: "Invite declined. You can ignore this email.",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Invite could not be declined.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [declineInvite, tokenValue]);

  const status: "loading" | "success" | "error" = !tokenValue
    ? "error"
    : result.status ?? "loading";
  const message = !tokenValue
    ? "Missing invite token."
    : result.message ?? "Declining invite...";

  return (
    <ActionStatusCard
      status={status}
      title="Invite status"
      loadingTitle="Declining invite"
      successTitle="Invite declined"
      errorTitle="Invite issue"
      message={message}
      ctaLabel="Go to Shelf"
    />
  );
}
