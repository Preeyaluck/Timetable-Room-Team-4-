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
    // Search alternative available rooms on the same day and time
    const altRoomsQuery = `
      SELECT r.id, r.name, r.building, r.capacity, r.room_type
      FROM rooms r
      WHERE r.capacity >= ?
        AND r.status = 'available'
        AND r.id != ?
        AND NOT EXISTS (
          SELECT 1 FROM meetings m
          WHERE m.room_id = r.id
            AND m.day_of_week = ?
            AND m.status = 'active'
            AND m.start_time < ?
            AND m.end_time > ?
        )
      ORDER BY r.capacity ASC
      LIMIT 3
    `;
    const altRooms = await db.prepare(altRoomsQuery)
      .bind(section.capacity, room_id, day_of_week, end_time, start_time)
      .all<any>();

    let aiRecommendation: string | null = null;
    if (c.env.AI) {
      try {
        const altNames = altRooms.results.map((r: any) => `${r.name} (${r.capacity} seats)`).join(', ');
        const prompt = `A capacity conflict occurred at Mae Fah Luang University:
Section '${section.id}' requires ${section.capacity} seats, but Room '${room.name}' has only ${room.capacity} seats.
Alternative available rooms on ${day_of_week} at ${start_time}-${end_time}: ${altNames || 'None available'}.
Provide a brief, 2-sentence scheduling advice for the Room Planner.`;

        const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are an intelligent university timetable and room allocation advisor. Keep your responses concise (under 50 words) and actionable.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 100
        });
        aiRecommendation = aiResponse?.response?.trim() || null;
      } catch (err: any) {
        console.warn('Workers AI capacity advice failed, falling back to deterministic recommendations:', err.message);
      }
    }

    return c.json({
      success: true,
      has_conflict: true,
      conflict_type: 'CAPACITY_OVERFLOW',
      reason: `Capacity Conflict (BR-02): Section requires ${section.capacity} seats, but Room '${room.name}' only accommodates ${room.capacity}.`,
      details: {
        section_capacity: section.capacity,
        room_capacity: room.capacity
      },
      suggested_alternative_rooms: altRooms.results,
      ai_recommendation: aiRecommendation
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
      return !dayMeetings.results.some((m: any) => slot.start < m.end_time && slot.end > m.start_time);
    });

    let aiRecommendation: string | null = null;
    if (c.env.AI) {
      try {
        const slotsStr = suggestedSlots.map((s) => `${s.start}-${s.end}`).join(', ');
        const prompt = `A schedule conflict occurred at Mae Fah Luang University:
Room '${room.name}' on ${day_of_week} is already occupied by ${conflicting.course_code} (Sec ${conflicting.section_number}) from ${conflicting.start_time} to ${conflicting.end_time}.
The requested booking was for ${start_time} to ${end_time}.
Available alternative standard slots on ${day_of_week} in this room are: ${slotsStr || 'None on this day'}.
Give a clear, 2-sentence recommendation to the staff room planner on which slot to choose or what action to take.`;

        const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are an academic timetable advisor. Keep advice concise, professional, and practical (under 50 words).' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 120
        });
        aiRecommendation = aiResponse?.response?.trim() || null;
      } catch (err: any) {
        console.warn('Workers AI schedule advice failed, falling back to deterministic scan (BR-05):', err.message);
      }
    }

    return c.json({
      success: true,
      has_conflict: true,
      conflict_type: 'SCHEDULE_OVERLAP',
      reason: `Schedule Conflict (BR-01): Room '${room.name}' is already occupied from ${conflicting.start_time} to ${conflicting.end_time} by ${conflicting.course_code} (Sec ${conflicting.section_number}).`,
      conflicting_meeting: conflicting,
      suggested_available_slots: suggestedSlots,
      ai_recommendation: aiRecommendation,
      fallback_used: !aiRecommendation
    });
  }

  // No conflict
  return c.json({
    success: true,
    has_conflict: false,
    message: `Slot is completely available in Room '${room.name}' on ${day_of_week} from ${start_time} to ${end_time}.`
  });
});

// POST /api/conflicts/ai-suggest - Dedicated AI Assistant for Timetable Optimization
conflicts.post('/ai-suggest', async (c) => {
  const db = getDb(c);
  const { course_id, section_id, room_id, preferred_day, notes } = await c.req.json<{
    course_id?: string;
    section_id?: string;
    room_id?: string;
    preferred_day?: string;
    notes?: string;
  }>();

  // Find room and meetings
  const targetRoom = room_id
    ? await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(room_id).first<Room>()
    : await db.prepare('SELECT * FROM rooms WHERE status = "available" ORDER BY capacity ASC LIMIT 1').first<Room>();

  const day = preferred_day || 'Monday';
  const existingMeetings = await db
    .prepare('SELECT m.*, c.course_code FROM meetings m JOIN sections s ON m.section_id = s.id JOIN courses c ON s.course_id = c.id WHERE m.room_id = ? AND m.day_of_week = ? AND m.status = "active"')
    .bind(targetRoom?.id || 'rm_c1_101', day)
    .all<any>();

  const scheduleSummary = existingMeetings.results
    .map((m: any) => `${m.course_code}: ${m.start_time}-${m.end_time}`)
    .join(', ') || 'No existing classes';

  let suggestion = `Recommended slot for Room ${targetRoom?.name || 'Selected Room'} on ${day}: 13:00 - 15:00 based on standard academic schedule.`;

  if (c.env.AI) {
    try {
      const prompt = `You are an academic scheduling expert for Mae Fah Luang University.
Target Room: ${targetRoom?.name} (Capacity: ${targetRoom?.capacity}, Type: ${targetRoom?.room_type})
Day: ${day}
Current classes booked: ${scheduleSummary}
Planner notes/preferences: ${notes || 'Standard 2-hour lecture slot'}

Recommend the single best 2-hour slot for a new class section and explain why in 2 concise sentences.`;

      const aiRes = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are an expert academic timetable planner. Be concise and actionable.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 120
      });
      if (aiRes?.response) {
        suggestion = aiRes.response.trim();
      }
    } catch (e: any) {
      console.warn('AI suggestion fallback:', e.message);
    }
  }

  return c.json({
    success: true,
    room: targetRoom,
    day,
    occupied_slots: existingMeetings.results,
    ai_suggestion: suggestion
  });
});

export default conflicts;
