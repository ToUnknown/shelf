import InviteDeclineClient from "./InviteDeclineClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { token?: string };
};

export default function InviteDeclinePage({ searchParams }: PageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : null;
  return <InviteDeclineClient token={token} />;
}
