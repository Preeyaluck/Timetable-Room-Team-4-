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

// POST /api/enrollments/event - Inbound event API-07: enrollment.changed (FR-09, FR-11 & Idempotent Event Replay)
enrollments.post('/event', async (c) => {
  const db = getDb(c);
  const event = await c.req.json<{
    event_id?: string;
    event_name: string;
    student_id: string;
    section_id: string;
    action: 'enrolled' | 'dropped' | 'withdrawn';
    timestamp?: string;
  }>();

  if (event.event_name !== 'enrollment.changed') {
    return c.json({ success: false, error: "Expected event_name 'enrollment.changed'" }, 400);
  }

  if (!event.student_id || !event.section_id || !event.action) {
    return c.json({
      success: false,
      error: 'Missing required fields: student_id, section_id, action.'
    }, 400);
  }

  const enrollmentId = `enr_${event.student_id}_${event.section_id}`;
  const isEnrolled = event.action === 'enrolled';

  try {
    // Idempotent UPSERT into enrollments table
    if (isEnrolled) {
      await db
        .prepare(
          `INSERT INTO enrollments (id, student_id, section_id, status)
           VALUES (?, ?, ?, 'enrolled')
           ON CONFLICT(student_id, section_id) DO UPDATE SET status = 'enrolled'`
        )
        .bind(enrollmentId, event.student_id, event.section_id)
        .run();
    } else {
      await db
        .prepare('UPDATE enrollments SET status = ? WHERE student_id = ? AND section_id = ?')
        .bind(event.action, event.student_id, event.section_id)
        .run();
    }

    // Idempotent recalculation of enrolled_count based on actual active enrolled rows
    await db
      .prepare(
        `UPDATE sections 
         SET enrolled_count = (SELECT COUNT(*) FROM enrollments WHERE section_id = ? AND status = 'enrolled')
         WHERE id = ?`
      )
      .bind(event.section_id, event.section_id)
      .run();

    // FR-11: Recalculate room capacity violations
    const check = await db
      .prepare(
        `SELECT s.id AS section_id, s.enrolled_count, s.capacity AS section_capacity, r.name AS room_name, r.capacity AS room_capacity
         FROM sections s
         LEFT JOIN meetings m ON s.id = m.section_id
         LEFT JOIN rooms r ON m.room_id = r.id
         WHERE s.id = ?`
      )
      .bind(event.section_id)
      .first<any>();

    let alert = null;
    if (check && check.room_capacity && check.enrolled_count > check.room_capacity) {
      alert = `WARNING: Section enrolled count (${check.enrolled_count}) exceeds assigned Room '${check.room_name}' capacity (${check.room_capacity}).`;
    }

    return c.json({
      success: true,
      idempotent: true,
      event_id: event.event_id || null,
      message: 'Processed enrollment.changed event idempotently and recomputed schedule capacity.',
      current_status: check,
      alert
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default enrollments;
