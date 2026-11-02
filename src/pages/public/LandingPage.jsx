import { useState } from 'react';
import PublicHeader from '@/components/landing/PublicHeader';
import HeroSection from '@/components/landing/HeroSection';
import WhoWeAreSection from '@/components/landing/WhoWeAreSection';
import ProblemSection from '@/components/landing/ProblemSection';
import WorkflowSection from '@/components/landing/WorkflowSection';
import ReadinessSection from '@/components/landing/ReadinessSection';
import CapabilitiesSection from '@/components/landing/CapabilitiesSection';
import AudienceSection from '@/components/landing/AudienceSection';
import ConnectedSection from '@/components/landing/ConnectedSection';
import SecuritySection from '@/components/landing/SecuritySection';
import FinalCtaSection from '@/components/landing/FinalCtaSection';
import PublicFooter from '@/components/landing/PublicFooter';
import DemoRequestModal from '@/components/landing/DemoRequestModal';

// Public marketing home page. It is the default route for visitors AND for
// signed-in users, and intentionally requests NO protected application data.
export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  return (
    <div className="min-h-screen scroll-smooth bg-[#060c18] font-body text-white antialiased">
      <PublicHeader onRequestDemo={openDemo} />
      <main>
        <HeroSection onRequestDemo={openDemo} />
        <WhoWeAreSection />
        <ProblemSection />
        <WorkflowSection />
        <ReadinessSection />
        <CapabilitiesSection />
        <AudienceSection />
        <ConnectedSection />
        <SecuritySection />
        <FinalCtaSection onRequestDemo={openDemo} />
      </main>
      <PublicFooter onRequestDemo={openDemo} />
      <DemoRequestModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}