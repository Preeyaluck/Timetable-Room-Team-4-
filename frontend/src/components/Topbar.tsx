import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomRequest, User } from '../types';

interface TopbarProps {
  activeView: string;
  user: User;
  onLogout: () => void;
  pendingRequestsCount?: number;
  roomRequests?: RoomRequest[];
  rooms?: Room[];
  onNavigateToRequests?: () => void;
  onOpenAiModal?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeView,
  user,
  onLogout,
  pendingRequestsCount = 0,
  roomRequests = [],
  rooms = [],
  onNavigateToRequests,
  onOpenAiModal,
}) => {
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    };
    if (showNotificationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationMenu]);

  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'timetable':
        return 'ตารางเรียนของฉัน';
      case 'rooms':
        return 'ตารางการใช้ห้อง';
      case 'manage':
        return 'จัดการห้องเรียน';
      case 'requests':
        return user.role === 'staff' ? 'หน้ารับคำร้องขอใช้ห้อง' : 'คำร้องขอใช้ห้องของฉัน';
      default:
        return 'ตารางเรียน';
    }
  };

  const isStaff = user.role === 'staff';

  const dayToThai = (day: string) => {
    const map: Record<string, string> = {
      Mon: 'วันจันทร์',
      Monday: 'วันจันทร์',
      Tue: 'วันอังคาร',
      Tuesday: 'วันอังคาร',
      Wed: 'วันพุธ',
      Wednesday: 'วันพุธ',
      Thu: 'วันพฤหัสบดี',
      Thursday: 'วันพฤหัสบดี',
      Fri: 'วันศุกร์',
      Friday: 'วันศุกร์',
      Sat: 'วันเสาร์',
      Saturday: 'วันเสาร์',
      Sun: 'วันอาทิตย์',
      Sunday: 'วันอาทิตย์',
    };
    return map[day] || `วัน${day}`;
  };

  const getRoomName = (roomId: string) => {
    const found = rooms.find((r) => r.id.toLowerCase() === roomId.toLowerCase());
    if (found) return found.name;
    return roomId.replace(/^rm_/i, '').toUpperCase();
  };

  // 1. Staff sees all requests (pending first, then others)
  // 2. Student sees ONLY their own requests (matching studentId)
  const myRequests = isStaff
    ? roomRequests
    : roomRequests.filter((r) => r.studentId === user.id);

  const pendingRequests = myRequests.filter((r) => r.status === 'pending');

  // Display items in dropdown:
  // For staff: show pending requests; if no pending, show up to 3 recent requests
  // For student: show their requests (pending, approved, rejected)
  const displayItems = isStaff
    ? pendingRequests.length > 0
      ? pendingRequests
      : myRequests.slice(0, 3)
    : myRequests.slice(0, 5);

  const displayCount = pendingRequests.length;

  return (
    <header className="app-topbar">
      <div className="topbar-breadcrumbs">
        <span className="crumb-root">ระบบบริการการศึกษา</span>
        <span className="crumb-separator">›</span>
        <span className="crumb-current">{getBreadcrumbTitle()}</span>
      </div>

      <div className="topbar-right">
        {/* AI Room Advisor Button */}
        {onOpenAiModal && (
          <button
            className="topbar-ai-btn"
            onClick={onOpenAiModal}
            id="btn-topbar-ai-advisor"
            title="ปรึกษา AI ค้นหาห้องว่างและยื่นคำร้อง"
          >
            <span className="ai-sparkle-icon">✨</span>
            <span>ปรึกษา AI</span>
          </button>
        )}

        {(() => {
          const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
          const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
          const now = new Date();
          const dateStr = `${thaiDays[now.getDay()]} ${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
          return <span className="topbar-date">{dateStr}</span>;
        })()}

        {activeView === 'manage' && isStaff ? (
          <div className="topbar-role-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>สิทธิ์จัดการห้องเรียน</span>
          </div>
        ) : (
          <div className="topbar-term-badge">
            <span className="badge-icon">🎓</span>
            <span>ภาคต้น / 2569</span>
          </div>
        )}

        {/* Notification Bell with Badge */}
        <div className="bell-container" ref={notifRef}>
          <button
            className={`topbar-bell-btn ${pendingRequestsCount > 0 ? 'has-notifications' : ''}`}
            title={pendingRequestsCount > 0 ? `มีการแจ้งเตือนใหม่ ${pendingRequestsCount} รายการ` : 'การแจ้งเตือน'}
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            id="btn-notification-bell"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>

            {pendingRequestsCount > 0 && (
              <span className="bell-badge-pill" id="bell-badge-count">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Menu */}
          {showNotificationMenu && (
            <div className="notification-dropdown-menu">
              <div className="notif-dropdown-header">
                <div>
                  <div className="notif-header-title">
                    {isStaff ? 'การแจ้งเตือนคำร้องขอใช้ห้อง' : 'การแจ้งเตือนคำร้องของฉัน'}
                  </div>
                  <div className="notif-header-sub">
                    {isStaff
                      ? displayCount > 0
                        ? `มีคำร้องที่รอการอนุมัติ ${displayCount} รายการ`
                        : 'ไม่มีคำร้องค้างในขณะนี้'
                      : myRequests.length > 0
                      ? displayCount > 0
                        ? `มีคำร้องที่รอการพิจารณา ${displayCount} รายการ`
                        : `อัปเดตสถานะคำร้องล่าสุด (${myRequests.length} รายการ)`
                      : 'ไม่มีการแจ้งเตือนในขณะนี้'}
                  </div>
                </div>
                {displayCount > 0 ? (
                  <span className="notif-badge-amber">{displayCount} ใหม่</span>
                ) : myRequests.length > 0 && !isStaff ? (
                  <span className="notif-badge-green">อัปเดต</span>
                ) : null}
              </div>

              <div className="notif-list-container">
                {displayItems.length > 0 ? (
                  displayItems.map((req) => {
                    const roomName = getRoomName(req.roomId);
                    const dayThai = dayToThai(req.day);

                    return (
                      <div
                        key={req.id}
                        className="notif-item-row"
                        onClick={() => {
                          setShowNotificationMenu(false);
                          if (onNavigateToRequests) onNavigateToRequests();
                        }}
                      >
                        <div className="notif-item-icon">
                          {req.status === 'approved' ? '🎉' : req.status === 'rejected' ? '⚠️' : '📨'}
                        </div>
                        <div className="notif-item-content">
                          <div className="notif-item-title">
                            {isStaff ? (
                              <span>
                                <b>{req.studentName}</b> ขอใช้ห้อง <b>{roomName}</b>
                              </span>
                            ) : req.status === 'approved' ? (
                              <span>
                                คำร้องขอใช้ห้อง <b>{roomName}</b> ได้รับการอนุมัติแล้ว
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span>
                                คำร้องขอใช้ห้อง <b>{roomName}</b> ไม่ได้รับการอนุมัติ
                              </span>
                            ) : (
                              <span>
                                คำร้องขอใช้ห้อง <b>{roomName}</b> (อยู่ระหว่างการพิจารณา)
                              </span>
                            )}
                          </div>

                          <div className="notif-item-details">
                            {req.status === 'rejected' && req.rejectReason ? (
                              <span style={{ color: '#dc2626' }}>เหตุผล: {req.rejectReason}</span>
                            ) : (
                              <span>
                                {roomName} · {dayThai} {req.start}–{req.end} น.
                              </span>
                            )}
                            {req.createdAt && (
                              <span style={{ marginLeft: '6px', opacity: 0.7, fontSize: '10.5px' }}>
                                ({req.createdAt})
                              </span>
                            )}
                          </div>

                          <div
                            className={`notif-item-status-pill ${
                              req.status === 'approved'
                                ? 'approved'
                                : req.status === 'rejected'
                                ? 'rejected'
                                : 'pending'
                            }`}
                          >
                            {req.status === 'approved'
                              ? '✓ อนุมัติแล้ว'
                              : req.status === 'rejected'
                              ? '✗ ไม่อนุมัติ'
                              : '⏳ รอการอนุมัติ'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="notif-empty-state">
                    {isStaff ? (
                      <span>✓ ตรวจสอบคำร้องทั้งหมดเรียบร้อยแล้ว</span>
                    ) : (
                      <div>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>📭</div>
                        <div>ยังไม่มีประวัติคำร้องขอใช้ห้องเรียน</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          เมื่อยื่นคำร้องขอใช้ห้อง สถานะการพิจารณาจะแจ้งเตือนที่นี่
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="notif-dropdown-footer">
                <button
                  className="btn-view-all-requests"
                  onClick={() => {
                    setShowNotificationMenu(false);
                    if (onNavigateToRequests) onNavigateToRequests();
                  }}
                >
                  {isStaff ? 'เปิดดูหน้ารับคำร้องทั้งหมด →' : 'ดูคำร้องของฉันทั้งหมด →'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="topbar-logout-btn"
          onClick={onLogout}
          title="ออกจากระบบ (Logout)"
          id="btn-topbar-logout"
        >
          <span>Logout</span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>⎋</span>
        </button>
      </div>
    </header>
  );
};
