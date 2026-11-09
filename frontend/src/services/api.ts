import { Course, Day, Enrollment, Meeting, Room, Section, User } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL || 'https://timetable-room-api.6731503021.workers.dev';

export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const H0 = 8, H1 = 18, HH = 52;

export const t2m = (s: string): number => {
  const [a, b] = s.split(':');
  return +a * 60 + +b;
};

export const m2t = (m: number): string => {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

export const overlap = (a: { start: string; end: string }, b: { start: string; end: string }): boolean => {
  return t2m(a.start) < t2m(b.end) && t2m(b.start) < t2m(a.end);
};

export const timeOpts: string[] = [];
for (let m = H0 * 60; m <= H1 * 60; m += 30) {
  timeOpts.push(m2t(m));
}

// Course color hue generator
export function getCourseHue(code: string): number {
  const hues: Record<string, number> = {
    CS101: 280, // Violet/Purple
    CS201: 250, // Indigo
    CS202: 215, // Blue
    CS203: 155, // Emerald
    CS204: 195, // Cyan
    CS205: 275, // Purple
    CS301: 170, // Teal
    SE201: 30,  // Orange/Amber
    MA201: 38,  // Amber
    GE101: 340, // Rose
    SWE204: 215,
    SWE312: 280,
    CPE101: 155,
  };
  const upper = (code || '').toUpperCase();
  if (hues[upper]) return hues[upper];
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = upper.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

// Initial Mock / Seed data as designed by teammate
export const INITIAL_ROOMS: Room[] = [
  {
    id: 'rm_sc301',
    name: 'SC301',
    type: 'ห้องบรรยาย',
    capacity: 50,
    building: 'อาคารวิทยาศาสตร์',
    floor: 'ชั้น 3',
    features: ['โปรเจกเตอร์', 'Wi-Fi', 'ไมโครโฟน'],
  },
  {
    id: 'rm_sc302',
    name: 'SC302',
    type: 'ห้องบรรยาย',
    capacity: 40,
    building: 'อาคารวิทยาศาสตร์',
    floor: 'ชั้น 3',
    features: ['โปรเจกเตอร์', 'Wi-Fi'],
  },
  {
    id: 'rm_sc303',
    name: 'SC303',
    type: 'ห้องปฏิบัติการคอมพิวเตอร์',
    capacity: 32,
    building: 'อาคารวิทยาศาสตร์',
    floor: 'ชั้น 3',
    features: ['คอมพิวเตอร์ 32 เครื่อง', 'โปรเจกเตอร์', 'Wi-Fi'],
  },
  {
    id: 'rm_sc304',
    name: 'SC304',
    type: 'ห้องบรรยาย',
    capacity: 60,
    building: 'อาคารวิทยาศาสตร์',
    floor: 'ชั้น 3',
    features: ['โปรเจกเตอร์', 'Wi-Fi', 'ระบบเสียงห้องประชุม'],
  },
];

export const INITIAL_COURSES: Course[] = [
  { id: 'c_cs201', code: 'CS201', name: 'โครงสร้างข้อมูล', credits: 3, hue: 250, instructor: 'อ.ธนา วงศ์ดี' },
  { id: 'c_cs202', code: 'CS202', name: 'ระบบฐานข้อมูล', credits: 3, hue: 215, instructor: 'อ.กมล สมบูรณ์' },
  { id: 'c_cs203', code: 'CS203', name: 'เครือข่ายคอมพิวเตอร์', credits: 3, hue: 155, instructor: 'อ.ปิยะ ชนะภัย' },
  { id: 'c_ma201', code: 'MA201', name: 'คณิตศาสตร์ไม่ต่อเนื่อง', credits: 3, hue: 38, instructor: 'อ.วรินทร์ แก้วมณี' },
  { id: 'c_ge101', code: 'GE101', name: 'ภาษาอังกฤษเพื่อการสื่อสาร', credits: 3, hue: 340, instructor: 'อ.มาลี เจริญผล' },
  { id: 'c_cs204', code: 'CS204', name: 'การพัฒนาเว็บ', credits: 3, hue: 195, instructor: 'อ.เอกชัย มีสุข' },
  { id: 'c_cs205', code: 'CS205', name: 'ระบบปฏิบัติการ', credits: 3, hue: 275, instructor: 'ดร.สมเกียรติ สว่างวงศ์' },
];

export const INITIAL_SECTIONS: Section[] = [
  { id: 'sec_cs201_01', courseId: 'c_cs201', no: '01', capacity: 50, base: 37 },
  { id: 'sec_cs201_02', courseId: 'c_cs201', no: '02', capacity: 60, base: 42 },
  { id: 'sec_cs202_01', courseId: 'c_cs202', no: '01', capacity: 40, base: 35 },
  { id: 'sec_cs203_01', courseId: 'c_cs203', no: '01', capacity: 32, base: 29 },
  { id: 'sec_cs203_02', courseId: 'c_cs203', no: '02', capacity: 32, base: 30 },
  { id: 'sec_ma201_01', courseId: 'c_ma201', no: '01', capacity: 60, base: 51 },
  { id: 'sec_ge101_03', courseId: 'c_ge101', no: '03', capacity: 60, base: 44 },
  { id: 'sec_cs204_01', courseId: 'c_cs204', no: '01', capacity: 32, base: 28 },
  { id: 'sec_cs204_02', courseId: 'c_cs204', no: '02', capacity: 32, base: 26 },
  { id: 'sec_cs205_01', courseId: 'c_cs205', no: '01', capacity: 32, base: 32 },
];

export const DEMO_USERS: Record<string, User> = {
  '69010042': { id: '69010042', name: 'ณัฐวุฒิ ใจดี', role: 'student', department: 'วิทยาการคอมพิวเตอร์', initials: 'ณว' },
  '65010042': { id: '65010042', name: 'Somchai Prasert (Team 03)', role: 'student', department: 'Software Engineering', initials: 'SP' },
  '65010088': { id: '65010088', name: 'Wipada Srisuk (Team 03)', role: 'student', department: 'Computer Science', initials: 'WS' },
  '66010123': { id: '66010123', name: 'Thanawat Jaiyen (Team 03)', role: 'student', department: 'Information Technology', initials: 'TJ' },
  '66010199': { id: '66010199', name: 'Nattaporn Meedee (Team 03)', role: 'student', department: 'Computer Science', initials: 'NM' },
  '6731503021': { id: '6731503021', name: 'Miss Preeyaluk Moolpom', role: 'student', department: 'Software Engineering', initials: 'PM' },
  'usr_stf_001': { id: 'usr_stf_001', name: 'พิมพ์ชนก สุขใจ', role: 'staff', department: 'เจ้าหน้าที่จัดตาราง', initials: 'พส' },
  'staff': { id: 'usr_stf_001', name: 'พิมพ์ชนก สุขใจ', role: 'staff', department: 'เจ้าหน้าที่จัดตาราง', initials: 'พส' },
};

export const INITIAL_STUDENT: User = DEMO_USERS['69010042'];
export const INITIAL_STAFF: User = DEMO_USERS['usr_stf_001'];

export const INITIAL_ENROLLMENTS: Enrollment[] = [
  { student: '69010042', section: 'sec_cs201_01', status: 'enrolled' },
  { student: '69010042', section: 'sec_cs202_01', status: 'enrolled' },
  { student: '69010042', section: 'sec_cs203_01', status: 'enrolled' },
  { student: '69010042', section: 'sec_ma201_01', status: 'enrolled' },
  { student: '69010042', section: 'sec_ge101_03', status: 'enrolled' },

  { student: '6731503021', section: 'sec_cs201_01', status: 'enrolled' },
  { student: '6731503021', section: 'sec_cs202_01', status: 'enrolled' },
  { student: '6731503021', section: 'sec_cs203_01', status: 'enrolled' },
  { student: '6731503021', section: 'sec_ma201_01', status: 'enrolled' },
  { student: '6731503021', section: 'sec_ge101_03', status: 'enrolled' },
];

export const INITIAL_MEETINGS: Meeting[] = [
  { id: 'mtg_01', sectionId: 'sec_cs201_01', roomId: 'rm_sc301', day: 'Mon', start: '09:00', end: '11:00' },
  { id: 'mtg_02', sectionId: 'sec_cs201_01', roomId: 'rm_sc301', day: 'Thu', start: '13:00', end: '15:00' },
  { id: 'mtg_03', sectionId: 'sec_ma201_01', roomId: 'rm_sc304', day: 'Mon', start: '13:00', end: '15:00' },
  { id: 'mtg_04', sectionId: 'sec_cs202_01', roomId: 'rm_sc302', day: 'Tue', start: '09:00', end: '11:00' },
  { id: 'mtg_05', sectionId: 'sec_cs202_01', roomId: 'rm_sc302', day: 'Fri', start: '13:00', end: '15:00' },
  { id: 'mtg_06', sectionId: 'sec_cs203_01', roomId: 'rm_sc303', day: 'Wed', start: '09:00', end: '12:00' },
  { id: 'mtg_07', sectionId: 'sec_ge101_03', roomId: 'rm_sc304', day: 'Thu', start: '09:00', end: '12:00' },
  { id: 'mtg_08', sectionId: 'sec_cs203_02', roomId: 'rm_sc303', day: 'Mon', start: '09:00', end: '12:00' },
  { id: 'mtg_09', sectionId: 'sec_cs204_01', roomId: 'rm_sc303', day: 'Tue', start: '13:00', end: '15:00' },
  { id: 'mtg_10', sectionId: 'sec_cs205_01', roomId: 'rm_sc303', day: 'Thu', start: '13:00', end: '16:00' },
  { id: 'mtg_11', sectionId: 'sec_cs204_02', roomId: 'rm_sc303', day: 'Fri', start: '09:00', end: '11:00' },
  { id: 'mtg_12', sectionId: 'sec_cs201_02', roomId: 'rm_sc304', day: 'Wed', start: '13:00', end: '15:00' },
];

export const color = (c: Course) => ({
  bg: `hsl(${c.hue} 85% var(--bgl))`,
  bd: `hsl(${c.hue} 60% var(--bdl))`,
  tx: `hsl(${c.hue} 55% var(--txl))`,
});

// ---------------------------------------------------------------------------
// Live API Client Layer (Connected to Cloudflare Workers + D1 Backend)
// ---------------------------------------------------------------------------
export async function apiFetchRooms(): Promise<Room[]> {
  try {
    const res = await fetch(`${API_BASE}/api/rooms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const apiRooms: Room[] = json.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.room_type || r.type || 'ห้องบรรยาย',
        capacity: Number(r.capacity) || 40,
        building: r.building || 'อาคารวิทยาศาสตร์',
        floor: r.floor || 'ชั้น 3',
        features: Array.isArray(r.features)
          ? r.features
          : typeof r.features === 'string'
          ? JSON.parse(r.features)
          : ['โปรเจกเตอร์', 'Wi-Fi'],
      }));
      const merged = new Map<string, Room>();
      INITIAL_ROOMS.forEach((r) => merged.set(r.id, r));
      apiRooms.forEach((r) => merged.set(r.id, r));
      return Array.from(merged.values());
    }
  } catch (err) {
    console.info('apiFetchRooms fallback to initial seed:', err);
  }
  return INITIAL_ROOMS;
}

export async function apiFetchMeetings(): Promise<Meeting[]> {
  try {
    const res = await fetch(`${API_BASE}/api/meetings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const dayMap: Record<string, Day> = {
        Monday: 'Mon',
        Tuesday: 'Tue',
        Wednesday: 'Wed',
        Thursday: 'Thu',
        Friday: 'Fri',
        Saturday: 'Sat',
        Sunday: 'Sun',
        Mon: 'Mon',
        Tue: 'Tue',
        Wed: 'Wed',
        Thu: 'Thu',
        Fri: 'Fri',
        Sat: 'Sat',
        Sun: 'Sun',
      };
      const apiMeetings: Meeting[] = json.data.map((m: any) => ({
        id: m.id,
        sectionId: m.section_id || m.sectionId,
        roomId: m.room_id || m.roomId,
        day: dayMap[m.day_of_week] || 'Mon',
        start: m.start_time || m.start,
        end: m.end_time || m.end,
      }));
      const merged = new Map<string, Meeting>();
      INITIAL_MEETINGS.forEach((m) => merged.set(m.id, m));
      apiMeetings.forEach((m) => merged.set(m.id, m));
      return Array.from(merged.values());
    }
  } catch (err) {
    console.info('apiFetchMeetings fallback to initial seed:', err);
  }
  return INITIAL_MEETINGS;
}

export async function apiFetchCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${API_BASE}/api/sections/courses/all`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const apiCourses: Course[] = json.data.map((c: any) => ({
        id: c.id,
        code: c.course_code,
        name: c.course_name,
        credits: Number(c.credits) || 3,
        hue: getCourseHue(c.course_code),
        instructor: c.department ? `ภาควิชา ${c.department}` : 'อาจารย์ประจำวิชา',
      }));
      const merged = new Map<string, Course>();
      INITIAL_COURSES.forEach((c) => merged.set(c.id, c));
      apiCourses.forEach((c) => merged.set(c.id, c));
      return Array.from(merged.values());
    }
  } catch (err) {
    console.info('apiFetchCourses fallback to initial seed:', err);
  }
  return INITIAL_COURSES;
}

export async function apiFetchSections(): Promise<Section[]> {
  try {
    const res = await fetch(`${API_BASE}/api/sections`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const apiSections: Section[] = json.data.map((s: any) => ({
        id: s.id,
        courseId: s.course_id,
        no: String(s.section_number).padStart(2, '0'),
        capacity: Number(s.capacity) || 40,
        base: Number(s.enrolled_count) || 0,
      }));
      const merged = new Map<string, Section>();
      INITIAL_SECTIONS.forEach((s) => merged.set(s.id, s));
      apiSections.forEach((s) => merged.set(s.id, s));
      return Array.from(merged.values());
    }
  } catch (err) {
    console.info('apiFetchSections fallback to initial seed:', err);
  }
  return INITIAL_SECTIONS;
}

export async function apiFetchEnrollments(): Promise<Enrollment[]> {
  try {
    const res = await fetch(`${API_BASE}/api/enrollments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const apiEnrollments: Enrollment[] = json.data.map((e: any) => ({
        id: e.id,
        student: e.student_id,
        section: e.section_id,
        status: e.status === 'enrolled' ? 'enrolled' : 'dropped',
      }));
      const merged = new Map<string, Enrollment>();
      INITIAL_ENROLLMENTS.forEach((e) => merged.set(`${e.student}_${e.section}`, e));
      apiEnrollments.forEach((e) => merged.set(`${e.student}_${e.section}`, e));
      return Array.from(merged.values());
    }
  } catch (err) {
    console.info('apiFetchEnrollments fallback to initial seed:', err);
  }
  return INITIAL_ENROLLMENTS;
}

export async function apiFetchUsers(): Promise<Record<string, User>> {
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const usersMap: Record<string, User> = { ...DEMO_USERS };
      for (const u of json.data) {
        usersMap[u.id] = {
          id: u.id,
          name: u.name,
          role: u.role === 'staff' ? 'staff' : 'student',
          department: u.department || 'วิทยาการคอมพิวเตอร์',
          initials: u.name.slice(0, 2),
        };
      }
      return usersMap;
    }
  } catch (err) {
    console.info('apiFetchUsers fallback to initial seed:', err);
  }
  return DEMO_USERS;
}

export async function apiCheckConflict(params: {
  section_id: string;
  room_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/conflicts/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err) {
    console.warn('apiCheckConflict network error:', err);
    return null;
  }
}

export async function apiAiSuggest(params: {
  course_id?: string;
  section_id?: string;
  room_id?: string;
  preferred_day?: string;
  notes?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/conflicts/ai-suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err) {
    console.warn('apiAiSuggest network error:', err);
    return null;
  }
}

export async function apiSyncTeam03() {
  try {
    const res = await fetch(`${API_BASE}/api/sync/team03`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err) {
    console.warn('apiSyncTeam03 network error:', err);
    return null;
  }
}
