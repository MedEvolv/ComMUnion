import { Link } from "react-router-dom";
import { Bus, MapPin, CalendarDays } from "lucide-react";
import type { Gathering } from "@/lib/types";
import { KIND_META, formatWhen, initials } from "@/lib/kinds";
import { cn } from "@/lib/utils";

export function AvatarStack({ names }: { names: string[] }) {
  const shown = names.slice(0, 4);
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <span
          key={n}
          style={{ marginLeft: i === 0 ? 0 : -8 }}
          className="grid size-7 place-items-center rounded-full border-2 border-white bg-foreground font-mono text-[10px] font-semibold text-background"
        >
          {initials(n)}
        </span>
      ))}
      {names.length > shown.length && (
        <span
          style={{ marginLeft: -8 }}
          className="grid size-7 place-items-center rounded-full border-2 border-white bg-primary font-mono text-[10px] font-semibold text-primary-foreground"
        >
          +{names.length - shown.length}
        </span>
      )}
    </div>
  );
}

export default function GatheringCard({
  gathering,
  youAreGoing,
}: {
  gathering: Gathering;
  youAreGoing: boolean;
}) {
  const meta = KIND_META[gathering.kind];
  const names = gathering.going.map((a) => a.name);

  return (
    <Link
      to={`/gatherings/${gathering.id}`}
      data-testid={`gathering-card-${gathering.id}`}
      className={cn(
        "animate-pop-in block rounded-3xl border-2 p-5 shadow-[3px_4px_0_0_rgba(30,32,34,0.12)] transition-transform duration-200 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
        meta.card,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold",
            meta.chip,
          )}
          data-testid={`gathering-kind-${gathering.id}`}
        >
          {meta.emoji} {meta.label}
        </span>
        {gathering.comingFromCollege && (
          <span className="rounded-full border border-[#92400E]/25 bg-[#FEF3C7] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#78350F]">
            <Bus className="mr-1 inline size-3" />
            Straight from college
          </span>
        )}
        {youAreGoing && (
          <span
            data-testid={`youre-going-${gathering.id}`}
            className="rounded-full bg-foreground px-2.5 py-1 font-mono text-[11px] font-semibold text-background"
          >
            You&rsquo;re in
          </span>
        )}
      </div>

      <h3 className="mt-3 font-heading text-2xl font-black leading-tight tracking-tight">
        {gathering.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed opacity-90">{gathering.hook}</p>

      <dl className="mt-4 grid gap-1.5 text-sm font-medium">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 opacity-70" />
          <dd data-testid={`gathering-when-${gathering.id}`}>{formatWhen(gathering.startsAt)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 opacity-70" />
          <dd className="truncate">{gathering.place}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-3 border-t border-current/10 pt-3">
        <AvatarStack names={names} />
        <p className="text-xs font-semibold" data-testid={`gathering-going-count-${gathering.id}`}>
          {names.length === 0
            ? "Nobody yet — be first"
            : `${names.length} going · hosted by ${gathering.hostName}`}
        </p>
      </div>
    </Link>
  );
}
