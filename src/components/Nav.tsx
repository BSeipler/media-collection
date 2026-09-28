import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function Nav({
  active,
  guest = false,
}: {
  active?: "collection" | "add" | "settings";
  guest?: boolean;
}) {
  const link = (href: string, label: string, key: typeof active) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active === key
          ? "bg-amber-500/20 text-amber-300"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100">
          Yard Sale Stack
        </Link>
        <nav className="flex items-center gap-1">
          {link("/", "Collection", "collection")}
          {guest ? (
            <span className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Guest
            </span>
          ) : (
            <>
              {link("/add", "Scan", "add")}
              {link("/settings", "Settings", "settings")}
            </>
          )}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
