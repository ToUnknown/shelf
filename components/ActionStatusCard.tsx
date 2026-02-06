import Link from "next/link";

type AsyncStatus = "loading" | "success" | "error";

type ActionStatusCardProps = {
  status: AsyncStatus;
  title: string;
  message: string;
  loadingTitle?: string;
  successTitle?: string;
  errorTitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

const statusConfig: Record<
  AsyncStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  loading: {
    label: "Processing",
    className:
      "border-[color:color-mix(in_oklab,var(--line-strong)_80%,transparent)] bg-[color:color-mix(in_oklab,var(--panel-strong)_88%,transparent)] text-[var(--muted)]",
    icon: (
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[color:color-mix(in_oklab,var(--muted)_34%,transparent)] border-t-[var(--primary)]" />
    ),
  },
  success: {
    label: "Completed",
    className:
      "border-[color:color-mix(in_oklab,var(--primary)_55%,transparent)] bg-[color:color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--foreground)]",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4.5 10.5l3.2 3.2L15.5 6.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    label: "Attention",
    className:
      "border-[color:color-mix(in_oklab,var(--danger)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] text-[var(--danger)]",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="1.9"
      >
        <path d="M10 6.2v5.9" strokeLinecap="round" />
        <circle cx="10" cy="14.7" r="0.8" fill="currentColor" stroke="none" />
        <path
          d="M10 2.8l8 13.8a1.2 1.2 0 0 1-1 1.8H3a1.2 1.2 0 0 1-1-1.8l8-13.8z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export default function ActionStatusCard({
  status,
  title,
  message,
  loadingTitle,
  successTitle,
  errorTitle,
  ctaHref = "/",
  ctaLabel = "Open Shelf",
}: ActionStatusCardProps) {
  const heading =
    status === "loading"
      ? loadingTitle ?? title
      : status === "success"
        ? successTitle ?? title
        : errorTitle ?? title;
  const meta = statusConfig[status];

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="neo-panel-strong anim-pop relative w-full max-w-xl overflow-hidden rounded-[1.7rem] p-6 sm:p-8">
        <span
          className="neo-orb h-56 w-56"
          style={{
            right: "-3.5rem",
            top: "-4.5rem",
            background: "radial-gradient(circle, var(--glow-a), transparent 72%)",
          }}
        />
        <p className="neo-kicker">Shelf</p>
        <span
          className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}
        >
          {meta.icon}
          {meta.label}
        </span>
        <h1 className="neo-heading mt-4 text-4xl leading-[0.92] sm:text-5xl">
          {heading}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          {message}
        </p>
        <div className="mt-6">
          <Link href={ctaHref} className="neo-btn">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
