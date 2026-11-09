import { Hono } from 'hono';
import { Bindings, D1Database } from '../types';

const sync = new Hono<{ Bindings: Bindings }>();

const TEAM03_BASE = 'https://unienroll-backend.team03-enrollment.workers.dev';
const PARTNER_KEY = 'partner-secret-key-2026';
const WEBHOOK_SECRET = 'whsec_partner_secret_2026';

function getDb(c: any): D1Database {
  return c.env.DB || c.env.timetable_room_db;
}

function parseSchedule(scheduleStr: string): { days: string[]; start: string; end: string } {
  if (!scheduleStr) {
    return { days: ['Monday'], start: '09:00', end: '11:00' };
  }
  const parts = scheduleStr.trim().split(/\s+/);
  const dayPart = parts[0] || 'MON';
  const timePart = parts[1] || '09:00-11:00';

  const dayMap: Record<string, string> = {
    MON: 'Monday',
    TUE: 'Tuesday',
    WED: 'Wednesday',
    THU: 'Thursday',
    FRI: 'Friday',
    SAT: 'Saturday',
    SUN: 'Sunday'
  };

  const days: string[] = [];
  dayPart.split('_').forEach((d) => {
    const mapped = dayMap[d.toUpperCase()];
    if (mapped) days.push(mapped);
  });
  if (days.length === 0) days.push('Monday');

  const [startRaw, endRaw] = timePart.split('-');
  const start = startRaw ? startRaw.trim().padStart(5, '0') : '09:00';
  const end = endRaw ? endRaw.trim().padStart(5, '0') : '11:00';

  return { days, start, end };
}

// 1. GET /api/sync/team03/preview - Preview live data from Team 03
sync.get('/team03/preview', async (c) => {
  try {
    const [sectionsRes, enrollmentsRes] = await Promise.all([
      fetch(`${TEAM03_BASE}/api/partner/sections`, {
        headers: { 'X-Partner-Key': PARTNER_KEY }
      }),
      fetch(`${TEAM03_BASE}/api/partner/enrollments`, {
        headers: { 'X-Partner-Key': PARTNER_KEY }
      })
    ]);

    if (!sectionsRes.ok || !enrollmentsRes.ok) {
      return c.json({
        success: false,
        error: 'Failed to fetch from Team 03 Partner API',
        sections_status: sectionsRes.status,
        enrollments_status: enrollmentsRes.status
      }, 502);
    }

    const sectionsData = (await sectionsRes.json()) as any;
    const enrollmentsData = (await enrollmentsRes.json()) as any;

    return c.json({
      success: true,
      provider: 'UniEnroll Team 03',
      total_sections: sectionsData.data?.length || 0,
      total_enrollments: enrollmentsData.data?.length || 0,
      sections: sectionsData.data || [],
      enrollments: enrollmentsData.data || []
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 2. POST /api/sync/team03 - Full Synchronization from Team 03 into D1 Database
sync.post('/team03', async (c) => {
  const db = getDb(c);

  try {
    const [sectionsRes, enrollmentsRes] = await Promise.all([
      fetch(`${TEAM03_BASE}/api/partner/sections`, {
        headers: { 'X-Partner-Key': PARTNER_KEY }
      }),
      fetch(`${TEAM03_BASE}/api/partner/enrollments`, {
        headers: { 'X-Partner-Key': PARTNER_KEY }
      })
    ]);

    if (!sectionsRes.ok || !enrollmentsRes.ok) {
      return c.json({
        success: false,
        error: 'Failed to fetch from Team 03 Partner API',
        sections_status: sectionsRes.status,
        enrollments_status: enrollmentsRes.status
      }, 502);
    }

    const sectionsJson = (await sectionsRes.json()) as any;
    const enrollmentsJson = (await enrollmentsRes.json()) as any;

    const sectionsList: any[] = sectionsJson.data || [];
    const enrollmentsList: any[] = enrollmentsJson.data || [];

    // 1. Fetch existing entities from D1 to map IDs safely and prevent foreign key conflicts
    const [existingCourses, existingRooms, existingSections] = await Promise.all([
      db.prepare('SELECT id, course_code FROM courses').all<{ id: string; course_code: string }>(),
      db.prepare('SELECT id, name FROM rooms').all<{ id: string; name: string }>(),
      db.prepare('SELECT id, course_id, section_number FROM sections').all<{ id: string; course_id: string; section_number: number }>()
    ]);

    const courseCodeToId = new Map<string, string>();
    for (const row of existingCourses.results || []) {
      courseCodeToId.set(row.course_code.toUpperCase(), row.id);
    }

    const roomNameToId = new Map<string, string>();
    for (const row of existingRooms.results || []) {
      roomNameToId.set(row.name.trim().toUpperCase(), row.id);
    }

    const sectionKeyToId = new Map<string, string>();
    for (const row of existingSections.results || []) {
      sectionKeyToId.set(`${row.course_id}__${row.section_number}`, row.id);
    }

    // Prepare arrays of statements executed sequentially by dependency layer
    const courseStmts: any[] = [];
    const roomStmts: any[] = [];
    const sectionStmts: any[] = [];
    const meetingStmts: any[] = [];
    const userStmts: any[] = [];
    const enrollmentStmts: any[] = [];

    const processedCourses = new Set<string>();
    const processedRooms = new Set<string>();
    const processedSections = new Set<string>();
    const processedUsers = new Set<string>();

    // Helper to ensure a course exists
    const ensureCourse = (code: string, title?: string, credits?: number) => {
      const upper = code.trim().toUpperCase();
      if (!upper) return null;
      let cId = courseCodeToId.get(upper);
      if (!cId) {
        cId = `crs_${upper.toLowerCase()}`;
        courseCodeToId.set(upper, cId);
      }
      if (!processedCourses.has(upper)) {
        processedCourses.add(upper);
        courseStmts.push(
          db.prepare(
            `INSERT INTO courses (id, course_code, course_name, department, credits)
             VALUES (?, ?, ?, 'Computer Science', ?)
             ON CONFLICT(id) DO UPDATE SET
               course_name = excluded.course_name,
               credits = excluded.credits`
          ).bind(cId, upper, (title || upper).trim(), credits || 3)
        );
      }
      return cId;
    };

    // Helper to ensure a room exists
    const ensureRoom = (name: string, maxCap?: number) => {
      const roomName = (name || 'CB2-301').trim();
      const upper = roomName.toUpperCase();
      let rId = roomNameToId.get(upper);
      if (!rId) {
        rId = `rm_${roomName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        roomNameToId.set(upper, rId);
      }
      if (!processedRooms.has(upper)) {
        processedRooms.add(upper);
        const buildingName = roomName.startsWith('CB') ? `Building ${roomName.split('-')[0]}` : 'Science & Tech Wing';
        const roomType = roomName.toLowerCase().includes('lab') ? 'lab' : 'lecture';
        const capacity = maxCap || 40;
        roomStmts.push(
          db.prepare(
            `INSERT INTO rooms (id, name, building, capacity, room_type, status)
             VALUES (?, ?, ?, ?, ?, 'available')
             ON CONFLICT(id) DO UPDATE SET
               capacity = MAX(capacity, excluded.capacity)`
          ).bind(rId, roomName, buildingName, capacity, roomType)
        );
      }
      return rId;
    };

    // Helper to ensure a section exists
    const ensureSection = (courseCode: string, secNum: number, capacity: number = 40, enrolledCount: number = 0) => {
      const cId = ensureCourse(courseCode);
      if (!cId) return null;

      const secKey = `${cId}__${secNum}`;
      let sId = sectionKeyToId.get(secKey);
      if (!sId) {
        sId = `sec_${courseCode.toLowerCase()}_${String(secNum).padStart(2, '0')}`;
        sectionKeyToId.set(secKey, sId);
      }

      if (!processedSections.has(sId)) {
        processedSections.add(sId);
        sectionStmts.push(
          db.prepare(
            `INSERT INTO sections (id, course_id, section_number, capacity, semester, academic_year, enrolled_count)
             VALUES (?, ?, ?, ?, '1', '2569', ?)
             ON CONFLICT(id) DO UPDATE SET
               capacity = excluded.capacity,
               enrolled_count = excluded.enrolled_count`
          ).bind(sId, cId, secNum, capacity, enrolledCount)
        );
      }
      return sId;
    };

    // Process all sections from Team 03
    for (const sec of sectionsList) {
      const courseCode = (sec.course_code || '').trim().toUpperCase();
      const courseTitle = (sec.course_title || courseCode).trim();
      const credits = Number(sec.credits) || 3;
      const capacity = Number(sec.max_capacity) || 40;
      const enrolledCount = Number(sec.enrolled_count) || 0;
      const roomName = (sec.room || 'CB2-301').trim();

      const secNumStr = String(sec.section_number || '1').replace(/\D/g, '');
      const secNum = parseInt(secNumStr, 10) || 1;

      ensureCourse(courseCode, courseTitle, credits);
      const roomId = ensureRoom(roomName, capacity);
      const sectionId = ensureSection(courseCode, secNum, capacity, enrolledCount);

      // Meetings (Schedules)
      if (sec.schedule && sectionId && roomId) {
        const { days, start, end } = parseSchedule(sec.schedule);
        for (const day of days) {
          const meetingId = `mtg_${sectionId}_${day.toLowerCase().slice(0, 3)}`;
          meetingStmts.push(
            db.prepare(
              `INSERT INTO meetings (id, section_id, room_id, day_of_week, start_time, end_time, status)
               VALUES (?, ?, ?, ?, ?, ?, 'active')
               ON CONFLICT(id) DO UPDATE SET
                 room_id = excluded.room_id,
                 day_of_week = excluded.day_of_week,
                 start_time = excluded.start_time,
                 end_time = excluded.end_time,
                 status = 'active'`
            ).bind(meetingId, sectionId, roomId, day, start, end)
          );
        }
      }
    }

    // Process all enrollments from Team 03
    for (const enr of enrollmentsList) {
      const studentCode = String(enr.student_code || '').trim();
      const studentName = (enr.student_name || `Student ${studentCode}`).trim();
      const studentEmail = (enr.student_email || `s${studentCode}@university.ac.th`).trim();
      const major = (enr.major || 'Software Engineering').trim();

      if (studentCode && !processedUsers.has(studentCode)) {
        processedUsers.add(studentCode);
        userStmts.push(
          db.prepare(
            `INSERT INTO users (id, name, email, role, department)
             VALUES (?, ?, ?, 'student', ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               email = excluded.email,
               department = excluded.department`
          ).bind(studentCode, studentName, studentEmail, major)
        );
      }

      const courseCode = (enr.course_code || '').trim().toUpperCase();
      const secNumStr = String(enr.section_number || '1').replace(/\D/g, '');
      const secNum = parseInt(secNumStr, 10) || 1;

      // Ensure course and section exist in case enrollment references a section not in sectionsList
      const sectionId = ensureSection(courseCode, secNum, 40, 1);
      if (studentCode && sectionId) {
        const enrollmentId = `enr_${studentCode}_${sectionId}`;
        const status = enr.status?.toUpperCase() === 'ENROLLED' ? 'enrolled' : 'dropped';

        enrollmentStmts.push(
          db.prepare(
            `INSERT INTO enrollments (id, student_id, section_id, status)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(student_id, section_id) DO UPDATE SET
               status = excluded.status`
          ).bind(enrollmentId, studentCode, sectionId, status)
        );
      }
    }

    // Execute in strict relational order with batching
    const BATCH_SIZE = 50;
    const runBatches = async (stmts: any[]) => {
      for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
        const chunk = stmts.slice(i, i + BATCH_SIZE);
        if (chunk.length > 0) {
          await db.batch(chunk);
        }
      }
    };

    // Step 1: Base entities (courses, rooms, users)
    await runBatches(courseStmts);
    await runBatches(roomStmts);
    await runBatches(userStmts);

    // Step 2: Dependent sections
    await runBatches(sectionStmts);

    // Step 3: Dependent meetings and enrollments
    await runBatches(meetingStmts);
    await runBatches(enrollmentStmts);

    // Step 4: Recalculate enrolled counts
    await db.prepare(
      `UPDATE sections
       SET enrolled_count = (
         SELECT COUNT(*) FROM enrollments WHERE enrollments.section_id = sections.id AND enrollments.status = 'enrolled'
       )`
    ).run();

    return c.json({
      success: true,
      message: 'Successfully synchronized data from UniEnroll Team 03',
      timestamp: new Date().toISOString(),
      synced_stats: {
        users: userStmts.length,
        courses: courseStmts.length,
        rooms: roomStmts.length,
        sections: sectionStmts.length,
        meetings: meetingStmts.length,
        enrollments: enrollmentStmts.length
      }
    });
  } catch (err: any) {
    console.error('Team 03 Sync Error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 3. POST /webhooks/incoming - Webhook receiver for Team 03 real-time events
sync.post('/incoming', async (c) => {
  return handleWebhook(c);
});
sync.post('/webhooks/incoming', async (c) => {
  return handleWebhook(c);
});

async function handleWebhook(c: any) {
  const secretHeader = c.req.header('X-Webhook-Secret');
  if (secretHeader && secretHeader !== WEBHOOK_SECRET) {
    return c.json({ success: false, error: 'Unauthorized webhook secret' }, 401);
  }

  const payload = await c.req.json<any>();
  const db = getDb(c);

  const studentCode = String(payload.student_code || payload.student_id || '').trim();
  const courseCode = String(payload.course_code || '').trim().toUpperCase();
  const secNumStr = String(payload.section_number || '1').replace(/\D/g, '');
  const secNum = parseInt(secNumStr, 10) || 1;
  const action = (payload.action || payload.status || 'enrolled').toLowerCase();
  const isEnrolled = action === 'enrolled';

  if (!studentCode || (!payload.section_id && !courseCode)) {
    return c.json({
      success: true,
      message: 'Webhook acknowledged (empty student or section)',
      received_payload: payload
    });
  }

  try {
    // 1. Ensure user exists
    const studentName = payload.student_name || `Student ${studentCode}`;
    const studentEmail = payload.student_email || `s${studentCode}@university.ac.th`;
    const major = payload.major || 'Software Engineering';

    await db.prepare(
      `INSERT INTO users (id, name, email, role, department)
       VALUES (?, ?, ?, 'student', ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         email = excluded.email`
    ).bind(studentCode, studentName, studentEmail, major).run();

    // 2. Resolve section_id
    let sectionId = payload.section_id;
    if (!sectionId && courseCode) {
      // Look up course id
      const courseRow = await db.prepare('SELECT id FROM courses WHERE course_code = ?').bind(courseCode).first<{ id: string }>();
      const courseId = courseRow ? courseRow.id : `crs_${courseCode.toLowerCase()}`;

      if (!courseRow) {
        await db.prepare(
          `INSERT INTO courses (id, course_code, course_name, department, credits)
           VALUES (?, ?, ?, 'Computer Science', 3)
           ON CONFLICT(id) DO NOTHING`
        ).bind(courseId, courseCode, courseCode).run();
      }

      // Look up section
      const secRow = await db.prepare('SELECT id FROM sections WHERE course_id = ? AND section_number = ?').bind(courseId, secNum).first<{ id: string }>();
      if (secRow) {
        sectionId = secRow.id;
      } else {
        sectionId = `sec_${courseCode.toLowerCase()}_${String(secNum).padStart(2, '0')}`;
        await db.prepare(
          `INSERT INTO sections (id, course_id, section_number, capacity, semester, academic_year, enrolled_count)
           VALUES (?, ?, ?, 40, '1', '2569', 0)
           ON CONFLICT(id) DO NOTHING`
        ).bind(sectionId, courseId, secNum).run();
      }
    }

    const enrollmentId = `enr_${studentCode}_${sectionId}`;

    if (isEnrolled) {
      await db.prepare(
        `INSERT INTO enrollments (id, student_id, section_id, status)
         VALUES (?, ?, ?, 'enrolled')
         ON CONFLICT(student_id, section_id) DO UPDATE SET status = 'enrolled'`
      ).bind(enrollmentId, studentCode, sectionId).run();
    } else {
      await db.prepare(
        `UPDATE enrollments SET status = ? WHERE student_id = ? AND section_id = ?`
      ).bind(action, studentCode, sectionId).run();
    }

    // Update section enrolled count
    await db.prepare(
      `UPDATE sections
       SET enrolled_count = (SELECT COUNT(*) FROM enrollments WHERE section_id = ? AND status = 'enrolled')
       WHERE id = ?`
    ).bind(sectionId, sectionId).run();

    return c.json({
      success: true,
      message: `Successfully processed enrollment webhook for student ${studentCode} (${action})`,
      student_id: studentCode,
      section_id: sectionId,
      status: action,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
}

export default sync;
