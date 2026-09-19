-- Cloudflare D1 Seed Data Migration: 0002_seed_data.sql
-- Project: Identity & Academic Core - Timetable & Room (Team 4)

-- 1. Insert Users (Staff and Students)
INSERT OR IGNORE INTO users (id, name, email, role, department) VALUES
('usr_stf_001', 'Dr. Sarah Connor', 'sarah.c@mfu.ac.th', 'staff', 'Software Engineering'),
('usr_stf_002', 'Prof. John Matrix', 'john.m@mfu.ac.th', 'staff', 'Computer Engineering'),
('usr_std_001', 'Somchai Jaidee', '6731503001@lamduan.mfu.ac.th', 'student', 'Software Engineering'),
('usr_std_002', 'Preeyaluck Moonoi', '6731503021@lamduan.mfu.ac.th', 'student', 'Software Engineering'),
('usr_std_003', 'Anan Sukhum', '6731503055@lamduan.mfu.ac.th', 'student', 'Computer Engineering');

-- 2. Insert Rooms
INSERT OR IGNORE INTO rooms (id, name, building, capacity, room_type, status) VALUES
('rm_c1_101', 'C1-101', 'C1 Building', 60, 'lecture', 'available'),
('rm_c1_102', 'C1-102', 'C1 Building', 40, 'lecture', 'available'),
('rm_e3_205', 'E3-205', 'E3 Building', 80, 'lecture', 'available'),
('rm_s7_lab1', 'S7-Lab1', 'S7 Innovation Center', 35, 'lab', 'available'),
('rm_c2_aud1', 'C2-Auditorium', 'C2 Learning Complex', 150, 'seminar', 'available');

-- 3. Insert Courses
INSERT OR IGNORE INTO courses (id, course_code, course_name, department, credits) VALUES
('crs_swe204', 'SWE204', 'Database Systems & Cloud Computing', 'Software Engineering', 3),
('crs_swe312', 'SWE312', 'Software Architecture & Design', 'Software Engineering', 3),
('crs_cpe101', 'CPE101', 'Computer Programming Laboratory', 'Computer Engineering', 3),
('crs_gen101', 'GEN101', 'English for Academic Purposes', 'General Education', 3);

-- 4. Insert Sections
INSERT OR IGNORE INTO sections (id, course_id, section_number, capacity, semester, academic_year, enrolled_count) VALUES
('sec_swe204_01', 'crs_swe204', 1, 40, '1/2026', '2026', 2),
('sec_swe204_02', 'crs_swe204', 2, 40, '1/2026', '2026', 1),
('sec_swe312_01', 'crs_swe312', 1, 50, '1/2026', '2026', 2),
('sec_cpe101_01', 'crs_cpe101', 1, 30, '1/2026', '2026', 1);

-- 5. Insert Scheduled Meetings
INSERT OR IGNORE INTO meetings (id, section_id, room_id, day_of_week, start_time, end_time, status, created_by) VALUES
('mtg_001', 'sec_swe204_01', 'rm_c1_101', 'Monday', '09:00', '11:00', 'active', 'usr_stf_001'),
('mtg_002', 'sec_swe312_01', 'rm_e3_205', 'Monday', '13:00', '15:00', 'active', 'usr_stf_001'),
('mtg_003', 'sec_cpe101_01', 'rm_s7_lab1', 'Tuesday', '10:00', '12:00', 'active', 'usr_stf_002'),
('mtg_004', 'sec_swe204_02', 'rm_c1_102', 'Wednesday', '13:00', '15:00', 'active', 'usr_stf_001');

-- 6. Insert Student Enrollments
INSERT OR IGNORE INTO enrollments (id, student_id, section_id, status) VALUES
('enr_001', 'usr_std_001', 'sec_swe204_01', 'enrolled'),
('enr_002', 'usr_std_001', 'sec_swe312_01', 'enrolled'),
('enr_003', 'usr_std_002', 'sec_swe204_01', 'enrolled'),
('enr_004', 'usr_std_002', 'sec_swe312_01', 'enrolled'),
('enr_005', 'usr_std_003', 'sec_cpe101_01', 'enrolled');
