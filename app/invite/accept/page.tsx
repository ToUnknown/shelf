import InviteAcceptClient from "./InviteAcceptClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { token?: string };
};

export default function InviteAcceptPage({ searchParams }: PageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : null;
  return <InviteAcceptClient token={token} />;
}
