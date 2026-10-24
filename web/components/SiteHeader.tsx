import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader({ home = true }: { home?: boolean }) {
  const p = home ? "" : "/";
  return (
    <header className="site-header">
      <Link href={home ? "#top" : "/"} className="brand" aria-label="Sloth Butler home"><Logo size={38} /><span>Sloth Butler</span></Link>
      <nav aria-label="Main">
        <a href={`${p}#negotiate`}>Try it</a>
        <a href={`${p}#ledger`}>Your log</a>
        <a href={`${p}#proof`}>Results</a>
        <Link href="/guide" aria-current={home ? undefined : "page"}>Guide</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Logo size={28} /><span>Sloth Butler. MIT licence. Read every reply before you send it. <Link href="/guide">Guide and FAQ</Link> · <a href="https://github.com/comzzy/sloth-butler">Source</a></span>
    </footer>
  );
}
