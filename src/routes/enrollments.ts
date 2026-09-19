import { Hono } from 'hono';
import { Bindings, D1Database, Enrollment } from '../types';

const enrollments = new Hono<{ Bindings: Bindings }>();

const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// GET /api/enrollments - List enrollments
enrollments.get('/', async (c) => {
  const db = getDb(c);
  const { student_id, section_id } = c.req.query();

  let query = `
    SELECT 
      e.*,
      u.name AS student_name,
      u.email AS student_email,
      c.course_code,
      c.course_name,
      s.section_number
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    JOIN sections s ON e.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (student_id) {
    query += ' AND e.student_id = ?';
    params.push(student_id);
  }
  if (section_id) {
    query += ' AND e.section_id = ?';
    params.push(section_id);
  }

  const { results } = await db.prepare(query).bind(...params).all();
  return c.json({ success: true, count: results.length, data: results });
});

// POST /api/enrollments - Enroll student
enrollments.post('/', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<Partial<Enrollment>>();

  const { student_id, section_id } = body;
  if (!student_id || !section_id) {
    return c.json({ success: false, error: 'Missing student_id or section_id.' }, 400);
  }

  const id = body.id || `enr_${student_id}_${section_id}`;
  const status = body.status || 'enrolled';

  try {
    // Atomic insert & update section count
    await db.batch([
      db
        .prepare('INSERT INTO enrollments (id, student_id, section_id, status) VALUES (?, ?, ?, ?)')
        .bind(id, student_id, section_id, status),
      db
        .prepare('UPDATE sections SET enrolled_count = enrolled_count + 1 WHERE id = ?')
        .bind(section_id)
    ]);

    return c.json({
      success: true,
      message: 'Enrollment completed successfully.',
      enrollment: { id, student_id, section_id, status }
    }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'Student is already enrolled in this section.' }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/enrollments/event - Inbound event API-07: enrollment.changed (FR-09 & FR-11)
enrollments.post('/event', async (c) => {
  const db = getDb(c);
  const event = await c.req.json<{
    event_name: string;
    student_id: string;
    section_id: string;
    action: 'enrolled' | 'dropped';
    timestamp: string;
  }>();

  if (event.event_name !== 'enrollment.changed') {
    return c.json({ success: false, error: "Expected event_name 'enrollment.changed'" }, 400);
  }

  // Update enrollment state and re-check capacity
  const countChange = event.action === 'enrolled' ? 1 : -1;
  await db
    .prepare('UPDATE sections SET enrolled_count = MAX(0, enrolled_count + ?) WHERE id = ?')
    .bind(countChange, event.section_id)
    .run();

  // FR-11: Recalculate room capacity violations
  const check = await db
    .prepare(
      `SELECT s.id AS section_id, s.enrolled_count, s.capacity, r.name AS room_name, r.capacity AS room_capacity
       FROM sections s
       LEFT JOIN meetings m ON s.id = m.section_id
       LEFT JOIN rooms r ON m.room_id = r.id
       WHERE s.id = ?`
    )
    .bind(event.section_id)
    .first<any>();

  let alert = null;
  if (check && check.room_capacity && check.enrolled_count > check.room_capacity) {
    alert = `WARNING: Section enrolled count (${check.enrolled_count}) now exceeds assigned Room '${check.room_name}' capacity (${check.room_capacity}).`;
  }

  return c.json({
    success: true,
    message: 'Processed enrollment.changed event and recomputed schedule capacity checks.',
    current_status: check,
    alert
  });
});

export default enrollments;
