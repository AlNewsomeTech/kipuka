import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const NAV_LINKS = [
  { label: 'Platform', href: '/#platform' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Capabilities', href: '/#capabilities' },
  { label: 'Who It Is For', href: '/#who-its-for' },
  { label: 'Security', href: '/#security' },
  { label: 'Blog', href: '/blog' },
];

export default function PublicHeader({ onRequestDemo }) {
  const { navigateToLogin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1c2c44] bg-[#060c18]/90 backdrop-blur supports-[backdrop-filter]:bg-[#060c18]/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]" aria-label="Kipuka home">
          <img src="/kipuka-fishhook.svg" alt="" aria-hidden="true" className="h-10 w-auto flex-shrink-0 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight text-white">Kipuka</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#b9c8dc] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={() => navigateToLogin()}
            className="rounded-xl border border-[#2a3d5c] px-4 py-2 text-sm font-bold text-white transition-colors hover:border-[#479dcf] hover:bg-[#0d1a2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={onRequestDemo}
            className="rounded-xl bg-[#479dcf] px-4 py-2 text-sm font-bold text-[#04101f] transition-colors hover:bg-[#67d1f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Request a Demo
          </button>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-white lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-[#1c2c44] bg-[#080f1e] px-4 pb-6 pt-3 lg:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-base font-semibold text-[#b9c8dc] hover:bg-[#0d1a2e] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigateToLogin()}
              className="w-full rounded-xl border border-[#2a3d5c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d1a2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onRequestDemo(); }}
              className="w-full rounded-xl bg-[#479dcf] px-4 py-2.5 text-sm font-bold text-[#04101f] hover:bg-[#67d1f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Request a Demo
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}