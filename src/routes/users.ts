import { Hono } from 'hono';
import { Bindings, D1Database, User } from '../types';

const users = new Hono<{ Bindings: Bindings }>();

const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// GET /api/users - List users
users.get('/', async (c) => {
  const db = getDb(c);
  const { role } = c.req.query();

  let query = 'SELECT id, name, email, role, department, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  query += ' ORDER BY name ASC';
  const { results } = await db.prepare(query).bind(...params).all<User>();
  return c.json({ success: true, count: results.length, data: results });
});

// GET /api/users/:id
users.get('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  const user = await db.prepare('SELECT id, name, email, role, department, created_at FROM users WHERE id = ?').bind(id).first<User>();

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }
  return c.json({ success: true, data: user });
});

// POST /api/users - Create user
users.post('/', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<Partial<User>>();

  if (!body.name || !body.email || !body.role) {
    return c.json({ success: false, error: 'Missing name, email, or role.' }, 400);
  }

  const id = body.id || `usr_${Date.now()}`;
  try {
    await db
      .prepare('INSERT INTO users (id, name, email, role, department) VALUES (?, ?, ?, ?, ?)')
      .bind(id, body.name, body.email, body.role, body.department || null)
      .run();

    const created = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
    return c.json({ success: true, message: 'User created successfully', data: created }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: `Email '${body.email}' is already registered.` }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default users;
