-- Cloudflare D1 Seed Data Migration: 0003_real_curriculum_seed.sql
-- Project: Timetable & Room - Team 4 (Matching UI Curriculum)

-- 1. Insert Users
INSERT OR REPLACE INTO users (id, name, email, role, department) VALUES
('69010042', 'ณัฐวุฒิ ใจดี', '69010042@lamduan.mfu.ac.th', 'student', 'วิทยาการคอมพิวเตอร์'),
('6731503021', 'Miss Preeyaluk Moolpom', '6731503021@lamduan.mfu.ac.th', 'student', 'Software Engineering'),
('usr_stf_001', 'พิมพ์ชนก สุขใจ', 'pimchanok.s@mfu.ac.th', 'staff', 'เจ้าหน้าที่จัดตาราง');

-- 2. Insert Rooms (SC301, SC302, SC303, SC304)
INSERT OR REPLACE INTO rooms (id, name, building, capacity, room_type, status) VALUES
('rm_sc301', 'SC301', 'อาคารวิทยาศาสตร์', 50, 'lecture', 'available'),
('rm_sc302', 'SC302', 'อาคารวิทยาศาสตร์', 40, 'lecture', 'available'),
('rm_sc303', 'SC303', 'อาคารวิทยาศาสตร์', 32, 'lab', 'available'),
('rm_sc304', 'SC304', 'อาคารวิทยาศาสตร์', 60, 'lecture', 'available');

-- 3. Insert Courses
INSERT OR REPLACE INTO courses (id, course_code, course_name, department, credits) VALUES
('c_cs201', 'CS201', 'โครงสร้างข้อมูล', 'วิทยาการคอมพิวเตอร์', 3),
('c_cs202', 'CS202', 'ระบบฐานข้อมูล', 'วิทยาการคอมพิวเตอร์', 3),
('c_cs203', 'CS203', 'เครือข่ายคอมพิวเตอร์', 'วิทยาการคอมพิวเตอร์', 3),
('c_ma201', 'MA201', 'คณิตศาสตร์ไม่ต่อเนื่อง', 'คณิตศาสตร์และสถิติ', 3),
('c_ge101', 'GE101', 'ภาษาอังกฤษเพื่อการสื่อสาร', 'ศึกษาทั่วไป', 3),
('c_cs204', 'CS204', 'การพัฒนาเว็บ', 'วิทยาการคอมพิวเตอร์', 3),
('c_cs205', 'CS205', 'ระบบปฏิบัติการ', 'วิทยาการคอมพิวเตอร์', 3);

-- 4. Insert Sections
INSERT OR REPLACE INTO sections (id, course_id, section_number, capacity, semester, academic_year, enrolled_count) VALUES
('sec_cs201_01', 'c_cs201', 1, 50, '1/2569', '2569', 37),
('sec_cs201_02', 'c_cs201', 2, 60, '1/2569', '2569', 42),
('sec_cs202_01', 'c_cs202', 1, 40, '1/2569', '2569', 35),
('sec_cs203_01', 'c_cs203', 1, 32, '1/2569', '2569', 29),
('sec_cs203_02', 'c_cs203', 2, 32, '1/2569', '2569', 30),
('sec_ma201_01', 'c_ma201', 1, 60, '1/2569', '2569', 51),
('sec_ge101_03', 'c_ge101', 3, 60, '1/2569', '2569', 44),
('sec_cs204_01', 'c_cs204', 1, 32, '1/2569', '2569', 28),
('sec_cs204_02', 'c_cs204', 2, 32, '1/2569', '2569', 26),
('sec_cs205_01', 'c_cs205', 1, 32, '1/2569', '2569', 32);

-- 5. Insert Student Enrollments for 69010042 & 6731503021
INSERT OR REPLACE INTO enrollments (id, student_id, section_id, status) VALUES
('enr_cs201_std1', '69010042', 'sec_cs201_01', 'enrolled'),
('enr_cs202_std1', '69010042', 'sec_cs202_01', 'enrolled'),
('enr_cs203_std1', '69010042', 'sec_cs203_01', 'enrolled'),
('enr_ma201_std1', '69010042', 'sec_ma201_01', 'enrolled'),
('enr_ge101_std1', '69010042', 'sec_ge101_03', 'enrolled'),
('enr_cs201_std2', '6731503021', 'sec_cs201_01', 'enrolled'),
('enr_cs202_std2', '6731503021', 'sec_cs202_01', 'enrolled'),
('enr_cs203_std2', '6731503021', 'sec_cs203_01', 'enrolled'),
('enr_ma201_std2', '6731503021', 'sec_ma201_01', 'enrolled'),
('enr_ge101_std2', '6731503021', 'sec_ge101_03', 'enrolled');

-- 6. Insert Meetings (Matching Student and Room Timetable)
INSERT OR REPLACE INTO meetings (id, section_id, room_id, day_of_week, start_time, end_time, status, created_by) VALUES
('mtg_01', 'sec_cs201_01', 'rm_sc301', 'Monday', '09:00', '11:00', 'active', 'usr_stf_001'),
('mtg_02', 'sec_cs201_01', 'rm_sc301', 'Thursday', '13:00', '15:00', 'active', 'usr_stf_001'),
('mtg_03', 'sec_ma201_01', 'rm_sc304', 'Monday', '13:00', '15:00', 'active', 'usr_stf_001'),
('mtg_04', 'sec_cs202_01', 'rm_sc302', 'Tuesday', '09:00', '11:00', 'active', 'usr_stf_001'),
('mtg_05', 'sec_cs202_01', 'rm_sc302', 'Friday', '13:00', '15:00', 'active', 'usr_stf_001'),
('mtg_06', 'sec_cs203_01', 'rm_sc303', 'Wednesday', '09:00', '12:00', 'active', 'usr_stf_001'),
('mtg_07', 'sec_ge101_03', 'rm_sc304', 'Thursday', '09:00', '12:00', 'active', 'usr_stf_001'),
('mtg_08', 'sec_cs203_02', 'rm_sc303', 'Monday', '09:00', '12:00', 'active', 'usr_stf_001'),
('mtg_09', 'sec_cs204_01', 'rm_sc303', 'Tuesday', '13:00', '15:00', 'active', 'usr_stf_001'),
('mtg_10', 'sec_cs205_01', 'rm_sc303', 'Thursday', '13:00', '16:00', 'active', 'usr_stf_001'),
('mtg_11', 'sec_cs204_02', 'rm_sc303', 'Friday', '09:00', '11:00', 'active', 'usr_stf_001'),
('mtg_12', 'sec_cs201_02', 'rm_sc304', 'Wednesday', '13:00', '15:00', 'active', 'usr_stf_001');
