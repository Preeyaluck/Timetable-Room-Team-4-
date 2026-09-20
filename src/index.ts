import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';
import rooms from './routes/rooms';
import meetings from './routes/meetings';
import sections from './routes/sections';
import timetables from './routes/timetables';
import conflicts from './routes/conflicts';
import users from './routes/users';
import enrollments from './routes/enrollments';

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all origins
app.use('*', cors());

// Root Endpoint - System Documentation and Overview
app.get('/', (c) => {
  return c.json({
    project: 'Identity & Academic Core - Timetable & Room',
    team: 'Team 4',
    database: 'Cloudflare D1 (Serverless Relational SQL / SQLite)',
    architecture: 'Cloudflare Workers + Hono + Cloudflare D1',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      rooms: {
        list: 'GET /api/rooms',
        detail: 'GET /api/rooms/:id',
        schedule: 'GET /api/rooms/:id/schedule',
        create: 'POST /api/rooms',
        update: 'PUT /api/rooms/:id',
        delete: 'DELETE /api/rooms/:id'
      },
      meetings: {
        list: 'GET /api/meetings',
        detail: 'GET /api/meetings/:id',
        create: 'POST /api/meetings',
        update: 'PATCH /api/meetings/:id',
        delete: 'DELETE /api/meetings/:id'
      },
      timetables: {
        student_timetable: 'GET /api/timetables/me?student_id=usr_std_001'
      },
      conflicts: {
        check: 'POST /api/conflicts/check'
      },
      sections_and_courses: {
        list_sections: 'GET /api/sections',
        create_section: 'POST /api/sections',
        list_courses: 'GET /api/sections/courses/all',
        create_course: 'POST /api/sections/courses'
      },
      users: {
        list: 'GET /api/users',
        create: 'POST /api/users'
      },
      enrollments: {
        list: 'GET /api/enrollments',
        create: 'POST /api/enrollments',
        event_hook: 'POST /api/enrollments/event'
      }
    }
  });
});

// Health check endpoint
app.get('/health', async (c) => {
  const db = c.env.DB || c.env.timetable_room_db;
  try {
    const result = await db.prepare('SELECT 1 as healthy').first<{ healthy: number }>();
    return c.json({
      status: 'healthy',
      database_connected: result?.healthy === 1,
      edge_region: (c.req.raw as any)?.cf?.colo || 'local'
    });
  } catch (error: any) {
    return c.json({
      status: 'degraded',
      database_connected: false,
      error: error.message
    }, 500);
  }
});

// Mount modular sub-routers
app.route('/api/rooms', rooms);
app.route('/api/meetings', meetings);
app.route('/api/sections', sections);
app.route('/api/timetables', timetables);
app.route('/api/conflicts', conflicts);
app.route('/api/users', users);
app.route('/api/enrollments', enrollments);

// 404 Handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint Not Found',
    path: c.req.path
  }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('Unhandled Server Error:', err);
  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

export default app;
