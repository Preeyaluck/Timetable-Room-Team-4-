export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta?: any }>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta?: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

export type Bindings = {
  DB: D1Database;
  timetable_room_db?: D1Database;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'staff';
  department?: string;
  created_at?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  room_type: 'lecture' | 'lab' | 'seminar';
  status: 'available' | 'maintenance' | 'inactive';
  created_at?: string;
}

export interface Course {
  id: string;
  course_code: string;
  course_name: string;
  department: string;
  credits: number;
  created_at?: string;
}

export interface Section {
  id: string;
  course_id: string;
  section_number: number;
  capacity: number;
  semester: string;
  academic_year: string;
  enrolled_count?: number;
  created_at?: string;
}

export interface Meeting {
  id: string;
  section_id: string;
  room_id: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string; // 'HH:MM'
  end_time: string;   // 'HH:MM'
  status: 'active' | 'cancelled';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  section_id: string;
  status: 'enrolled' | 'dropped';
  enrolled_at?: string;
}
