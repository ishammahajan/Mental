import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, TrendingUp, AlertOctagon, BarChart2, Sliders, LogOut, Sparkles, BrainCircuit, Calendar, CheckCircle, Clock, UserCircle } from 'lucide-react';
import * as db from '../services/storage';
import { analyzeBurnoutRisk } from '../services/aiService';
import { signOut } from '../services/authService';
import { subscribeToSlots } from '../services/slotService';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebaseConfig';
import { AppointmentSlot } from '../types';
import { isDemoMode } from '../services/demoMode';
import { DEMO_USERS } from '../data/demoData';

interface AdminProps { onLogout?: () => void; }

interface LiveStats {
  totalStudents: number;
  totalCounselors: number;
  totalAdmins: number;
  openSlots: number;
  requestedSlots: number;
  confirmedSlots: number;
  utilizationPct: number;
}

const AdminDashboard: React.FC<AdminProps> = ({ onLogout }) => {
  const demoMode = isDemoMode();
  const [metric, setMetric] = useState('stress');
  const [dimension, setDimension] = useState('program');
  const [chartType, setChartType] = useState('bar');
  const [customData, setCustomData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Live Firestore stats ──────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalStudents: 0, totalCounselors: 0, totalAdmins: 0,
    openSlots: 0, requestedSlots: 0, confirmedSlots: 0, utilizationPct: 0,
  });
  const [allSlots, setAllSlots] = useState<AppointmentSlot[]>([]);
  const [roleChart, setRoleChart] = useState<{ name: string; value: number }[]>([]);

  // Listen to Firestore users collection for live role counts
  useEffect(() => {
    if (demoMode) {
      const students = DEMO_USERS.filter(u => u.role === 'student').length;
      const counselors = DEMO_USERS.filter(u => u.role === 'counselor').length;
      const admins = DEMO_USERS.filter(u => u.role === 'admin').length;
      setRoleChart([
        { name: 'Students', value: students },
        { name: 'Counselors', value: counselors },
        { name: 'Admins', value: admins },
      ]);
      setLiveStats(prev => ({ ...prev, totalStudents: students, totalCounselors: counselors, totalAdmins: admins }));
      return;
    }
    const unsub = onSnapshot(collection(firestoreDb, 'users'), snap => {
      const users = snap.docs.map(d => d.data() as any);
      const students = users.filter(u => u.role === 'student').length;
      const counselors = users.filter(u => u.role === 'counselor').length;
      const admins = users.filter(u => u.role === 'admin').length;
      setRoleChart([
        { name: 'Students', value: students },
        { name: 'Counselors', value: counselors },
        { name: 'Admins', value: admins },
      ]);
      setLiveStats(prev => ({ ...prev, totalStudents: students, totalCounselors: counselors, totalAdmins: admins }));
    });
    return () => unsub();
  }, [demoMode]);

  // Listen to Firestore slots for live booking stats
  useEffect(() => {
    const unsub = subscribeToSlots(slots => {
      setAllSlots(slots);
      const open = slots.filter(s => s.status === 'open').length;
      const requested = slots.filter(s => s.status === 'requested').length;
      const confirmed = slots.filter(s => s.status === 'confirmed').length;
      const total = slots.length;
      const utilization = total > 0 ? Math.round(((requested + confirmed) / total) * 100) : 0;
      setLiveStats(prev => ({
        ...prev, openSlots: open, requestedSlots: requested,
        confirmedSlots: confirmed, utilizationPct: utilization,
      }));
    });
    return () => unsub();
  }, []);

  const handleGenerate = async () => {
    const data = await db.getAdminAnalytics(metric, dimension);
    setCustomData(data);
    setAiInsight(null);
  };

  const handleAiPredict = async () => {
    if (customData.length === 0) return;
    setIsAnalyzing(true);
    const insight = await analyzeBurnoutRisk(customData);
    setAiInsight(insight);
    setIsAnalyzing(false);
  };

  const stressByDept = [
    { name: 'MBA Yr 1', score: 85 },
    { name: 'MBA Yr 2', score: 65 },
    { name: 'PGDM', score: 72 },
    { name: 'GMP', score: 48 },
  ];

  const COLORS = ['#8a6b5c', '#dccfc4', '#efe4da', '#785a4d'];

  // Slot status breakdown for pie chart
  const slotPieData = [
    { name: 'Open', value: liveStats.openSlots },
    { name: 'Requested', value: liveStats.requestedSlots },
    { name: 'Confirmed', value: liveStats.confirmedSlots },
  ].filter(d => d.value > 0);
  const SLOT_COLORS = ['#8a6b5c', '#dccfc4', '#785a4d'];

  return (
    <div className="min-h-screen app-shell text-[var(--color-text)] p-4 md:p-8 font-sans overflow-y-auto flex flex-col">
      <header className="mb-6 flex-shrink-0 border-b border-[var(--border-subtle)] pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">SPeakUp Analytics <span className="text-[var(--color-text-secondary)] text-lg">| Admin View</span></h1>
          <p className="text-[var(--color-text-secondary)] text-sm flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse inline-block" />
            Live — data updates in real time from Firestore
          </p>
        </div>
        <button
          onClick={async () => { await signOut(); onLogout?.(); }}
          className="ui-btn-secondary px-4 py-2 flex items-center gap-2 text-xs font-bold"
        >
          <LogOut size={14} /> Logout
        </button>
      </header>

      {/* ── Live KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 flex-shrink-0">
        <KpiCard icon={<Users className="text-blue-400" size={20} />}
          label="Students" value={liveStats.totalStudents} color="blue" />
        <KpiCard icon={<UserCircle className="text-green-400" size={20} />}
          label="Counselors" value={liveStats.totalCounselors} color="green" />
        <KpiCard icon={<Calendar className="text-amber-400" size={20} />}
          label="Pending Requests" value={liveStats.requestedSlots} color="amber" />
        <KpiCard icon={<CheckCircle className="text-emerald-400" size={20} />}
          label="Confirmed Sessions" value={liveStats.confirmedSlots} color="emerald" />
      </div>

      {/* ── Slot Utilization Banner ─────────────────────────────────────── */}
      <div className="mb-6 flex-shrink-0 ui-panel p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="ui-kicker mb-1 flex items-center gap-1.5">
            <Clock size={12} /> Counsellor Slot Utilization (Live)
          </p>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold text-[var(--color-text)]">{liveStats.utilizationPct}%</p>
            <div className="flex-1 bg-[var(--color-elevated)] rounded-full h-3 border border-[var(--border-subtle)]">
              <div
                className="bg-gradient-to-r from-[#8a6b5c] to-[#785a4d] h-3 rounded-full transition-all duration-700"
                style={{ width: `${liveStats.utilizationPct}%` }}
              />
            </div>
          </div>
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">
            {liveStats.openSlots} open · {liveStats.requestedSlots} pending · {liveStats.confirmedSlots} confirmed
          </p>
        </div>
        {slotPieData.length > 0 && (
          <PieChart width={100} height={80}>
            <Pie data={slotPieData} cx={50} cy={40} innerRadius={25} outerRadius={38} dataKey="value" paddingAngle={3}>
              {slotPieData.map((_, i) => <Cell key={i} fill={SLOT_COLORS[i]} />)}
            </Pie>
          </PieChart>
        )}
      </div>

      {/* ── Live Slot Table ─────────────────────────────────────────────── */}
      {allSlots.length > 0 && (
        <div className="mb-6 flex-shrink-0 ui-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h3 className="font-bold text-sm text-[var(--color-text)] flex items-center gap-2"><Calendar size={14} /> All Slots (Live)</h3>
            <span className="text-xs text-[var(--color-text-secondary)]">{allSlots.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-text-secondary)] text-xs uppercase border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Counselor</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Booked By</th>
                </tr>
              </thead>
              <tbody>
                {allSlots.map(slot => (
                  <tr key={slot.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--color-elevated)]">
                    <td className="px-4 py-2 text-[var(--color-text)]">{slot.date}</td>
                    <td className="px-4 py-2 text-[var(--color-text)]">{slot.time}</td>
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">{slot.counselorName}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${slot.status === 'confirmed' ? 'bg-[#f1e6df] text-[#8a6b5c]' :
                          slot.status === 'requested' ? 'bg-[#f1e6df] text-[#5b5350]' :
                            'bg-[#f2ede7] text-[#7c7470]'
                        }`}>{slot.status}</span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text-secondary)] text-xs">{slot.bookedByStudentName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left: Charts */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="ui-card p-4 flex flex-col min-h-[260px]">
            <h3 className="mb-2 font-bold text-[var(--color-text)] text-sm">Stress Load by Department</h3>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stressByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dad1" vertical={false} />
                  <XAxis dataKey="name" stroke="#768287" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#768287" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e6dad1' }} />
                  <Bar dataKey="score" fill="#8a6b5c">
                    {stressByDept.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#dccfc4' : '#8a6b5c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Role Breakdown */}
          <div className="ui-card p-4 flex flex-col min-h-[240px]">
            <h3 className="mb-2 font-bold text-[var(--color-text)] text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse inline-block" />
              User Role Breakdown (Live)
            </h3>
            {roleChart.length > 0 ? (
              <div className="flex-1 min-h-[180px] flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={roleChart} cx={60} cy={60} outerRadius={52} dataKey="value" paddingAngle={3}>
                    {roleChart.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e6dad1' }} />
                </PieChart>
                <div className="space-y-2">
                  {roleChart.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                      <span className="text-[var(--color-text-secondary)]">{entry.name}</span>
                      <span className="font-bold text-[var(--color-text)] ml-auto pl-4">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">No Firestore data yet</div>
            )}
          </div>
        </div>

        {/* Right: Custom Analytics Builder */}
        <div className="w-full lg:w-2/3 ui-panel flex flex-col min-h-[500px] lg:min-h-0">
          <div className="bg-[var(--color-elevated)] p-3 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between flex-shrink-0 gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><Sliders size={16} /> Custom Analytics Builder</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleAiPredict}
                disabled={customData.length === 0 || isAnalyzing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#f1e6df] hover:bg-[#f1e6df] text-[var(--color-text)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? <span className="animate-spin">🌀</span> : <BrainCircuit size={14} />} AI Burnout Predict
              </button>
              <button onClick={handleGenerate} className="flex-1 sm:flex-none ui-btn-primary px-3 py-1.5 text-sm font-bold transition-colors">Generate</button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
            <div>
              <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 uppercase font-bold">Metric</label>
              <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full ui-input p-2 text-sm">
                <option value="stress">Stress Level</option>
                <option value="attendance">Class Attendance</option>
                <option value="workload">LMS Workload</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 uppercase font-bold">Dimension</label>
              <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="w-full ui-input p-2 text-sm">
                <option value="program">By Program</option>
                <option value="gender">By Gender</option>
                <option value="year">By Year</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 uppercase font-bold">Chart Type</label>
              <div className="flex gap-2">
                <button onClick={() => setChartType('bar')} className={`p-2 rounded-lg flex-1 flex justify-center ${chartType === 'bar' ? 'bg-[#8a6b5c] text-white' : 'bg-[var(--color-elevated)] border border-[var(--border-subtle)] text-[var(--color-text-secondary)]'}`}><BarChart2 size={16} /></button>
                <button onClick={() => setChartType('line')} className={`p-2 rounded-lg flex-1 flex justify-center ${chartType === 'line' ? 'bg-[#8a6b5c] text-white' : 'bg-[var(--color-elevated)] border border-[var(--border-subtle)] text-[var(--color-text-secondary)]'}`}><TrendingUp size={16} /></button>
              </div>
            </div>
          </div>

          {customData.length > 0 ? (
            <div className="flex-1 w-full p-4 border-t border-[var(--border-subtle)] min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={customData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6dad1" vertical={false} />
                    <XAxis dataKey="name" stroke="#768287" label={{ value: dimension.toUpperCase(), position: 'insideBottom', offset: -10, fill: '#768287', fontSize: 10 }} />
                    <YAxis stroke="#768287" label={{ value: metric.toUpperCase(), angle: -90, position: 'insideLeft', fill: '#768287', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e6dad1' }} />
                    <Bar dataKey="value" fill="#8a6b5c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={customData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6dad1" vertical={false} />
                    <XAxis dataKey="name" stroke="#768287" label={{ value: dimension.toUpperCase(), position: 'insideBottom', offset: -10, fill: '#768287', fontSize: 10 }} />
                    <YAxis stroke="#768287" label={{ value: metric.toUpperCase(), angle: -90, position: 'insideLeft', fill: '#768287', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #e6dad1' }} />
                    <Line type="monotone" dataKey="value" stroke="#8a6b5c" strokeWidth={3} dot={{ fill: '#8a6b5c', r: 4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">Click Generate to build custom analytics</div>
          )}

          {aiInsight && (
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[#f2ede7]">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 p-2 bg-white rounded-lg border border-[var(--border-subtle)]">
                  <Sparkles size={16} className="text-[var(--color-secondary)]" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text)] text-sm mb-1 uppercase tracking-wider">Predictive Burnout Modeling</h4>
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{aiInsight}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── KPI Card helper ──────────────────────────────────────────────────────────
const colorMap: Record<string, string> = {
  blue: 'bg-[#f2ede7] border-[#e6dad1]',
  green: 'bg-[#f2ede7] border-[#e6dad1]',
  amber: 'bg-[#f1e6df] border-[#e6dad1]',
  emerald: 'bg-[#f1e6df] border-[#e6dad1]',
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`${colorMap[color] || 'bg-[#f2ede7] border-[#e6dad1]'} border p-4 rounded-xl shadow-sm`}>
    <div className="flex items-center gap-2 mb-1">{icon}<p className="text-[var(--color-text-secondary)] text-xs font-medium">{label}</p></div>
    <p className="text-3xl font-bold text-[var(--color-text)]">{value}</p>
  </div>
);

export default AdminDashboard;







