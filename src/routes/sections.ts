import { Hono } from 'hono';
import { Bindings, Course, D1Database, Section } from '../types';

const sections = new Hono<{ Bindings: Bindings }>();

const getDb = (c: any): D1Database => c.env.DB || c.env.timetable_room_db;

// 1. GET /api/sections - List sections with course details
sections.get('/', async (c) => {
  const db = getDb(c);
  const { course_id, semester } = c.req.query();

  let query = `
    SELECT 
      s.id,
      s.course_id,
      s.section_number,
      s.capacity,
      s.semester,
      s.academic_year,
      s.enrolled_count,
      s.created_at,
      c.course_code,
      c.course_name,
      c.department,
      c.credits
    FROM sections s
    JOIN courses c ON s.course_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (course_id) {
    query += ' AND s.course_id = ?';
    params.push(course_id);
  }
  if (semester) {
    query += ' AND s.semester = ?';
    params.push(semester);
  }

  query += ' ORDER BY c.course_code ASC, s.section_number ASC';

  const { results } = await db.prepare(query).bind(...params).all();
  return c.json({ success: true, count: results.length, data: results });
});

// 2. GET /api/sections/:id - Get section details
sections.get('/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');

  const query = `
    SELECT 
      s.*,
      c.course_code,
      c.course_name,
      c.department,
      c.credits
    FROM sections s
    JOIN courses c ON s.course_id = c.id
    WHERE s.id = ?
  `;

  const section = await db.prepare(query).bind(id).first();
  if (!section) {
    return c.json({ success: false, error: 'Section not found' }, 404);
  }

  return c.json({ success: true, data: section });
});

// 3. POST /api/sections - Create section
sections.post('/', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<Partial<Section>>();

  const { course_id, section_number, capacity, semester, academic_year } = body;
  if (!course_id || !section_number || !capacity || !semester || !academic_year) {
    return c.json({
      success: false,
      error: 'Missing mandatory fields: course_id, section_number, capacity, semester, academic_year.'
    }, 400);
  }

  const id = body.id || `sec_${course_id}_${section_number}`;

  try {
    await db
      .prepare(
        'INSERT INTO sections (id, course_id, section_number, capacity, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(id, course_id, section_number, capacity, semester, academic_year)
      .run();

    const created = await db.prepare('SELECT * FROM sections WHERE id = ?').bind(id).first<Section>();
    return c.json({ success: true, message: 'Section created successfully', data: created }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({
        success: false,
        error: `Section ${section_number} for course '${course_id}' already exists in ${semester} ${academic_year}.`
      }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 4. GET /api/sections/courses/all - List catalog courses
sections.get('/courses/all', async (c) => {
  const db = getDb(c);
  const { results } = await db.prepare('SELECT * FROM courses ORDER BY course_code ASC').all<Course>();
  return c.json({ success: true, count: results.length, data: results });
});

// 5. POST /api/sections/courses - Create course
sections.post('/courses', async (c) => {
  const db = getDb(c);
  const body = await c.req.json<Partial<Course>>();

  if (!body.course_code || !body.course_name || !body.department) {
    return c.json({
      success: false,
      error: 'Missing required fields: course_code, course_name, department.'
    }, 400);
  }

  const id = body.id || `crs_${body.course_code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const credits = body.credits || 3;

  try {
    await db
      .prepare('INSERT INTO courses (id, course_code, course_name, department, credits) VALUES (?, ?, ?, ?, ?)')
      .bind(id, body.course_code, body.course_name, body.department, credits)
      .run();

    const created = await db.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first<Course>();
    return c.json({ success: true, message: 'Course created successfully', data: created }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: `Course code '${body.course_code}' already exists.` }, 409);
    }
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default sections;
