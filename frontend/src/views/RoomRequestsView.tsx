import React, { useState } from 'react';
import { Room, RoomRequest, User } from '../types';

interface RoomRequestsViewProps {
  currentUser: User;
  rooms: Room[];
  roomRequests: RoomRequest[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason?: string) => void;
  onOpenNewRequestModal?: () => void;
  onOpenAiAdvisor?: () => void;
}

export const RoomRequestsView: React.FC<RoomRequestsViewProps> = ({
  currentUser,
  rooms,
  roomRequests,
  onApproveRequest,
  onRejectRequest,
  onOpenNewRequestModal,
  onOpenAiAdvisor,
}) => {
  const isStaff = currentUser.role === 'staff';
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const getRoom = (id: string) => rooms.find((r) => r.id === id);

  // If student, show only their own requests; if staff, show all requests
  const userRequests = isStaff
    ? roomRequests
    : roomRequests.filter((r) => r.studentId === currentUser.id);

  // Count by status
  const pendingCount = userRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = userRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = userRequests.filter((r) => r.status === 'rejected').length;

  const filteredRequests = userRequests.filter((req) => {
    if (activeTab !== 'all' && req.status !== activeTab) return false;
    if (selectedRoomFilter && req.roomId !== selectedRoomFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const rm = getRoom(req.roomId);
      const match =
        req.studentName.toLowerCase().includes(q) ||
        req.studentId.toLowerCase().includes(q) ||
        (rm?.name || '').toLowerCase().includes(q) ||
        req.purpose.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleConfirmReject = (id: string) => {
    onRejectRequest(id, rejectReasonInput.trim() || 'ตารางเวลาชนกับกิจกรรมคณะหรือคาบเรียนที่มีอยู่');
    setRejectingId(null);
    setRejectReasonInput('');
  };

  const dayToThai = (day: string) => {
    switch (day) {
      case 'Mon':
        return 'จันทร์';
      case 'Tue':
        return 'อังคาร';
      case 'Wed':
        return 'พุธ';
      case 'Thu':
        return 'พฤหัสบดี';
      case 'Fri':
        return 'ศุกร์';
      case 'Sat':
        return 'เสาร์';
      case 'Sun':
        return 'อาทิตย์';
      default:
        return day;
    }
  };

  return (
    <div className="view-container room-requests-view">
      {/* Page Header */}
      <div className="view-page-header">
        <div>
          <div className="view-kicker">
            {isStaff ? 'ระบบจัดการคำร้องขอใช้ห้อง' : 'ระบบคำร้องนักศึกษา'}
          </div>
          <h1 className="view-main-title">
            {isStaff ? 'หน้ารับคำร้องขอใช้ห้อง' : 'คำร้องขอใช้ห้องของฉัน'}
          </h1>
          <p className="view-main-sub">
            {isStaff
              ? 'ตรวจสอบและพิจารณาคำร้องขอใช้ห้องเรียนจากนักศึกษา พร้อมสถานะการอนุมัติแบบเรียลไทม์'
              : 'ติดตามสถานะคำร้องขอใช้ห้องเรียนสำหรับกิจกรรม ติว หรือทำงานกลุ่ม'}
          </p>
        </div>

        <div className="view-header-actions">
          {onOpenAiAdvisor && (
            <button
              className="btn-action-outline btn-ai-trigger"
              onClick={onOpenAiAdvisor}
              id="btn-requests-ai-advisor"
              title="ปรึกษา AI ในการหาห้องและส่งคำร้อง"
            >
              <span className="sparkle-icon">✨</span>
              <span>ปรึกษา AI ในการขอห้อง</span>
            </button>
          )}

          {!isStaff && onOpenNewRequestModal && (
            <button
              className="btn-action-primary"
              onClick={onOpenNewRequestModal}
              id="btn-student-new-request"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>+ ส่งคำขอใช้ห้องใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="requests-stats-grid">
        <div className={`req-stat-card ${activeTab === 'all' ? 'active-stat' : ''}`} onClick={() => setActiveTab('all')}>
          <div className="stat-card-label">คำร้องทั้งหมด</div>
          <div className="stat-card-value">{userRequests.length}</div>
          <div className="stat-card-sub">รายการในระบบ</div>
        </div>

        <div className={`req-stat-card pending-card ${activeTab === 'pending' ? 'active-stat' : ''}`} onClick={() => setActiveTab('pending')}>
          <div className="stat-card-label">ยังไม่อนุมัติ</div>
          <div className="stat-card-value pending-val">{pendingCount}</div>
          <div className="stat-card-sub">รอดำเนินการ</div>
        </div>

        <div className={`req-stat-card approved-card ${activeTab === 'approved' ? 'active-stat' : ''}`} onClick={() => setActiveTab('approved')}>
          <div className="stat-card-label">อนุมัติแล้ว</div>
          <div className="stat-card-value approved-val">{approvedCount}</div>
          <div className="stat-card-sub">พร้อมใช้งานตามเวลา</div>
        </div>

        <div className={`req-stat-card rejected-card ${activeTab === 'rejected' ? 'active-stat' : ''}`} onClick={() => setActiveTab('rejected')}>
          <div className="stat-card-label">ปฏิเสธ</div>
          <div className="stat-card-value rejected-val">{rejectedCount}</div>
          <div className="stat-card-sub">ไม่สามารถจัดสรรได้</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="requests-filter-bar">
        {/* Status Tabs */}
        <div className="status-tabs-group">
          <button
            className={`status-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>ทั้งหมด</span>
            <span className="tab-count-badge">{userRequests.length}</span>
          </button>

          <button
            className={`status-tab-btn pending ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span>ยังไม่อนุมัติ</span>
            <span className="tab-count-badge pending">{pendingCount}</span>
          </button>

          <button
            className={`status-tab-btn approved ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <span>อนุมัติ</span>
            <span className="tab-count-badge approved">{approvedCount}</span>
          </button>

          <button
            className={`status-tab-btn rejected ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <span>ปฏิเสธ</span>
            <span className="tab-count-badge rejected">{rejectedCount}</span>
          </button>
        </div>

        <div className="requests-search-room-group">
          {/* Search Box */}
          <div className="requests-search-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัสนักศึกษา, ห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Room Filter Select */}
          <div className="requests-room-select-wrap">
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
            >
              <option value="">ทุกห้องเรียน</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.building})
                </option>
              ))}
            </select>
            <span className="select-arrow">▾</span>
          </div>
        </div>
      </div>

      {/* Requests List Cards */}
      <div className="requests-list-container">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const room = getRoom(req.roomId);

            return (
              <div key={req.id} className={`request-card-item status-${req.status}`}>
                {/* Header Row */}
                <div className="req-card-top-header">
                  <div className="req-student-profile">
                    <div className="req-student-avatar">
                      {req.studentName.charAt(0)}
                    </div>
                    <div>
                      <div className="req-student-name-row">
                        <span className="req-student-name">{req.studentName}</span>
                        <span className="req-student-id">({req.studentId})</span>
                      </div>
                      <div className="req-student-dept">
                        {req.department || 'วิทยาการคอมพิวเตอร์'} · ส่งคำร้องเมื่อ {req.createdAt}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="req-status-badge-wrap">
                    {req.status === 'pending' && (
                      <span className="status-pill-badge pending">
                        <span className="status-dot-amber"></span>
                        <span>ยังไม่อนุมัติ</span>
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="status-pill-badge approved">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>อนุมัติ</span>
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="status-pill-badge rejected">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>ปฏิเสธ</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Details Grid */}
                <div className="req-card-body-grid">
                  <div className="req-detail-col">
                    <div className="req-detail-label">ห้องเรียนที่ขอใช้</div>
                    <div className="req-detail-val room-name">
                      🏛️ {room?.name || req.roomId}
                      <span className="room-type-tag">
                        {room?.type || 'ห้องปฏิบัติการ'}
                      </span>
                    </div>
                    <div className="req-detail-sub">
                      {room?.building} {room?.floor || 'ชั้น 3'} · ความจุ {room?.capacity} ที่นั่ง
                    </div>
                  </div>

                  <div className="req-detail-col">
                    <div className="req-detail-label">วันและช่วงเวลา</div>
                    <div className="req-detail-val">
                      📅 วัน{dayToThai(req.day)} · {req.start} - {req.end} น.
                    </div>
                    <div className="req-detail-sub">
                      ระยะเวลา 2 ชั่วโมง
                    </div>
                  </div>

                  <div className="req-detail-col">
                    <div className="req-detail-label">จำนวนผู้เข้าร่วม</div>
                    <div className="req-detail-val">
                      👥 {req.attendees} คน
                    </div>
                    <div className="req-detail-sub">
                      {room && req.attendees <= room.capacity ? '✓ พอดีความจุห้อง' : '⚠️ เกินความจุ'}
                    </div>
                  </div>
                </div>

                {/* Purpose Note */}
                <div className="req-card-purpose-box">
                  <span className="purpose-tag">วัตถุประสงค์การใช้ห้อง:</span>
                  <span className="purpose-text">{req.purpose}</span>
                </div>

                {/* Rejection reason if rejected */}
                {req.status === 'rejected' && req.rejectReason && (
                  <div className="req-card-reject-reason-box">
                    <span className="reject-reason-tag">เหตุผลการปฏิเสธ:</span>
                    <span className="reject-reason-text">{req.rejectReason}</span>
                  </div>
                )}

                {/* Staff Actions when pending */}
                {isStaff && req.status === 'pending' && (
                  <div className="req-card-actions-bar">
                    <div className="actions-hint-text">
                      * เมื่ออนุมัติแล้ว ระบบจะจัดสรรเข้าสู่ตารางการใช้ห้อง และส่งการแจ้งเตือนให้นักศึกษา
                    </div>
                    <div className="actions-buttons-group">
                      <button
                        className="btn-action-reject"
                        onClick={() => setRejectingId(req.id)}
                      >
                        ✕ ปฏิเสธคำร้อง
                      </button>
                      <button
                        className="btn-action-approve"
                        onClick={() => onApproveRequest(req.id)}
                      >
                        ✓ อนุมัติคำร้อง
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="requests-empty-state">
            <div className="empty-icon">📨</div>
            <div className="empty-title">ไม่พบคำร้องในสถานะที่เลือก</div>
            <div className="empty-sub">
              {activeTab === 'all'
                ? 'ยังไม่มีประวัติคำร้องขอใช้ห้องในระบบ'
                : `ไม่มีคำร้องที่อยู่ในสถานะ "${activeTab === 'pending' ? 'ยังไม่อนุมัติ' : activeTab === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}"`}
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal Prompt */}
      {rejectingId && (
        <div className="modal-backdrop" onClick={() => setRejectingId(null)}>
          <div className="modal-dialog reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">ระบุเหตุผลในการปฏิเสธคำร้อง</h3>
              <button className="modal-close-btn" onClick={() => setRejectingId(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                โปรดระบุเหตุผลเพื่อให้ผู้ยื่นคำร้องทราบสาเหตุ (เช่น เวลาชนกับคาบเรียน, ห้องปิดปรับปรุง):
              </p>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น ห้อง SC303 มีคาบเรียนประจำอยู่แล้วในวันและเวลาดังกล่าว"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn-action-cancel" onClick={() => setRejectingId(null)}>
                ยกเลิก
              </button>
              <button
                className="btn-action-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => handleConfirmReject(rejectingId)}
              >
                ยืนยันปฏิเสธคำร้อง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
