-- Cloudflare D1 Schema Migration: 0001_initial_schema.sql
-- Project: Identity & Academic Core - Timetable & Room (Team 4)

-- Enable foreign key support in SQLite/D1
PRAGMA foreign_keys = ON;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('student', 'staff')),
    department TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    building TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity > 0),
    room_type TEXT NOT NULL DEFAULT 'lecture' CHECK(room_type IN ('lecture', 'lab', 'seminar')),
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance', 'inactive')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    course_code TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    department TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3 CHECK(credits > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Sections Table
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_number INTEGER NOT NULL CHECK(section_number > 0),
    capacity INTEGER NOT NULL CHECK(capacity > 0),
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK(enrolled_count >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(course_id, section_number, semester, academic_year)
);

-- 5. Meetings Table (Class Schedule)
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TEXT NOT NULL, -- HH:MM format e.g. '09:00'
    end_time TEXT NOT NULL,   -- HH:MM format e.g. '11:00'
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK(start_time < end_time)
);

-- 6. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'dropped')),
    enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, section_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_room_day_time ON meetings(room_id, day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_meetings_section ON meetings(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
