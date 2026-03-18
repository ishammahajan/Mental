import type {
  AppointmentSlot,
  CounselorEmailThread,
  CounselorReport,
  CounselorTaskItem,
  ForgeResponse,
  ForgeSurvey,
  Message,
  P2PMessage,
  User,
  WellnessPost,
  WellnessTask,
  JournalEntry,
  ConsentData,
} from '../types';

export const DEMO_USERS: User[] = [
  {
    id: 'demo_student_aarohi',
    casefileId: 'CF-1024',
    name: 'Aarohi Mehta',
    email: 'aarohi.mehta@spjimr.org',
    program: 'MBA Year 1',
    role: 'student',
    phone: '9876543210',
    likes: ['Music', 'Yoga'],
    dislikes: ['Late-night work'],
  },
  {
    id: 'demo_student_kunal',
    casefileId: 'CF-1081',
    name: 'Kunal Iyer',
    email: 'kunal.iyer@spjimr.org',
    program: 'MBA Year 2',
    role: 'student',
    phone: '9123456780',
    likes: ['Running', 'Photography'],
    dislikes: ['Crowded places'],
  },
  {
    id: 'demo_student_sana',
    casefileId: 'CF-1103',
    name: 'Sana Qureshi',
    email: 'sana.qureshi@spjimr.org',
    program: 'MBA Year 1',
    role: 'student',
    phone: '9012345678',
    likes: ['Journaling'],
    dislikes: ['Overbooking'],
  },
  {
    id: 'demo_student_rhea',
    casefileId: 'CF-1139',
    name: 'Rhea Banerjee',
    email: 'rhea.banerjee@spjimr.org',
    program: 'MBA Year 2',
    role: 'student',
    phone: '9988776655',
    likes: ['Reading'],
    dislikes: ['Last-minute changes'],
  },
  {
    id: 'demo_counselor_dimple',
    name: 'Ms. Dimple Wagle',
    email: 'dimple.wagle@spjimr.org',
    role: 'counselor',
  },
  {
    id: 'demo_admin',
    name: 'Admin Desk',
    email: 'admin@spjimr.org',
    role: 'admin',
  },
];

export const DEMO_SLOTS: AppointmentSlot[] = [
  {
    id: 'demo_slot_1',
    date: 'Tomorrow',
    time: '10:00 AM',
    counselorName: 'Ms. Dimple Wagle',
    status: 'open',
  },
  {
    id: 'demo_slot_2',
    date: 'Tomorrow',
    time: '02:30 PM',
    counselorName: 'Ms. Dimple Wagle',
    status: 'requested',
    bookedByStudentId: 'demo_student_aarohi',
    bookedByStudentName: 'Aarohi Mehta',
  },
  {
    id: 'demo_slot_3',
    date: 'Mar 22',
    time: '11:00 AM',
    counselorName: 'Ms. Dimple Wagle',
    status: 'confirmed',
    bookedByStudentId: 'demo_student_kunal',
    bookedByStudentName: 'Kunal Iyer',
  },
  {
    id: 'demo_slot_4',
    date: 'Mar 25',
    time: '04:00 PM',
    counselorName: 'Ms. Jyoti Sangle',
    status: 'open',
  },
];

export const DEMO_TASKS_BY_EMAIL: Record<string, WellnessTask[]> = {
  'aarohi.mehta@spjimr.org': [
    {
      id: 'task_demo_aarohi_1',
      title: '10-min walk after dinner',
      description: 'Short recovery break to reset before study block.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
    {
      id: 'task_demo_aarohi_2',
      title: 'Sleep log (5 nights)',
      description: 'Track bedtime and wake time for consistency.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
  ],
  'kunal.iyer@spjimr.org': [
    {
      id: 'task_demo_kunal_1',
      title: 'Check-in with faculty mentor',
      description: 'Schedule a 15-min feedback alignment call.',
      isCompleted: false,
      assignedBy: 'counselor_dimple_wagle',
    },
  ],
};

export const DEMO_POSTS: WellnessPost[] = [
  {
    id: 'post_demo_1',
    title: 'Midterm Reset Week',
    body: 'This week is a reset week. Pick one habit to protect: sleep, meals, or a 10-min walk. You are not alone in this.',
    authorName: 'Counselling Cell',
    postedAt: new Date().toISOString(),
    isPinned: true,
  },
  {
    id: 'post_demo_2',
    title: 'Breathing Routine',
    body: 'Try 4-4-4-4 box breathing before presentations. Inhale 4, hold 4, exhale 4, hold 4. Repeat for 2 minutes.',
    authorName: 'Counselling Cell',
    postedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const DEMO_CHAT_HISTORY: Record<string, Message[]> = {
  demo_student_aarohi: [
    {
      id: 'chat_demo_1',
      role: 'user',
      text: 'I feel overwhelmed with assignments this week.',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 'chat_demo_2',
      role: 'model',
      text: 'That sounds heavy. Would you like to try a 2-minute grounding exercise together?',
      timestamp: new Date(Date.now() - 3500000),
    },
  ],
};

export const DEMO_P2P_MESSAGES: P2PMessage[] = [
  {
    id: 'p2p_demo_1',
    senderId: 'demo_counselor_dimple',
    receiverId: 'demo_student_aarohi',
    text: 'Hi Aarohi, checking in. How are you feeling today?',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
  },
];

export const DEMO_JOURNALS: Record<string, JournalEntry[]> = {
  demo_student_aarohi: [
    {
      id: 'journal_demo_1',
      date: new Date().toISOString(),
      encryptedText: 'Felt calmer after a short walk and a call with a friend.',
    },
  ],
};

export const DEMO_CONSENTS: Record<string, ConsentData> = {
  demo_slot_3: {
    slotId: 'demo_slot_3',
    studentId: 'demo_student_kunal',
    studentName: 'Kunal Iyer',
    studentSignature: 'Kunal Iyer',
    studentSignDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    counselorId: 'demo_counselor_dimple',
    counselorName: 'Ms. Dimple Wagle',
    counselorSignature: 'Dimple Wagle',
    counselorSignDate: new Date(Date.now() - 86400000).toISOString(),
  },
};

export const DEMO_EMAIL_THREADS: CounselorEmailThread[] = [
  {
    id: 'demo_email_thread_1',
    counselorId: 'demo_counselor_dimple',
    studentId: 'demo_student_aarohi',
    subject: 'Follow-up on sleep routine',
    participants: ['dimple.wagle@spjimr.org', 'aarohi.mehta@spjimr.org'],
    messages: [
      {
        id: 'demo_email_msg_1',
        threadId: 'demo_email_thread_1',
        senderName: 'Ms. Dimple Wagle',
        senderEmail: 'dimple.wagle@spjimr.org',
        body: 'Hi Aarohi, sharing a short sleep routine checklist. Can you try it for 5 nights?',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        direction: 'sent',
      },
    ],
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const DEMO_SURVEYS: ForgeSurvey[] = [
  {
    id: 'demo_survey_1',
    counselorId: 'demo_counselor_dimple',
    title: 'Stress Check-in',
    sourceFileName: 'stress_checkin.pdf',
    questions: [
      {
        id: 'q1',
        text: 'I feel overwhelmed by my workload.',
        scale: 5,
        meanings: ['Low', 'Mild', 'Moderate', 'High', 'Severe'],
      },
      {
        id: 'q2',
        text: 'I am able to get adequate sleep.',
        scale: 5,
        meanings: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
      },
    ],
    assignedTo: [{ type: 'student', id: 'demo_student_aarohi', name: 'Aarohi Mehta' }],
    assignedStudentIds: ['demo_student_aarohi'],
    assignedGroupIds: ['MBA Year 1'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const DEMO_RESPONSES: ForgeResponse[] = [
  {
    id: 'demo_response_1',
    surveyId: 'demo_survey_1',
    studentId: 'demo_student_aarohi',
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    answers: [
      { questionId: 'q1', score: 4 },
      { questionId: 'q2', score: 2 },
    ],
  },
];

export const DEMO_REPORTS: CounselorReport[] = [
  {
    id: 'demo_report_1',
    counselorId: 'demo_counselor_dimple',
    studentId: 'demo_student_aarohi',
    generatedAt: new Date(Date.now() - 86400000).toISOString(),
    currentState: 'Student reports high workload and sleep debt ahead of midterms.',
    concerns: 'Evening anxiety spikes and missed rest breaks.',
    actions: 'Schedule a follow-up session next week; reinforce 10-min recovery blocks.',
    snippets: ['Sleep log started', 'Workload map created'],
    surveySummary: 'Stress check-in indicates moderate stress and low sleep.',
  },
];

export const DEMO_COUNSELOR_TASKS: CounselorTaskItem[] = [
  {
    id: 'demo_c_task_1',
    counselorId: 'demo_counselor_dimple',
    studentId: 'demo_student_aarohi',
    title: 'Send sleep checklist',
    description: 'Email 5-night sleep checklist and follow-up reminder.',
    assignedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
  },
];
