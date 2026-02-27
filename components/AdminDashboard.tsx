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
  }, []);

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

  const COLORS = ['#3b82f6', '#8A9A5B', '#CC5500', '#6366f1'];

  // Slot status breakdown for pie chart
  const slotPieData = [
    { name: 'Open', value: liveStats.openSlots },
    { name: 'Requested', value: liveStats.requestedSlots },
    { name: 'Confirmed', value: liveStats.confirmedSlots },
  ].filter(d => d.value > 0);
  const SLOT_COLORS = ['#8A9A5B', '#f59e0b', '#22c55e'];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6 font-sans overflow-y-auto flex flex-col">
      <header className="mb-6 flex-shrink-0 border-b border-slate-700 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">SPeakUp Analytics <span className="text-slate-500 text-lg">| Admin View</span></h1>
          <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Live — data updates in real time from Firestore
          </p>
        </div>
        <button
          onClick={async () => { await signOut(); onLogout?.(); }}
          className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded border border-red-900 transition-colors flex items-center gap-2 text-xs font-bold"
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
      <div className="mb-6 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <p className="text-slate-400 text-xs uppercase font-bold mb-1 flex items-center gap-1.5">
            <Clock size={12} /> Counsellor Slot Utilization (Live)
          </p>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold text-white">{liveStats.utilizationPct}%</p>
            <div className="flex-1 bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-700"
                style={{ width: `${liveStats.utilizationPct}%` }}
              />
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-1">
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
        <div className="mb-6 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><Calendar size={14} /> All Slots (Live)</h3>
            <span className="text-xs text-slate-500">{allSlots.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase border-b border-slate-700">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Counselor</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Booked By</th>
                </tr>
              </thead>
              <tbody>
                {allSlots.map(slot => (
                  <tr key={slot.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-slate-300">{slot.date}</td>
                    <td className="px-4 py-2 text-slate-300">{slot.time}</td>
                    <td className="px-4 py-2 text-slate-400">{slot.counselorName}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${slot.status === 'confirmed' ? 'bg-green-900/50 text-green-300' :
                          slot.status === 'requested' ? 'bg-amber-900/50 text-amber-300' :
                            'bg-slate-700 text-slate-400'
                        }`}>{slot.status}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{slot.bookedByStudentName || '—'}</td>
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
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col min-h-[260px]">
            <h3 className="mb-2 font-bold text-slate-300 text-sm">Stress Load by Department</h3>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stressByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                  <Bar dataKey="score" fill="#8884d8">
                    {stressByDept.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#ef4444' : '#8A9A5B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Role Breakdown */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col min-h-[240px]">
            <h3 className="mb-2 font-bold text-slate-300 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              User Role Breakdown (Live)
            </h3>
            {roleChart.length > 0 ? (
              <div className="flex-1 min-h-[180px] flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={roleChart} cx={60} cy={60} outerRadius={52} dataKey="value" paddingAngle={3}>
                    {roleChart.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                </PieChart>
                <div className="space-y-2">
                  {roleChart.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                      <span className="text-slate-300">{entry.name}</span>
                      <span className="font-bold text-white ml-auto pl-4">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No Firestore data yet</div>
            )}
          </div>
        </div>

        {/* Right: Custom Analytics Builder */}
        <div className="w-full lg:w-2/3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col min-h-[500px] lg:min-h-0">
          <div className="bg-slate-700/50 p-3 border-b border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between flex-shrink-0 gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><Sliders size={16} /> Custom Analytics Builder</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleAiPredict}
                disabled={customData.length === 0 || isAnalyzing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? <span className="animate-spin">🌀</span> : <BrainCircuit size={14} />} AI Burnout Predict
              </button>
              <button onClick={handleGenerate} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">Generate</button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Metric</label>
              <select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white p-2 text-sm rounded-lg focus:outline-none">
                <option value="stress">Stress Level</option>
                <option value="attendance">Class Attendance</option>
                <option value="workload">LMS Workload</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Dimension</label>
              <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white p-2 text-sm rounded-lg focus:outline-none">
                <option value="program">By Program</option>
                <option value="gender">By Gender</option>
                <option value="year">By Year</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Chart Type</label>
              <div className="flex gap-2">
                <button onClick={() => setChartType('bar')} className={`p-2 rounded-lg flex-1 flex justify-center ${chartType === 'bar' ? 'bg-blue-600' : 'bg-slate-900 border border-slate-600'}`}><BarChart2 size={16} /></button>
                <button onClick={() => setChartType('line')} className={`p-2 rounded-lg flex-1 flex justify-center ${chartType === 'line' ? 'bg-blue-600' : 'bg-slate-900 border border-slate-600'}`}><TrendingUp size={16} /></button>
              </div>
            </div>
          </div>

          {customData.length > 0 ? (
            <div className="flex-1 w-full p-4 border-t border-slate-700 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={customData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" label={{ value: dimension.toUpperCase(), position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" label={{ value: metric.toUpperCase(), angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={customData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" label={{ value: dimension.toUpperCase(), position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" label={{ value: metric.toUpperCase(), angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Click Generate to build custom analytics</div>
          )}

          {aiInsight && (
            <div className="p-4 border-t border-slate-700 bg-indigo-950/30">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 p-2 bg-indigo-900/50 rounded-lg">
                  <Sparkles size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-300 text-sm mb-1 uppercase tracking-wider">Predictive Burnout Modeling</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{aiInsight}</p>
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
  blue: 'bg-blue-900/30 border-blue-800/50',
  green: 'bg-green-900/30 border-green-800/50',
  amber: 'bg-amber-900/30 border-amber-800/50',
  emerald: 'bg-emerald-900/30 border-emerald-800/50',
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`${colorMap[color] || 'bg-slate-800 border-slate-700'} border p-4 rounded-xl`}>
    <div className="flex items-center gap-2 mb-1">{icon}<p className="text-slate-400 text-xs font-medium">{label}</p></div>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);

export default AdminDashboard;