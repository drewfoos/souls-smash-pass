import Link from "next/link";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PageHeader({ current }: { current?: string }) {
  return (
    <header className="flex items-center justify-between mb-12">
      <Link
        href="/"
        className="flex items-center gap-2 group"
      >
        <span className="text-gold/40 group-hover:text-gold/70 transition-colors text-lg" aria-hidden="true">✦</span>
        <span className="text-souls font-bold text-gold/80 group-hover:text-gold transition-colors text-sm tracking-wider">
          Elden Smash
        </span>
      </Link>
      <nav className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              current === link.href
                ? "text-gold bg-gold/10"
                : "text-ash/50 hover:text-ash/80 hover:bg-dark-700/50"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
