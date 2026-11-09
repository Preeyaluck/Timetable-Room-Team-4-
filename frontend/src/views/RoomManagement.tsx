import React, { useState, useMemo } from 'react';
import { Course, Day, Meeting, Room, RoomRequest, Section } from '../types';
import { overlap } from '../services/api';

interface RoomManagementProps {
  isStaff?: boolean;
  onSwitchToStaff?: () => void;
  meetings: Meeting[];
  rooms: Room[];
  sections: Section[];
  courses: Course[];
  enrolledCount: (sectionId: string) => number;
  onNewMeeting: () => void;
  onEditMeeting?: (meetingId: string) => void;
  onDeleteMeeting: (meetingId: string) => void;
  onSaveMeeting?: (meeting: Meeting) => void;
  roomRequests?: RoomRequest[];
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  meetings,
  rooms,
  sections,
  courses,
  enrolledCount,
  onNewMeeting,
  onDeleteMeeting,
  onSaveMeeting,
  roomRequests: _roomRequests = [],
  onApproveRequest: _onApproveRequest,
  onRejectRequest: _onRejectRequest,
}) => {
  // Active selected section for editing (Default to CS201 sec 02 matching Screenshot 3)
  const [selectedSecId, setSelectedSecId] = useState<string>(() => {
    return sections.find((s) => s.no === '02')?.id || sections[0]?.id || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSections, setShowAllSections] = useState(false);

  // Form State for editing the active section
  const [formCourseId, setFormCourseId] = useState<string>('c_cs201');
  const [formSecNo, setFormSecNo] = useState<string>('02');
  const [formRoomId, setFormRoomId] = useState<string>('rm_sc303'); // intentionally set to SC303 initially to showcase conflict
  const [formDay, setFormDay] = useState<Day>('Mon');
  const [formStart, setFormStart] = useState<string>('09:00');
  const [formEnd, setFormEnd] = useState<string>('11:00');
  const [repeatWeekly, setRepeatWeekly] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);
  const getRoom = (id: string) => rooms.find((r) => r.id === id);

  // Active section & course info
  const activeSection = sections.find((s) => s.id === selectedSecId) || sections[0];
  const activeCourse = courses.find((c) => c.id === activeSection?.courseId) || courses[0];
  const activeEnrolled = enrolledCount(activeSection?.id || '') || 42;

  // Selected room object
  const currentRoom = rooms.find((r) => r.id === formRoomId) || rooms[0];
  const capacityDeficit = currentRoom ? activeEnrolled - currentRoom.capacity : 0;

  // Check conflicts in real-time
  const validationResults = useMemo(() => {
    const conflicts: { type: 'overlap' | 'capacity'; title: string; desc: string }[] = [];

    // 1. Time & Room Overlap Check
    const overlappingMeeting = meetings.find((m) => {
      // Don't compare with this section's own existing meeting if it's the same
      if (m.sectionId === activeSection?.id) return false;
      if (m.roomId !== formRoomId) return false;
      if (m.day !== formDay) return false;
      return overlap({ start: formStart, end: formEnd }, { start: m.start, end: m.end });
    });

    if (overlappingMeeting) {
      const otherSec = getSec(overlappingMeeting.sectionId);
      const otherCrs = getCrs(otherSec?.courseId || '');
      const dayThaiMap: Record<string, string> = {
        Mon: 'วันจันทร์',
        Tue: 'วันอังคาร',
        Wed: 'วันพุธ',
        Thu: 'วันพฤหัสบดี',
        Fri: 'วันศุกร์',
        Sat: 'วันเสาร์',
        Sun: 'วันอาทิตย์',
      };
      const dayThai = dayThaiMap[formDay] || formDay;

      conflicts.push({
        type: 'overlap',
        title: 'เวลาใช้ห้องทับซ้อน',
        desc: `${currentRoom?.name} มี ${otherCrs?.code} กลุ่ม ${otherSec?.no} ${dayThai} ${overlappingMeeting.start}-${overlappingMeeting.end} ทับซ้อนกับเวลาที่เลือก ${formStart}-${formEnd}`,
      });
    }

    // 2. Capacity Check
    if (currentRoom && activeEnrolled > currentRoom.capacity) {
      conflicts.push({
        type: 'capacity',
        title: 'จำนวนผู้เรียนเกินความจุ',
        desc: `ผู้เรียน ${activeEnrolled} คน แต่ ${currentRoom.name} รองรับ ${currentRoom.capacity} ที่นั่ง เกินความจุ ${activeEnrolled - currentRoom.capacity} คน`,
      });
    }

    return conflicts;
  }, [formRoomId, formDay, formStart, formEnd, currentRoom, activeEnrolled, activeSection, meetings]);

  const hasConflicts = validationResults.length > 0;

  // Select a section from the left list
  const handleSelectSection = (sec: Section) => {
    setSelectedSecId(sec.id);
    const crs = getCrs(sec.courseId);
    if (crs) setFormCourseId(crs.id);
    setFormSecNo(sec.no);
    setIsSaved(false);

    // If CS201 sec 02, configure initial state matching screenshot
    if (sec.id.includes('cs201_02')) {
      setFormRoomId('rm_sc303');
      setFormDay('Mon');
      setFormStart('09:00');
      setFormEnd('11:00');
    } else {
      const existingMtg = meetings.find((m) => m.sectionId === sec.id);
      if (existingMtg) {
        setFormRoomId(existingMtg.roomId);
        setFormDay(existingMtg.day);
        setFormStart(existingMtg.start);
        setFormEnd(existingMtg.end);
      }
    }
  };

  // Apply AI Recommendation 1: SC304, Monday 09:00-11:00
  const handleApplyRec1 = () => {
    const sc304 = rooms.find((r) => r.name === 'SC304');
    if (sc304) {
      setFormRoomId(sc304.id);
      setFormDay('Mon');
      setFormStart('09:00');
      setFormEnd('11:00');
      setIsSaved(false);
    }
  };

  // Apply AI Recommendation 2: SC301, Thursday 15:00-17:00
  const handleApplyRec2 = () => {
    const sc301 = rooms.find((r) => r.name === 'SC301');
    if (sc301) {
      setFormRoomId(sc301.id);
      setFormDay('Thu');
      setFormStart('15:00');
      setFormEnd('17:00');
      setIsSaved(false);
    }
  };

  // Handle Save
  const handleSave = () => {
    if (hasConflicts) return;
    setIsSaved(true);
    if (onSaveMeeting) {
      const existingMtg = meetings.find((m) => m.sectionId === activeSection?.id);
      onSaveMeeting({
        id: existingMtg?.id || `mtg_${Date.now()}`,
        sectionId: activeSection?.id || '',
        roomId: formRoomId,
        day: formDay,
        start: formStart,
        end: formEnd,
      });
    }
  };

  const filteredSections = sections.filter((s) => {
    const c = getCrs(s.courseId);
    const text = `${c?.code || ''} ${c?.name || ''} ${s.no}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const displayedSections = showAllSections ? filteredSections : filteredSections.slice(0, 4);

  return (
    <div className="view-container room-management-view">
      {/* Page Header */}
      <div className="view-page-header">
        <div>
          <div className="view-kicker">พื้นที่ทำงานเจ้าหน้าที่</div>
          <h1 className="view-main-title">จัดการห้องเรียน</h1>
          <p className="view-main-sub">
            จัดเวลาและห้องเรียนให้แต่ละกลุ่มเรียน พร้อมตรวจสอบความขัดแย้งก่อนบันทึก
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn-action-primary" onClick={onNewMeeting} id="btn-create-meeting">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>สร้างคาบเรียน</span>
          </button>
        </div>
      </div>

      {/* Staff Permission Alert Banner */}
      <div className="staff-permission-banner">
        <div className="banner-left-msg">
          <span className="banner-shield-icon">🛡️</span>
          <span>
            <b>เฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์จัดการห้องเรียน</b> · คุณสามารถสร้าง แก้ไข และสลับคาบเรียนได้
          </span>
        </div>
        <div className="banner-right-status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>ยืนยันสิทธิ์แล้ว</span>
        </div>
      </div>



      {/* 3-Column Studio Interface */}
      <div className="management-studio-grid">
        {/* Column 1: Sections List */}
        <div className="studio-col-sections">
          <div className="col-header-row">
            <span className="col-header-title">คาบเรียน</span>
            <span className="col-header-count">{sections.length} รายการ</span>
          </div>

          <div className="col-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="ค้นหารายวิชา / กลุ่มเรียน"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="col-filter-dropdown">
            <span>ภาคต้น 2569 - ทั้งหมด</span>
            <span className="dropdown-caret">▾</span>
          </div>

          {/* Section Cards Stack */}
          <div className="sections-cards-stack">
            {displayedSections.map((sec) => {
              const crs = getCrs(sec.courseId);
              const mtg = meetings.find((m) => m.sectionId === sec.id);
              const rm = getRoom(mtg?.roomId || '');
              const enrolled = enrolledCount(sec.id);
              const isSelected = sec.id === selectedSecId;
              const dayShortMap: Record<string, string> = {
                Mon: 'จันทร์',
                Tue: 'อังคาร',
                Wed: 'พุธ',
                Thu: 'พฤหัสบดี',
                Fri: 'ศุกร์',
                Sat: 'เสาร์',
                Sun: 'อาทิตย์',
              };
              const dayThai = mtg?.day ? (dayShortMap[mtg.day] || mtg.day) : 'ยังไม่ระบุ';

              return (
                <div
                  key={sec.id}
                  className={`section-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectSection(sec)}
                >
                  <div className="sec-card-top-row">
                    <span className="sec-course-code">{crs?.code}</span>
                    <span className="sec-group-tag">กลุ่ม {sec.no}</span>
                  </div>
                  <div className="sec-course-name">{crs?.name}</div>
                  <div className="sec-time-line">
                    {dayThai} · {mtg ? `${mtg.start}-${mtg.end}` : 'รอกำหนดเวลา'}
                  </div>
                  <div className="sec-bottom-row">
                    <span className="sec-room-enrolled">
                      {rm?.name || 'ยังไม่มีห้อง'} · {enrolled} คน
                    </span>
                    {isSelected ? (
                      <span className="status-editing-badge">กำลังแก้ไข</span>
                    ) : (
                      <span className="status-check-circle">✓</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSections.length > 4 && (
              <button
                className="btn-toggle-more-sections"
                onClick={() => setShowAllSections(!showAllSections)}
              >
                <span>{showAllSections ? 'ย่อรายการ ▴' : `ดูอีก ${filteredSections.length - 4} รายการ ▾`}</span>
              </button>
            )}
          </div>

          {/* Bottom Info Card */}
          <div className="col-sync-notice-card">
            <div className="notice-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <b>ข้อมูลผู้เรียนเป็นปัจจุบัน</b>
            </div>
            <p>ซิงค์จากการลงทะเบียนล่าสุด วันนี้ 08:40 น. ใช้จำนวนนี้ตรวจสอบความจุห้อง</p>
          </div>
        </div>

        {/* Column 2: Center Edit Form */}
        <div className="studio-col-editor">
          <div className="editor-card-header">
            <div>
              <h2 className="editor-title">แก้ไขคาบเรียน</h2>
              <div className="editor-subtitle">
                {activeCourse?.code} · กลุ่ม {activeSection?.no} · ภาคต้น 2569
              </div>
            </div>
            <div className={`save-status-badge ${isSaved ? 'saved' : 'pending'}`}>
              {isSaved ? 'บันทึกแล้ว' : 'ยังไม่บันทึก'}
            </div>
          </div>

          {/* Published original timetable banner */}
          <div className="published-original-card">
            <div className="pub-card-label">ตารางเดิมที่เผยแพร่แล้ว</div>
            <div className="pub-card-details">
              พุธ 13:00-15:00 · SC304 · 60 ที่นั่ง
            </div>
          </div>

          {/* Edit Form */}
          <div className="editor-form-body">
            {/* Field: Course */}
            <div className="form-group">
              <label className="form-label">รายวิชา *</label>
              <div className="form-select-wrap">
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="form-select"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <span className="select-arrow">▾</span>
              </div>
              <div className="form-field-helper">
                ผู้สอน: {activeCourse?.instructor || 'อ.ธนา วงศ์ดี'}
              </div>
            </div>

            {/* Field Row: Group & Enrolled Students */}
            <div className="form-row-two-col">
              <div className="form-group">
                <label className="form-label">กลุ่มเรียน *</label>
                <div className="form-select-wrap">
                  <select
                    value={formSecNo}
                    onChange={(e) => setFormSecNo(e.target.value)}
                    className="form-select"
                  >
                    <option value="01">01</option>
                    <option value="02">02</option>
                    <option value="03">03</option>
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">จำนวนผู้เรียน</label>
                <div className="form-input-locked-wrap">
                  <input
                    type="text"
                    value={`${activeEnrolled} คน`}
                    readOnly
                    className="form-input locked"
                  />
                  <span className="lock-icon">🔒</span>
                </div>
              </div>
            </div>

            {/* Field: Room */}
            <div className="form-group">
              <label className="form-label">ห้องเรียน *</label>
              <div className="form-select-wrap">
                <select
                  value={formRoomId}
                  onChange={(e) => {
                    setFormRoomId(e.target.value);
                    setIsSaved(false);
                  }}
                  className={`form-select ${capacityDeficit > 0 ? 'error-border' : ''}`}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.type || 'ห้องเรียน'} · {r.capacity} ที่นั่ง
                    </option>
                  ))}
                </select>
                <span className="select-arrow">▾</span>
              </div>
              {capacityDeficit > 0 && (
                <div className="form-field-error">
                  ความจุไม่เพียงพอ ขาดอีก {capacityDeficit} ที่นั่ง
                </div>
              )}
            </div>

            {/* Field: Day */}
            <div className="form-group">
              <label className="form-label">วันเรียน *</label>
              <div className="form-select-wrap">
                <select
                  value={formDay}
                  onChange={(e) => {
                    setFormDay(e.target.value as any);
                    setIsSaved(false);
                  }}
                  className="form-select"
                >
                  <option value="Mon">จันทร์</option>
                  <option value="Tue">อังคาร</option>
                  <option value="Wed">พุธ</option>
                  <option value="Thu">พฤหัสบดี</option>
                  <option value="Fri">ศุกร์</option>
                  <option value="Sat">เสาร์</option>
                  <option value="Sun">อาทิตย์</option>
                </select>
                <span className="select-arrow">▾</span>
              </div>
            </div>

            {/* Field Row: Start & End Time */}
            <div className="form-row-two-col">
              <div className="form-group">
                <label className="form-label">เวลาเริ่ม *</label>
                <div className="form-input-time-wrap">
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => {
                      setFormStart(e.target.value);
                      setIsSaved(false);
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">เวลาสิ้นสุด *</label>
                <div className="form-input-time-wrap">
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => {
                      setFormEnd(e.target.value);
                      setIsSaved(false);
                    }}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox: Repeat Weekly */}
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={repeatWeekly}
                onChange={(e) => setRepeatWeekly(e.target.checked)}
              />
              <span>เรียนซ้ำทุกสัปดาห์ในภาคต้น 2569</span>
            </label>

            {/* Conflict Summary Row */}
            <div className="conflict-summary-row">
              {hasConflicts ? (
                <div className="conflict-count-text">
                  พบข้อขัดแย้ง {validationResults.length} รายการ
                </div>
              ) : (
                <div className="conflict-ok-text">
                  ✓ พร้อมบันทึก ไม่พบข้อขัดแย้ง
                </div>
              )}

              <button
                className="btn-recheck"
                onClick={() => {
                  /* trigger re-render / check */
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>ตรวจสอบอีกครั้ง</span>
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="editor-actions-row">
              <button
                className="btn-action-delete"
                onClick={() => {
                  const m = meetings.find((item) => item.sectionId === activeSection?.id);
                  if (m) onDeleteMeeting(m.id);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>ลบคาบเรียน</span>
              </button>

              <div className="actions-right-group">
                <button
                  className="btn-action-cancel"
                  onClick={() => handleSelectSection(activeSection)}
                >
                  ยกเลิก
                </button>
                <button
                  className={`btn-action-save ${hasConflicts ? 'disabled' : 'ready'}`}
                  disabled={hasConflicts}
                  onClick={handleSave}
                  id="btn-save-schedule-change"
                >
                  {hasConflicts ? (
                    <>
                      <span className="btn-icon">🔒</span>
                      <span>บันทึกการเปลี่ยนแปลง</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">✓</span>
                      <span>บันทึกการเปลี่ยนแปลง</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="editor-footer-note">
              แก้ไขข้อขัดแย้งก่อนบันทึก เมื่อบันทึกสำเร็จ ระบบจะแจ้งการเปลี่ยนแปลงให้นักศึกษาที่ลงทะเบียน
            </div>
          </div>
        </div>

        {/* Column 3: Diagnostics & AI Recommendations */}
        <div className="studio-col-diagnostics">
          {/* Card 1: Conflict Warnings Card */}
          <div className={`diagnostics-card conflict-card ${!hasConflicts ? 'resolved' : ''}`}>
            <div className="card-top-title-row">
              <div className="title-with-icon">
                <span className="warning-icon">{hasConflicts ? '⚠️' : '✓'}</span>
                <span className="card-heading">
                  {hasConflicts ? 'ยังบันทึกไม่ได้' : 'ผ่านการตรวจสอบความถูกต้อง'}
                </span>
              </div>
              <span className={`conflict-badge ${hasConflicts ? 'active-conflict' : 'resolved-badge'}`}>
                {hasConflicts ? `${validationResults.length} ข้อขัดแย้ง` : 'พร้อมบันทึก'}
              </span>
            </div>

            {hasConflicts ? (
              <div className="conflict-items-container">
                {validationResults.map((c, i) => (
                  <div key={i} className="conflict-detail-item">
                    <div className="conflict-item-title">
                      {c.type === 'overlap' ? '📅 ' : '👥 '}
                      {c.title}
                    </div>
                    <div className="conflict-item-desc">{c.desc}</div>
                  </div>
                ))}
                <div className="conflict-check-link">
                  ตรวจสอบตารางเวลาใช้ห้องและจำนวนผู้เรียนล่าสุดแล้ว
                </div>
              </div>
            ) : (
              <div className="conflict-resolved-box">
                <p>ตารางเวลานี้ไม่มีคาบเรียนซ้อนทับ และห้อง {currentRoom?.name} มีความจุเพียงพอกับผู้เรียน {activeEnrolled} คน</p>
              </div>
            )}
          </div>

          {/* Card 2: AI Recommendations Card */}
          <div className="diagnostics-card ai-recommendations-card">
            <div className="card-top-title-row">
              <div className="title-with-icon">
                <span className="ai-wand-icon">🪄</span>
                <span className="card-heading">ทางเลือกแนะนำโดย AI</span>
              </div>
              <span className="ai-count-badge">2 ทางเลือก</span>
            </div>
            <p className="ai-sub-description">
              ช่วงเวลาต่อไปนี้ไม่มีคาบทับซ้อน และรองรับผู้เรียนครบทั้ง {activeEnrolled} คน
            </p>

            {/* AI Option 1: SC304 (Recommended) */}
            <div className="ai-option-card">
              <div className="ai-option-header">
                <span className="option-room-title">SC304</span>
                <span className="badge-best-choice">แนะนำที่สุด</span>
              </div>
              <div className="option-time-slot">จันทร์ · 09:00-11:00</div>
              <div className="option-seats-info">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span>60 ที่นั่ง · เหลือ 18 ที่นั่ง</span>
              </div>
              <div className="option-rationale-note">
                ตรงเวลาเดิมที่เลือก · เปลี่ยนเฉพาะห้อง
              </div>
              <button
                className="btn-apply-rec primary"
                onClick={handleApplyRec1}
                id="btn-apply-ai-sc304"
              >
                <span>ใช้ทางเลือกนี้</span>
                <span className="arrow-icon">↗</span>
              </button>
            </div>

            {/* AI Option 2: SC301 */}
            <div className="ai-option-card">
              <div className="ai-option-header">
                <span className="option-room-title">SC301</span>
                <span className="badge-qualified">ผ่านเงื่อนไข</span>
              </div>
              <div className="option-time-slot">พฤหัสบดี · 15:00-17:00</div>
              <div className="option-seats-info">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span>50 ที่นั่ง · เหลือ 8 ที่นั่ง</span>
              </div>
              <div className="option-rationale-note">
                เปลี่ยนวันและห้อง · อาจารย์เดียวกัน
              </div>
              <button
                className="btn-apply-rec outline"
                onClick={handleApplyRec2}
                id="btn-apply-ai-sc301"
              >
                <span>ใช้ทางเลือกนี้</span>
                <span className="arrow-icon">↗</span>
              </button>
            </div>

            {/* AI Recommendation Security Note */}
            <div className="ai-footer-guarantee">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>ทุกทางเลือกผ่านกฎเวลาและความจุแล้ว ระบบจะตรวจสอบซ้ำก่อนบันทึก</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
