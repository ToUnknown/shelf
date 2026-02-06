"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ActionStatusCard from "../../../components/ActionStatusCard";

type Props = {
  token: string | null;
};

export default function InviteAcceptClient({ token }: Props) {
  const searchParams = useSearchParams();
  const tokenValue = token ?? searchParams.get("token");
  const acceptInvite = useMutation(api.invites.acceptWithToken);
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
    acceptInvite({ token: tokenValue })
      .then(() => {
        if (cancelled) return;
        setResult({
          status: "success",
          message: "Invite accepted. You can now sign in as a member.",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Invite could not be accepted.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [acceptInvite, tokenValue]);

  const status: "loading" | "success" | "error" = !tokenValue
    ? "error"
    : result.status ?? "loading";
  const message = !tokenValue
    ? "Missing invite token."
    : result.message ?? "Accepting invite...";

  return (
    <ActionStatusCard
      status={status}
      title="Invite status"
      loadingTitle="Accepting invite"
      successTitle="Invite accepted"
      errorTitle="Invite issue"
      message={message}
      ctaLabel="Go to Shelf"
    />
  );
}
