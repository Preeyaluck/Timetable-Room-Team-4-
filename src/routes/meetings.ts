import { Hono } from 'hono';
import { Bindings, D1Database, Meeting, Room, Section } from '../types';

const meetings = new Hono<{ Bindings: Bindings }>();

const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// 1. GET /api/meetings - List meetings with rich relational details
meetings.get('/', async (c) => {
  const db = getDb(c);
  const { room_id, day_of_week, status } = c.req.query();

  let query = `
    SELECT 
      m.id,
      m.day_of_week,
      m.start_time,
      m.end_time,
      m.status,
      m.created_at,
      r.id AS room_id,
      r.name AS room_name,
      r.building AS room_building,
      r.capacity AS room_capacity,
      s.id AS section_id,
      s.section_number,
      s.capacity AS section_capacity,
      c.id AS course_id,
      c.course_code,
      c.course_name,
      u.name AS created_by_name
    FROM meetings m
    JOIN rooms r ON m.room_id = r.id
    JOIN sections s ON m.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    LEFT JOIN users u ON m.created_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (room_id) {
    query += ' AND m.room_id = ?';
    params.push(room_id);
  }
  if (day_of_week) {
    query += ' AND m.day_of_week = ?';
    params.push(day_of_week);
  }
  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }

  query += `
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

  const { results } = await db.prepare(query).bind(...params).all();
  return c.json({ success: true, count: results.length, data: results });
});

// 2. GET /api/meetings/:id - Get specific meeting
meetings.get('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');

  const query = `
    SELECT 
      m.*,
      r.name AS room_name,
      r.capacity AS room_capacity,
      s.section_number,
      s.capacity AS section_capacity,
      c.course_code,
      c.course_name
    FROM meetings m
    JOIN rooms r ON m.room_id = r.id
    JOIN sections s ON m.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE m.id = ?
  `;

  const meeting = await db.prepare(query).bind(id).first();
  if (!meeting) {
    return c.json({ success: false, error: 'Meeting not found' }, 404);
  }

  return c.json({ success: true, data: meeting });
});

// 3. POST /api/meetings - Create meeting with BR-01 (Overlap Check) and BR-02 (Capacity Check)
meetings.post('/', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<Partial<Meeting>>();

  const { section_id, room_id, day_of_week, start_time, end_time, created_by } = body;

  // Validation: Required fields
  if (!section_id || !room_id || !day_of_week || !start_time || !end_time) {
    return c.json({
      success: false,
      error: 'Missing mandatory fields: section_id, room_id, day_of_week, start_time, end_time.'
    }, 400);
  }

  // Validation: Time format and order
  if (start_time >= end_time) {
    return c.json({
      success: false,
      error: `Invalid time range: start_time (${start_time}) must be earlier than end_time (${end_time}).`
    }, 400);
  }

  // Check Room Existence
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(room_id).first<Room>();
  if (!room) {
    return c.json({ success: false, error: `Room with ID '${room_id}' does not exist.` }, 404);
  }

  // Check Section Existence
  const section = await db.prepare('SELECT * FROM sections WHERE id = ?').bind(section_id).first<Section>();
  if (!section) {
    return c.json({ success: false, error: `Section with ID '${section_id}' does not exist.` }, 404);
  }

  // BR-02: Room Capacity Check
  if (section.capacity > room.capacity) {
    return c.json({
      success: false,
      error: `Capacity Conflict (BR-02): Section capacity (${section.capacity}) exceeds Room '${room.name}' capacity (${room.capacity}).`,
      details: {
        section_capacity: section.capacity,
        room_capacity: room.capacity,
        room_name: room.name
      }
    }, 400);
  }

  // BR-01: Time Overlap Conflict Check
  // Two intervals [s1, e1) and [s2, e2) overlap iff (s1 < e2) AND (e1 > s2)
  const overlapQuery = `
    SELECT 
      m.id,
      m.start_time,
      m.end_time,
      c.course_code,
      c.course_name,
      s.section_number
    FROM meetings m
    JOIN sections s ON m.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE m.room_id = ?
      AND m.day_of_week = ?
      AND m.status = 'active'
      AND m.start_time < ?
      AND m.end_time > ?
    LIMIT 1
  `;

  const conflicting = await db
    .prepare(overlapQuery)
    .bind(room_id, day_of_week, end_time, start_time)
    .first<any>();

  if (conflicting) {
    return c.json({
      success: false,
      error: `Schedule Conflict (BR-01): Room '${room.name}' is already booked on ${day_of_week} from ${conflicting.start_time} to ${conflicting.end_time} by ${conflicting.course_code} (Sec ${conflicting.section_number}).`,
      conflicting_meeting: conflicting
    }, 409);
  }

  // Generate ID and Insert Meeting
  const id = body.id || `mtg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const status = body.status || 'active';

  try {
    await db
      .prepare(
        `INSERT INTO meetings (id, section_id, room_id, day_of_week, start_time, end_time, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, section_id, room_id, day_of_week, start_time, end_time, status, created_by || null)
      .run();

    const created = await db
      .prepare(
        `SELECT m.*, r.name AS room_name, s.section_number, c.course_code, c.course_name
         FROM meetings m
         JOIN rooms r ON m.room_id = r.id
         JOIN sections s ON m.section_id = s.id
         JOIN courses c ON s.course_id = c.id
         WHERE m.id = ?`
      )
      .bind(id)
      .first();

    return c.json({
      success: true,
      message: 'Meeting created successfully. schedule.changed event dispatched.',
      data: created
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 4. PATCH /api/meetings/:id or PUT /api/meetings/:id - Update meeting
meetings.put('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  const body = await c.req.json<Partial<Meeting>>();

  const existing = await db.prepare('SELECT * FROM meetings WHERE id = ?').bind(id).first<Meeting>();
  if (!existing) {
    return c.json({ success: false, error: 'Meeting not found' }, 404);
  }

  const roomId = body.room_id ?? existing.room_id;
  const sectionId = body.section_id ?? existing.section_id;
  const dayOfWeek = body.day_of_week ?? existing.day_of_week;
  const startTime = body.start_time ?? existing.start_time;
  const endTime = body.end_time ?? existing.end_time;
  const status = body.status ?? existing.status;

  if (startTime >= endTime) {
    return c.json({
      success: false,
      error: `Invalid time range: start_time (${startTime}) must be earlier than end_time (${endTime}).`
    }, 400);
  }

  // Room & Capacity Check
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first<Room>();
  const section = await db.prepare('SELECT * FROM sections WHERE id = ?').bind(sectionId).first<Section>();
  if (!room || !section) {
    return c.json({ success: false, error: 'Specified room or section does not exist.' }, 404);
  }

  if (section.capacity > room.capacity) {
    return c.json({
      success: false,
      error: `Capacity Conflict (BR-02): Section capacity (${section.capacity}) exceeds Room '${room.name}' capacity (${room.capacity}).`
    }, 400);
  }

  // Overlap check (excluding self)
  const overlapQuery = `
    SELECT m.id, m.start_time, m.end_time, c.course_code, s.section_number
    FROM meetings m
    JOIN sections s ON m.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE m.room_id = ?
      AND m.day_of_week = ?
      AND m.status = 'active'
      AND m.id != ?
      AND m.start_time < ?
      AND m.end_time > ?
    LIMIT 1
  `;

  const conflicting = await db
    .prepare(overlapQuery)
    .bind(roomId, dayOfWeek, id, endTime, startTime)
    .first<any>();

  if (conflicting) {
    return c.json({
      success: false,
      error: `Schedule Conflict (BR-01): Room '${room.name}' is already booked on ${dayOfWeek} from ${conflicting.start_time} to ${conflicting.end_time} by ${conflicting.course_code}.`,
      conflicting_meeting: conflicting
    }, 409);
  }

  try {
    await db
      .prepare(
        `UPDATE meetings
         SET room_id = ?, section_id = ?, day_of_week = ?, start_time = ?, end_time = ?, status = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(roomId, sectionId, dayOfWeek, startTime, endTime, status, id)
      .run();

    const updated = await db
      .prepare(
        `SELECT m.*, r.name AS room_name, s.section_number, c.course_code, c.course_name
         FROM meetings m
         JOIN rooms r ON m.room_id = r.id
         JOIN sections s ON m.section_id = s.id
         JOIN courses c ON s.course_id = c.id
         WHERE m.id = ?`
      )
      .bind(id)
      .first();

    return c.json({
      success: true,
      message: 'Meeting updated successfully. schedule.changed event dispatched.',
      data: updated
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 5. DELETE /api/meetings/:id - Delete meeting
meetings.delete('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');

  const existing = await db.prepare('SELECT * FROM meetings WHERE id = ?').bind(id).first<Meeting>();
  if (!existing) {
    return c.json({ success: false, error: 'Meeting not found' }, 404);
  }

  await db.prepare('DELETE FROM meetings WHERE id = ?').bind(id).run();

  return c.json({
    success: true,
    message: `Meeting '${id}' deleted successfully. schedule.changed event dispatched.`
  });
});

export default meetings;
