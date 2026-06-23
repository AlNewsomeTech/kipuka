import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { ClientProvider } from '@/lib/clientContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import DeploymentBoard from '@/pages/DeploymentBoard';
import CMMCControls from '@/pages/CMMCControls';
import ControlDetail from '@/pages/ControlDetail';
import Level2Readiness from '@/pages/Level2Readiness';
import Microsoft365Setup from '@/pages/Microsoft365Setup';
import GoogleMigration from '@/pages/GoogleMigration';
import SharePointArchive from '@/pages/SharePointArchive';
import NinjaOneEvidence from '@/pages/NinjaOneEvidence';
import ScreenshotLibrary from '@/pages/ScreenshotLibrary';
import DocumentLibrary from '@/pages/DocumentLibrary';
import EvidenceIndex from '@/pages/EvidenceIndex';
import FinalPackage from '@/pages/FinalPackage';
import PIEESelfCert from '@/pages/PIEESelfCert';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<ClientProvider><Layout /></ClientProvider>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/board" element={<DeploymentBoard />} />
        <Route path="/controls" element={<CMMCControls />} />
        <Route path="/controls/:id" element={<ControlDetail />} />
        <Route path="/level2" element={<Level2Readiness />} />
        <Route path="/m365" element={<Microsoft365Setup />} />
        <Route path="/google" element={<GoogleMigration />} />
        <Route path="/sharepoint" element={<SharePointArchive />} />
        <Route path="/ninjaone" element={<NinjaOneEvidence />} />
        <Route path="/screenshots" element={<ScreenshotLibrary />} />
        <Route path="/documents" element={<DocumentLibrary />} />
        <Route path="/evidence" element={<EvidenceIndex />} />
        <Route path="/package" element={<FinalPackage />} />
        <Route path="/piee" element={<PIEESelfCert />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App