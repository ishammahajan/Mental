export type Role = 'student' | 'counselor' | 'admin';

export interface User {
  id: string;
  casefileId?: string;
  name: string;
  role: Role;
  email: string;
  program?: string; // e.g., "MBA Year 1"
  mobile?: string;
  likes?: string[];
  dislikes?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'agent'; 
  text: string;
  timestamp: Date;
  metadata?: {
    type: 'booking_suggestion' | 'task_assignment' | 'crisis_trigger' | 'booking_request_sent' | 'booking_slot_taken' | 'booking_confirmation';
    slotId?: string;
    slotTime?: string;
    taskName?: string;
  };
}

export interface P2PMessage {
  id: string;
  senderId: string;
  receiverId: string; // 'counselor' or specific student ID
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface StudentMetric {
  date: string;
  workloadScore: number; // 0-100
  sleepHours: number;
  stressScore: number; // 0-100
}

export interface AnonymizedStudent {
  hashId: string;
  stressScore: number;
  lastCheckIn: string;
  status: 'Normal' | 'Monitor' | 'High Risk';
}

export interface AppointmentSlot {
  id: string;
  date: string;
  time: string;
  counselorName: string;
  status: 'open' | 'requested' | 'confirmed';
  bookedByStudentId?: string;
  bookedByStudentName?: string;
}

export interface WellnessTask {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  assignedBy: string; // Counselor Name or "SParsh Guardian"
}



export interface WellnessLeave {
  id: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ConsentData {
  slotId: string;
  studentId: string;
  studentName: string;
  studentSignature: string; // URL or base64
  studentSignDate: string;
  counselorId: string;
  counselorName: string;
  counselorSignature: string; // Typed name
  counselorSignDate: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  encryptedText: string;
}

export type VibeType = 'calm' | 'anxious' | 'focus' | 'tired' | 'energetic';

export interface AgentAnalysis {
  sentimentScore: number; // 0-100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedAction: 'NONE' | 'SUGGEST_BOOKING' | 'ASSIGN_EXERCISE' | 'TRIGGER_SOS' | 'BOOK_SLOT';
  reasoning: string;
  specificExercise?: string; // e.g., "Box Breathing"
}

// FIX: Added missing WeatherData interface used by EnvironmentWidget.tsx
export interface WeatherData {
  location: string;
  city: string;
  temp: number;
  condition: string;
  aqi: number;
}