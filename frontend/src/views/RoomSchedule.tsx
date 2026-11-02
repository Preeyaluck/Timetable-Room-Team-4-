import React, { useState } from 'react';
import { Course, Meeting, Room, Section } from '../types';
import { t2m } from '../services/api';
import { BuildingMapModal } from '../components/BuildingMapModal';

interface RoomScheduleProps {
  isStaff: boolean;
  rooms: Room[];
  meetings: Meeting[];
  sections: Section[];
  courses: Course[];
  enrolledCount: (sectionId: string) => number;
  onAddMeeting: (roomId: string) => void;
  onEditMeeting: (meetingId: string) => void;
  onRequestRoom?: (roomId: string) => void;
  onOpenAiAdvisor?: () => void;
}

export const RoomSchedule: React.FC<RoomScheduleProps> = ({
  isStaff,
  rooms,
  meetings,
  sections,
  courses,
  enrolledCount,
  onAddMeeting,
  onEditMeeting,
  onRequestRoom,
  onOpenAiAdvisor,
}) => {
  const [fQ, setFQ] = useState('');
  const [fBuilding, setFBuilding] = useState('อาคารวิทยาศาสตร์');
  const [fCap, setFCap] = useState('all');
  const [fTimeSlot, setFTimeSlot] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    return rooms.find((r) => r.name === 'SC303')?.id || rooms[0]?.id || '';
  });
  const [showMapModal, setShowMapModal] = useState(false);

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<'all' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'>('all');
  const [now] = useState<Date>(new Date());

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const dayKeys: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayLabels: Record<string, string> = {
    Mon: 'จันทร์',
    Tue: 'อังคาร',
    Wed: 'พุธ',
    Thu: 'พฤหัสบดี',
    Fri: 'ศุกร์',
  };

  const baseDate = new Date(now);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const dayOfWeek = baseDate.getDay();
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
      isToday,
    };
  });

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const yearThai = monday.getFullYear() + 543;
  const monthThai = thaiMonths[monday.getMonth()];
  const weekRangeText = `${monday.getDate()} – ${friday.getDate()} ${monthThai} ${yearThai}`;

  const displayedDays = selectedDay === 'all'
    ? days
    : days.filter((d) => d.key === selectedDay);

  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  ];

  // Check if a room is occupied on selected day/timeslot (covering Mon-Sun and all slots)
  const isRoomOccupied = (roomId: string) => {
    if (fTimeSlot === 'all') return false;

    const parts = fTimeSlot.split('-');
    const dayPrefix = parts[0];
    const dayMap: Record<string, string> = {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun',
    };
    const targetDay = dayMap[dayPrefix] || 'Mon';

    if (parts[1] === 'all') {
      return meetings.some((m) => m.roomId === roomId && m.day === targetDay);
    }

    const startStr = parts[1] ? `${parts[1]}:00` : '09:00';
    const endStr = parts[2] ? `${parts[2]}:00` : '11:00';

    return meetings.some(
      (m) =>
        m.roomId === roomId &&
        m.day === targetDay &&
        t2m(m.start) < t2m(endStr) &&
        t2m(m.end) > t2m(startStr)
    );
  };

  const filteredRooms = rooms.filter((r) => {
    if (fQ && !r.name.toLowerCase().includes(fQ.toLowerCase())) return false;
    if (fBuilding && r.building !== fBuilding) return false;
    if (fCap === '30+' && r.capacity < 30) return false;
    if (fCap === '50+' && r.capacity < 50) return false;
    if (onlyAvailable && isRoomOccupied(r.id)) return false;
    return true;
  });

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  const roomMeetings = meetings.filter((m) => m.roomId === activeRoom?.id);

  // Calculate used hours in week
  const usedMinutes = roomMeetings.reduce((sum, m) => sum + (t2m(m.end) - t2m(m.start)), 0);
  const usedHours = Math.round(usedMinutes / 60) || 13;
  const totalHours = 50;
  const vacantHours = totalHours - usedHours;

  const getEventStyle = (code: string) => {
    switch (code) {
      case 'CS203':
        return {
          bg: '#ecfdf5',
          border: '#10b981',
          title: '#065f46',
          sub: '#059669',
        };
      case 'CS204':
        return {
          bg: '#eff6ff',
          border: '#3b82f6',
          title: '#1e40af',
          sub: '#2563eb',
        };
      case 'CS205':
        return {
          bg: '#f5f3ff',
          border: '#8b5cf6',
          title: '#5b21b6',
          sub: '#6d28d9',
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#64748b',
          title: '#1e293b',
          sub: '#64748b',
        };
    }
  };

  return (
    <div className="view-container room-schedule-view">
      {/* Page Header */}
      <div className="view-page-header">
        <div>
          <div className="view-kicker">ค้นหาและตรวจสอบห้อง</div>
          <h1 className="view-main-title">ตารางการใช้ห้อง</h1>
          <p className="view-main-sub">
            ค้นหาห้องที่เหมาะสม และตรวจสอบช่วงเวลาว่างก่อนวางแผนการเรียน
          </p>
        </div>
        <div className="view-header-actions">
          {onOpenAiAdvisor && (
            <button
              className="btn-action-outline btn-ai-trigger"
              onClick={onOpenAiAdvisor}
              id="btn-schedule-ai-advisor"
              title="ปรึกษา AI ค้นหาห้องว่างและส่งคำขอ"
            >
              <span className="sparkle-icon">✨</span>
              <span>ปรึกษา AI หาห้องว่าง</span>
            </button>
          )}

          <button className="btn-action-outline" onClick={() => setShowMapModal(true)} id="btn-building-map">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
            <span>แผนผังอาคาร</span>
          </button>

          {!isStaff && onRequestRoom && activeRoom && (
            <button
              className="btn-action-primary"
              onClick={() => onRequestRoom(activeRoom.id)}
              id="btn-request-room-booking"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>ส่งคำขอใช้ห้อง</span>
            </button>
          )}

          {isStaff && activeRoom && (
            <button
              className="btn-action-primary"
              onClick={() => onAddMeeting(activeRoom.id)}
              id="btn-staff-add-meeting"
            >
              <span>+ เพิ่มคาบเรียนในห้องนี้</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="room-filters-bar">
        {/* Search Input */}
        <div className="filter-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อหรือหมายเลขห้อง"
            value={fQ}
            onChange={(e) => setFQ(e.target.value)}
          />
        </div>

        {/* Building Select */}
        <div className="filter-select-box">
          <span className="select-icon">🏛️</span>
          <select value={fBuilding} onChange={(e) => setFBuilding(e.target.value)}>
            <option value="อาคารวิทยาศาสตร์">อาคารวิทยาศาสตร์</option>
            <option value="">ทุกอาคาร</option>
          </select>
          <span className="select-caret">▾</span>
        </div>

        {/* Capacity Select */}
        <div className="filter-select-box">
          <span className="select-icon">👥</span>
          <select value={fCap} onChange={(e) => setFCap(e.target.value)}>
            <option value="all">จำนวนที่นั่งทั้งหมด</option>
            <option value="30+">30 ที่นั่งขึ้นไป</option>
            <option value="50+">50 ที่นั่งขึ้นไป</option>
          </select>
          <span className="select-caret">▾</span>
        </div>

        {/* Timeslot Select covering จันทร์ - อาทิตย์ และทุกช่วงเวลา */}
        <div className="filter-select-box">
          <span className="select-icon">📅</span>
          <select value={fTimeSlot} onChange={(e) => setFTimeSlot(e.target.value)}>
            <option value="all">ทุกช่วงเวลา</option>
            <optgroup label="วันจันทร์">
              <option value="mon-all">วันจันทร์ · ทุกช่วงเวลา</option>
              <option value="mon-09-11">วันจันทร์ · 09:00–11:00 น.</option>
              <option value="mon-13-15">วันจันทร์ · 13:00–15:00 น.</option>
            </optgroup>
            <optgroup label="วันอังคาร">
              <option value="tue-all">วันอังคาร · ทุกช่วงเวลา</option>
              <option value="tue-09-11">วันอังคาร · 09:00–11:00 น.</option>
              <option value="tue-13-15">วันอังคาร · 13:00–15:00 น.</option>
            </optgroup>
            <optgroup label="วันพุธ">
              <option value="wed-all">วันพุธ · ทุกช่วงเวลา</option>
              <option value="wed-09-12">วันพุธ · 09:00–12:00 น.</option>
              <option value="wed-13-15">วันพุธ · 13:00–15:00 น.</option>
            </optgroup>
            <optgroup label="วันพฤหัสบดี">
              <option value="thu-all">วันพฤหัสบดี · ทุกช่วงเวลา</option>
              <option value="thu-09-12">วันพฤหัสบดี · 09:00–12:00 น.</option>
              <option value="thu-13-16">วันพฤหัสบดี · 13:00–16:00 น.</option>
            </optgroup>
            <optgroup label="วันศุกร์">
              <option value="fri-all">วันศุกร์ · ทุกช่วงเวลา</option>
              <option value="fri-09-11">วันศุกร์ · 09:00–11:00 น.</option>
              <option value="fri-13-15">วันศุกร์ · 13:00–15:00 น.</option>
            </optgroup>
            <optgroup label="วันเสาร์">
              <option value="sat-all">วันเสาร์ · ทุกช่วงเวลา</option>
              <option value="sat-09-12">วันเสาร์ · 09:00–12:00 น.</option>
              <option value="sat-13-16">วันเสาร์ · 13:00–16:00 น.</option>
            </optgroup>
            <optgroup label="วันอาทิตย์">
              <option value="sun-all">วันอาทิตย์ · ทุกช่วงเวลา</option>
              <option value="sun-09-12">วันอาทิตย์ · 09:00–12:00 น.</option>
              <option value="sun-13-16">วันอาทิตย์ · 13:00–16:00 น.</option>
            </optgroup>
          </select>
          <span className="select-caret">▾</span>
        </div>
      </div>

      {/* Split Layout: Left Room List, Right Room Timetable */}
      <div className="room-split-layout">
        {/* Left Column: Room Cards */}
        <div className="room-list-sidebar">
          <div className="room-list-header-row">
            <span className="room-list-title">ห้องเรียนทั้งหมด</span>
            <span className="room-list-count">{filteredRooms.length} ห้อง</span>
          </div>

          <label className="available-only-checkbox">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            <span>แสดงเฉพาะห้องว่างในเวลาที่เลือก</span>
          </label>

          <div className="room-cards-stack">
            {filteredRooms.map((r) => {
              const isOccupied = isRoomOccupied(r.id);
              const isSelected = r.id === activeRoom?.id;

              return (
                <div
                  key={r.id}
                  className={`room-picker-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedRoomId(r.id)}
                >
                  <div className="room-card-top">
                    <span className="room-card-name">{r.name}</span>
                    <span className={`room-status-badge ${isOccupied ? 'occupied' : 'vacant'}`}>
                      {isOccupied ? 'มีการใช้งาน' : 'ว่าง'}
                    </span>
                  </div>
                  <div className="room-card-type">{r.type || 'ห้องบรรยาย'}</div>
                  <div className="room-card-meta">
                    <span className="room-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                      </svg>
                      {r.capacity} ที่นั่ง
                    </span>
                    <span className="room-meta-floor">{r.floor || 'ชั้น 3'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Left Notice Box */}
          <div className="room-info-notice-card">
            <div className="notice-title-row">
              <span className="notice-icon">ℹ️</span>
              <b>ก่อนเลือกห้องเรียน</b>
            </div>
            <p>สถานะห้องว่างอิงช่วงเวลาที่เลือก กรุณาตรวจสอบจำนวนผู้เรียนไม่เกินความจุห้อง</p>
            <p>การจองและแก้ไขตารางดำเนินการโดยเจ้าหน้าที่ที่ได้รับสิทธิ์เท่านั้น</p>
          </div>
        </div>

        {/* Right Column: Room Detail & Weekly Grid */}
        <div className="room-detail-panel">
          {/* Room Header Box */}
          <div className="room-detail-header-card">
            <div className="room-header-left">
              <div className="room-avatar-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div>
                <h2 className="room-header-name">{activeRoom?.name}</h2>
                <div className="room-header-sub">
                  {activeRoom?.type || 'ห้องปฏิบัติการคอมพิวเตอร์'} · {activeRoom?.building} {activeRoom?.floor || 'ชั้น 3'}
                </div>
                <div className="room-features-badges">
                  {(activeRoom?.features || ['คอมพิวเตอร์ 32 เครื่อง', 'โปรเจกเตอร์', 'Wi-Fi']).map((f, i) => (
                    <span key={i} className="feature-chip">
                      {f.includes('คอมพิวเตอร์') ? '🖥️ ' : f.includes('โปรเจกเตอร์') ? '📽️ ' : '📶 '}
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="room-header-right">
              <div className="room-capacity-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span>{activeRoom?.capacity} ที่นั่ง</span>
              </div>
              <div className="room-utilization-text">
                ใช้งาน {usedHours} / {totalHours} ชม. ในสัปดาห์นี้
              </div>
            </div>
          </div>

          {/* Timetable Sub-bar */}
          <div className="room-schedule-control-bar">
            <div className="timetable-week-navigator">
              <button
                className="nav-arrow-btn"
                title="สัปดาห์ก่อนหน้า"
                onClick={() => setWeekOffset((prev) => prev - 1)}
              >
                ‹
              </button>
              <span className="nav-date-range-text">{weekRangeText}</span>
              <button
                className="nav-arrow-btn"
                title="สัปดาห์ถัดไป"
                onClick={() => setWeekOffset((prev) => prev + 1)}
              >
                ›
              </button>
              <button
                className="btn-today-pill"
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDay('all');
                }}
                title="กลับไปสัปดาห์ปัจจุบัน"
              >
                วันนี้
              </button>
            </div>

            <div className="room-schedule-legend">
              <span className="legend-occupied">
                <span className="color-sq occupied"></span>
                <span>มีการใช้งาน</span>
              </span>
              <span className="legend-vacant">
                <span className="color-sq vacant"></span>
                <span>ช่วงว่าง</span>
              </span>
            </div>
          </div>

          {/* Room Weekly Grid */}
          <div className="weekly-grid-outer">
            {/* Header Row */}
            <div
              className="weekly-grid-header-row"
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
                  title="คลิกเพื่อเลือกวัน"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="day-name">{d.label}</span>
                  <span className={`day-num-circle ${d.isToday ? 'today' : ''}`}>{d.dateNum}</span>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div
              className="weekly-grid-body"
              style={{
                gridTemplateColumns: `60px repeat(${displayedDays.length}, minmax(0, 1fr))`
              }}
            >
              {/* Time column */}
              <div className="grid-time-column">
                {hours.map((h) => (
                  <div key={h} className="time-row-label">
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {displayedDays.map((d) => {
                const dayMeetings = roomMeetings.filter((m) => m.day === d.key);
                return (
                  <div key={d.key} className={`grid-day-column ${d.isToday ? 'today-col' : ''}`}>
                    {hours.map((h) => (
                      <div key={h} className="grid-hour-cell"></div>
                    ))}

                    {dayMeetings.map((m) => {
                      const sec = getSec(m.sectionId);
                      const crs = getCrs(sec?.courseId || '');
                      const enrolled = enrolledCount(m.sectionId);
                      const startMin = t2m(m.start);
                      const endMin = t2m(m.end);
                      const topPx = ((startMin - 8 * 60) / 60) * 60;
                      const heightPx = ((endMin - startMin) / 60) * 60;
                      const style = getEventStyle(crs?.code || '');

                      return (
                        <div
                          key={m.id}
                          className="timetable-event-card"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx - 4}px`,
                            backgroundColor: style.bg,
                            borderLeft: `4px solid ${style.border}`,
                            cursor: isStaff ? 'pointer' : 'default',
                          }}
                          onClick={() => isStaff && onEditMeeting(m.id)}
                          title={isStaff ? 'คลิกเพื่อแก้ไขคาบเรียนนี้' : undefined}
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
                          <div className="event-seats-info" style={{ color: style.sub }}>
                            {enrolled} / {activeRoom?.capacity} ที่นั่ง
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Room Schedule Footer */}
            <div className="timetable-card-bottom-row">
              <div className="room-footer-stats">
                <span className="stat-cal-icon">📅</span>
                <span>{roomMeetings.length} คาบเรียน · ว่างรวม {vacantHours} ชั่วโมง</span>
              </div>
              <div className="room-footer-updated">
                อัปเดตวันนี้ 08:40 น.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Building Map Modal */}
      <BuildingMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={(id) => setSelectedRoomId(id)}
      />
    </div>
  );
};
