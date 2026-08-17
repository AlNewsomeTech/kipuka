import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function PublicFooter({ onRequestDemo }) {
  const { navigateToLogin } = useAuth();
  const linkClass =
    'text-sm text-[#8fa3bd] hover:text-white rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]';

  return (
    <footer className="border-t border-[#1c2c44] bg-[#050a13]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/kipuka-fishhook.svg" alt="" aria-hidden="true" className="h-9 w-auto flex-shrink-0 object-contain" />
            <span className="font-display text-lg font-bold text-white">Kipuka</span>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2.5 sm:grid-cols-3">
            <a href="#platform" className={linkClass}>Platform</a>
            <a href="#capabilities" className={linkClass}>Capabilities</a>
            <a href="/#security" className={linkClass}>Security</a>
            <Link to="/blog" className={linkClass}>Blog</Link>
            <button type="button" onClick={onRequestDemo} className={`${linkClass} text-left`}>Contact</button>
            <button type="button" onClick={() => navigateToLogin()} className={`${linkClass} text-left`}>Log In</button>
            <Link to="/privacy" className={linkClass}>Privacy Policy</Link>
            <Link to="/legal-terms" className={linkClass}>Terms and Conditions</Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-[#131f33] pt-6">
          <p className="text-xs text-[#64789a]">
            &copy; {new Date().getFullYear()} Pacific Global Security Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}