import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { ClientProvider } from '@/lib/clientContext';
import { OrgProvider } from '@/lib/orgContext';
import { ThemeProvider } from '@/lib/themeContext';
import { BrandProvider } from '@/lib/brandContext';
import RoleRoute from '@/components/RoleRoute';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Projects from '@/pages/Projects';
import NewProjectWizard from '@/pages/NewProjectWizard';
import ProjectWorkspace from '@/pages/ProjectWorkspace';
import ProjectDashboard from '@/pages/project/ProjectDashboard';
import ProjectModulePage from '@/pages/project/ProjectModulePage';
import GuidedWalkthrough from '@/pages/project/GuidedWalkthrough';
import GuidedQueue from '@/pages/project/GuidedQueue';
import '@/lib/externalLinks'; // force all external links to open in a new tab
import ClientIntake from '@/pages/ClientIntake';
import DeploymentBoard from '@/pages/DeploymentBoard';
import CanonicalControlsRedirect from '@/pages/CanonicalControlsRedirect';
import JiraExport from '@/pages/JiraExport';
import Microsoft365Setup from '@/pages/Microsoft365Setup';
import GoogleMigration from '@/pages/GoogleMigration';
import SharePointArchive from '@/pages/SharePointArchive';
import NinjaOneEvidence from '@/pages/NinjaOneEvidence';
import ScreenshotLibrary from '@/pages/ScreenshotLibrary';
import DocumentLibrary from '@/pages/DocumentLibrary';
import Documentation from '@/pages/Documentation';
import EvidenceIndex from '@/pages/EvidenceIndex';
import PIEESelfCert from '@/pages/PIEESelfCert';
import UserManagement from '@/pages/UserManagement';
import Settings from '@/pages/Settings';
import AIAssistant from '@/pages/AIAssistant';
import TermsAndConditions from '@/pages/TermsAndConditions';
import SaaSAdmin from '@/pages/SaaSAdmin';
import ControlLibraryAdmin from '@/pages/ControlLibraryAdmin';
import BrandingSettings from '@/pages/BrandingSettings';
import PolicyLibraryAdmin from '@/pages/PolicyLibraryAdmin';
import OrgSettings from '@/pages/OrgSettings';
import OrgAssets from '@/pages/OrgAssets';
import AuditLogPage from '@/pages/AuditLogPage';
import RoleDashboards from '@/pages/RoleDashboards';
import HelpCenter from '@/pages/HelpCenter';
import SupportInbox from '@/pages/SupportInbox';
import DemoWorkspace from '@/pages/DemoWorkspace';
import AcolyteOverview from '@/pages/acolyte/AcolyteOverview';
import PostureAssessmentPage from '@/pages/acolyte/PostureAssessment';
import ReadinessReviews from '@/pages/acolyte/ReadinessReviews';
import CyberFindings from '@/pages/acolyte/CyberFindings';
import RemediationQueue from '@/pages/acolyte/RemediationQueue';
import IncidentReadiness from '@/pages/acolyte/IncidentReadiness';
import ExecutiveReports from '@/pages/acolyte/ExecutiveReports';
import AcolyteSettings from '@/pages/acolyte/AcolyteSettings';
import WebsiteScanner from '@/pages/acolyte/WebsiteScanner';
import SecureScoreImports from '@/pages/acolyte/SecureScoreImports';

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
      <Route element={<OrgProvider><OnboardingGate><ClientProvider><Layout /></ClientProvider></OnboardingGate></OrgProvider>}>
        {/* Read-only pages — all roles, including client */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/intake" element={<ClientIntake />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/org-settings" element={<OrgSettings />} />
        <Route path="/org-assets" element={<OrgAssets />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/dashboards" element={<RoleDashboards />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/help/:slug" element={<HelpCenter />} />

        {/* ACOLYTE Operations — all roles (read-only enforced inside via org role) */}
        <Route path="/acolyte" element={<AcolyteOverview />} />
        <Route path="/acolyte/posture" element={<PostureAssessmentPage />} />
        <Route path="/acolyte/reviews" element={<ReadinessReviews />} />
        <Route path="/acolyte/findings" element={<CyberFindings />} />
        <Route path="/acolyte/remediation" element={<RemediationQueue />} />
        <Route path="/acolyte/incident-readiness" element={<IncidentReadiness />} />
        <Route path="/acolyte/reports" element={<ExecutiveReports />} />
        <Route path="/acolyte/settings" element={<AcolyteSettings />} />
        <Route path="/acolyte/scanner" element={<WebsiteScanner />} />
        <Route path="/acolyte/secure-score" element={<SecureScoreImports />} />

        {/* Projects list + per-project workspace — all roles (read-only enforced inside) */}
        <Route path="/projects" element={<Projects />} />
        {/* Guided walkthrough — full-page 5-step wizard for a single control (all roles) */}
        <Route path="/projects/:id/guided" element={<GuidedQueue />} />
        <Route path="/projects/:id/guided/:controlId" element={<GuidedWalkthrough />} />
        <Route path="/projects/:id" element={<ProjectWorkspace />}>
          <Route index element={<ProjectDashboard />} />
          <Route path="scoping" element={<ProjectModulePage moduleKey="scoping" />} />
          <Route path="inventory" element={<ProjectModulePage moduleKey="inventory" />} />
          <Route path="assessment" element={<ProjectModulePage moduleKey="assessment" />} />
          <Route path="evidence" element={<ProjectModulePage moduleKey="evidence" />} />
          <Route path="readiness" element={<ProjectModulePage moduleKey="readiness" />} />
          <Route path="mock" element={<ProjectModulePage moduleKey="mock" />} />
          <Route path="security-tooling" element={<ProjectModulePage moduleKey="security-tooling" />} />
          <Route path="diagrams" element={<ProjectModulePage moduleKey="diagrams" />} />
          <Route path="srm" element={<ProjectModulePage moduleKey="srm" />} />
          <Route path="incident" element={<ProjectModulePage moduleKey="incident" />} />
          <Route path="ssp" element={<ProjectModulePage moduleKey="ssp" />} />
          <Route path="poam" element={<ProjectModulePage moduleKey="poam" />} />
          <Route path="policies" element={<ProjectModulePage moduleKey="policies" />} />
          <Route path="sprs" element={<ProjectModulePage moduleKey="sprs" />} />
          <Route path="maintenance" element={<ProjectModulePage moduleKey="maintenance" />} />
          <Route path="reports" element={<ProjectModulePage moduleKey="reports" />} />
        </Route>

        {/* Full workflow — admin + technician only (client role redirected to dashboard) */}
        <Route element={<RoleRoute allow={['admin', 'technician']} />}>
          <Route path="/projects/new" element={<NewProjectWizard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/board" element={<DeploymentBoard />} />
          {/* Retired 17/93 CMMCControl screens — redirect to the canonical project assessment. */}
          <Route path="/controls" element={<CanonicalControlsRedirect />} />
          <Route path="/controls/:id" element={<CanonicalControlsRedirect />} />
          <Route path="/level2" element={<CanonicalControlsRedirect />} />
          <Route path="/jira-export" element={<JiraExport />} />
          <Route path="/m365" element={<Microsoft365Setup />} />
          <Route path="/google" element={<GoogleMigration />} />
          <Route path="/sharepoint" element={<SharePointArchive />} />
          <Route path="/ninjaone" element={<NinjaOneEvidence />} />
          <Route path="/screenshots" element={<ScreenshotLibrary />} />
          <Route path="/documents" element={<DocumentLibrary />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/evidence" element={<EvidenceIndex />} />
          <Route path="/package" element={<DocumentLibrary initialTab="package" />} />
          <Route path="/sharepoint-package" element={<Navigate to="/projects" replace />} />
          <Route path="/piee" element={<PIEESelfCert />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/support-inbox" element={<SupportInbox />} />
        </Route>

        {/* Administration — admin only */}
        <Route element={<RoleRoute allow={['admin']} />}>
          <Route path="/users" element={<UserManagement />} />
          <Route path="/saas-admin" element={<SaaSAdmin />} />
          <Route path="/demo-workspace" element={<DemoWorkspace />} />
          <Route path="/control-library" element={<ControlLibraryAdmin />} />
          <Route path="/branding" element={<BrandingSettings />} />
          <Route path="/policy-library" element={<PolicyLibraryAdmin />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
          <BrandProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          </BrandProvider>
        </ThemeProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App