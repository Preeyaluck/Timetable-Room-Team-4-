export interface Room {
  id: string;
  name: string;
  capacity: number;
  building: string;
  type?: string;
  floor?: string;
  features?: string[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  hue: number;
  instructor?: string;
}

export interface Section {
  id: string;
  courseId: string;
  no: string;
  capacity: number;
  base: number;
}

export interface Meeting {
  id: string;
  sectionId: string;
  roomId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  start: string;
  end: string;
}

export interface Enrollment {
  student: string;
  section: string;
  status: 'enrolled' | 'dropped' | 'withdrawn';
}

export interface User {
  id: string;
  name: string;
  role: 'student' | 'staff';
  department?: string;
  initials?: string;
}

export interface EventLog {
  dir: 'IN' | 'OUT' | 'API';
  name: string;
  payload: any;
  extra?: string;
  ts: string;
}

export interface Suggestion {
  roomId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  start: string;
  end: string;
  score: number;
  why: string;
}

export interface CheckResult {
  ok: boolean;
  http: number;
  errors: string[];
}

export interface RoomRequest {
  id: string;
  studentId: string;
  studentName: string;
  roomId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  start: string;
  end: string;
  purpose: string;
  attendees: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  department?: string;
  rejectReason?: string;
}

