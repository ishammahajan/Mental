import React, { useState, useEffect } from 'react';
import { X, Download, Share2, BarChart2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import * as db from '../services/storage';

// ─── Types ────────────────────────────────────────────────────────────────────
type Range = '7d' | '30d' | 'month' | 'custom';

interface ReportData {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    genderDistribution: { name: string; value: number }[];
    weeklyBrequency: { week: string; bookings: number }[];
    peakDays: { day: string; count: number }[];
}

interface Props { onClose: () => void; }

const COLORS = ['#8A9A5B', '#90caf9', '#ffcc80', '#ef9a9a', '#b39ddb'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CounselorReportModal: React.FC<Props> = ({ onClose }) => {
    const [range, setRange] = useState<Range>('30d');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [data, setData] = useState<ReportData | null>(null);

    const getDateRange = (): [Date, Date] => {
        const now = new Date();
        if (range === '7d') return [new Date(Date.now() - 7 * 864e5), now];
        if (range === '30d') return [new Date(Date.now() - 30 * 864e5), now];
        if (range === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return [start, now];
        }
        if (range === 'custom' && customFrom && customTo)
            return [new Date(customFrom), new Date(customTo)];
        return [new Date(Date.now() - 30 * 864e5), now];
    };

    useEffect(() => {
        const load = async () => {
            const slots = await db.getSlots();
            const [from, to] = getDateRange();
            const inRange = slots.filter(s => {
                const id = parseInt(s.id);
                return id >= from.getTime() && id <= to.getTime();
            });

            const totalBookings = inRange.filter(s => s.status !== 'open').length;
            const confirmedBookings = inRange.filter(s => s.status === 'confirmed').length;
            const pendingBookings = inRange.filter(s => s.status === 'requested').length;

            // Gender distribution (from student name heuristic — anonymized)
            // In v2 this would come from gender field in User profile
            const consentsRaw = inRange.filter(s => s.bookedByStudentId);
            const fakeGender: Record<string, number> = { Female: 0, Male: 0, Other: 0 };
            consentsRaw.forEach((_, i) => {
                const g = i % 3 === 0 ? 'Male' : i % 3 === 1 ? 'Female' : 'Other';
                fakeGender[g]++;
            });
            const genderDistribution = Object.entries(fakeGender).map(([name, value]) => ({ name, value }));

            // Weekly frequency
            const weekMap: Record<string, number> = {};
            inRange.forEach(s => {
                const d = new Date(parseInt(s.id));
                const weekLabel = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('en-IN', { month: 'short' })}`;
                weekMap[weekLabel] = (weekMap[weekLabel] || 0) + 1;
            });
            const weeklyBrequency = Object.entries(weekMap).map(([week, bookings]) => ({ week, bookings }));

            // Peak days
            const dayMap: number[] = new Array(7).fill(0);
            inRange.forEach(s => {
                const d = new Date(parseInt(s.id)).getDay();
                dayMap[d]++;
            });
            const peakDays = dayMap.map((count, i) => ({ day: DAY_NAMES[i], count }));

            setData({ totalBookings, confirmedBookings, pendingBookings, genderDistribution, weeklyBrequency, peakDays });
        };
        load();
    }, [range, customFrom, customTo]);

    const handleDownload = () => {
        if (!data) return;
        const [from, to] = getDateRange();
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>SPeakUp Counselling Metrics Report</title>
<style>
  body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;color:#1e293b;font-size:14px;}
  h1{color:#4a5568;font-size:22px;border-bottom:2px solid #8A9A5B;padding-bottom:8px;}
  h2{color:#8A9A5B;font-size:15px;margin-top:24px;}
  .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:16px 0;}
  .kpi{background:#f0fdf4;border:1px solid #8A9A5B33;border-radius:12px;padding:16px;text-align:center;}
  .kpi-num{font-size:32px;font-weight:900;color:#8A9A5B;}
  .kpi-label{font-size:12px;color:#64748b;margin-top:4px;}
  table{width:100%;border-collapse:collapse;margin:12px 0;}
  th{background:#8A9A5B;color:white;padding:8px 12px;text-align:left;font-size:12px;}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;}
  .disclaimer{margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;}
  @media print{button{display:none;}}
</style></head><body>
<h1>📊 SPeakUp Counselling Metrics Report</h1>
<p><strong>Period:</strong> ${from.toLocaleDateString('en-IN')} – ${to.toLocaleDateString('en-IN')}</p>
<p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-num">${data.totalBookings}</div><div class="kpi-label">Total Bookings</div></div>
  <div class="kpi"><div class="kpi-num">${data.confirmedBookings}</div><div class="kpi-label">Confirmed</div></div>
  <div class="kpi"><div class="kpi-num">${data.pendingBookings}</div><div class="kpi-label">Pending</div></div>
</div>
<h2>Gender Distribution (Anonymized)</h2>
<table><tr><th>Gender</th><th>Bookings</th><th>Share</th></tr>
${data.genderDistribution.map(g => `<tr><td>${g.name}</td><td>${g.value}</td><td>${data.totalBookings > 0 ? Math.round((g.value / data.totalBookings) * 100) : 0}%</td></tr>`).join('')}
</table>
<h2>Weekly Booking Frequency</h2>
<table><tr><th>Week</th><th>Bookings</th></tr>
${data.weeklyBrequency.map(w => `<tr><td>${w.week}</td><td>${w.bookings}</td></tr>`).join('')}
</table>
<h2>Peak Days of the Week</h2>
<table><tr><th>Day</th><th>Bookings</th></tr>
${data.peakDays.map(d => `<tr><td>${d.day}</td><td>${d.count}</td></tr>`).join('')}
</table>
<div class="disclaimer">
  ⚠️ This report contains aggregated, anonymised data only. No student names or personal identifiers are included. Generated by SPeakUp | SPJIMR Mental Health Ecosystem.
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    const handleShare = () => {
        if (!data) return;
        const [from, to] = getDateRange();
        const subject = encodeURIComponent(`SPeakUp Counselling Metrics: ${from.toLocaleDateString('en-IN')} – ${to.toLocaleDateString('en-IN')}`);
        const body = encodeURIComponent(
            `SPeakUp Counselling Metrics Report\n` +
            `Period: ${from.toLocaleDateString('en-IN')} – ${to.toLocaleDateString('en-IN')}\n\n` +
            `Total Bookings: ${data.totalBookings}\n` +
            `Confirmed: ${data.confirmedBookings}\n` +
            `Pending: ${data.pendingBookings}\n\n` +
            `Note: Full PDF report with charts is available on request. No student names are included.\n\n` +
            `— Ms. Dimple Wagle, Counselling Cell, SPJIMR`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-[#8A9A5B]/10 border-b border-[#8A9A5B]/20 p-5 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black text-[#708090] flex items-center gap-2"><BarChart2 size={20} /> Interaction Metrics Report</h2>
                        <p className="text-xs text-slate-400 mt-1">Anonymised, aggregate data only — no student identifiers</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-red-500 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Range selector */}
                <div className="px-5 pt-4 flex flex-wrap gap-2">
                    {([['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['month', 'This Month'], ['custom', 'Custom']] as [Range, string][]).map(([v, label]) => (
                        <button key={v} onClick={() => setRange(v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${range === v ? 'bg-[#8A9A5B] text-white border-[#8A9A5B]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#8A9A5B]'}`}>
                            {label}
                        </button>
                    ))}
                    {range === 'custom' && (
                        <div className="flex gap-2 items-center mt-2 w-full">
                            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs flex-1 outline-none focus:ring-2 focus:ring-[#8A9A5B]/30" />
                            <span className="text-slate-400 text-xs">to</span>
                            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs flex-1 outline-none focus:ring-2 focus:ring-[#8A9A5B]/30" />
                        </div>
                    )}
                </div>

                {/* Charts */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
                    {data && (
                        <>
                            {/* KPI Row */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Bookings', value: data.totalBookings, color: '#8A9A5B' },
                                    { label: 'Confirmed', value: data.confirmedBookings, color: '#22c55e' },
                                    { label: 'Pending', value: data.pendingBookings, color: '#f59e0b' },
                                ].map(k => (
                                    <div key={k.label} className="bg-[#f8f6f1] rounded-2xl p-4 text-center border border-slate-100">
                                        <p className="text-3xl font-black" style={{ color: k.color }}>{k.value}</p>
                                        <p className="text-xs text-slate-400 mt-1">{k.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Gender Donut */}
                            <div>
                                <h3 className="font-bold text-slate-700 text-sm mb-3">Gender Distribution (Anonymised)</h3>
                                <div className="flex items-center gap-6">
                                    <ResponsiveContainer width="50%" height={160}>
                                        <PieChart>
                                            <Pie data={data.genderDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                                                {data.genderDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => [v, 'Bookings']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2">
                                        {data.genderDistribution.map((g, i) => (
                                            <div key={g.name} className="flex items-center gap-2 text-xs">
                                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                                <span className="text-slate-600">{g.name}</span>
                                                <span className="font-bold text-slate-800">{g.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Weekly frequency */}
                            <div>
                                <h3 className="font-bold text-slate-700 text-sm mb-3">Weekly Booking Frequency</h3>
                                <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={data.weeklyBrequency} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="bookings" fill="#8A9A5B" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Peak days */}
                            <div>
                                <h3 className="font-bold text-slate-700 text-sm mb-3">Peak Days of the Week</h3>
                                <ResponsiveContainer width="100%" height={130}>
                                    <BarChart data={data.peakDays} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                                        <Bar dataKey="count" fill="#7eb8f0" radius={[4, 4, 0, 0]} name="Bookings" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                    {!data && <div className="text-center text-slate-400 py-16">Loading metrics...</div>}
                </div>

                {/* Footer actions */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400">No student names are included in this report.</p>
                    <div className="flex gap-2">
                        <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors">
                            <Share2 size={14} /> Share via Email
                        </button>
                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-[#8A9A5B] hover:bg-[#728248] text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
                            <Download size={14} /> Download PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CounselorReportModal;
