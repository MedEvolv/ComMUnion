import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2" data-testid="feed-loading">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-3xl border-2 border-border bg-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function EmptyState({
  title,
  body,
  ctaLabel,
  ctaTo,
  testid,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaTo?: string;
  testid: string;
}) {
  return (
    <div
      data-testid={testid}
      className="rounded-3xl border-2 border-dashed border-foreground/20 bg-card px-6 py-14 text-center"
    >
      <div className="mx-auto mb-4 grid size-14 animate-wiggle place-items-center rounded-2xl border-2 border-foreground bg-secondary text-2xl">
        🎈
      </div>
      <h3 className="font-heading text-2xl font-black tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          data-testid={`${testid}-cta`}
          className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full font-semibold")}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
