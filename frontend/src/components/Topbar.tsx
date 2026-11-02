import React, { useState } from 'react';
import { RoomRequest, User } from '../types';

interface TopbarProps {
  activeView: string;
  user: User;
  onLogout: () => void;
  pendingRequestsCount?: number;
  roomRequests?: RoomRequest[];
  onNavigateToRequests?: () => void;
  onOpenAiModal?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeView,
  user,
  onLogout,
  pendingRequestsCount = 0,
  roomRequests = [],
  onNavigateToRequests,
  onOpenAiModal,
}) => {
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

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
  const pendingRequests = roomRequests.filter((r) => r.status === 'pending');

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

        <span className="topbar-date">จันทร์ 16 พ.ย. 2569</span>

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
        <div className="bell-container">
          <button
            className={`topbar-bell-btn ${pendingRequestsCount > 0 ? 'has-notifications' : ''}`}
            title={pendingRequestsCount > 0 ? `มีคำร้องใหม่ ${pendingRequestsCount} รายการ` : 'การแจ้งเตือน'}
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
                  <div className="notif-header-title">การแจ้งเตือนคำร้อง</div>
                  <div className="notif-header-sub">
                    {pendingRequestsCount > 0
                      ? `มีคำร้องที่รอการอนุมัติ ${pendingRequestsCount} รายการ`
                      : 'ไม่มีคำร้องค้างในขณะนี้'}
                  </div>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="notif-badge-amber">{pendingRequestsCount} ใหม่</span>
                )}
              </div>

              <div className="notif-list-container">
                {pendingRequests.length > 0 ? (
                  pendingRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="notif-item-row"
                      onClick={() => {
                        setShowNotificationMenu(false);
                        if (onNavigateToRequests) onNavigateToRequests();
                      }}
                    >
                      <div className="notif-item-icon">📨</div>
                      <div className="notif-item-content">
                        <div className="notif-item-title">
                          <b>{req.studentName}</b> ขอใช้ห้อง
                        </div>
                        <div className="notif-item-details">
                          {req.roomId.toUpperCase()} · วัน{req.day} {req.start}–{req.end} น.
                        </div>
                        <div className="notif-item-status-pill">สถานะ: ยังไม่อนุมัติ</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="notif-empty-state">
                    <span>✓ ตรวจสอบคำร้องทั้งหมดเรียบร้อยแล้ว</span>
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

        {/* Changed 'สลับบัญชี' to 'Logout' */}
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
