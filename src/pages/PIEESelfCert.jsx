import { useState, useEffect } from 'react';
import { Building2, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import EmptyState from '@/components/EmptyState';
import OverviewCard from '@/components/piee/OverviewCard';
import PrerequisitesChecklist from '@/components/piee/PrerequisitesChecklist';
import RoleExplainer from '@/components/piee/RoleExplainer';
import StepAccordion from '@/components/piee/StepAccordion';
import CertificationWizard from '@/components/piee/CertificationWizard';
import EvidenceChecklist from '@/components/piee/EvidenceChecklist';
import OfficialResources from '@/components/piee/OfficialResources';
import Disclaimer from '@/components/piee/Disclaimer';
import { stepSections, officialResources, prerequisites, evidenceItems } from '@/components/piee/stepContent';

export default function PIEESelfCert() {
  const { selectedClient, selectedClientId } = useClient();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedClientId) { setLoading(false); return; }
    setLoading(true);
    base44.entities.SelfCertificationWalkthrough.filter({ client_id: selectedClientId })
      .then(records => {
        if (records.length > 0) {
          setRecord(records[0]);
          setLoading(false);
        } else {
          base44.entities.SelfCertificationWalkthrough.create({
            client_id: selectedClientId,
            completion_status: 'Not Started',
            piee_user_status: 'Not Started',
            assessment_level: 'Level 1 Self-Assessment',
            last_reviewed_date: new Date().toISOString().split('T')[0],
          }).then(r => { setRecord(r); setLoading(false); });
        }
      })
      .catch(() => setLoading(false));
  }, [selectedClientId]);

  const parseList = (val) => {
    if (!val) return [];
    try { return JSON.parse(val); } catch { return []; }
  };

  const updateRecord = async (data) => {
    if (!record) return;
    setRecord({ ...record, ...data });
    setSaving(true);
    try {
      const result = await base44.entities.SelfCertificationWalkthrough.update(record.id, data);
      setRecord(result);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggleListItem = (field, key) => {
    const list = parseList(record[field]);
    const newList = list.includes(key) ? list.filter(k => k !== key) : [...list, key];
    updateRecord({ [field]: JSON.stringify(newList) });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const client = selectedClient;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('PIEE / SPRS CMMC Self-Certification Walkthrough', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Client: ${client.legal_name || '—'}`, 20, y); y += 6;
    doc.text(`CAGE Code: ${record.cage_code || '—'}`, 20, y); y += 6;
    doc.text(`UEI: ${record.uei || '—'}`, 20, y); y += 6;
    doc.text(`Assessment Level: ${record.assessment_level || '—'}`, 20, y); y += 6;
    doc.text(`AO Name: ${record.ao_name || '—'}`, 20, y); y += 6;
    doc.text(`AO Email: ${record.ao_email || '—'}`, 20, y); y += 10;

    doc.setFont(undefined, 'bold');
    doc.text('Step-by-Step Instructions', 20, y); y += 8;
    doc.setFont(undefined, 'normal');

    stepSections.forEach(section => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(`${section.key}. ${section.title}`, 20, y); y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      section.steps.forEach((step, i) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`${i + 1}. ${step}`, 170);
        doc.text(lines, 22, y);
        y += lines.length * 5 + 1;
      });
      y += 4;
    });

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Official Resources', 20, y); y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    officialResources.forEach(r => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(r.name, 22, y); y += 5;
      doc.setTextColor(0, 0, 200);
      doc.text(r.url, 22, y); y += 6;
      doc.setTextColor(0, 0, 0);
    });

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Evidence Checklist', 20, y); y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    evidenceItems.forEach(item => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`[ ] ${item.label}`, 22, y); y += 5;
    });

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Completion Checklist', 20, y); y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    prerequisites.forEach(p => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`[ ] ${p.label}`, 22, y); y += 5;
    });

    doc.save(`${(client.legal_name || 'Client').replace(/[^a-zA-Z0-9]/g, '')}-PIEE-SPRS-Walkthrough.pdf`);
  };

  if (!selectedClient) {
    return <EmptyState icon={Building2} title="No client selected" description="Select a client to start the PIEE Self-Certification Walkthrough." />;
  }

  if (loading || !record) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">PIEE Self-Cert Walkthrough</h1>
          <p className="text-sm text-slate-500">{selectedClient.legal_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-slate-400">Saving...</span>}
          <button onClick={generatePDF} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A]">
            <FileDown className="w-4 h-4" /> Generate Client Instructions PDF
          </button>
        </div>
      </div>

      <OverviewCard />
      <PrerequisitesChecklist checked={parseList(record.prerequisites_checked)} onToggle={(k) => toggleListItem('prerequisites_checked', k)} />
      <RoleExplainer />
      <StepAccordion />
      <CertificationWizard completed={parseList(record.wizard_steps_completed)} onToggleStep={(k) => toggleListItem('wizard_steps_completed', k)} record={record} onUpdate={updateRecord} />

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Client Certification Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">CAGE Code</label>
            <input className="form-input mt-1" value={record.cage_code || ''} onChange={e => updateRecord({ cage_code: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">UEI</label>
            <input className="form-input mt-1" value={record.uei || ''} onChange={e => updateRecord({ uei: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Assessment Level</label>
            <select className="form-input mt-1" value={record.assessment_level || ''} onChange={e => updateRecord({ assessment_level: e.target.value })}>
              <option value="Level 1 Self-Assessment">Level 1 Self-Assessment</option>
              <option value="Level 2 Self-Assessment">Level 2 Self-Assessment</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">PIEE User Status</label>
            <select className="form-input mt-1" value={record.piee_user_status || ''} onChange={e => updateRecord({ piee_user_status: e.target.value })}>
              <option value="Not Started">Not Started</option>
              <option value="Existing PIEE User">Existing PIEE User</option>
              <option value="New PIEE User">New PIEE User</option>
              <option value="Role Requested">Role Requested</option>
              <option value="Role Approved">Role Approved</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">AO Email</label>
            <input className="form-input mt-1" value={record.ao_email || ''} onChange={e => updateRecord({ ao_email: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Completion Status</label>
            <select className="form-input mt-1" value={record.completion_status || ''} onChange={e => updateRecord({ completion_status: e.target.value })}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending AO">Pending AO</option>
              <option value="Submitted">Submitted</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Last Reviewed Date</label>
            <input type="date" className="form-input mt-1" value={record.last_reviewed_date || ''} onChange={e => updateRecord({ last_reviewed_date: e.target.value })} />
          </div>
        </div>
      </div>

      <EvidenceChecklist checked={parseList(record.evidence_checked)} onToggle={(k) => toggleListItem('evidence_checked', k)} record={record} onUpdate={updateRecord} />
      <OfficialResources />
      <Disclaimer />
    </div>
  );
}