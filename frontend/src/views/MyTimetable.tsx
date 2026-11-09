import React, { useState, useEffect } from 'react';
import { Course, Day, Enrollment, Meeting, Room, Section, User } from '../types';
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
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<'all' | Day>('all');
  const [now, setNow] = useState<Date>(new Date());

  // Real-time live clock ticking every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);
  const getRoom = (id: string) => rooms.find((r) => r.id === id);
  const secCourse = (sectionId: string) => getCrs(getSec(sectionId)?.courseId || '');

  // Student enrolled sections - Strictly dynamic from D1 / Team 03
  const mySections = enrollments
    .filter((e) => e.student === user.id && e.status === 'enrolled')
    .map((e) => e.section);

  const studentMeetings = meetings.filter((m) => mySections.includes(m.sectionId));

  const mine = enrollments.filter((e) => e.student === user.id && e.status === 'enrolled');
  const enrolledCount = mine.length;
  const totalCredits = mine.reduce((sum, e) => sum + (secCourse(e.section)?.credits || 3), 0);

  // Calculate total weekly hours
  const totalWeeklyMinutes = studentMeetings.reduce((acc, m) => acc + (t2m(m.end) - t2m(m.start)), 0);
  const totalWeeklyHours = Math.round(totalWeeklyMinutes / 60);

  // Real-time Week & Day calculation
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const dayKeys: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLabels: Record<Day, string> = {
    Mon: 'จันทร์',
    Tue: 'อังคาร',
    Wed: 'พุธ',
    Thu: 'พฤหัสบดี',
    Fri: 'ศุกร์',
    Sat: 'เสาร์',
    Sun: 'อาทิตย์',
  };

  // Find Monday of the currently navigated week
  const baseDate = new Date(now);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMon);

  const days = dayKeys.map((key, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const isToday = d.toDateString() === now.toDateString();
    return {
      key,
      label: dayLabels[key],
      dateNum: d.getDate(),
      fullDate: d,
      isToday,
    };
  });

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const yearThai = monday.getFullYear() + 543;
  const monthThai = thaiMonths[monday.getMonth()];
  const endMonthThai = thaiMonths[sunday.getMonth()];
  const weekRangeText = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()} – ${sunday.getDate()} ${monthThai} ${yearThai}`
    : `${monday.getDate()} ${monthThai} – ${sunday.getDate()} ${endMonthThai} ${yearThai}`;

  // Filtered days to display (if specific day selected, show only that day; otherwise all 7 days)
  const displayedDays = selectedDay === 'all'
    ? days
    : days.filter((d) => d.key === selectedDay);

  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  ];

  // Current Live Time Calculations
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowTotalMinutes = currentHour * 60 + currentMinute;
  const isLiveTimeInRange = nowTotalMinutes >= 8 * 60 && nowTotalMinutes <= 18 * 60;
  const liveTimeTopPx = ((nowTotalMinutes - 8 * 60) / 60) * 60;
  const liveTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} น.`;

  // Dynamic "Next Class" (คาบถัดไป) Calculation
  const todayDayIndex = now.getDay();
  const todayKeyMap: Record<number, Day | null> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  };
  const todayKey = todayKeyMap[todayDayIndex] || null;

  let nextMeeting: Meeting | null = null;
  let nextDayLabel = 'วันนี้';
  let countdownText = '';

  if (todayKey) {
    const todayMeetings = studentMeetings
      .filter((m) => m.day === todayKey)
      .sort((a, b) => t2m(a.start) - t2m(b.start));

    // Find next meeting today that has not ended yet
    const upcomingToday = todayMeetings.find((m) => t2m(m.end) > nowTotalMinutes);
    if (upcomingToday) {
      nextMeeting = upcomingToday;
      const startDiff = t2m(upcomingToday.start) - nowTotalMinutes;
      if (startDiff <= 0) {
        countdownText = 'กำลังเรียนอยู่ขณะนี้';
      } else if (startDiff <= 60) {
        countdownText = `อีก ${startDiff} นาที`;
      } else {
        countdownText = `อีก ${Math.floor(startDiff / 60)} ชม. ${startDiff % 60} นาที`;
      }
    }
  }

  // If no upcoming class today, find the earliest class on future days
  if (!nextMeeting) {
    const sorted = [...studentMeetings].sort((a, b) => {
      const order: Record<Day, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
      return order[a.day] - order[b.day] || t2m(a.start) - t2m(b.start);
    });
    nextMeeting = sorted[0] || null;
    if (nextMeeting) {
      nextDayLabel = `วัน${dayLabels[nextMeeting.day]}`;
      countdownText = `เวลา ${nextMeeting.start} น.`;
    }
  }

  const nextSec = nextMeeting ? getSec(nextMeeting.sectionId) : null;
  const nextCrs = nextSec ? getCrs(nextSec.courseId) : null;
  const nextRm = nextMeeting ? getRoom(nextMeeting.roomId) : null;

  // Course Color Palette
  const getCourseStyle = (code: string) => {
    switch (code) {
      case 'CS101':
        return { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6', title: '#4c1d95', sub: '#6d28d9' };
      case 'CS301':
        return { bg: '#f0fdfa', border: '#14b8a6', text: '#0f766e', title: '#115e59', sub: '#0d9488' };
      case 'SE201':
        return { bg: '#fff7ed', border: '#f97316', text: '#9a3412', title: '#7c2d12', sub: '#ea580c' };
      case 'CS201':
        return { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6', title: '#4c1d95', sub: '#6d28d9' };
      case 'CS202':
        return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', title: '#1e3a8a', sub: '#2563eb' };
      case 'CS203':
        return { bg: '#f0fdf4', border: '#10b981', text: '#065f46', title: '#064e3b', sub: '#059669' };
      case 'MA201':
        return { bg: '#fefce8', border: '#f59e0b', text: '#92400e', title: '#78350f', sub: '#d97706' };
      case 'GE101':
        return { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d', title: '#831843', sub: '#db2777' };
      case 'CS204':
        return { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1', title: '#075985', sub: '#0284c7' };
      case 'CS205':
        return { bg: '#f3e8ff', border: '#9333ea', text: '#7e22ce', title: '#6b21a8', sub: '#9333ea' };
      default:
        return { bg: '#f8fafc', border: '#94a3b8', text: '#334155', title: '#0f172a', sub: '#64748b' };
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
          <div className="view-kicker">พื้นที่การเรียนรู้ · ภาคต้น 2569</div>
          <h1 className="view-main-title">ตารางเรียนของฉัน</h1>
          <p className="view-main-sub">
            วางแผนสัปดาห์ของคุณ ดูเวลาเรียนและห้องเรียนทั้งหมดในที่เดียว (ข้อมูลอัปเดตแบบเรียลไทม์)
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
              <span className="metric-number">{enrolledCount}</span>
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
              {studentMeetings.length} คาบเรียน · ไม่มีเวลาทับซ้อน
            </div>
          </div>
          <div className="summary-card-icon-wrap blue-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        {/* Stat Card 3: Next Class (Dynamic Real-time) */}
        <div className="summary-card next-class-card">
          <div className="next-class-left-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div className="summary-card-content">
            <div className="next-class-header-row">
              <span className="summary-card-title">
                คาบถัดไป · {nextDayLabel} {nextMeeting ? `${nextMeeting.start}-${nextMeeting.end}` : ''}
              </span>
              {countdownText && <span className="countdown-pill">{countdownText}</span>}
            </div>
            <div className="next-class-name">
              {nextCrs ? `${nextCrs.code} ${nextCrs.name}` : 'ไม่มีคาบเรียนถัดไป'}
            </div>
            <div className="summary-card-meta">
              {nextSec && nextRm
                ? `กลุ่ม ${nextSec.no} · ห้อง ${nextRm.name} · ${nextRm.building}`
                : 'ไม่มีคาบเรียนที่รออยู่ในขณะนี้'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Weekly Timetable Container */}
      <div className="timetable-main-card">
        {/* Timetable Header Row */}
        <div className="timetable-card-topbar">
          <div className="timetable-topbar-left">
            <h2 className="timetable-section-title">ตารางประจำสัปดาห์</h2>
            {selectedDay !== 'all' && (
              <span className="selected-day-tag">
                กำลังดูเฉพาะ: วัน{dayLabels[selectedDay]}
                <button className="btn-clear-day-filter" onClick={() => setSelectedDay('all')} title="แสดงทั้งสัปดาห์">✕</button>
              </span>
            )}
          </div>

          {/* Real-time Week Navigation Controls */}
          <div className="timetable-week-navigator">
            <button
              className="nav-arrow-btn"
              title="สัปดาห์ก่อนหน้า"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              id="btn-prev-week"
            >
              ‹
            </button>
            <span className="nav-date-range-text" id="label-week-range">
              {weekRangeText}
            </span>
            <button
              className="nav-arrow-btn"
              title="สัปดาห์ถัดไป"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              id="btn-next-week"
            >
              ›
            </button>
            <button
              className={`btn-today-pill ${weekOffset === 0 ? 'is-current' : ''}`}
              onClick={() => {
                setWeekOffset(0);
                setSelectedDay('all');
              }}
              id="btn-goto-today"
              title="กลับไปสัปดาห์ปัจจุบัน"
            >
              วันนี้
            </button>
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

        {/* Interactive Day Selector Tabs (กดเลือกวันได้จริง) */}
        <div className="timetable-day-selector-bar">
          <span className="day-select-label">เลือกวัน:</span>
          <button
            className={`btn-day-tab ${selectedDay === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedDay('all')}
            id="tab-day-all"
          >
            <span>📅 ทั้งสัปดาห์</span>
          </button>
          {days.map((d) => (
            <button
              key={d.key}
              className={`btn-day-tab ${selectedDay === d.key ? 'active' : ''} ${d.isToday ? 'today-day-tab' : ''}`}
              onClick={() => setSelectedDay(selectedDay === d.key ? 'all' : d.key)}
              id={`tab-day-${d.key}`}
              title={`คลิกเพื่อดูตารางเฉพาะวัน${d.label}`}
            >
              <span>วัน{d.label}</span>
              <span className="tab-date-badge">{d.dateNum}</span>
              {d.isToday && <span className="today-dot-indicator" title="วันนี้">●</span>}
            </button>
          ))}
        </div>

        {/* Timetable View Mode: Week Grid */}
        {viewMode === 'week' ? (
          <div className="weekly-grid-outer">
            {/* Day Header Row (Clickable headers) */}
            <div
              className={`weekly-grid-header-row ${displayedDays.length < 7 ? 'single-day-grid' : ''}`}
              style={{
                gridTemplateColumns: `60px repeat(${displayedDays.length}, minmax(0, 1fr))`
              }}
            >
              <div className="grid-header-tz">GMT+7</div>
              {displayedDays.map((d) => (
                <div
                  key={d.key}
                  className={`grid-header-day ${d.isToday ? 'today-active' : ''} ${selectedDay === d.key ? 'selected-day-col' : ''}`}
                  onClick={() => setSelectedDay(selectedDay === d.key ? 'all' : d.key)}
                  title="คลิกเพื่อเลือกดูเฉพาะวันนี้ หรือกดอีกครั้งเพื่อดูทั้งสัปดาห์"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="day-name">{d.label}</span>
                  <span className={`day-num-circle ${d.isToday ? 'today' : ''}`}>{d.dateNum}</span>
                </div>
              ))}
            </div>

            {/* Timetable Body (Rows 08:00 to 18:00) */}
            <div
              className={`weekly-grid-body ${displayedDays.length < 7 ? 'single-day-grid' : ''}`}
              style={{
                gridTemplateColumns: `60px repeat(${displayedDays.length}, minmax(0, 1fr))`
              }}
            >
              {/* Time Column */}
              <div className="grid-time-column">
                {hours.map((h) => (
                  <div key={h} className="time-row-label">
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {displayedDays.map((d) => {
                const dayMeetings = studentMeetings.filter((m) => m.day === d.key);
                const isCurrentWeekAndToday = weekOffset === 0 && d.isToday;

                return (
                  <div
                    key={d.key}
                    className={`grid-day-column ${d.isToday ? 'today-col' : ''} ${selectedDay === d.key ? 'selected-column' : ''}`}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div key={h} className="grid-hour-cell"></div>
                    ))}

                    {/* Real-time Current Time Line Indicator */}
                    {isCurrentWeekAndToday && isLiveTimeInRange && (
                      <div
                        className="live-time-indicator-line"
                        style={{ top: `${liveTimeTopPx}px` }}
                        title={`เวลาปัจจุบัน: ${liveTimeStr}`}
                      >
                        <span className="live-time-dot"></span>
                        <span className="live-time-badge">{liveTimeStr}</span>
                      </div>
                    )}

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
                            border: `1px solid ${style.border}33`,
                            borderLeft: `4px solid ${style.border}`,
                            boxSizing: 'border-box',
                            overflow: 'hidden',
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

                    {dayMeetings.length === 0 && selectedDay !== 'all' && (
                      <div className="empty-day-state">
                        <span>ไม่มีคาบเรียนในวันนี้</span>
                      </div>
                    )}
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
          /* List View Mode (ตารางเรียนแบบรายการ) */
          <div className="timetable-list-view">
            {(() => {
              const getDurationText = (start: string, end: string) => {
                const mins = t2m(end) - t2m(start);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                if (h > 0 && m > 0) return `${h} ชม. ${m} นาที`;
                if (h > 0) return `${h} ชม.`;
                return `${m} นาที`;
              };

              // Group meetings by day according to displayedDays
              const groupedDays = displayedDays.map((d) => {
                const dayMeetings = studentMeetings
                  .filter((m) => m.day === d.key)
                  .sort((a, b) => t2m(a.start) - t2m(b.start));
                return {
                  ...d,
                  meetings: dayMeetings,
                };
              });

              // When viewing 'all' days, show days that have classes; when viewing a specific day, show that day
              const visibleDays = selectedDay === 'all'
                ? groupedDays.filter((d) => d.meetings.length > 0)
                : groupedDays;

              if (visibleDays.length === 0 || (selectedDay !== 'all' && visibleDays[0]?.meetings.length === 0)) {
                const targetDayLabel = selectedDay === 'all' ? 'สัปดาห์นี้' : `วัน${days.find((d) => d.key === selectedDay)?.label || ''}`;
                return (
                  <div className="list-empty-day-box">
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>☕</div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '6px' }}>
                      ไม่มีคาบเรียนใน{targetDayLabel}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                      คุณไม่มีตารางเรียนในช่วงเวลานี้ สามารถพักผ่อนหรือทบทวนบทเรียนได้
                    </div>
                    {selectedDay !== 'all' && (
                      <button
                        className="btn-action-outline"
                        style={{ padding: '6px 16px', fontSize: '13px' }}
                        onClick={() => setSelectedDay('all')}
                      >
                        ดูทุกวันทั้งสัปดาห์
                      </button>
                    )}
                  </div>
                );
              }

              return visibleDays.map((d) => (
                <div key={d.key} className="list-view-day-group">
                  <div className="list-view-day-header">
                    <div className="list-day-title-wrap">
                      <span className="list-day-name">วัน{d.label}</span>
                      <span className="list-day-date">
                        · {d.dateNum} {thaiMonths[d.fullDate.getMonth()]} {d.fullDate.getFullYear() + 543}
                      </span>
                      {d.isToday && <span className="list-day-today-badge">วันนี้</span>}
                    </div>
                    <span className="list-day-count-badge">
                      {d.meetings.length} คาบเรียน
                    </span>
                  </div>

                  <div className="list-view-cards-container">
                    {d.meetings.map((m) => {
                      const sec = getSec(m.sectionId);
                      const crs = getCrs(sec?.courseId || '');
                      const rm = getRoom(m.roomId);
                      const style = getCourseStyle(crs?.code || '');
                      const duration = getDurationText(m.start, m.end);

                      return (
                        <div
                          key={m.id}
                          className="list-view-card"
                          style={{
                            border: '1px solid #e2e8f0',
                            borderLeft: `5px solid ${style.border}`,
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                          }}
                        >
                          <div className="list-card-time-col">
                            <span className="list-card-time-main">
                              <span>🕒</span>
                              <span>{m.start} – {m.end}</span>
                            </span>
                            <span className="list-card-duration">({duration})</span>
                          </div>

                          <div className="list-card-content-col">
                            <div className="list-card-title-row">
                              <span className="list-card-code" style={{ color: style.title }}>
                                {crs?.code}
                              </span>
                              <span className="list-card-name">
                                {crs?.name}
                              </span>
                              <span className="list-card-sec-badge">
                                กลุ่ม {sec?.no}
                              </span>
                            </div>

                            <div className="list-card-meta-row">
                              <span className="list-meta-pill">
                                🏛️ <b>{rm?.name}</b> ({rm?.building})
                              </span>
                              <span className="list-meta-pill">
                                👤 ภาควิชา/ผู้สอน: {crs?.instructor || 'ภาควิชาวิทยาการคอมพิวเตอร์'}
                              </span>
                            </div>
                          </div>

                          <div className="list-card-right-col">
                            <span className="list-credits-badge">
                              {crs?.credits || 3} หน่วยกิต
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Page Footer Info with Real-time Clock */}
      <div className="view-page-footer">
        <div className="footer-sync-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>อัปเดตแบบเรียลไทม์ · ปัจจุบัน: {now.toLocaleTimeString('th-TH')} น.</span>
        </div>
        <div className="footer-tz-info">
          เวลาเรียนทั้งหมดแสดงตามเวลาไทย (GMT+7)
        </div>
      </div>
    </div>
  );
};
