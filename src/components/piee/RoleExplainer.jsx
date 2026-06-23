import { ShieldCheck, Eye, AlertTriangle } from 'lucide-react';

export default function RoleExplainer() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">PIEE / SPRS Roles</h3>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-slate-800">SPRS Cyber Vendor User</h4>
          </div>
          <p className="text-xs text-slate-600">Required to view, enter, edit, delete, and affirm cyber information, including NIST SP 800-171 and CMMC data.</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-800">Contractor/Vendor Support Role</h4>
          </div>
          <p className="text-xs text-slate-600">View-only access to company cyber information and scoring. Cannot enter CMMC assessments.</p>
        </div>
      </div>
      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red-800 font-medium">To enter CMMC assessments, the client must have the SPRS Cyber Vendor User role.</p>
      </div>
    </div>
  );
}