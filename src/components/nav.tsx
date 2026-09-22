import Link from "next/link";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/study", label: "Study" },
  { href: "/sessions", label: "Sessions" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/reviews", label: "Reviews" },
  { href: "/mistakes", label: "Mistakes" },
];

export function Nav() {
  return (
    <aside className="border-b border-zinc-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-4 lg:block lg:px-7 lg:py-8">
        <Link href="/" className="shrink-0">
          <div className="text-lg font-semibold tracking-tight">StudyOS</div>
          <div className="hidden text-xs text-zinc-500 lg:block">
            Personal Learning OS
          </div>
        </Link>

        <nav className="flex gap-1 overflow-x-auto lg:mt-10 lg:block lg:space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
