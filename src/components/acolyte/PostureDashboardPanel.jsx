import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, TrendingUp, Plus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import PostureGauge from '@/components/acolyte/PostureGauge';
import PostureDomainBars from '@/components/acolyte/PostureDomainBars';

// Live posture summary for the ACOLYTE Overview dashboard: gauge + per-domain
// bars + trend line. Reads PostureAssessment by organization. Never overwrites.
export default function PostureDashboardPanel({ organizationId }) {
  const [state, setState] = useState({ loading: true, completed: [] });

  useEffect(() => {
    let alive = true;
    if (!organizationId) { setState({ loading: false, completed: [] }); return; }
    (async () => {
      const list = await base44.entities.PostureAssessment
        .filter({ organization_id: organizationId }, '-created_date', 200).catch(() => []);
      if (!alive) return;
      const completed = list.filter((p) => p.status === 'completed')
        .sort((a, b) => new Date(a.assessment_date || a.created_date) - new Date(b.assessment_date || b.created_date));
      setState({ loading: false, completed });
    })();
    return () => { alive = false; };
  }, [organizationId]);

  const { loading, completed } = state;
  const latest = completed[completed.length - 1] || null;
  const previous = completed[completed.length - 2] || null;
  const delta = latest && previous ? Math.round(latest.overall_score) - Math.round(previous.overall_score) : null;
  const trend = completed.map((a) => ({
    date: (a.assessment_date || a.created_date || '').slice(0, 10),
    score: Math.round(a.overall_score || 0),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0F1E3C]" />
          <h2 className="text-sm font-bold text-slate-800">Cyber Posture</h2>
        </div>
        <Link to="/acolyte/posture" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : !latest ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-3">No posture assessment completed yet.</p>
          <Link to="/acolyte/posture" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
            <Plus className="w-4 h-4" /> Run Posture Assessment
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center">
            <PostureGauge score={latest.overall_score} size={110} />
            {delta !== null && (
              <div className={`mt-2 text-xs font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {delta >= 0 ? '+' : ''}{delta} vs previous
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <PostureDomainBars domainScores={latest.domain_scores} />
          </div>

          {trend.length >= 2 && (
            <div className="md:col-span-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Trend</div>
              <div style={{ width: '100%', height: 150 }}>
                <ResponsiveContainer>
                  <LineChart data={trend} margin={{ top: 5, right: 15, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#479dcf" strokeWidth={2} dot={{ r: 2.5 }} name="Posture" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}