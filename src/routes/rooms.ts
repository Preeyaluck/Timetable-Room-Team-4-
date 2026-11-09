import { Hono } from 'hono';
import { Bindings, D1Database, Room, RoomCatalogEntry } from '../types';

const rooms = new Hono<{ Bindings: Bindings }>();

// Helper to get DB instance
const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// 1. GET /api/rooms - List all rooms with optional filtering
rooms.get('/', async (c) => {
  const db = getDb(c);
  const { building, min_capacity, status } = c.req.query();

  let query = 'SELECT * FROM rooms WHERE 1=1';
  const params: any[] = [];

  if (building) {
    query += ' AND building = ?';
    params.push(building);
  }
  if (min_capacity) {
    query += ' AND capacity >= ?';
    params.push(parseInt(min_capacity, 10));
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY building ASC, name ASC';

  const { results } = await db.prepare(query).bind(...params).all<Room>();
  return c.json({
    success: true,
    count: results.length,
    data: results
  });
});

// 2. GET /api/rooms/catalog - List every imported CSV row
rooms.get('/catalog', async (c) => {
  const db = getDb(c);
  const { building_code, floor, room_id } = c.req.query();

  let query = 'SELECT * FROM room_catalog WHERE 1=1';
  const params: string[] = [];

  if (building_code) {
    query += ' AND building_code = ?';
    params.push(building_code);
  }
  if (floor) {
    query += ' AND floor = ?';
    params.push(floor);
  }
  if (room_id) {
    query += ' AND room_id = ?';
    params.push(room_id);
  }

  query += ' ORDER BY building_code ASC, floor ASC, room_id ASC, id ASC';

  const { results } = await db.prepare(query).bind(...params).all<RoomCatalogEntry>();
  return c.json({
    success: true,
    count: results.length,
    data: results
  });
});

// 3. GET /api/rooms/:id - Get a specific room
rooms.get('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first<Room>();

  if (!room) {
    return c.json({ success: false, error: 'Room not found' }, 404);
  }

  return c.json({ success: true, data: room });
});

// 3. GET /api/rooms/:id/schedule - Retrieve classroom usage schedule (API-02 / FR-02)
rooms.get('/:id/schedule', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');

  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first<Room>();
  if (!room) {
    return c.json({ success: false, error: 'Room not found' }, 404);
  }

  const query = `
    SELECT 
      m.id AS meeting_id,
      m.day_of_week,
      m.start_time,
      m.end_time,
      m.status AS meeting_status,
      s.id AS section_id,
      s.section_number,
      c.course_code,
      c.course_name,
      c.department
    FROM meetings m
    JOIN sections s ON m.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE m.room_id = ? AND m.status = 'active'
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

  const { results } = await db.prepare(query).bind(id).all();

  return c.json({
    success: true,
    room,
    schedule: results
  });
});

// 4. POST /api/rooms - Create a new room
rooms.post('/', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<Partial<Room>>();

  if (!body.name || !body.building || !body.capacity) {
    return c.json({
      success: false,
      error: 'Missing required fields: name, building, and capacity are mandatory.'
    }, 400);
  }

  if (body.capacity <= 0) {
    return c.json({ success: false, error: 'Capacity must be greater than 0.' }, 400);
  }

  const id = body.id || `rm_${body.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const roomType = body.room_type || 'lecture';
  const status = body.status || 'available';

  try {
    await db
      .prepare(
        'INSERT INTO rooms (id, name, building, capacity, room_type, status) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(id, body.name, body.building, body.capacity, roomType, status)
      .run();

    const created = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first<Room>();
    return c.json({ success: true, message: 'Room created successfully', data: created }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: `Room with name '${body.name}' already exists.` }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 5. PUT /api/rooms/:id - Update an existing room
rooms.put('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  const body = await c.req.json<Partial<Room>>();

  const existing = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first<Room>();
  if (!existing) {
    return c.json({ success: false, error: 'Room not found' }, 404);
  }

  const name = body.name ?? existing.name;
  const building = body.building ?? existing.building;
  const capacity = body.capacity ?? existing.capacity;
  const roomType = body.room_type ?? existing.room_type;
  const status = body.status ?? existing.status;

  if (capacity <= 0) {
    return c.json({ success: false, error: 'Capacity must be greater than 0.' }, 400);
  }

  try {
    await db
      .prepare(
        'UPDATE rooms SET name = ?, building = ?, capacity = ?, room_type = ?, status = ? WHERE id = ?'
      )
      .bind(name, building, capacity, roomType, status, id)
      .run();

    const updated = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first<Room>();
    return c.json({ success: true, message: 'Room updated successfully', data: updated });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: `Room with name '${name}' already exists.` }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 6. DELETE /api/rooms/:id - Delete a room (checks for active meetings)
rooms.delete('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');

  const existing = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(id).first<Room>();
  if (!existing) {
    return c.json({ success: false, error: 'Room not found' }, 404);
  }

  // Check if room is linked to any active meetings
  const activeMeeting = await db
    .prepare("SELECT id FROM meetings WHERE room_id = ? AND status = 'active' LIMIT 1")
    .bind(id)
    .first();

  if (activeMeeting) {
    return c.json({
      success: false,
      error: 'Cannot delete room: active meetings are currently scheduled in this room. Please reassign or delete the meetings first.'
    }, 409);
  }

  await db.prepare('DELETE FROM rooms WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: `Room '${existing.name}' deleted successfully.` });
});

export default rooms;
