import { Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/public/LandingPage';
import PublicTerms from '@/pages/public/PublicTerms';
import PublicPrivacy from '@/pages/public/PublicPrivacy';
import BlogIndex from '@/pages/public/BlogIndex';
import BlogPostPage from '@/pages/public/BlogPostPage';
import LoginRedirect from '@/components/public/LoginRedirect';

// Routes shown to unauthenticated visitors. Only the marketing landing page
// and public legal pages are reachable; every other path preserves the
// original behavior by redirecting to the existing platform login flow.
export default function PublicApp() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PublicPrivacy />} />
      <Route path="/legal-terms" element={<PublicTerms />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="*" element={<LoginRedirect />} />
    </Routes>
  );
}