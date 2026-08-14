import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Safe placeholder privacy route so the public footer never dead-links.
// Deliberately makes no legal claims and invents no policy terms.
export default function PublicPrivacy() {
  return (
    <div className="min-h-screen bg-[#060c18] font-body text-white">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-[#67d1f0] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Kipuka
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#8fa3bd]">
          The Kipuka privacy policy is maintained by Pacific Global Security Group and is
          being prepared for publication on this page. In the meantime, please use the
          contact option on the Kipuka home page to request privacy information.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#8fa3bd]">
          Kipuka handles sensitive readiness data with organization-level separation,
          role-based access, and audit history, as described in the platform&apos;s{' '}
          <Link to="/legal-terms" className="font-bold text-[#67d1f0] hover:text-white">Terms and Conditions</Link>.
        </p>
      </div>
    </div>
  );
}