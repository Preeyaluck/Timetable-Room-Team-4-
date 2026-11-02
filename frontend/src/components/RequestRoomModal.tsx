import React, { useState } from 'react';
import { Day, Meeting, Room, User } from '../types';
import { timeOpts, t2m } from '../services/api';

interface RequestRoomModalProps {
  currentUser: User;
  initialRoomId: string;
  rooms: Room[];
  meetings: Meeting[];
  onSubmit: (requestData: {
    studentId: string;
    studentName: string;
    roomId: string;
    day: Day;
    start: string;
    end: string;
    purpose: string;
    attendees: number;
  }) => void;
  onClose: () => void;
}

export const RequestRoomModal: React.FC<RequestRoomModalProps> = ({
  currentUser,
  initialRoomId,
  rooms,
  meetings,
  onSubmit,
  onClose,
}) => {
  const [roomId, setRoomId] = useState<string>(initialRoomId || rooms[0]?.id || '');
  const [day, setDay] = useState<Day>('Mon');
  const [start, setStart] = useState<string>('10:00');
  const [end, setEnd] = useState<string>('12:00');
  const [purpose, setPurpose] = useState<string>('');
  const [attendees, setAttendees] = useState<number>(15);

  const selectedRoom = rooms.find((r) => r.id === roomId) || rooms[0];

  const daysOptions: { key: Day; label: string }[] = [
    { key: 'Mon', label: 'วันจันทร์ (Monday)' },
    { key: 'Tue', label: 'วันอังคาร (Tuesday)' },
    { key: 'Wed', label: 'วันพุธ (Wednesday)' },
    { key: 'Thu', label: 'วันพฤหัสบดี (Thursday)' },
    { key: 'Fri', label: 'วันศุกร์ (Friday)' },
  ];

  const dayThaiLabels: Record<Day, string> = {
    Mon: 'จันทร์',
    Tue: 'อังคาร',
    Wed: 'พุธ',
    Thu: 'พฤหัสบดี',
    Fri: 'ศุกร์',
  };

  // Validation
  const errors: string[] = [];
  if (t2m(end) <= t2m(start)) {
    errors.push('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
  }

  // Check if room is booked by an existing class
  const conflictingMeeting = meetings.find(
    (m) =>
      m.roomId === roomId &&
      m.day === day &&
      t2m(m.start) < t2m(end) &&
      t2m(start) < t2m(m.end)
  );

  if (conflictingMeeting) {
    errors.push(
      `ห้อง ${selectedRoom?.name} มีการใช้งานอยู่แล้วในวัน${dayThaiLabels[day]} ช่วงเวลา ${conflictingMeeting.start} – ${conflictingMeeting.end} น. กรุณาเลือกช่วงเวลาอื่นหรือห้องอื่น`
    );
  }

  if (selectedRoom && attendees > selectedRoom.capacity) {
    errors.push(
      `จำนวนผู้เข้าร่วม (${attendees} คน) เกินความจุของห้อง ${selectedRoom.name} (${selectedRoom.capacity} ที่นั่ง)`
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;
    if (!purpose.trim()) {
      alert('กรุณาระบุวัตถุประสงค์ในการขอใช้ห้องเรียน');
      return;
    }

    onSubmit({
      studentId: currentUser.id,
      studentName: currentUser.name,
      roomId,
      day,
      start,
      end,
      purpose: purpose.trim(),
      attendees: Number(attendees) || 1,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog request-room-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header request-modal-header">
          <div className="request-header-left">
            <div className="request-icon-badge">📨</div>
            <div>
              <h3 className="modal-title">ยื่นคำร้องขอใช้ห้องเรียน</h3>
              <p className="modal-subtitle">
                ส่งคำร้องไปยังเจ้าหน้าที่จัดตารางเรียนเพื่อพิจารณาอนุมัติ
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button" id="btn-close-request-modal">
            ✕
          </button>
        </div>

        {/* Requester Profile Strip */}
        <div className="requester-info-strip">
          <div className="requester-avatar">
            {currentUser.initials || currentUser.name.charAt(0)}
          </div>
          <div className="requester-details">
            <span className="requester-name">{currentUser.name}</span>
            <span className="requester-meta">
              รหัสนักศึกษา: <b>{currentUser.id}</b> · สาขาวิชา: {currentUser.department || 'วิทยาการคอมพิวเตอร์'}
            </span>
          </div>
          <span className="requester-term-tag">ภาคต้น / 2569</span>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="request-modal-form">
          <div className="request-form-body">
            {/* Row 1: Classroom and Day */}
            <div className="form-two-cols">
              <div className="form-field-group">
                <label className="field-label">
                  ห้องเรียนที่ต้องการขอใช้ <span className="req-star">*</span>
                </label>
                <select
                  className="modern-input-select"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  id="select-request-room"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.capacity} ที่นั่ง ({r.building} {r.floor || 'ชั้น 3'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <label className="field-label">
                  วันที่ต้องการใช้งาน <span className="req-star">*</span>
                </label>
                <select
                  className="modern-input-select"
                  value={day}
                  onChange={(e) => setDay(e.target.value as Day)}
                  id="select-request-day"
                >
                  {daysOptions.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Time Start and End */}
            <div className="form-two-cols">
              <div className="form-field-group">
                <label className="field-label">
                  เวลาเริ่มต้น <span className="req-star">*</span>
                </label>
                <select
                  className="modern-input-select"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  id="select-request-start"
                >
                  {timeOpts.slice(0, -1).map((t) => (
                    <option key={t} value={t}>
                      {t} น.
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <label className="field-label">
                  เวลาสิ้นสุด <span className="req-star">*</span>
                </label>
                <select
                  className="modern-input-select"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  id="select-request-end"
                >
                  {timeOpts.slice(1).map((t) => (
                    <option key={t} value={t}>
                      {t} น.
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Purpose */}
            <div className="form-field-group">
              <label className="field-label">
                วัตถุประสงค์การขอใช้ห้อง <span className="req-star">*</span>
              </label>
              <input
                type="text"
                className="modern-input-text"
                placeholder="เช่น ติวสอบกลางภาควิชา CS201, สัมมนาและนำเสนอโครงงานกลุ่มย่อย"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                id="input-request-purpose"
              />
            </div>

            {/* Row 4: Attendees and Room Capacity Card */}
            <div className="form-two-cols align-center">
              <div className="form-field-group">
                <label className="field-label">
                  จำนวนผู้เข้าร่วม (คน) <span className="req-star">*</span>
                </label>
                <input
                  type="number"
                  className="modern-input-text"
                  min="1"
                  max={selectedRoom ? selectedRoom.capacity : 100}
                  value={attendees}
                  onChange={(e) => setAttendees(Number(e.target.value))}
                  required
                  id="input-request-attendees"
                />
              </div>

              <div className="room-capacity-summary-card">
                <div className="cap-summary-label">ความจุห้อง {selectedRoom?.name}</div>
                <div className="cap-summary-val">
                  <span className="cap-highlight">{selectedRoom?.capacity || 40}</span> ที่นั่ง
                  <span className="cap-sub">
                    ({selectedRoom?.type || 'ห้องบรรยาย'} · {selectedRoom?.building})
                  </span>
                </div>
              </div>
            </div>

            {/* Live Availability Status Banner */}
            {errors.length > 0 ? (
              <div className="slot-status-banner error">
                <div className="status-banner-icon">⚠️</div>
                <div className="status-banner-text">
                  <b>ไม่สามารถยื่นคำร้องในช่วงเวลานี้ได้:</b>
                  <ul className="status-error-list">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="slot-status-banner success">
                <div className="status-banner-icon">✓</div>
                <div className="status-banner-text">
                  <b>ห้องว่าง สามารถยื่นคำร้องได้!</b>
                  <div>
                    ห้อง {selectedRoom?.name} ว่างสมบูรณ์ในวัน{dayThaiLabels[day]} ช่วงเวลา {start} – {end} น.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer request-modal-footer">
            <span className="footer-notice-text">
              🔒 คำร้องจะถูกส่งไปยังระบบการแจ้งเตือนของเจ้าหน้าที่ทันที
            </span>
            <div className="footer-buttons-wrap">
              <button className="btn-modal-cancel" type="button" onClick={onClose} id="btn-cancel-request">
                ยกเลิก
              </button>
              <button
                className="btn-modal-submit"
                type="submit"
                disabled={errors.length > 0}
                id="btn-confirm-submit-request"
              >
                <span>📨 ส่งคำร้องขอใช้ห้อง</span>
                <span className="arrow-sym">→</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
