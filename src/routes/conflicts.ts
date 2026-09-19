import { Hono } from 'hono';
import { Bindings, D1Database, Room, Section } from '../types';

const conflicts = new Hono<{ Bindings: Bindings }>();

const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// POST /api/conflicts/check - Pre-check schedule conflict and room capacity (API-06, FR-07, FR-08)
conflicts.post('/check', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<{
    room_id: string;
    section_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    exclude_meeting_id?: string;
  }>();

  const { room_id, section_id, day_of_week, start_time, end_time, exclude_meeting_id } = body;

  if (!room_id || !section_id || !day_of_week || !start_time || !end_time) {
    return c.json({
      success: false,
      error: 'Missing required parameters: room_id, section_id, day_of_week, start_time, end_time.'
    }, 400);
  }

  if (start_time >= end_time) {
    return c.json({
      success: false,
      conflict: true,
      reason: `Validation error: start_time (${start_time}) must be earlier than end_time (${end_time}).`
    }, 400);
  }

  // Check Room & Section
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(room_id).first<Room>();
  if (!room) {
    return c.json({ success: false, error: 'Room not found' }, 404);
  }

  const section = await db.prepare('SELECT * FROM sections WHERE id = ?').bind(section_id).first<Section>();
  if (!section) {
    return c.json({ success: false, error: 'Section not found' }, 404);
  }

  // 1. Capacity conflict check (BR-02)
  if (section.capacity > room.capacity) {
    return c.json({
      success: true,
      has_conflict: true,
      conflict_type: 'CAPACITY_OVERFLOW',
      reason: `Capacity Conflict: Section requires ${section.capacity} seats, but Room '${room.name}' only accommodates ${room.capacity}.`,
      details: {
        section_capacity: section.capacity,
        room_capacity: room.capacity
      }
    });
  }

  // 2. Overlap conflict check (BR-01)
  let overlapQuery = `
    SELECT 
      m.id AS meeting_id,
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
  `;
  const params: any[] = [room_id, day_of_week, end_time, start_time];

  if (exclude_meeting_id) {
    overlapQuery += ' AND m.id != ?';
    params.push(exclude_meeting_id);
  }

  const conflicting = await db.prepare(overlapQuery).bind(...params).first<any>();

  if (conflicting) {
    // Deterministic Scan Fallback (BR-05 / FR-08): Find available slots in this room on the same day
    const standardSlots = [
      { start: '08:00', end: '10:00' },
      { start: '10:00', end: '12:00' },
      { start: '13:00', end: '15:00' },
      { start: '15:00', end: '17:00' },
      { start: '17:00', end: '19:00' }
    ];

    const dayMeetings = await db
      .prepare('SELECT start_time, end_time FROM meetings WHERE room_id = ? AND day_of_week = ? AND status = "active"')
      .bind(room_id, day_of_week)
      .all<any>();

    const suggestedSlots = standardSlots.filter((slot) => {
      // Check if slot collides with any meeting
      return !dayMeetings.results.some((m: any) => slot.start < m.end_time && slot.end > m.start_time);
    });

    return c.json({
      success: true,
      has_conflict: true,
      conflict_type: 'SCHEDULE_OVERLAP',
      reason: `Schedule Conflict: Room '${room.name}' is already occupied from ${conflicting.start_time} to ${conflicting.end_time} by ${conflicting.course_code} (Sec ${conflicting.section_number}).`,
      conflicting_meeting: conflicting,
      suggested_available_slots: suggestedSlots
    });
  }

  // No conflict
  return c.json({
    success: true,
    has_conflict: false,
    message: `Slot is completely available in Room '${room.name}' on ${day_of_week} from ${start_time} to ${end_time}.`
  });
});

export default conflicts;
