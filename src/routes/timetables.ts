import { Hono } from 'hono';
import { Bindings, D1Database, User } from '../types';

const timetables = new Hono<{ Bindings: Bindings }>();

const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// GET /api/timetables/me - Retrieve student personal timetable (API-01, FR-01, FR-03)
timetables.get('/me', async (c) => {
  const db = getDb(c);

  // Student identifier can come from query param ?student_id=... or header X-User-Id / Authorization
  const studentId = c.req.query('student_id') || c.req.header('X-User-Id') || 'usr_std_001';

  // Verify student exists
  const student = await db.prepare('SELECT id, name, email, role, department FROM users WHERE id = ?').bind(studentId).first<User>();
  if (!student) {
    return c.json({ success: false, error: `Student with ID '${studentId}' not found.` }, 404);
  }

  // Fetch all meetings for sections this student is actively enrolled in
  const query = `
    SELECT 
      m.id AS meeting_id,
      m.day_of_week,
      m.start_time,
      m.end_time,
      m.status AS meeting_status,
      c.course_code,
      c.course_name,
      c.credits,
      s.id AS section_id,
      s.section_number,
      s.semester,
      s.academic_year,
      r.id AS room_id,
      r.name AS room_name,
      r.building AS room_building,
      e.status AS enrollment_status
    FROM enrollments e
    JOIN sections s ON e.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    JOIN meetings m ON s.id = m.section_id
    JOIN rooms r ON m.room_id = r.id
    WHERE e.student_id = ?
      AND e.status = 'enrolled'
      AND m.status = 'active'
    ORDER BY 
      CASE m.day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END,
      m.start_time ASC
  `;

  const { results } = await db.prepare(query).bind(studentId).all<any>();

  // Check for conflicts within the student's own schedule (FR-03)
  const conflicts: any[] = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      if (a.day_of_week === b.day_of_week) {
        if (a.start_time < b.end_time && a.end_time > b.start_time) {
          conflicts.push({
            day_of_week: a.day_of_week,
            conflict_between: [
              { meeting_id: a.meeting_id, course: a.course_code, time: `${a.start_time}-${a.end_time}`, room: a.room_name },
              { meeting_id: b.meeting_id, course: b.course_code, time: `${b.start_time}-${b.end_time}`, room: b.room_name }
            ],
            message: `Time overlap detected between ${a.course_code} and ${b.course_code} on ${a.day_of_week}.`
          });
        }
      }
    }
  }

  return c.json({
    success: true,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      department: student.department
    },
    total_classes: results.length,
    has_conflicts: conflicts.length > 0,
    conflicts,
    timetable: results
  });
});

export default timetables;
