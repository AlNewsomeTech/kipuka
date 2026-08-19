import { Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/public/LandingPage';
import PublicTerms from '@/pages/public/PublicTerms';
import PublicPrivacy from '@/pages/public/PublicPrivacy';
import BlogIndex from '@/pages/public/BlogIndex';
import BlogPostPage from '@/pages/public/BlogPostPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<LoginRedirect />} />
    </Routes>
  );
}