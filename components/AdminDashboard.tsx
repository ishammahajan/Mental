import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, TrendingUp, AlertOctagon, BarChart2, Sliders, LogOut } from 'lucide-react';
import * as db from '../services/storage';

const AdminDashboard: React.FC = () => {
  const [metric, setMetric] = useState('stress');
  const [dimension, setDimension] = useState('program');
  const [chartType, setChartType] = useState('bar');
  const [customData, setCustomData] = useState<any[]>([]);

  const handleGenerate = async () => {
    const data = await db.getAdminAnalytics(metric, dimension);
    setCustomData(data);
  };

  const stressByDept = [
    { name: 'MBA Yr 1', score: 85 },
    { name: 'MBA Yr 2', score: 65 },
    { name: 'PGDM', score: 72 },
    { name: 'GMP', score: 48 },
  ];

  const usageStats = [
    { name: 'Seeking Help', value: 120 },
    { name: 'Routine Check-in', value: 450 },
    { name: 'Inactive', value: 80 },
  ];

  const COLORS = ['#CC5500', '#8A9A5B', '#E6DDD0'];

  return (
    <div className="h-screen bg-slate-900 text-white p-6 font-sans overflow-hidden flex flex-col">
      <header className="mb-6 flex-shrink-0 border-b border-slate-700 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SPeakUp Analytics <span className="text-slate-500 text-lg">| Admin View</span></h1>
          <p className="text-slate-400 text-sm">Organization-level mental health pulse</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.reload()} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded border border-red-900 transition-colors flex items-center gap-2 text-xs font-bold">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 flex-shrink-0">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-orange-500" />
            <h3 className="text-slate-300">Avg Org Stress</h3>
          </div>
          <p className="text-3xl font-bold">62<span className="text-sm text-slate-500 font-normal">/100</span></p>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-green-500" />
            <h3 className="text-slate-300">Counsellor Utilization</h3>
          </div>
          <p className="text-3xl font-bold">92% <span className="text-sm text-slate-500 font-normal">Booked</span></p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Standard Charts */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1 flex flex-col min-h-0">
            <h3 className="mb-2 font-bold text-slate-300 text-sm">Stress Load by Department</h3>
            <div className="flex-1 min-h-0">
              <BarChart data={stressByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar dataKey="score" fill="#8884d8">
                  {stressByDept.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#ef4444' : '#8A9A5B'} />
                  ))}
                </Bar>
              </BarChart>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1 flex flex-col min-h-0">
            <h3 className="mb-2 font-bold text-slate-300 text-sm">App Engagement</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usageStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {usageStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
                {usageStats.map((entry, index) => (
                  <span key={index} style={{ color: COLORS[index] }}>● {entry.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Analytics Builder */}
        <div className="w-2/3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col min-h-0">
          <div className="bg-slate-700/50 p-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2"><Sliders size={16} /> Custom Analytics Builder</h2>
            <button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">Generate</button>
          </div>

          <div className="p-4 grid grid-cols-3 gap-4 flex-shrink-0">
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
            <div className="flex-1 w-full p-4 border-t border-slate-700 min-h-0">
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;