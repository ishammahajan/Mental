import React, { useState, useEffect, useRef } from 'react';

import EnvironmentWidget from './EnvironmentWidget';
import CounselorReportModal from './CounselorReportModal';
import { Shield, Users, Clock, Calendar as CalendarIcon, FileText, CheckCircle2, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, MessageSquare, ClipboardList, Trash2, LogOut, Bell, PlusCircle, Newspaper, Settings, MoreVertical, X, Download, ShieldAlert, Zap, XCircle, ArrowRight, BookOpen, Lock, Video, Phone, Mail, Pin, Star, Hash, Share2, Printer, LineChart as ChartIcon, Wand2, Activity, Send, Edit2, Bot } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import * as db from '../services/storage';
import * as chat from '../services/chatService';
import { deleteTask } from '../services/storage';
import { uploadGamePDF, getForgedGames, GameMetadata } from '../services/ragService';
import {
  AppointmentSlot,
  CounselorEmailThread,
  CounselorReport,
  CounselorTaskItem,
  ForgeQuestion,
  ForgeResponse,
  ForgeSurvey,
  P2PMessage,
  ConsentData,
  User,
  WellnessPost,
} from '../types';
import ConsentForm from './ConsentForm';
import CounselorCopilot from './CounselorCopilot';
import { useNotification } from '../contexts/NotificationContext';
import { useStorageSync } from '../hooks/useStorageSync';
import { signOut } from '../services/authService';
import {
  getSlots,
  createSlot,
  requestSlot,
  updateSlotStatus,
  updateSlot,
  deleteSlot as deleteSlotFromFirestore,
  subscribeToSlots,
} from '../services/slotService';
import { COUNSELORS } from '../constants';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebaseConfig';
import {
  saveCounselorTask,
  extractForgeQuestionsFromText,
  saveForgeResponse,
  saveForgeSurvey,
  saveReport,
  subscribeCounselorTasksForCounselor,
  subscribeEmailThreadsForCounselor,
  subscribeForgeResponsesForCounselor,
  subscribeForgeSurveysForCounselor,
  updateCounselorTaskCompletion,
  upsertEmailThread,
} from '../services/counselorStudioService';

// Mock Graph Data
const stressData = [
  { name: 'Mon', workload: 40 },
  { name: 'Tue', workload: 70 },
  { name: 'Wed', workload: 90 },
  { name: 'Thu', workload: 60 },
  { name: 'Fri', workload: 30 },
];

type DemoCaseIndicator = {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'steady';
  note: string;
};

type DemoInteraction = {
  date: string;
  channel: 'Chat' | 'In-person' | 'Call' | 'Email';
  summary: string;
  followUp: string;
};

type DemoAlert = {
  level: 'High' | 'Medium' | 'Low';
  title: string;
  detail: string;
  date: string;
};

type DemoCaseData = {
  summary: string;
  lastCheckIn: string;
  riskLevel: 'High' | 'Moderate' | 'Low';
  focusArea: string;
  indicators: DemoCaseIndicator[];
  interactions: DemoInteraction[];
  alerts: DemoAlert[];
  lastActive: string;
};

type DemoTask = import('../types').WellnessTask;

type ReportTemplate = {
  id: string;
  title: string;
  currentState: string;
  concerns: string;
  actions: string;
};
type ReminderItem = {
  id: string;
  type: 'task-overdue' | 'task-pending' | 'inactive';
  studentId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
};

const demoStudents: User[] = [
  {
    id: 'stu_demo_aarohi',
    casefileId: 'CF-1024',
    name: 'Aarohi Mehta',
    email: 'aarohi.mehta@spjimr.edu',
    program: 'MBA Year 1',
    role: 'student',
  } as User,
  {
    id: 'stu_demo_kunal',
    casefileId: 'CF-1081',
    name: 'Kunal Iyer',
    email: 'kunal.iyer@spjimr.edu',
    program: 'MBA Year 2',
    role: 'student',
  } as User,
  {
    id: 'stu_demo_sana',
    casefileId: 'CF-1103',
    name: 'Sana Qureshi',
    email: 'sana.qureshi@spjimr.edu',
    program: 'MBA Year 1',
    role: 'student',
  } as User,
  {
    id: 'stu_demo_rhea',
    casefileId: 'CF-1139',
    name: 'Rhea Banerjee',
    email: 'rhea.banerjee@spjimr.edu',
    program: 'MBA Year 2',
    role: 'student',
  } as User,
];

const demoCaseData: Record<string, DemoCaseData> = {
  stu_demo_aarohi: {
    summary: 'High workload and sleep debt ahead of midterms; anxiety spikes in evening hours.',
    lastCheckIn: 'Mar 12, 2026',
    riskLevel: 'Moderate',
    focusArea: 'Sleep hygiene and workload pacing',
    indicators: [
      { label: 'Stress', value: 'High', trend: 'up', note: 'Three deadlines in 5 days' },
      { label: 'Sleep', value: '4-5 hrs', trend: 'down', note: 'Late-night submissions' },
      { label: 'Mood', value: 'Anxious', trend: 'steady', note: 'Worries about performance' },
    ],
    interactions: [
      { date: 'Mar 12', channel: 'Chat', summary: 'Discussed overwhelm; practiced 2-min grounding', followUp: '10-min walk after dinner' },
      { date: 'Mar 08', channel: 'In-person', summary: 'Reviewed workload map; set 2-day buffer', followUp: 'Send updated task list' },
      { date: 'Mar 01', channel: 'Email', summary: 'Shared breathing audio and sleep tips', followUp: 'Track sleep for 5 nights' },
    ],
    alerts: [
      { level: 'High', title: 'Missed follow-up task', detail: 'No sleep log submitted for 10 days', date: 'Mar 15' },
      { level: 'Medium', title: 'Late-night activity spike', detail: 'Active after 2:30 AM three nights', date: 'Mar 13' },
    ],
    lastActive: 'Mar 12, 2026',
  },
  stu_demo_kunal: {
    summary: 'Low mood after internship feedback; reports social withdrawal and low energy.',
    lastCheckIn: 'Mar 10, 2026',
    riskLevel: 'High',
    focusArea: 'Re-engagement and confidence rebuild',
    indicators: [
      { label: 'Mood', value: 'Low', trend: 'down', note: 'Negative self-talk reported' },
      { label: 'Motivation', value: 'Low', trend: 'down', note: 'Skipped two classes' },
      { label: 'Support', value: 'Limited', trend: 'steady', note: 'Avoiding peers this week' },
    ],
    interactions: [
      { date: 'Mar 10', channel: 'Call', summary: 'Processed feedback; set small wins plan', followUp: '1:1 faculty check-in' },
      { date: 'Mar 05', channel: 'Chat', summary: 'Reported low energy; encouraged peer buddy', followUp: 'Lunch with cohort mate' },
      { date: 'Feb 26', channel: 'In-person', summary: 'Introduced cognitive reframing steps', followUp: 'Daily 3-line reflection' },
    ],
    alerts: [
      { level: 'High', title: 'Class absence pattern', detail: 'Missed 2 consecutive lectures', date: 'Mar 11' },
      { level: 'Medium', title: 'Withdrawal signal', detail: 'Muted chat for 7 days', date: 'Mar 09' },
    ],
    lastActive: 'Mar 10, 2026',
  },
  stu_demo_sana: {
    summary: 'Steady progress; managing anxiety with journaling and peer support.',
    lastCheckIn: 'Mar 14, 2026',
    riskLevel: 'Low',
    focusArea: 'Maintain routines and boundary setting',
    indicators: [
      { label: 'Stress', value: 'Moderate', trend: 'steady', note: 'Project workload stable' },
      { label: 'Sleep', value: '6-7 hrs', trend: 'up', note: 'Consistent bedtime' },
      { label: 'Engagement', value: 'High', trend: 'up', note: 'Active in peer group' },
    ],
    interactions: [
      { date: 'Mar 14', channel: 'Chat', summary: 'Shared progress; reviewed boundary script', followUp: 'Practice assertive response' },
      { date: 'Mar 07', channel: 'Email', summary: 'Sent coping plan template', followUp: 'Fill weekly plan' },
      { date: 'Feb 28', channel: 'In-person', summary: 'Discussed social anxiety triggers', followUp: 'Attend 1 club meet' },
    ],
    alerts: [
      { level: 'Low', title: 'Routine check-in', detail: 'Weekly check-in due tomorrow', date: 'Mar 17' },
    ],
    lastActive: 'Mar 14, 2026',
  },
  stu_demo_rhea: {
    summary: 'Burnout risk from leadership role; reports tension headaches.',
    lastCheckIn: 'Mar 09, 2026',
    riskLevel: 'Moderate',
    focusArea: 'Delegation and recovery breaks',
    indicators: [
      { label: 'Stress', value: 'High', trend: 'up', note: 'Event week overload' },
      { label: 'Somatic', value: 'Headaches', trend: 'steady', note: 'Evening tension' },
      { label: 'Sleep', value: '5-6 hrs', trend: 'down', note: 'Late meetings' },
    ],
    interactions: [
      { date: 'Mar 09', channel: 'In-person', summary: 'Mapped delegation plan', followUp: 'Assign two co-leads' },
      { date: 'Mar 03', channel: 'Call', summary: 'Discussed burnout signs', followUp: 'Schedule recovery block' },
      { date: 'Feb 25', channel: 'Email', summary: 'Shared headache relief routine', followUp: 'Hydration check' },
    ],
    alerts: [
      { level: 'Medium', title: 'Overtime hours logged', detail: 'Workday exceeded 12 hrs twice', date: 'Mar 12' },
      { level: 'Low', title: 'Hydration reminder', detail: 'Below 1.5L intake this week', date: 'Mar 08' },
    ],
    lastActive: 'Mar 09, 2026',
  },
};

const demoTasks: Record<string, DemoTask[]> = {
  stu_demo_aarohi: [
    {
      id: 'task_aarohi_1',
      title: '10-min walk after dinner',
      description: 'Short recovery break to reset before study block.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
    {
      id: 'task_aarohi_2',
      title: 'Sleep log (5 nights)',
      description: 'Track bedtime and wake time for consistency.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
  ],
  stu_demo_kunal: [
    {
      id: 'task_kunal_1',
      title: 'Check-in with faculty mentor',
      description: 'Schedule a 15-min feedback alignment call.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
  ],
  stu_demo_sana: [
    {
      id: 'task_sana_1',
      title: 'Boundary script practice',
      description: 'Rehearse the assertive response twice this week.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
  ],
  stu_demo_rhea: [
    {
      id: 'task_rhea_1',
      title: 'Delegate two tasks to co-leads',
      description: 'Offload event logistics to reduce overtime.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
  ],
};

const STUDIO_KEYS = {
  EMAILS: 'speakup_mock_email_threads',
  SURVEYS: 'speakup_mock_forge_surveys',
  RESPONSES: 'speakup_mock_forge_responses',
  TASKS: 'speakup_mock_counselor_tasks',
  SNIPPETS: 'speakup_mock_report_snippets',
};

const demoEmailThreads: CounselorEmailThread[] = [
  {
    id: 'email_thread_aarohi',
    counselorId: 'counselor_dimple_wagle',
    studentId: 'stu_demo_aarohi',
    subject: 'Follow-up on sleep routine',
    participants: ['counselor@spjimr.edu', 'aarohi.mehta@spjimr.edu'],
    messages: [
      {
        id: 'email_msg_1',
        threadId: 'email_thread_aarohi',
        senderName: 'Ms. Dimple Wagle',
        senderEmail: 'counselor@spjimr.edu',
        body: 'Hi Aarohi, sharing a short sleep routine checklist. Can you try it for 5 nights and reply with any blockers?',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        direction: 'sent',
      },
      {
        id: 'email_msg_2',
        threadId: 'email_thread_aarohi',
        senderName: 'Aarohi Mehta',
        senderEmail: 'aarohi.mehta@spjimr.edu',
        body: 'Thanks maam, I tried two nights but got late submissions. Will retry this week.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        direction: 'received',
      },
    ],
  },
  {
    id: 'email_thread_kunal',
    counselorId: 'counselor_dimple_wagle',
    studentId: 'stu_demo_kunal',
    subject: 'Small wins plan',
    participants: ['counselor@spjimr.edu', 'kunal.iyer@spjimr.edu'],
    messages: [
      {
        id: 'email_msg_3',
        threadId: 'email_thread_kunal',
        senderName: 'Ms. Dimple Wagle',
        senderEmail: 'counselor@spjimr.edu',
        body: 'Hi Kunal, attached a small wins worksheet. Pick 1 task for today and let me know how it feels.',
        timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        direction: 'sent',
      },
    ],
  },
];

const reportTemplates: ReportTemplate[] = [
  {
    id: 'template_case_brief',
    title: 'Case Brief',
    currentState: 'Summarize the student current mental and academic state based on latest check-ins.',
    concerns: 'Highlight the top 2-3 clinical or academic concerns observed.',
    actions: 'Recommend immediate next steps with dates and accountability owner.',
  },
  {
    id: 'template_supervisor',
    title: 'Supervisor Update',
    currentState: 'Provide a concise snapshot for leadership review and risk monitoring.',
    concerns: 'List risks, patterns, or escalations needing attention.',
    actions: 'Outline support actions and any escalation triggers.',
  },
];

const defaultCaseData: DemoCaseData = {
  summary: 'Workload pressure noted; steady engagement with coping routines.',
  lastCheckIn: 'Mar 11, 2026',
  riskLevel: 'Moderate',
  focusArea: 'Workload pacing and sleep routine',
  indicators: [
    { label: 'Stress', value: 'Moderate', trend: 'steady', note: 'Project deadlines clustered' },
    { label: 'Sleep', value: '5-6 hrs', trend: 'down', note: 'Late study hours' },
    { label: 'Mood', value: 'Balanced', trend: 'steady', note: 'Uses breathing breaks' },
  ],
  interactions: [
    { date: 'Mar 11', channel: 'Chat', summary: 'Reviewed weekly plan and coping tools', followUp: 'Set 2 recovery blocks' },
    { date: 'Mar 04', channel: 'Email', summary: 'Shared time-block template', followUp: 'Send updated schedule' },
    { date: 'Feb 27', channel: 'In-person', summary: 'Explored stress triggers', followUp: 'Journal 3 evenings' },
  ],
  alerts: [
    { level: 'Medium', title: 'Routine check-in due', detail: 'No check-in in the last 7 days', date: 'Mar 16' },
    { level: 'Low', title: 'Sleep variability', detail: 'Bedtime shifted by 2+ hours', date: 'Mar 13' },
  ],
  lastActive: 'Mar 11, 2026',
};

const getCaseData = (studentId: string, studentName: string) => {
  const base = demoCaseData[studentId] || defaultCaseData;
  return {
    ...base,
    summary: base.summary.replace('Workload pressure noted', `${studentName} is managing workload pressure`),
  };
};

/** Generate PDF for a consent form */
const downloadConsentAsPDF = async (slotId: string) => {
  const consent = await db.getConsentForSlot(slotId);
  if (!consent) return;
  const html = `< !DOCTYPE html > <html><head><meta charset="UTF-8" /><title>Consent – ${consent.studentName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>@page{margin:24mm 20mm;}body{font - family:'Inter',sans-serif;font-size:13px;color:#222;line-height:1.7;}
    h1{font - size:18px;text-align:center;margin-bottom:8px;}
    .info{background:#f2ede7;padding:12px;border-radius:6px;margin:12px 0;display:grid;grid-template-columns:1fr 1fr;gap:6px;border:1px solid #e6dad1;}
    .sigs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;border-top:2px solid #e6dad1;padding-top:16px;}
    .sig-box{border:1px solid #ccc;border-radius:6px;padding:12px;min-height:80px;}
    .footer{text - align:center;color:#aaa;font-size:10px;margin-top:24px;}</style></head><body>
    <h1>Informed Consent for Psychological Counseling</h1>
    <div class="info">
      <div><strong>Student:</strong> ${consent.studentName}</div>
      <div><strong>Counselor:</strong> ${consent.counselorName || 'Ms. Dimple Wagle'}</div>
      <div><strong>Slot ID:</strong> ${consent.slotId}</div>
      <div><strong>Date:</strong> ${new Date(consent.studentSignDate).toLocaleString()}</div>
    </div>
    <p>This consent confirms voluntary participation in psychological counselling at SPJIMR under the assigned counselor, subject to standard confidentiality protocols.</p>
    <div class="sigs">
      <div class="sig-box"><strong>Student Signature</strong><br />${consent.studentSignature?.startsWith('data:image')
      ? `<img src="${consent.studentSignature}" style="max-height:60px;margin-top:4px;"/>`
      : `<p style="font-family:cursive;font-size:22px;">${consent.studentSignature || '—'}</p>`
    }<p style="font-size:11px;color:#666;">Date: ${new Date(consent.studentSignDate).toLocaleString()}</p></div>
      <div class="sig-box"><strong>Counselor Signature</strong><br /><p style="font-family:cursive;font-size:22px;">${consent.counselorSignature || 'Pending'}</p>
        <p style="font-size:11px;color:#666;">Date: ${consent.counselorSignDate ? new Date(consent.counselorSignDate).toLocaleString() : 'Pending'}</p></div>
    </div>
    <p class="footer">Generated by SPeakUp | SPJIMR Mental Health Ecosystem</p>
    <script>window.onload=()=>window.print();</script></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
};

interface CounselorProps { onLogout?: () => void; }

const CounselorDashboard: React.FC<CounselorProps> = ({ onLogout }) => {
  const counselorId = COUNSELORS[0].email || COUNSELORS[0].id;
  const { addNotification, storedNotifications, unreadCount: contextUnreadCount, markAllRead, clearAll, clearOne } = useNotification();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Input States
  const [taskInput, setTaskInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<P2PMessage[]>([]);

  // Scheduling State
  const [pickerDate, setPickerDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Inbox State
  const [conversations, setConversations] = useState<{ studentId: string, lastMessage: P2PMessage | null, unreadCount: number }[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  // Consent Form State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedSlotForConsent, setSelectedSlotForConsent] = useState<AppointmentSlot | null>(null);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [studentForConsent, setStudentForConsent] = useState<User | null>(null);

  // Posts (Wellness Wall) State
  const [activePanel, setActivePanel] = useState<'requests' | 'manageSlots' | 'posts' | 'questForge' | 'copilot'>('requests');
  const [posts, setPosts] = useState<WellnessPost[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postPinned, setPostPinned] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  // Quest Forge State
  const [questTitle, setQuestTitle] = useState('');
  const [questParadigm, setQuestParadigm] = useState<'Resource Gathering' | 'Story Weaving' | 'Logic Puzzle'>('Resource Gathering');
  const [questFile, setQuestFile] = useState<File | null>(null);
  const [isForging, setIsForging] = useState(false);
  const [forgedGames, setForgedGames] = useState<Record<string, GameMetadata>>({});

  // Counselor Studio (Email, Reports, Forge, Tasks, Alerts)
  const [showCounselorStudio, setShowCounselorStudio] = useState(false);
  const [studioTab, setStudioTab] = useState<'email' | 'reports' | 'forge' | 'tasks' | 'alerts'>('email');
  const [emailThreads, setEmailThreads] = useState<CounselorEmailThread[]>([]);
  const [selectedEmailThreadId, setSelectedEmailThreadId] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTarget, setEmailTarget] = useState<'student' | 'group'>('student');
  const [emailGroupId, setEmailGroupId] = useState('');

  const [reportTemplateId, setReportTemplateId] = useState(reportTemplates[0]?.id || '');
  const [reportSnippets, setReportSnippets] = useState<Record<string, string[]>>({});
  const [reportSnippetInput, setReportSnippetInput] = useState('');
  const [generatedReport, setGeneratedReport] = useState<CounselorReport | null>(null);
  const [sendToSupervisor, setSendToSupervisor] = useState(false);

  const [forgeStep, setForgeStep] = useState<'upload' | 'review' | 'assign' | 'results'>('upload');
  const [forgeFileName, setForgeFileName] = useState('');
  const [forgeTitle, setForgeTitle] = useState('');
  const [forgeSourceText, setForgeSourceText] = useState('');
  const [forgePdfFile, setForgePdfFile] = useState<File | null>(null);
  const [isForgeExtracting, setIsForgeExtracting] = useState(false);
  const [forgeExtractError, setForgeExtractError] = useState<string | null>(null);
  const [forgeQuestions, setForgeQuestions] = useState<ForgeQuestion[]>([]);
  const [forgeSurveys, setForgeSurveys] = useState<ForgeSurvey[]>([]);
  const [forgeResponses, setForgeResponses] = useState<ForgeResponse[]>([]);
  const [forgeAssignTarget, setForgeAssignTarget] = useState<'student' | 'group'>('student');
  const [forgeAssignGroupId, setForgeAssignGroupId] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  const [counselorTasks, setCounselorTasks] = useState<CounselorTaskItem[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [editSlot, setEditSlot] = useState<AppointmentSlot | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Derived
  const pendingRequests = slots.filter(s => s.status === 'requested').length;

  // Per-student task tracking
  const [studentTasks, setStudentTasks] = useState<{ studentEmail: string; tasks: import('../types').WellnessTask[] }[]>([]);
  const selectedStudentEmail = students.find(s => (s.casefileId || s.id) === selectedStudent)?.email || '';
  const selectedStudentTasks = studentTasks.find(st => st.studentEmail === selectedStudentEmail)?.tasks || [];

  const visibleStudents = students.length > 0 ? students : demoStudents;
  const selectedStudentRecord = visibleStudents.find(s => (s.casefileId || s.id) === selectedStudent) || null;
  const selectedCaseData = selectedStudentRecord
    ? getCaseData(selectedStudentRecord.casefileId || selectedStudentRecord.id, selectedStudentRecord.name || 'Student')
    : null;
  const isDemoMode = students.length === 0;
  const demoTasksForSelected = selectedStudentRecord ? demoTasks[selectedStudentRecord.id] || [] : [];
  const effectiveSelectedTasks = isDemoMode ? demoTasksForSelected : selectedStudentTasks;

  const programGroups: { id: string; name: string }[] = Array.from(
    new Map<string, { id: string; name: string }>(
      visibleStudents
        .filter(s => s.program)
        .map(s => [s.program as string, { id: s.program as string, name: s.program as string }])
    ).values()
  );

  const selectedEmailThread = emailThreads.find(t => t.id === selectedEmailThreadId) || null;
  const activeReportTemplate = reportTemplates.find(t => t.id === reportTemplateId) || reportTemplates[0];

  const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveToStorage = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors in mock mode
    }
  };

  const mergeById = <T extends { id: string }>(values: T[]): T[] => {
    const map = new Map<string, T>();
    values.forEach(value => map.set(value.id, value));
    return Array.from(map.values());
  };

  const normalizeSurvey = (survey: ForgeSurvey): ForgeSurvey => {
    const assignedStudentIds = survey.assignedStudentIds || survey.assignedTo.filter(a => a.type === 'student').map(a => a.id);
    const assignedGroupIds = survey.assignedGroupIds || survey.assignedTo.filter(a => a.type === 'group').map(a => a.id);
    return {
      ...survey,
      counselorId: survey.counselorId || counselorId,
      assignedStudentIds,
      assignedGroupIds,
    };
  };

  const normalizeThread = (thread: CounselorEmailThread): CounselorEmailThread => ({
    ...thread,
    counselorId: thread.counselorId || counselorId,
  });


  // ── Real-time Firestore slot subscription (instant cross-device updates)
  useEffect(() => {
    const unsub = subscribeToSlots((updatedSlots) => {
      setSlots(updatedSlots);
    });
    return () => unsub();
  }, []);

  // ── Real-time cross-tab sync — fires instantly when student tab changes localStorage
  useStorageSync(async (changedKey) => {

    if (changedKey.startsWith('speakup_cloud_posts')) {
      setPosts(await db.getAllPosts());
    }
    if (changedKey.startsWith('speakup_cloud_tasks')) {
      // Instant casefile task refresh when student tab updates
      setStudentTasks(await db.getCounselorAssignedTasks());
    }
    if (changedKey.startsWith('speakup_cloud_p2p')) {
      const convos = await chat.getCounselorConversations(counselorId);
      setConversations(convos);
      setTotalUnread(convos.reduce((acc, c) => acc + c.unreadCount, 0));
      // Instantly refresh the active P2P chat window
      if (selectedStudent) {
        setChatHistory(await chat.getP2PThread(counselorId, selectedStudent));
      }
    }
  });

  // Poll for updates
  useEffect(() => {
    const fetchUpdates = async () => {
      // Fetch Inbox Data
      const convos = await chat.getCounselorConversations(counselorId);
      setConversations(convos);
      const unread = convos.reduce((acc, curr) => acc + curr.unreadCount, 0);
      setTotalUnread(unread);

      // Fetch active chat details if open
      if (showChatModal && selectedStudent) {
        await chat.markThreadAsRead(counselorId, selectedStudent);
        setChatHistory(await chat.getP2PThread(counselorId, selectedStudent));
      }
    };

    const interval = setInterval(fetchUpdates, 3000);
    const init = async () => {
      // Load students from Firestore (same source as their profiles)
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setStudents(allUsers.filter((u: any) => u.role === 'student'));
      } catch {
        // Fallback to localStorage if offline
        const allUsers = await db.getAllUsers();
        setStudents(allUsers.filter(u => u.role === 'student'));
      }
      fetchUpdates();
      const [postsData, tasksData, gamesData] = await Promise.all([db.getAllPosts(), db.getCounselorAssignedTasks(), getForgedGames()]);
      setPosts(postsData);
      setStudentTasks(tasksData);
      setForgedGames(gamesData);
    };
    init();
    return () => clearInterval(interval);
  }, [showChatModal, selectedStudent, counselorId]);

  useEffect(() => {
    const storedThreads = loadFromStorage<CounselorEmailThread[]>(STUDIO_KEYS.EMAILS, []);
    const storedSurveys = loadFromStorage<ForgeSurvey[]>(STUDIO_KEYS.SURVEYS, []);
    const storedResponses = loadFromStorage<ForgeResponse[]>(STUDIO_KEYS.RESPONSES, []);
    const storedTasks = loadFromStorage<CounselorTaskItem[]>(STUDIO_KEYS.TASKS, []);
    const storedSnippets = loadFromStorage<Record<string, string[]>>(STUDIO_KEYS.SNIPPETS, {});

    setEmailThreads((storedThreads.length > 0 ? storedThreads : demoEmailThreads).map(normalizeThread));
    setForgeSurveys(storedSurveys.map(normalizeSurvey));
    setForgeResponses(storedResponses);
    setCounselorTasks(storedTasks);
    setReportSnippets(storedSnippets);
  }, []);

  useEffect(() => {
    const unsubThreads = subscribeEmailThreadsForCounselor(counselorId, (threads) => {
      if (threads.length > 0) {
        setEmailThreads(threads.map(normalizeThread));
      }
    });
    const unsubSurveys = subscribeForgeSurveysForCounselor(counselorId, (surveys) => {
      if (surveys.length > 0) {
        setForgeSurveys(surveys.map(normalizeSurvey));
      }
    });
    const unsubTasks = subscribeCounselorTasksForCounselor(counselorId, (tasks) => {
      if (tasks.length > 0) {
        setCounselorTasks(tasks);
      }
    });
    return () => {
      unsubThreads();
      unsubSurveys();
      unsubTasks();
    };
  }, [counselorId]);

  useEffect(() => {
    if (forgeSurveys.length === 0) return;
    const unsubs = forgeSurveys.map((survey) =>
      subscribeForgeResponsesForCounselor(survey.id, (responses) => {
        setForgeResponses(prev => mergeById([...prev.filter(r => r.surveyId !== survey.id), ...responses]));
      })
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, [forgeSurveys]);

  useEffect(() => {
    saveToStorage(STUDIO_KEYS.EMAILS, emailThreads);
  }, [emailThreads]);

  useEffect(() => {
    saveToStorage(STUDIO_KEYS.SURVEYS, forgeSurveys);
  }, [forgeSurveys]);

  useEffect(() => {
    saveToStorage(STUDIO_KEYS.RESPONSES, forgeResponses);
  }, [forgeResponses]);

  useEffect(() => {
    saveToStorage(STUDIO_KEYS.TASKS, counselorTasks);
  }, [counselorTasks]);

  useEffect(() => {
    saveToStorage(STUDIO_KEYS.SNIPPETS, reportSnippets);
  }, [reportSnippets]);

  useEffect(() => {
    if (visibleStudents.length === 0) return;
    const visibleIds = new Set(visibleStudents.map(s => s.casefileId || s.id));
    if (!selectedStudent || !visibleIds.has(selectedStudent)) {
      setSelectedStudent(visibleStudents[0].casefileId || visibleStudents[0].id);
    }
  }, [visibleStudents, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) return;
    const existing = emailThreads.find(t => t.studentId === selectedStudent);
    if (existing) {
      setSelectedEmailThreadId(existing.id);
      return;
    }
    const newThread: CounselorEmailThread = {
      id: `email_thread_${selectedStudent}`,
      counselorId,
      studentId: selectedStudent,
      subject: `Check-in with ${selectedStudentRecord?.name || 'student'}`,
      participants: ['counselor@spjimr.edu', selectedStudentRecord?.email || 'student@spjimr.edu'],
      messages: [],
    };
    setEmailThreads(prev => [...prev, newThread]);
    setSelectedEmailThreadId(newThread.id);
    upsertEmailThread(newThread).catch(() => {});
  }, [selectedStudent, selectedStudentRecord, emailThreads]);

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postBody.trim()) return;
    setIsPosting(true);
    const newPost: WellnessPost = {
      id: Date.now().toString(),
      title: postTitle.trim(),
      body: postBody.trim(),
      authorName: 'Ms. Dimple Wagle, Counselling Cell',
      postedAt: new Date().toISOString(),
      isPinned: postPinned,
    };
    await db.createPost(newPost);
    setPosts(await db.getAllPosts());
    setPostTitle('');
    setPostBody('');
    setPostPinned(false);
    setIsPosting(false);
    addNotification('Post published to student wall! 📢', 'success');
  };

  const handleDeletePost = async (postId: string) => {
    await db.deletePost(postId);
    setPosts(await db.getAllPosts());
    addNotification('Post removed', 'info');
  };

  const handleTogglePin = async (postId: string) => {
    await db.togglePinPost(postId);
    setPosts(await db.getAllPosts());
  };

  const handleForgeQuest = async () => {
    if (!questTitle.trim() || !questFile) return addNotification('Please provide a title and PDF manual.', 'error');
    setIsForging(true);
    try {
      const gameId = 'game_' + Date.now();
      await uploadGamePDF(questFile, gameId, questTitle, questParadigm);
      setForgedGames(await getForgedGames());
      setQuestTitle('');
      setQuestFile(null);
      addNotification('Quest Forged Successfully! RAG embeddings stored.', 'success');
    } catch (e) {
      console.warn("Forge backend unavailable, falling back to local mock.", e);
      // OFFLINE FALLBACK FOR DEMO / LOCAL TESTING
      const mockGameId = 'game_mock_' + Date.now();
      setForgedGames(prev => ({
        ...prev,
        [mockGameId]: {
          id: mockGameId,
          title: questTitle,
          paradigm: questParadigm,
          fileRef: questFile.name,
          createdAt: new Date().toISOString()
        }
      }));
      setQuestTitle('');
      setQuestFile(null);
      addNotification(`Offline Mock: Quest '${questTitle}' stored virtually!`, 'success');
    }
    setIsForging(false);
  };

  // Actions
  const handleSlotAction = async (slot: AppointmentSlot, action: 'confirm' | 'reject' | 'delete') => {
    if (action === 'delete') {
      await deleteSlotFromFirestore(slot.id);
      addNotification('Slot deleted successfully', 'error');
    } else if (action === 'reject') {
      await updateSlotStatus(slot.id, 'open');
      addNotification('Slot request rejected', 'info');
    } else if (action === 'confirm') {
      const consent = await db.getConsentForSlot(slot.id);
      if (consent) {
        const student = await db.getUser(consent.studentId);
        if (student) {
          setStudentForConsent(student);
        }
        setConsentData(consent);
        setSelectedSlotForConsent(slot);
        setShowConsentModal(true);
      } else {
        // If for some reason consent is not found, just confirm.
        await updateSlotStatus(slot.id, 'confirmed');
      }
    }
    // subscribeToSlots keeps slots in sync automatically — no manual refresh needed
  };

  const handleDownloadConsent = async (slotId: string) => {
    await downloadConsentAsPDF(slotId);
  };

  const handleConsentSignAndConfirm = async (signature: string | File) => {
    if (!selectedSlotForConsent || !consentData) return;

    const updatedConsent: ConsentData = {
      ...consentData,
      counselorId: 'counselor_dimple_wagle',
      counselorName: 'Ms Dimple Wagle',
      counselorSignature: signature as string,
      counselorSignDate: new Date().toISOString(),
    };

    await db.saveConsent(updatedConsent);
    await updateSlotStatus(selectedSlotForConsent.id, 'confirmed');
    addNotification('Slot confirmed and consent signed', 'success');

    setShowConsentModal(false);
    setSelectedSlotForConsent(null);
    setConsentData(null);
    // subscribeToSlots will refresh the slots list automatically
  };



  const handleAssignTask = async () => {
    if (!taskInput.trim() || !selectedStudent) return;

    const student = students.find(s => (s.casefileId || s.id) === selectedStudent);
    if (!student) return;

    await db.assignTask(student.email, {
      id: Date.now().toString(),
      title: taskInput.trim(),
      description: 'Prescribed activity.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    });

    // Instantly refresh casefile without waiting for next poll
    const updated = await db.getCounselorAssignedTasks();
    setStudentTasks(updated);

    setTaskInput('');
    setShowTaskModal(false);
    addNotification(`Task assigned to ${student.name || student.email} ✅`, 'success');
  };

  const handleClearTask = async (taskId: string) => {
    if (!selectedStudent) return;
    const student = students.find(s => (s.casefileId || s.id) === selectedStudent);
    if (!student) return;
    await deleteTask(student.email, taskId);
    const updated = await db.getCounselorAssignedTasks();
    setStudentTasks(updated);
  };

  const handleSendFollowUpNudge = async () => {
    if (!selectedStudent) return;
    const student = students.find(s => (s.casefileId || s.id) === selectedStudent);
    if (!student) return;
    addNotification(
      `💬 Follow - up nudge sent to ${student.name || student.email} `,
      'success',
      'student',
      student.id
    );
    addNotification(
      'Your counsellor is checking in on you 💚 How have you been feeling? If you\'d like to book a follow-up session, tap the Slot Booking tab.',
      'info',
      'student',
      student.id
    );
  };

  const handlePublishSlot = async () => {
    if (!selectedTime) return;

    // VALIDATION: Prevent past time/date booking
    const parsedDate = new Date(pickerDate);
    const timeParts = selectedTime.match(/(\d+):(\d+)\s+(AM|PM)/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const mins = parseInt(timeParts[2], 10);
      const ampm = timeParts[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      parsedDate.setHours(hours, mins, 0, 0);
    }

    if (parsedDate < new Date()) {
      addNotification('Cannot schedule a slot in the past.', 'error');
      return;
    }

    const dateStr = pickerDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    await createSlot({
      date: dateStr,
      time: selectedTime,
      counselorName: 'Dimple Wagle',
      status: 'open',
    });
    addNotification('New slot published successfully', 'success');
    setShowScheduleModal(false);
    setSelectedTime(null);
  };

  const handleSaveEdit = async () => {
    if (!editSlot || !editDate.trim() || !editTime.trim()) return;
    setIsSavingEdit(true);
    await updateSlot(editSlot.id, { date: editDate, time: editTime });
    addNotification('Slot updated successfully', 'success');
    setEditSlot(null);
    setIsSavingEdit(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedStudent) return;
    await chat.sendP2PMessage({
      id: Date.now().toString(),
      senderId: counselorId,
      receiverId: selectedStudent,
      text: chatInput,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    setChatInput('');
    setChatHistory(await chat.getP2PThread(counselorId, selectedStudent));
  };

  const ensureThreadForStudent = (studentId: string) => {
    const existing = emailThreads.find(t => t.studentId === studentId);
    if (existing) return existing;
    const student = visibleStudents.find(s => (s.casefileId || s.id) === studentId);
    const newThread: CounselorEmailThread = {
      id: `email_thread_${studentId}`,
      counselorId,
      studentId,
      subject: `Check-in with ${student?.name || 'student'}`,
      participants: ['counselor@spjimr.edu', student?.email || 'student@spjimr.edu'],
      messages: [],
    };
    setEmailThreads(prev => [...prev, newThread]);
    upsertEmailThread(newThread).catch(() => {});
    return newThread;
  };

  const sendEmailToThread = (threadId: string, body: string, subject?: string) => {
    if (!body.trim()) return;
    let updatedThread: CounselorEmailThread | null = null;
    setEmailThreads(prev => prev.map(thread => {
      if (thread.id !== threadId) return thread;
      const nextSubject = subject?.trim() ? subject.trim() : thread.subject;
      const message = {
        id: `email_msg_${Date.now()}`,
        threadId: thread.id,
        senderName: 'Ms. Dimple Wagle',
        senderEmail: 'counselor@spjimr.edu',
        body: body.trim(),
        timestamp: new Date().toISOString(),
        direction: 'sent' as const,
      };
      updatedThread = {
        ...thread,
        subject: nextSubject,
        messages: [...thread.messages, message],
      };
      return updatedThread;
    }));
    if (updatedThread) {
      upsertEmailThread(updatedThread).catch(() => {});
    }
  };

  const handleSendEmail = () => {
    if (!emailBody.trim()) return;
    if (emailTarget === 'student' && selectedStudent) {
      const thread = ensureThreadForStudent(selectedStudent);
      sendEmailToThread(thread.id, emailBody, emailSubject);
    }

    if (emailTarget === 'group' && emailGroupId) {
      const groupStudents = visibleStudents.filter(s => s.program === emailGroupId);
      groupStudents.forEach(student => {
        const thread = ensureThreadForStudent(student.casefileId || student.id);
        sendEmailToThread(thread.id, emailBody, emailSubject);
      });
    }

    setEmailBody('');
    addNotification('Email sent (mock).', 'success');
  };

  const handleSimulateReply = (threadId: string) => {
    let updatedThread: CounselorEmailThread | null = null;
    setEmailThreads(prev => prev.map(thread => {
      if (thread.id !== threadId) return thread;
      const student = visibleStudents.find(s => (s.casefileId || s.id) === thread.studentId);
      const reply = {
        id: `email_msg_${Date.now()}`,
        threadId: thread.id,
        senderName: student?.name || 'Student',
        senderEmail: student?.email || 'student@spjimr.edu',
        body: 'Thanks for the note. I will update you by tomorrow.',
        timestamp: new Date().toISOString(),
        direction: 'received' as const,
      };
      updatedThread = { ...thread, messages: [...thread.messages, reply] };
      return updatedThread;
    }));
    if (updatedThread) {
      upsertEmailThread(updatedThread).catch(() => {});
    }
  };

  const buildSurveySummary = (studentId: string) => {
    const responses = forgeResponses
      .filter(r => r.studentId === studentId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    const latest = responses[0];
    if (!latest) return '';
    const survey = forgeSurveys.find(s => s.id === latest.surveyId);
    if (!survey) return '';
    const avgScore = latest.answers.length
      ? (latest.answers.reduce((acc, a) => acc + a.score, 0) / latest.answers.length).toFixed(1)
      : '0';
    return `Survey: ${survey.title}. Avg score: ${avgScore}. Responses: ${latest.answers.length}.`;
  };

  const handleGenerateReport = () => {
    if (!selectedStudent || !selectedCaseData || !activeReportTemplate) return;
    const snippets = reportSnippets[selectedStudent] || [];
    const taskCount = counselorTasks.filter(t => t.studentId === selectedStudent && !t.completedAt).length;
    const surveySummary = buildSurveySummary(selectedStudent);

    const report: CounselorReport = {
      id: `report_${Date.now()}`,
      counselorId,
      studentId: selectedStudent,
      generatedAt: new Date().toISOString(),
      currentState: `${activeReportTemplate.currentState} ${selectedCaseData.summary}`,
      concerns: `${activeReportTemplate.concerns} Risk level: ${selectedCaseData.riskLevel}.`,
      actions: `${activeReportTemplate.actions} Active tasks: ${taskCount}.`,
      snippets,
      surveySummary: surveySummary || undefined,
      taskSummary: taskCount ? `${taskCount} open tasks assigned.` : 'No open tasks assigned.',
    };
    setGeneratedReport(report);
    saveReport(report).catch(() => {});
    if (sendToSupervisor) {
      addNotification('Report shared with Supervisor / Associate Dean (mock).', 'success');
    }
  };

  const handleAddSnippet = () => {
    if (!selectedStudent || !reportSnippetInput.trim()) return;
    setReportSnippets(prev => ({
      ...prev,
      [selectedStudent]: [...(prev[selectedStudent] || []), reportSnippetInput.trim()],
    }));
    setReportSnippetInput('');
  };

  const adjustMeanings = (scale: number) => {
    if (!Number.isFinite(scale) || scale <= 0) return [];
    return Array.from({ length: scale }, (_, i) => `Score ${i + 1}: ${i + 1 === scale ? 'High' : 'Moderate'}`);
  };

  const extractPdfText = async (file: File): Promise<string> => {
    const pdfjs = await import('pdfjs-dist');
    // Set worker source for Vite + ESM builds.
    (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const buffer = await file.arrayBuffer();
    const pdf = await (pdfjs as any).getDocument({ data: buffer }).promise;
    let text = '';
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += `${pageText}\n`;
    }
    return text.trim();
  };

  const handleForgeFileChange = async (file: File | null) => {
    setForgePdfFile(file);
    setForgeFileName(file?.name || '');
    setForgeExtractError(null);
    if (!file) {
      setForgeSourceText('');
      return;
    }
    setIsForgeExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (!text) {
        addNotification('No readable text found in this PDF.', 'warning');
        setForgeExtractError('No readable text found in this PDF. If this is a scanned file, text extraction will be empty without OCR.');
      }
      setForgeSourceText(text);
    } catch (error) {
      console.warn('[Forge Extract] PDF text extraction failed.', error);
      setForgeExtractError(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      addNotification('PDF text extraction failed. Try a different file.', 'error');
    } finally {
      setIsForgeExtracting(false);
    }
  };

  const handleForgeExtract = async () => {
    setForgeExtractError(null);
    if (!forgeFileName.trim() && !forgeSourceText.trim()) {
      setForgeExtractError('Please upload a PDF or paste text before extracting questions.');
      addNotification('Select a PDF or paste text before extracting questions.', 'warning');
      return;
    }
    if (!forgeSourceText.trim() && forgePdfFile) {
      setIsForgeExtracting(true);
      await handleForgeFileChange(forgePdfFile);
    }
    if (!forgeSourceText.trim()) {
      setForgeExtractError('No PDF text available. Upload a text-based PDF or paste text manually.');
      addNotification('Please provide readable PDF text before extracting questions.', 'warning');
      return;
    }
    try {
      setIsForgeExtracting(true);
      const extracted = await extractForgeQuestionsFromText(forgeSourceText, { maxQuestions: 8, defaultScale: 5 });
      if (extracted.length === 0) {
        setForgeExtractError('No questions were found in the extracted text. Try a different file or edit the text.');
        addNotification('No questions found in the provided text.', 'warning');
        return;
      }
      setForgeQuestions(extracted.map(q => {
        const safeScale = Number.isFinite(q.scale) && q.scale > 0 ? q.scale : 5;
        return {
          ...q,
          scale: safeScale,
          meanings: q.meanings?.length ? q.meanings : adjustMeanings(safeScale),
        };
      }));
      setForgeStep('review');
    } catch (error) {
      console.warn('[Forge Extract] RAG+LLM failed, keeping existing questions.', error);
      setForgeExtractError(`Question extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      addNotification('Question extraction failed. Please try again.', 'error');
    } finally {
      setIsForgeExtracting(false);
    }
  };

  const handleForgeScaleChange = (questionId: string, scale: number) => {
    setForgeQuestions(prev => prev.map(q => q.id === questionId
      ? { ...q, scale, meanings: Array.from({ length: scale }, (_, i) => q.meanings[i] || `Score ${i + 1}`) }
      : q
    ));
  };

  const handleCreateSurvey = () => {
    if (!forgeTitle.trim() || forgeQuestions.length === 0) return;
    const assignments: { type: 'student' | 'group'; id: string; name: string }[] = [];
    const assignedStudentIds: string[] = [];
    const assignedGroupIds: string[] = [];
    if (forgeAssignTarget === 'student' && selectedStudentRecord) {
      const studentId = selectedStudentRecord.casefileId || selectedStudentRecord.id;
      assignments.push({ type: 'student', id: studentId, name: selectedStudentRecord.name });
      assignedStudentIds.push(studentId);
    }
    if (forgeAssignTarget === 'group' && forgeAssignGroupId) {
      assignments.push({ type: 'group', id: forgeAssignGroupId, name: forgeAssignGroupId });
      assignedGroupIds.push(forgeAssignGroupId);
    }
    const survey: ForgeSurvey = {
      id: `survey_${Date.now()}`,
      counselorId,
      title: forgeTitle.trim(),
      sourceFileName: forgeFileName || 'manual.pdf',
      questions: forgeQuestions,
      assignedTo: assignments,
      assignedStudentIds,
      assignedGroupIds,
      createdAt: new Date().toISOString(),
    };
    setForgeSurveys(prev => [survey, ...prev]);
    setSelectedSurveyId(survey.id);
    setForgeStep('results');
    saveForgeSurvey(survey).catch(() => {});
  };

  const handleSimulateResponses = (survey: ForgeSurvey) => {
    const assignedStudents = new Set<string>();
    survey.assignedTo.forEach(a => {
      if (a.type === 'student') {
        assignedStudents.add(a.id);
      } else {
        visibleStudents.filter(s => s.program === a.id).forEach(s => assignedStudents.add(s.casefileId || s.id));
      }
    });

    const newResponses: ForgeResponse[] = Array.from(assignedStudents).map(studentId => ({
      id: `response_${survey.id}_${studentId}_${Date.now()}`,
      surveyId: survey.id,
      studentId,
      submittedAt: new Date().toISOString(),
      answers: survey.questions.map(q => ({
        questionId: q.id,
        score: Math.max(1, Math.min(q.scale, Math.floor(Math.random() * q.scale) + 1)),
      })),
    }));

    setForgeResponses(prev => [...newResponses, ...prev]);
    newResponses.forEach(response => {
      saveForgeResponse(response).catch(() => {});
    });
    addNotification('Survey responses stored (mock).', 'success');
  };

  const handleSendSurveyToChat = async () => {
    if (!selectedStudent) return;
    const summary = buildSurveySummary(selectedStudent);
    if (!summary) return;
    await chat.sendP2PMessage({
      id: Date.now().toString(),
      senderId: counselorId,
      receiverId: selectedStudent,
      text: `Survey update: ${summary}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    });
    setChatHistory(await chat.getP2PThread(counselorId, selectedStudent));
    addNotification('Survey summary sent to chat (mock).', 'success');
  };

  const handleCreateTask = async () => {
    if (!selectedStudent || !taskTitle.trim() || !taskDueDate) return;
    const newTask: CounselorTaskItem = {
      id: `ctask_${Date.now()}`,
      counselorId,
      studentId: selectedStudent,
      title: taskTitle.trim(),
      description: taskDescription.trim() || 'Assigned follow-up.',
      assignedAt: new Date().toISOString(),
      dueAt: new Date(taskDueDate).toISOString(),
    };
    setCounselorTasks(prev => [newTask, ...prev]);
    saveCounselorTask(newTask).catch(() => {});
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');

    const student = students.find(s => (s.casefileId || s.id) === selectedStudent);
    if (student) {
      await db.assignTask(student.email, {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        isCompleted: false,
        assignedBy: 'counselor_dimple_wagle',
      });
      const updated = await db.getCounselorAssignedTasks();
      setStudentTasks(updated);
    }
    addNotification('Task assigned (mock).', 'success');
  };

  const markTaskCompleted = (taskId: string) => {
    const completedAt = new Date().toISOString();
    setCounselorTasks(prev => prev.map(t => t.id === taskId ? { ...t, completedAt } : t));
    updateCounselorTaskCompletion(taskId, completedAt).catch(() => {});
  };

  const getTaskStatus = (task: CounselorTaskItem) => {
    if (task.completedAt) return 'completed';
    const due = new Date(task.dueAt).getTime();
    if (due < Date.now()) return 'overdue';
    return 'pending';
  };

  const buildReminderItems = (): ReminderItem[] => {
    const reminders: ReminderItem[] = [];
    counselorTasks.forEach(task => {
      const status = getTaskStatus(task);
      const ageDays = Math.floor((Date.now() - new Date(task.assignedAt).getTime()) / 86400000);
      if (status === 'overdue') {
        reminders.push({
          id: `reminder_${task.id}`,
          type: 'task-overdue',
          studentId: task.studentId,
          message: `Task overdue: ${task.title}`,
          severity: 'high',
          createdAt: new Date().toISOString(),
        });
      } else if (status === 'pending' && ageDays >= 7) {
        reminders.push({
          id: `reminder_${task.id}`,
          type: 'task-pending',
          studentId: task.studentId,
          message: `Task pending for ${ageDays} days: ${task.title}`,
          severity: 'medium',
          createdAt: new Date().toISOString(),
        });
      }
    });

    visibleStudents.forEach(student => {
      const studentId = student.casefileId || student.id;
      const caseData = getCaseData(studentId, student.name || 'Student');
      const lastActive = new Date(caseData.lastActive).getTime();
      const inactiveDays = Math.floor((Date.now() - lastActive) / 86400000);
      if (inactiveDays >= 15) {
        reminders.push({
          id: `inactive_${studentId}`,
          type: 'inactive',
          studentId,
          message: `${student.name} inactive for ${inactiveDays} days`,
          severity: inactiveDays >= 30 ? 'high' : 'medium',
          createdAt: new Date().toISOString(),
        });
      }
    });

    return reminders;
  };

  const openChatFromInbox = async (studentId: string) => {
    setSelectedStudent(studentId);
    const convo = conversations.find(c => c.studentId === studentId);
    if (convo) {
      await chat.markThreadAsRead(counselorId, convo.studentId);
      setChatHistory(await chat.getP2PThread(counselorId, convo.studentId));
    }
    setShowInboxModal(false);
    setShowChatModal(true);
    setChatHistory(await chat.getP2PThread(counselorId, studentId));
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(pickerDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setPickerDate(newDate);
  };

  const timeSlots = [];
  for (let i = 9; i <= 18; i++) { // 9 AM to 6 PM
    const h = i > 12 ? i - 12 : i;
    const ampm = i >= 12 ? 'PM' : 'AM';
    timeSlots.push(`${h}:00 ${ampm}`);
    timeSlots.push(`${h}:30 ${ampm}`);
  }

  return (
    <div className="min-h-screen app-shell text-[var(--color-text)] font-sans flex flex-col relative">

      {/* Top Header */}
      <header className="bg-[var(--color-elevated)] border-b border-[var(--border-subtle)] px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row justify-between items-center shadow-sm z-10 gap-3">
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-[#8a6b5c] p-2 rounded-lg flex-shrink-0"><Activity className="text-white" size={20} md:size={24} /></div>
            <div><h1 className="text-base md:text-xl font-bold text-[var(--color-text)]">SPeakUp <span className="hidden xs:inline text-[var(--color-text-secondary)] font-normal">| Command Center</span></h1></div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-full bg-[#e6dad1] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-secondary)]">DW</div>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6 w-full sm:w-auto justify-around sm:justify-end">
          {/* Inbox Alert */}
          <div className="relative">
            <button onClick={() => setShowInboxModal(true)} title="Messages" className="p-2 hover:bg-[var(--color-elevated)] rounded-full transition-colors">
              <Mail className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]" size={20} />
            </button>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse border-2 border-white">{totalUnread}</span>
            )}
          </div>

          {/* Download Report */}
          <button
            onClick={() => setShowReportModal(true)}
            title="Download interaction metrics report"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f1e6df] hover:bg-[#f1e6df] text-[var(--color-text)] rounded-lg text-xs font-bold border border-[var(--border-subtle)] transition-colors"
          >
            <Download size={14} /> Report
          </button>

          <button
            onClick={() => { setShowCounselorStudio(true); setStudioTab('email'); }}
            title="Open counselor studio"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[var(--color-text)] rounded-lg text-xs font-bold border border-[var(--border-subtle)] transition-colors"
          >
            <Bot size={14} /> Studio
          </button>

          {/* Bell Notification Dropdown */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => { setShowBellDropdown(v => !v); if (!showBellDropdown) markAllRead(); }}
              className="p-2 hover:bg-[var(--color-elevated)] rounded-full transition-colors relative"
            >
              <Bell className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]" size={20} />
              {(contextUnreadCount('counselor', '') > 0 || pendingRequests > 0) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                  {contextUnreadCount('counselor', '') + pendingRequests > 9 ? '9+' : contextUnreadCount('counselor', '') + pendingRequests}
                </span>
              )}
            </button>
            {showBellDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                  <span className="font-bold text-slate-700 text-sm">Notifications</span>
                  <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                    <Trash2 size={12} /> Clear all
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {pendingRequests > 0 && (
                    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 bg-yellow-50 border-l-4 border-l-yellow-400">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-700">{pendingRequests} pending slot request{pendingRequests > 1 ? 's' : ''} awaiting your approval</p>
                      </div>
                    </div>
                  )}
                  {storedNotifications.filter(n => !n.targetRole || n.targetRole === 'counselor').length === 0 && pendingRequests === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No notifications yet</p>
                  ) : (
                    storedNotifications.filter(n => !n.targetRole || n.targetRole === 'counselor').map(n => (
                      <div key={n.id} className={`flex items - start gap - 3 px - 4 py - 3 border - b border - slate - 50 last: border - 0 border - l - 4 ${n.type === 'success' ? 'bg-green-50 border-l-green-400 text-green-700' :
                        n.type === 'error' ? 'bg-red-50 border-l-red-400 text-red-700' :
                          'bg-blue-50 border-l-blue-400 text-blue-700'
                        } `}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{n.message}</p>
                          <p className="text-[10px] opacity-60 mt-0.5">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button onClick={() => clearOne(n.id)} className="flex-shrink-0 opacity-40 hover:opacity-80 mt-0.5"><X size={14} /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={async () => { await signOut(); onLogout?.(); }} title="Logout">
            <LogOut className="text-slate-400 hover:text-red-500 transition-colors" size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">DW</div>
            <span className="text-sm font-medium">Dimple Wagle</span>
          </div>
        </div>
      </header>

      <EnvironmentWidget variant="counselor" />

      {/* Main Grid */}
      <div className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">

        {/* LEFT: Alerts */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">Priority Alerts</h2>
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">Live</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {visibleStudents.map((student) => {
              const studentId = student.casefileId || student.id;
              const caseData = getCaseData(studentId, student.name || 'Student');

              // Calculate days since last session
              let daysSinceLastSession: number | null = null;
              const myPastSlots = slots
                .filter(s => s.bookedByStudentId === studentId && s.status === 'confirmed')
                .map(s => {
                  const dateObj = new Date(`${s.date} ${s.time.replace(/AM|PM/i, '').trim()}`);
                  return isNaN(dateObj.getTime()) ? new Date(s.date) : dateObj;
                })
                .filter(d => !isNaN(d.getTime()) && d < new Date())
                .sort((a, b) => b.getTime() - a.getTime());

              const lastActiveDate = myPastSlots[0] || new Date(caseData.lastActive);
              if (!isNaN(lastActiveDate.getTime())) {
                daysSinceLastSession = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
              }

              const isInactive = daysSinceLastSession !== null && daysSinceLastSession >= 15;
              const topAlert = caseData.alerts[0];

              return (
                <div key={student.id} onClick={() => setSelectedStudent(studentId)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors group ${selectedStudent === studentId ? 'border-[#8a6b5c] ring-1 ring-[#8a6b5c]' : 'bg-white border-gray-100'} `}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-slate-500">{student.casefileId}</span>
                    {isInactive ? (
                      <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1"><AlertTriangle size={10} /> {daysSinceLastSession} Days Inactive</span>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${topAlert.level === 'High' ? 'bg-red-100 text-red-700' : topAlert.level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {topAlert.level} Alert
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{student.name}</div>
                      <div className={`text-xs font-bold text-slate-500 mt-0.5`}>{student.program}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{topAlert.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Last Active</div>
                      <div className="text-xs font-medium text-slate-600">
                        {!isNaN(lastActiveDate.getTime()) ? lastActiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER: Case File */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">
                  Case File: {selectedStudentRecord ? `${selectedStudentRecord.name} (${selectedStudentRecord.casefileId || selectedStudentRecord.id})` : 'Select a student'}
                </h2>
                <p className="text-xs md:text-sm text-slate-500">
                  {selectedCaseData ? `${selectedStudentRecord?.program || 'Program'} • ${selectedCaseData.focusArea}` : 'Click a student on the left to view details'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button onClick={() => setShowTaskModal(true)} disabled={!selectedStudent} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs md:text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors">
                  <ClipboardList size={14} /> <span className="hidden xs:inline">Assign Task</span><span className="xs:hidden">Task</span>
                </button>
                <button onClick={async () => {
                  setShowChatModal(true);
                  if (selectedStudent) {
                    await chat.markThreadAsRead(counselorId, selectedStudent);
                    setChatHistory(await chat.getP2PThread(counselorId, selectedStudent));
                  }
                }} disabled={!selectedStudent} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs md:text-sm bg-[#8a6b5c] text-white rounded-md hover:bg-[#785a4d] shadow-sm transition-colors disabled:opacity-50">
                  <MessageSquare size={14} /> <span className="hidden xs:inline">Chat</span><span className="xs:hidden">Chat</span>
                </button>
                <button onClick={handleSendFollowUpNudge} disabled={!selectedStudent} title="Send a gentle follow-up notification to this student" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs md:text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 disabled:opacity-50 transition-colors">
                  <Bell size={14} /> <span className="hidden xs:inline">Follow-Up Nudge</span><span className="xs:hidden">Nudge</span>
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-4">
              {selectedCaseData && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 rounded-full font-bold ${selectedCaseData.riskLevel === 'High' ? 'bg-red-100 text-red-700' : selectedCaseData.riskLevel === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      Risk: {selectedCaseData.riskLevel}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">Last check-in: {selectedCaseData.lastCheckIn}</span>
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold">Focus: {selectedCaseData.focusArea}</span>
                  </div>
                  {isDemoMode && (
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold">Demo data</span>
                  )}
                </div>
              )}

              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="font-semibold text-slate-700">Case Summary:</span>{' '}
                {selectedCaseData?.summary || 'Select a student to view case summary.'}
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stressData}>
                    <defs>
                      <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a66a63" stopOpacity={0.1} /><stop offset="95%" stopColor="#a66a63" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6dad1" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#7c7470' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#7c7470' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="workload" stroke="#a66a63" strokeWidth={2} fillOpacity={1} fill="url(#colorWorkload)" name="Workload" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-100 bg-white p-4">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Mental State Indicators</h3>
                  <div className="space-y-2">
                    {(selectedCaseData?.indicators || defaultCaseData.indicators).map((indicator) => (
                      <div key={indicator.label} className="flex items-start justify-between gap-3 bg-slate-50 rounded-lg p-2.5">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{indicator.label}: {indicator.value}</p>
                          <p className="text-[11px] text-slate-500">{indicator.note}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${indicator.trend === 'up' ? 'bg-red-100 text-red-700' : indicator.trend === 'down' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {indicator.trend === 'up' ? 'Rising' : indicator.trend === 'down' ? 'Declining' : 'Stable'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-white p-4">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Active Alerts</h3>
                  <div className="space-y-2">
                    {(selectedCaseData?.alerts || defaultCaseData.alerts).map((alert) => (
                      <div key={`${alert.title}-${alert.date}`} className="flex items-start gap-3 bg-slate-50 rounded-lg p-2.5">
                        <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center ${alert.level === 'High' ? 'bg-red-100 text-red-600' : alert.level === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          <AlertTriangle size={14} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">{alert.title}</p>
                            <span className="text-[10px] text-slate-400">{alert.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{alert.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-white p-4">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Recent Interactions</h3>
                <div className="space-y-3">
                  {(selectedCaseData?.interactions || defaultCaseData.interactions).map((interaction) => (
                    <div key={`${interaction.date}-${interaction.summary}`} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        {interaction.channel === 'Chat' && <MessageSquare size={14} />}
                        {interaction.channel === 'In-person' && <Users size={14} />}
                        {interaction.channel === 'Call' && <Phone size={14} />}
                        {interaction.channel === 'Email' && <Mail size={14} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">{interaction.channel} • {interaction.date}</p>
                          <span className="text-[10px] text-slate-400">Follow-up: {interaction.followUp}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{interaction.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Tasks for Selected Student */}
          {selectedStudent && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <ClipboardList size={14} /> Tasks Assigned to {selectedStudentRecord?.name || selectedStudent}
              </h3>
              {effectiveSelectedTasks.filter(t => t.assignedBy !== 'system' && !t.isCompleted).length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-3">No active tasks assigned.</p>
              ) : (
                <div className="space-y-2">
                  {effectiveSelectedTasks.filter(t => t.assignedBy !== 'system' && !t.isCompleted).map(task => (
                    <div key={task.id} className={`flex items-start gap-3 p-2.5 rounded-lg bg-gray-50`}>
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border-2 border-gray-300`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug text-slate-700`}>{task.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">In progress</p>
                      </div>
                      <button onClick={() => handleClearTask(task.id)} title="Clear task" className="text-xs text-red-400 hover:text-red-600 font-bold px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors flex-shrink-0">
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Slot Publisher + Posts */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* ── TOP NAV PILLS ─────────────────────────────────────────────── */}
          <div className="flex gap-2 p-2 bg-slate-100/50 rounded-xl mb-6 overflow-x-auto scrollbar-hide items-center shadow-inner border border-slate-200/60 transition-all">
            <button
              onClick={() => setActivePanel('requests')}
              className={`py-2 text-sm flex items-center justify-center gap-2 px-6 rounded-lg transition-all whitespace-nowrap ${activePanel === 'requests' ? 'bg-white text-slate-800 shadow-sm font-bold ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'}`}
            >
              <div className="relative">
                <Bell size={16} />
                {slots.filter(s => s.status === 'requested').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>
                )}
              </div>
              Requests {slots.filter(s => s.status === 'requested').length > 0 && `(${slots.filter(s => s.status === 'requested').length})`}
            </button>
            <button
              onClick={() => setActivePanel('manageSlots')}
              className={`py-2 text-sm flex items-center justify-center gap-2 px-6 rounded-lg transition-all whitespace-nowrap ${activePanel === 'manageSlots' ? 'bg-white text-slate-800 shadow-sm font-bold ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'}`}
            >
              <CalendarIcon size={16} /> Schedule
            </button>
            <button
              onClick={() => setActivePanel('posts')}
              className={`py-2 text-sm flex items-center justify-center gap-2 px-6 rounded-lg transition-all whitespace-nowrap ${activePanel === 'posts' ? 'bg-white text-slate-800 shadow-sm font-bold ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'}`}
            >
              <Newspaper size={16} /> Wall Posts
            </button>
            <button
              onClick={() => setActivePanel('questForge')}
              className={`py-2 text-sm flex items-center justify-center gap-2 px-6 rounded-lg transition-all whitespace-nowrap ${activePanel === 'questForge' ? 'bg-white text-slate-800 shadow-sm font-bold ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-white/40 hover:text-slate-700'}`}
            >
              <Wand2 size={16} /> Quest Forge
            </button>
          </div>

          {/* ── REQUESTS PANEL ─────────────────────────────────────────────── */}
          {activePanel === 'requests' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {slots.filter(s => s.status === 'requested').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <CheckCircle size={40} className="mb-3 text-green-300 opacity-50" />
                  <p className="font-bold text-slate-500 mb-1">All caught up!</p>
                  <p className="text-xs text-center px-4">You have no pending session requests to approve.</p>
                </div>
              ) : slots.filter(s => s.status === 'requested')
                .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1))
                .map(slot => (
                  <div key={slot.id} className={`bg-white rounded-xl border ${slot.priority === 'high' ? 'border-red-300 ring-1 ring-red-100' : 'border-amber-200'} shadow-sm p-4 hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${slot.priority === 'high' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-amber-100 text-amber-600'}`}>
                          {slot.priority === 'high' ? <Zap size={18} /> : <Bell size={18} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            {slot.bookedByStudentName || 'Unknown Student'}
                            {slot.priority === 'high' && (
                              <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-black flex items-center gap-0.5">
                                High Priority
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">{slot.date} at {slot.time}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${slot.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        Needs Approval
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSlotAction(slot, 'confirm')}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Approve Session
                      </button>
                      <button
                        onClick={() => handleSlotAction(slot, 'reject')}
                        className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ── MANAGE SLOTS PANEL ─────────────────────────────────────────────── */}
          {activePanel === 'manageSlots' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between gap-2 shadow-sm z-10">
                <div className="flex gap-2 text-[11px] font-bold">
                  <span className="bg-gray-100 text-slate-600 px-2.5 py-1 rounded-md">{slots.filter(s => s.status === 'open').length} Open Slots</span>
                  <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md">{slots.filter(s => s.status === 'confirmed').length} Upcoming</span>
                </div>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1.5 text-xs bg-[#8a6b5c] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#785a4d] transition-all hover:scale-105 font-bold"
                >
                  <PlusCircle size={14} /> New Slot
                </button>
              </div>

              {/* Slot list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {slots.filter(s => s.status !== 'requested').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <CalendarIcon size={36} className="mb-3 opacity-30" />
                    <p className="font-bold text-slate-500 mb-1">No slots available</p>
                    <p className="text-xs text-center">Click "New Slot" to open your schedule.</p>
                  </div>
                ) : slots.filter(s => s.status !== 'requested').map(slot => (
                  <div
                    key={slot.id}
                    className={`rounded-xl border p-4 transition-all hover:shadow-md bg-white ${slot.status === 'confirmed' ? 'border-green-200 border-l-4 border-l-green-500' : 'border-gray-200 border-l-4 border-l-gray-300'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${slot.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            {slot.time}
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${slot.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>{slot.status}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{slot.date}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                        {slot.status === 'open' && (
                          <button
                            onClick={() => { setEditSlot(slot); setEditDate(slot.date); setEditTime(slot.time); }}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-sm transition-all"
                            title="Edit slot"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleSlotAction(slot, 'delete')}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-white hover:shadow-sm transition-all"
                          title="Delete slot"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Confirmed details */}
                    {slot.status === 'confirmed' && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={`https://ui-avatars.com/api/?name=${slot.bookedByStudentName}&background=random`} alt="Avatar" className="w-5 h-5 rounded-full" />
                          <span className="text-xs font-bold text-slate-700">{slot.bookedByStudentName}</span>
                        </div>
                        <button
                          onClick={() => handleDownloadConsent(slot.id)}
                          className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          <Download size={12} /> Consent
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Edit Slot Modal */}
              {editSlot && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditSlot(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-slate-700 text-lg mb-4 flex items-center gap-2">
                      <Edit2 size={16} className="text-[#8a6b5c]" /> Edit Slot
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 font-bold mb-1 uppercase tracking-wide">Date</label>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Calendar Header */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} /></button>
                            <span className="font-bold text-sm text-slate-700">
                              {pickerDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} /></button>
                          </div>
                          {/* Calendar Grid */}
                          <div className="p-3">
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-[10px] font-bold text-slate-400">{day}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {/* Empty slots for first week */}
                              {Array(getDaysInMonth(pickerDate).firstDay).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} className="p-2" />
                              ))}
                              {/* Actual days */}
                              {Array.from({ length: getDaysInMonth(pickerDate).days }, (_, i) => i + 1).map((day) => {
                                const dateStr = `${pickerDate.toLocaleString('default', { month: 'short' })} ${day}, ${pickerDate.getFullYear()}`;
                                const newDateStr = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day)
                                  .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                                const isSelected = editDate === newDateStr;

                                return (
                                  <button
                                    key={day}
                                    onClick={() => setEditDate(newDateStr)}
                                    className={`p-2 w-full text-xs rounded-lg transition-all ${isSelected
                                      ? 'bg-[#8a6b5c] text-white font-bold shadow-sm'
                                      : 'hover:bg-gray-100 text-slate-700'
                                      }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 font-bold mb-1 uppercase tracking-wide">Time (e.g. 5:00 PM)</label>
                        <input
                          type="text"
                          value={editTime}
                          onChange={e => setEditTime(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8a6b5c]/40 bg-gray-50"
                          placeholder="5:00 PM"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => { setEditSlot(null); setPickerDate(new Date()); }}
                        className="flex-1 border border-gray-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit}
                        className="flex-1 bg-[#8a6b5c] hover:bg-[#785a4d] text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                      >
                        {isSavingEdit ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── POSTS PANEL ─────────────────────────────────────────────── */}
          {activePanel === 'posts' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Compose Form */}
              <div className="p-4 space-y-3 border-b border-gray-100">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Newspaper size={14} /> Compose Post</h3>
                <input
                  type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                  placeholder="Post title (e.g. World Mental Health Day 🌟)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8a6b5c]/40"
                />
                <textarea
                  value={postBody} onChange={e => setPostBody(e.target.value)}
                  placeholder="Write your message here... Emojis, line breaks welcome! 💚"
                  rows={7}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8a6b5c]/40 resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
                    <input type="checkbox" checked={postPinned} onChange={e => setPostPinned(e.target.checked)} className="rounded" />
                    <Pin size={13} /> Pin to top
                  </label>
                  <button onClick={handleCreatePost} disabled={isPosting || !postTitle.trim() || !postBody.trim()}
                    className="flex items-center gap-2 text-xs bg-[#8a6b5c] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#785a4d] transition-colors disabled:opacity-50">
                    {isPosting ? 'Publishing...' : '📢 Publish'}
                  </button>
                </div>
              </div>

              {/* Archive */}
              <div className="flex-1 overflow-y-auto">
                <button onClick={() => setShowArchive(v => !v)}
                  className="w-full px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <span>Archive ({posts.length} posts)</span>
                  <ChevronRight size={14} className={`transition - transform ${showArchive ? 'rotate-90' : ''} `} />
                </button>
                {showArchive && (
                  <div className="px-3 pb-3 space-y-2">
                    {posts.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No posts yet.</p>}
                    {posts.map(post => (
                      <div key={post.id} className={`rounded - lg border p - 3 text - xs ${post.isPinned ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'} `}>
                        <div className="flex justify-between items-start gap-1">
                          <p className="font-bold text-slate-700 leading-snug flex-1">{post.isPinned && '📌 '}{post.title}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleTogglePin(post.id)} title={post.isPinned ? 'Unpin' : 'Pin'} className="text-amber-500 hover:text-amber-700 p-0.5"><Pin size={12} /></button>
                            <button onClick={() => handleDeletePost(post.id)} title="Delete" className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <p className="text-slate-400 mt-1">{new Date(post.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p className="text-slate-500 mt-1 line-clamp-2">{post.body.slice(0, 100)}{post.body.length > 100 ? '…' : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reminder */}
              <div className="p-3 border-t border-gray-100 bg-amber-50">
                <p className="text-[10px] text-amber-700 flex items-start gap-1">
                  <ShieldAlert size={10} className="mt-0.5 flex-shrink-0" />
                  Posts appear on the student wellness wall immediately. Ensure content is supportive and appropriate.
                </p>
              </div>
            </div>
          )}

          {/* ── QUEST FORGE PANEL ───────────────────────────────────────────── */}
          {activePanel === 'questForge' && (
            <div className="flex flex-col h-[calc(100vh-280px)] overflow-y-auto p-4 bg-slate-50 relative">
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800">Forge Studio upgraded</p>
                  <p className="text-[11px] text-amber-700">Use the new Forge flow in Counselor Studio.</p>
                </div>
                <button
                  onClick={() => { setShowCounselorStudio(true); setStudioTab('forge'); }}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-700 text-white rounded-lg"
                >
                  Open Studio
                </button>
              </div>
              <div className="mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-3">
                  <Wand2 className="text-purple-600" size={18} /> Forge New Wellness Quest
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Quest Title (e.g., Anxiety Alchemist)"
                    className="w-full text-sm border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-purple-500"
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                  />
                  <select
                    className="w-full text-sm border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-purple-500"
                    value={questParadigm}
                    onChange={(e) => setQuestParadigm(e.target.value as any)}
                  >
                    <option value="Resource Gathering">Resource Gathering (Alchemist Jar)</option>
                    <option value="Story Weaving">Story Weaving (The Weaver's Loom)</option>
                    <option value="Logic Puzzle">Logic Puzzle</option>
                    <option value="Custom Explorer">Custom Explorer</option>
                  </select>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-6 h-6 mb-2 text-slate-500" />
                        <p className="mb-2 text-xs text-slate-500"><span className="font-semibold">Click to upload PDF manual</span></p>
                        <p className="text-[10px] text-slate-400">{questFile ? questFile.name : 'PDF format only'}</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf" onChange={(e) => setQuestFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <button
                    onClick={handleForgeQuest}
                    disabled={isForging || !questFile || !questTitle}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 transition-colors text-sm shadow-sm"
                  >
                    {isForging ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Wand2 size={16} />}
                    {isForging ? 'Processing PDF & Forging...' : 'Forge Quest Array'}
                  </button>
                </div>
              </div>

              {/* Analytics for published quests */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 text-sm">Active RAG Quests</h4>
                {Object.keys(forgedGames).length === 0 ? (
                  <div className="text-center p-6 bg-white rounded-xl border border-dashed border-gray-300">
                    <BookOpen className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-sm font-medium text-slate-500">No custom quests forged yet</p>
                    <p className="text-xs text-slate-400 mt-1">Upload a PDF to create your first dynamic survey game.</p>
                  </div>
                ) : (
                  (Object.entries(forgedGames) as [string, GameMetadata][]).map(([id, game]) => (
                    <div key={id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{game.title}</h5>
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{game.paradigm}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                          <p className="text-[10px] text-slate-500 font-medium">Total Cohort Starts</p>
                          <p className="text-lg font-black text-slate-700">{game.totalUsers || Math.max(12, Math.floor((game.title.length * 7) % 50))}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                          <p className="text-[10px] text-slate-500 font-medium">Avg Completion</p>
                          <p className="text-lg font-black text-slate-700">{game.avgCompletionTime || ((game.title.length % 5) + 2.4).toFixed(1)}<span className="text-xs ml-1">min</span></p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {showConsentModal && selectedSlotForConsent && consentData && (
        <ConsentForm
          role="counselor"
          studentName={consentData.studentName}
          program="PGDM"
          onClose={() => setShowConsentModal(false)}
          onSubmit={handleConsentSignAndConfirm}
          user={studentForConsent ?? undefined}
        />
      )}

      {/* Counselor Studio Modal */}
      {showCounselorStudio && (
        <div className="fixed inset-0 z-[220] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Counselor Studio</h2>
                <p className="text-xs text-slate-500">Email, reports, forge, tasks, and reminders in one place</p>
              </div>
              <button onClick={() => setShowCounselorStudio(false)} className="p-2 rounded-full hover:bg-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 px-5 py-3 border-b border-slate-100 bg-white">
              {([
                { id: 'email', label: 'Email' },
                { id: 'reports', label: 'Reports' },
                { id: 'forge', label: 'Forge' },
                { id: 'tasks', label: 'Tasks' },
                { id: 'alerts', label: 'Alerts' },
              ] as { id: typeof studioTab; label: string }[]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStudioTab(tab.id)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-colors ${studioTab === tab.id
                    ? 'bg-[#8a6b5c] text-white border-[#8a6b5c]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#8a6b5c]'} `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {studioTab === 'email' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-3">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-600 mb-2">Target</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEmailTarget('student')}
                          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border ${emailTarget === 'student' ? 'bg-[#8a6b5c] text-white border-[#8a6b5c]' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          Student
                        </button>
                        <button
                          onClick={() => setEmailTarget('group')}
                          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border ${emailTarget === 'group' ? 'bg-[#8a6b5c] text-white border-[#8a6b5c]' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          Group
                        </button>
                      </div>
                      {emailTarget === 'group' && (
                        <select
                          value={emailGroupId}
                          onChange={(e) => setEmailGroupId(e.target.value)}
                          className="w-full mt-3 border border-slate-200 rounded-lg px-2 py-2 text-xs"
                        >
                          <option value="">Select program group</option>
                          {programGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-bold text-slate-600 mb-2">Threads</p>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {emailThreads.map(thread => {
                          const student = visibleStudents.find(s => (s.casefileId || s.id) === thread.studentId);
                          return (
                            <button
                              key={thread.id}
                              onClick={() => setSelectedEmailThreadId(thread.id)}
                              className={`w-full text-left p-2 rounded-lg border ${selectedEmailThreadId === thread.id ? 'border-[#8a6b5c] bg-[#f7f0eb]' : 'border-slate-200 bg-white'}`}
                            >
                              <p className="text-xs font-bold text-slate-700 truncate">{student?.name || thread.studentId}</p>
                              <p className="text-[10px] text-slate-400 truncate">{thread.subject}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-slate-600 mb-2">Compose</p>
                      <input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder={selectedEmailThread?.subject || 'Subject'}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs mb-2"
                      />
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={4}
                        placeholder="Write your email here..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                      <div className="flex justify-between mt-3">
                        <button
                          onClick={() => selectedEmailThreadId && handleSimulateReply(selectedEmailThreadId)}
                          className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-500"
                        >
                          Simulate Reply
                        </button>
                        <button
                          onClick={handleSendEmail}
                          className="px-4 py-2 text-xs font-bold bg-[#8a6b5c] text-white rounded-lg"
                        >
                          Send Email
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-slate-600 mb-3">Thread</p>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {selectedEmailThread?.messages.map(msg => (
                          <div key={msg.id} className={`p-3 rounded-xl text-xs ${msg.direction === 'sent' ? 'bg-[#8a6b5c] text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                            <div className="flex justify-between mb-1">
                              <span className="font-bold">{msg.senderName}</span>
                              <span className="text-[10px] opacity-70">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p>{msg.body}</p>
                          </div>
                        ))}
                        {selectedEmailThread?.messages.length === 0 && (
                          <p className="text-center text-xs text-slate-400">No messages yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {studioTab === 'reports' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-bold text-slate-600 mb-2">Generate Report</p>
                      <div className="text-xs text-slate-500 mb-2">Student: {selectedStudentRecord?.name || 'Select a student'}</div>
                      <select
                        value={reportTemplateId}
                        onChange={(e) => setReportTemplateId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs"
                      >
                        {reportTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                      <div className="mt-3">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Add snippet</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            value={reportSnippetInput}
                            onChange={(e) => setReportSnippetInput(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-xs"
                            placeholder="Short observation or quote"
                          />
                          <button onClick={handleAddSnippet} className="px-3 py-2 text-xs font-bold bg-slate-100 rounded-lg">Add</button>
                        </div>
                        <div className="mt-2 space-y-1">
                          {(selectedStudent && reportSnippets[selectedStudent] || []).map((snippet, i) => (
                            <div key={`${snippet}-${i}`} className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                              {snippet}
                            </div>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                        <input type="checkbox" checked={sendToSupervisor} onChange={(e) => setSendToSupervisor(e.target.checked)} />
                        Send to Supervisor / Associate Dean (mock)
                      </label>
                      <button onClick={handleGenerateReport} className="w-full mt-3 bg-[#8a6b5c] text-white text-xs font-bold py-2 rounded-lg">
                        Generate Report
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-slate-600 mb-2">Report Preview</p>
                    {generatedReport ? (
                      <div className="space-y-3 text-xs text-slate-700">
                        <div>
                          <p className="font-bold text-slate-600">Current State</p>
                          <p>{generatedReport.currentState}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-600">Concerns</p>
                          <p>{generatedReport.concerns}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-600">Suggested Actions</p>
                          <p>{generatedReport.actions}</p>
                        </div>
                        {generatedReport.surveySummary && (
                          <div>
                            <p className="font-bold text-slate-600">Survey Summary</p>
                            <p>{generatedReport.surveySummary}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-600">Snippets</p>
                          <ul className="list-disc ml-4">
                            {generatedReport.snippets.map((s, i) => (
                              <li key={`${s}-${i}`}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Generate a report to preview it here.</p>
                    )}
                  </div>
                </div>
              )}

              {studioTab === 'forge' && (
                <div className="space-y-6">
                  <div className="flex gap-2 text-xs font-bold">
                    {['upload', 'review', 'assign', 'results'].map(step => (
                      <button
                        key={step}
                        onClick={() => setForgeStep(step as any)}
                        className={`px-3 py-1.5 rounded-full border ${forgeStep === step ? 'bg-[#8a6b5c] text-white border-[#8a6b5c]' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {step}
                      </button>
                    ))}
                  </div>

                  {forgeStep === 'upload' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <input
                        type="text"
                        value={forgeTitle}
                        onChange={(e) => setForgeTitle(e.target.value)}
                        placeholder="Survey title"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleForgeFileChange(e.target.files?.[0] || null)}
                        className="w-full text-xs"
                      />
                      <p className="text-[11px] text-slate-500">
                        PDF text is extracted automatically for question generation.
                      </p>
                      {forgeExtractError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-[11px] px-3 py-2">
                          {forgeExtractError}
                        </div>
                      )}
                      <button
                        onClick={handleForgeExtract}
                        disabled={isForgeExtracting}
                        className="px-4 py-2 text-xs font-bold bg-[#8a6b5c] text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isForgeExtracting ? 'Processing PDF...' : 'Extract Questions (RAG + LLM)'}
                      </button>
                    </div>
                  )}

                  {forgeStep === 'review' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      {forgeQuestions.map(q => (
                        <div key={q.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                          <input
                            value={q.text}
                            onChange={(e) => setForgeQuestions(prev => prev.map(item => item.id === q.id ? { ...item, text: e.target.value } : item))}
                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs"
                          />
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-500">Scale</span>
                            <select
                              value={q.scale}
                              onChange={(e) => handleForgeScaleChange(q.id, Number(e.target.value))}
                              className="border border-slate-200 rounded px-2 py-1 text-xs"
                            >
                              {[3, 5, 7].map(scale => (<option key={scale} value={scale}>{scale}-point</option>))}
                            </select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.meanings.map((meaning, idx) => (
                              <input
                                key={`${q.id}-${idx}`}
                                value={meaning}
                                onChange={(e) => setForgeQuestions(prev => prev.map(item => item.id === q.id
                                  ? { ...item, meanings: item.meanings.map((m, i) => i === idx ? e.target.value : m) }
                                  : item
                                ))}
                                className="border border-slate-200 rounded px-2 py-1 text-[11px]"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setForgeStep('assign')} className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-lg">
                        Continue to Assign
                      </button>
                    </div>
                  )}

                  {forgeStep === 'assign' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForgeAssignTarget('student')}
                          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border ${forgeAssignTarget === 'student' ? 'bg-[#8a6b5c] text-white border-[#8a6b5c]' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          Student
                        </button>
                        <button
                          onClick={() => setForgeAssignTarget('group')}
                          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border ${forgeAssignTarget === 'group' ? 'bg-[#8a6b5c] text-white border-[#8a6b5c]' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          Group
                        </button>
                      </div>
                      {forgeAssignTarget === 'group' && (
                        <select
                          value={forgeAssignGroupId}
                          onChange={(e) => setForgeAssignGroupId(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs"
                        >
                          <option value="">Select program group</option>
                          {programGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                      )}
                      {forgeAssignTarget === 'student' && (
                        <p className="text-xs text-slate-500">Assigning to: {selectedStudentRecord?.name || 'Select a student'}</p>
                      )}
                      <button onClick={handleCreateSurvey} className="px-4 py-2 text-xs font-bold bg-[#8a6b5c] text-white rounded-lg">
                        Create Survey
                      </button>
                    </div>
                  )}

                  {forgeStep === 'results' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {forgeSurveys.length === 0 && (
                          <p className="text-xs text-slate-400">No surveys created yet.</p>
                        )}
                        {forgeSurveys.map(survey => (
                          <div key={survey.id} className={`border rounded-xl p-3 ${selectedSurveyId === survey.id ? 'border-[#8a6b5c] bg-[#f7f0eb]' : 'border-slate-200 bg-white'}`}>
                            <div className="flex justify-between">
                              <div>
                                <p className="text-sm font-bold text-slate-700">{survey.title}</p>
                                <p className="text-[10px] text-slate-500">Assigned to {survey.assignedTo.map(a => a.name).join(', ') || 'none'}</p>
                              </div>
                              <button onClick={() => setSelectedSurveyId(survey.id)} className="text-xs text-slate-500">View</button>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleSimulateResponses(survey)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 rounded-lg">Simulate Responses</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-600 mb-2">Survey Results</p>
                        {selectedSurveyId ? (
                          <div className="space-y-2">
                            {forgeResponses.filter(r => r.surveyId === selectedSurveyId).map(resp => {
                              const student = visibleStudents.find(s => (s.casefileId || s.id) === resp.studentId);
                              const avg = resp.answers.length
                                ? (resp.answers.reduce((acc, a) => acc + a.score, 0) / resp.answers.length).toFixed(1)
                                : '0';
                              return (
                                <div key={resp.id} className="bg-white border border-slate-200 rounded-lg p-2 text-xs">
                                  <p className="font-bold text-slate-700">{student?.name || resp.studentId}</p>
                                  <p className="text-[11px] text-slate-500">Avg score: {avg} | {new Date(resp.submittedAt).toLocaleString()}</p>
                                </div>
                              );
                            })}
                            <button onClick={handleSendSurveyToChat} className="mt-2 px-3 py-2 text-xs font-bold bg-[#8a6b5c] text-white rounded-lg">
                              Send Summary to Chat
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">Select a survey to see responses.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {studioTab === 'tasks' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600">Assign Task</p>
                    <p className="text-xs text-slate-500">Student: {selectedStudentRecord?.name || 'Select a student'}</p>
                    <input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Task title"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Task details"
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <button onClick={handleCreateTask} className="w-full bg-[#8a6b5c] text-white text-xs font-bold py-2 rounded-lg">
                      Assign Task
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-slate-600 mb-2">Task Tracker</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {counselorTasks.filter(t => t.studentId === selectedStudent).map(task => {
                        const status = getTaskStatus(task);
                        return (
                          <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                            <div className="flex justify-between">
                              <p className="font-bold text-slate-700">{task.title}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === 'completed' ? 'bg-emerald-100 text-emerald-700' : status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{status}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Assigned: {new Date(task.assignedAt).toLocaleDateString()} | Due: {new Date(task.dueAt).toLocaleDateString()}</p>
                            {!task.completedAt && (
                              <button onClick={() => markTaskCompleted(task.id)} className="mt-2 px-2 py-1 text-[10px] font-bold bg-slate-100 rounded-lg">
                                Mark Completed
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {counselorTasks.filter(t => t.studentId === selectedStudent).length === 0 && (
                        <p className="text-xs text-slate-400">No tasks assigned yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {studioTab === 'alerts' && (
                <div className="space-y-4">
                  {buildReminderItems().length === 0 ? (
                    <p className="text-xs text-slate-400">No reminders at the moment.</p>
                  ) : (
                    buildReminderItems().map(reminder => {
                      const student = visibleStudents.find(s => (s.casefileId || s.id) === reminder.studentId);
                      return (
                        <div key={reminder.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
                          <div>
                            <p className="font-bold text-slate-700">{student?.name || reminder.studentId}</p>
                            <p className="text-[11px] text-slate-500">{reminder.message}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const thread = emailThreads.find(t => t.studentId === reminder.studentId);
                                if (thread) {
                                  sendEmailToThread(thread.id, `Reminder: ${reminder.message}`, 'Reminder');
                                  addNotification('Email reminder sent (mock).', 'success');
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 rounded-lg"
                            >
                              Send Email
                            </button>
                            <button
                              onClick={() => addNotification(reminder.message, 'info')}
                              className="px-3 py-1.5 text-xs font-bold bg-[#8a6b5c] text-white rounded-lg"
                            >
                              Add Alert
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Assign Wellness Task</h3>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Describe the task (e.g. 'Take a 15min walk without phone')..."
              className="w-full h-32 p-3 border border-gray-200 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
              <button onClick={handleAssignTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {showInboxModal && (
        <div className="absolute inset-0 z-50 bg-black/20 flex items-start justify-end p-4 animate-in slide-in-from-right duration-200 backdrop-blur-sm">
          <div className="w-80 bg-white rounded-xl shadow-2xl h-[calc(100vh-2rem)] flex flex-col mt-16 mr-4">
            <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--color-elevated)] rounded-t-xl">
              <h3 className="font-bold text-[var(--color-text)]">Messages</h3>
              <button onClick={() => setShowInboxModal(false)}><XCircle size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {conversations.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">No messages yet.</p>}
              {conversations.map(c => (
                <div key={c.studentId} onClick={() => openChatFromInbox(c.studentId)} className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-slate-700 truncate w-32">
                      {students.find(s => (s.casefileId || s.id) === c.studentId)?.name || c.studentId}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(c.lastMessage?.timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 truncate w-48">{c.lastMessage?.text}</p>
                    {c.unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{c.unreadCount}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-[var(--color-elevated)] p-4 text-[var(--color-text)] flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><CalendarIcon size={18} /> Schedule Session</h3>
              <button onClick={() => setShowScheduleModal(false)}><XCircle size={18} /></button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Calendar */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={20} /></button>
                  <h4 className="font-bold text-slate-700">{pickerDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                  <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-bold">
                  <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Padding */}
                  {[...Array(getDaysInMonth(pickerDate).firstDay)].map((_, i) => <div key={`pad - ${i} `} />)}
                  {/* Days */}
                  {[...Array(getDaysInMonth(pickerDate).days)].map((_, i) => {
                    const d = i + 1;
                    const isSelected = d === pickerDate.getDate();
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          const newD = new Date(pickerDate);
                          newD.setDate(d);
                          setPickerDate(newD);
                        }}
                        className={`h - 8 w - 8 rounded - full text - sm flex items - center justify - center transition - colors ${isSelected ? 'bg-[#8a6b5c] text-white font-bold' : 'hover:bg-slate-100 text-slate-700'} `}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Picker (Structured Grid) */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Clock size={16} className="text-[#8a6b5c]" /> Select Time</h4>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 pb-2 scrollbar-hide">
                  {timeSlots.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`px-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${selectedTime === t ? 'bg-[#8a6b5c] text-white border-[#8a6b5c] shadow-md scale-105 ring-2 ring-[#8a6b5c]/20' : 'bg-gray-50 border-gray-200 text-slate-600 hover:border-[#8a6b5c] hover:bg-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!selectedTime}
                onClick={handlePublishSlot}
                className="w-full bg-[#8a6b5c] text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#75844d] transition-colors"
              >
                Publish Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
        <div className="absolute bottom-4 right-4 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-in slide-in-from-bottom duration-300">
          <div className="p-4 bg-[var(--color-elevated)] text-[var(--color-text)] rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-sm">Chat: {(() => {
              const s = students.find(st => (st.casefileId || st.id) === selectedStudent);
              return s ? `${s.name} (${s.casefileId || s.id})` : selectedStudent;
            })()}</h3>
            <button onClick={() => setShowChatModal(false)}><XCircle size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatHistory.map(m => (
              <div key={m.id} className={`flex ${m.senderId === counselorId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.senderId === counselorId ? 'bg-[#8a6b5c] text-white shadow-sm' : 'bg-white border border-gray-200 text-slate-700 shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200 flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }} className="flex-1 border rounded px-2 text-sm outline-none" placeholder="Type..." />
            <button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded"><Send size={16} /></button>
          </div>
        </div>
      )}

      {/* Counselor Report Modal */}
      {showReportModal && <CounselorReportModal onClose={() => setShowReportModal(false)} />}

    </div>
  );
};



export default CounselorDashboard;







