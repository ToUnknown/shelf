import VerifyEmailClient from "./VerifyEmailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { token?: string };
};

export default function VerifyEmailPage({ searchParams }: PageProps) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : null;
  return <VerifyEmailClient token={token} />;
}
