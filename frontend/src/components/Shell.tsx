import { Link, NavLink } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { usePersona } from "@/lib/persona";
import { initials } from "@/lib/kinds";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Feed", testid: "nav-feed" },
  { to: "/create", label: "Throw one", testid: "nav-create" },
  { to: "/profile", label: "My hub", testid: "nav-profile" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { persona } = usePersona();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            data-testid="brand-link"
            className="flex items-center gap-2 font-heading text-lg font-black tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-2xl border-2 border-foreground bg-primary text-primary-foreground">
              <PartyPopper className="size-4" />
            </span>
            <span className="hidden sm:inline">Not&nbsp;Your&nbsp;Flat&nbsp;Group</span>
            <span className="sm:hidden">NYFG</span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={l.testid}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {persona ? (
            <Link
              to="/sign-in"
              data-testid="active-persona-chip"
              aria-label={`Signed in as ${persona.name}. Switch classmate`}
              className="ml-1 flex items-center gap-2 rounded-full border-2 border-foreground bg-foreground py-1 pl-1 pr-3 text-background transition-transform duration-150 hover:-translate-y-0.5"
            >
              <span className="grid size-7 place-items-center rounded-full bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
                {initials(persona.name)}
              </span>
              <span className="hidden max-w-[7rem] truncate text-xs font-semibold sm:inline">
                {persona.name}
              </span>
            </Link>
          ) : (
            <Link
              to="/sign-in"
              data-testid="sign-in-link"
              className={cn(buttonVariants({ size: "sm" }), "ml-1 rounded-full font-semibold")}
            >
              Pick a classmate
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">{children}</main>

      <footer className="border-t border-border/70 py-8 text-center font-mono text-xs text-muted-foreground">
        Masters&rsquo; Union · demo personas only, no campus mail required
      </footer>
    </div>
  );
}
