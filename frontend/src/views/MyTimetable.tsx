import React, { useState } from 'react';
import { Course, Enrollment, Meeting, Room, Section, User } from '../types';
import { t2m } from '../services/api';

interface MyTimetableProps {
  user: User;
  courses: Course[];
  sections: Section[];
  rooms: Room[];
  meetings: Meeting[];
  enrollments: Enrollment[];
}

export const MyTimetable: React.FC<MyTimetableProps> = ({
  user,
  courses,
  sections,
  rooms,
  meetings,
  enrollments,
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);
  const getRoom = (id: string) => rooms.find((r) => r.id === id);
  const secCourse = (sectionId: string) => getCrs(getSec(sectionId)?.courseId || '');

  // Student enrolled meetings
  const mySections = enrollments
    .filter((e) => e.student === user.id && e.status === 'enrolled')
    .map((e) => e.section);

  const studentMeetings = meetings.filter((m) => mySections.includes(m.sectionId));

  const mine = enrollments.filter((e) => e.student === user.id && e.status === 'enrolled');
  const totalCredits = mine.reduce((sum, e) => sum + (secCourse(e.section)?.credits || 0), 3 * mine.length);

  // Calculate total weekly hours
  const totalWeeklyMinutes = studentMeetings.reduce((acc, m) => acc + (t2m(m.end) - t2m(m.start)), 0);
  const totalWeeklyHours = Math.round(totalWeeklyMinutes / 60) || 16;

  // Day columns definition matching Screenshot 1
  const days: { key: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'; label: string; dateNum: number; isToday?: boolean }[] = [
    { key: 'Mon', label: 'จันทร์', dateNum: 16, isToday: true },
    { key: 'Tue', label: 'อังคาร', dateNum: 17 },
    { key: 'Wed', label: 'พุธ', dateNum: 18 },
    { key: 'Thu', label: 'พฤหัสบดี', dateNum: 19 },
    { key: 'Fri', label: 'ศุกร์', dateNum: 20 },
  ];

  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  ];

  // Helper for color styles of course cards matching the screenshot's exact pastel palette
  const getCourseStyle = (code: string) => {
    switch (code) {
      case 'CS201':
        return {
          bg: '#f5f3ff', // soft lavender
          border: '#8b5cf6', // purple
          text: '#5b21b6',
          title: '#4c1d95',
          sub: '#6d28d9',
        };
      case 'CS202':
        return {
          bg: '#eff6ff', // soft blue
          border: '#3b82f6', // blue
          text: '#1e40af',
          title: '#1e3a8a',
          sub: '#2563eb',
        };
      case 'CS203':
        return {
          bg: '#f0fdf4', // soft green
          border: '#10b981', // green
          text: '#065f46',
          title: '#064e3b',
          sub: '#059669',
        };
      case 'MA201':
        return {
          bg: '#fefce8', // soft amber/yellow
          border: '#f59e0b', // amber
          text: '#92400e',
          title: '#78350f',
          sub: '#d97706',
        };
      case 'GE101':
        return {
          bg: '#fdf2f8', // soft pink
          border: '#ec4899', // pink
          text: '#9d174d',
          title: '#831843',
          sub: '#db2777',
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#94a3b8',
          text: '#334155',
          title: '#0f172a',
          sub: '#64748b',
        };
    }
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="view-container my-timetable-view">
      {/* Page Header */}
      <div className="view-page-header">
        <div>
          <div className="view-kicker">พื้นที่การเรียนรู้</div>
          <h1 className="view-main-title">ตารางเรียนของฉัน</h1>
          <p className="view-main-sub">
            วางแผนสัปดาห์ของคุณ ดูเวลาเรียนและห้องเรียนทั้งหมดในที่เดียว
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn-action-outline" onClick={handleExport} id="btn-export-timetable">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>ส่งออกตารางเรียน</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="summary-stat-cards-grid">
        {/* Stat Card 1: Registered Courses */}
        <div className="summary-card">
          <div className="summary-card-content">
            <div className="summary-card-title">รายวิชาที่ลงทะเบียน</div>
            <div className="summary-card-metric">
              <span className="metric-number">{mine.length || 5}</span>
              <span className="metric-unit">รายวิชา</span>
            </div>
            <div className="summary-card-meta">
              รวม {totalCredits} หน่วยกิต · ภาคต้น 2569
            </div>
          </div>
          <div className="summary-card-icon-wrap blue-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
        </div>

        {/* Stat Card 2: Weekly Hours */}
        <div className="summary-card">
          <div className="summary-card-content">
            <div className="summary-card-title">เวลาเรียนสัปดาห์นี้</div>
            <div className="summary-card-metric">
              <span className="metric-number">{totalWeeklyHours}</span>
              <span className="metric-unit">ชั่วโมง</span>
            </div>
            <div className="summary-card-meta">
              {studentMeetings.length || 7} คาบเรียน · ไม่มีเวลาทับซ้อน
            </div>
          </div>
          <div className="summary-card-icon-wrap blue-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        {/* Stat Card 3: Next Class */}
        <div className="summary-card next-class-card">
          <div className="next-class-left-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="summary-card-content">
            <div className="next-class-header-row">
              <span className="summary-card-title">คาบถัดไป · วันนี้ 09:00-11:00</span>
              <span className="countdown-pill">อีก 15 นาที</span>
            </div>
            <div className="next-class-name">CS201 โครงสร้างข้อมูล</div>
            <div className="summary-card-meta">
              กลุ่ม 01 · ห้อง SC301 · อาคารวิทยาศาสตร์
            </div>
          </div>
        </div>
      </div>

      {/* Main Weekly Timetable Container */}
      <div className="timetable-main-card">
        {/* Timetable Header Row */}
        <div className="timetable-card-topbar">
          <h2 className="timetable-section-title">ตารางประจำสัปดาห์</h2>

          <div className="timetable-week-navigator">
            <button className="nav-arrow-btn" title="สัปดาห์ก่อนหน้า">‹</button>
            <span className="nav-date-range-text">16 – 20 พ.ย. 2569</span>
            <button className="nav-arrow-btn" title="สัปดาห์ถัดไป">›</button>
            <button className="btn-today-pill">วันนี้</button>
          </div>

          <div className="view-mode-toggle-group">
            <button
              className={`toggle-tab-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              สัปดาห์
            </button>
            <button
              className={`toggle-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              รายการ
            </button>
          </div>
        </div>

        {/* Timetable View Mode: Week Grid */}
        {viewMode === 'week' ? (
          <div className="weekly-grid-outer">
            {/* Day Header Row */}
            <div className="weekly-grid-header-row">
              <div className="grid-header-tz">GMT+7</div>
              {days.map((d) => (
                <div key={d.key} className={`grid-header-day ${d.isToday ? 'today-active' : ''}`}>
                  <span className="day-name">{d.label}</span>
                  <span className={`day-num-circle ${d.isToday ? 'today' : ''}`}>{d.dateNum}</span>
                </div>
              ))}
            </div>

            {/* Timetable Body (Rows 08:00 to 18:00) */}
            <div className="weekly-grid-body">
              {/* Time Column */}
              <div className="grid-time-column">
                {hours.map((h) => (
                  <div key={h} className="time-row-label">
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {days.map((d) => {
                const dayMeetings = studentMeetings.filter((m) => m.day === d.key);
                return (
                  <div key={d.key} className={`grid-day-column ${d.isToday ? 'today-col' : ''}`}>
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div key={h} className="grid-hour-cell"></div>
                    ))}

                    {/* Render Meetings positioned by start/end times */}
                    {dayMeetings.map((m) => {
                      const sec = getSec(m.sectionId);
                      const crs = getCrs(sec?.courseId || '');
                      const rm = getRoom(m.roomId);
                      const startMin = t2m(m.start);
                      const endMin = t2m(m.end);
                      const topPx = ((startMin - 8 * 60) / 60) * 60; // 60px per hour
                      const heightPx = ((endMin - startMin) / 60) * 60;
                      const style = getCourseStyle(crs?.code || '');

                      return (
                        <div
                          key={m.id}
                          className="timetable-event-card"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx - 4}px`,
                            backgroundColor: style.bg,
                            borderLeft: `4px solid ${style.border}`,
                          }}
                        >
                          <div className="event-card-header" style={{ color: style.title }}>
                            <span className="event-course-code">{crs?.code}</span>
                            <span className="event-sec-no">· กลุ่ม {sec?.no}</span>
                          </div>
                          <div className="event-course-name" style={{ color: style.title }}>
                            {crs?.name}
                          </div>
                          <div className="event-time-range" style={{ color: style.sub }}>
                            {m.start}–{m.end}
                          </div>
                          <div className="event-location-inst" style={{ color: style.sub }}>
                            {rm?.name} · {crs?.instructor ? crs.instructor.split(' ')[0] : 'ผู้สอน'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend and Status */}
            <div className="timetable-card-bottom-row">
              <div className="course-legend-dots">
                {courses.slice(0, 5).map((c) => {
                  const style = getCourseStyle(c.code);
                  return (
                    <div key={c.id} className="legend-dot-item">
                      <span className="legend-color-dot" style={{ backgroundColor: style.border }}></span>
                      <span className="legend-code-text">{c.code}</span>
                    </div>
                  );
                })}
              </div>

              <div className="timetable-status-pill success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>ไม่มีตารางเรียนชนกัน</span>
              </div>
            </div>
          </div>
        ) : (
          /* List View Mode */
          <div className="timetable-list-view">
            {studentMeetings.map((m) => {
              const sec = getSec(m.sectionId);
              const crs = getCrs(sec?.courseId || '');
              const rm = getRoom(m.roomId);
              const dayName = days.find((d) => d.key === m.day)?.label || m.day;
              const style = getCourseStyle(crs?.code || '');

              return (
                <div key={m.id} className="list-view-item" style={{ borderLeft: `4px solid ${style.border}` }}>
                  <div className="list-item-day-badge">{dayName}</div>
                  <div className="list-item-main">
                    <div className="list-item-title">
                      <b>{crs?.code}</b> {crs?.name} (กลุ่ม {sec?.no})
                    </div>
                    <div className="list-item-meta">
                      <span>🕒 {m.start} – {m.end}</span>
                      <span>🏛️ {rm?.name} ({rm?.building})</span>
                      <span>👤 {crs?.instructor || '-'}</span>
                    </div>
                  </div>
                  <div className="list-item-credits">{crs?.credits} หน่วยกิต</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Page Footer Info */}
      <div className="view-page-footer">
        <div className="footer-sync-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>อัปเดตจากข้อมูลลงทะเบียนล่าสุด · วันนี้ 08:40 น.</span>
        </div>
        <div className="footer-tz-info">
          เวลาเรียนทั้งหมดแสดงตามเวลาไทย (GMT+7)
        </div>
      </div>
    </div>
  );
};
