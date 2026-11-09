import React, { useState } from 'react';
import { User } from '../types';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
  pendingRequestsCount?: number;
  onOpenAiModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  user,
  onLogout,
  pendingRequestsCount = 0,
  onOpenAiModal,
}) => {
  const isStaff = user.role === 'staff';
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div className="brand-title-wrap">
          <span className="brand-title">Timetable</span>
          <span className="brand-title">& Room</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="sidebar-section-label">พื้นที่ทำงาน</div>
      <nav className="sidebar-nav">
        {!isStaff && (
          <button
            className={`nav-item ${activeView === 'timetable' ? 'active' : ''}`}
            onClick={() => onViewChange('timetable')}
            id="nav-timetable"
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </span>
            <span className="nav-text">ตารางเรียนของฉัน</span>
          </button>
        )}

        <button
          className={`nav-item ${activeView === 'rooms' ? 'active' : ''}`}
          onClick={() => onViewChange('rooms')}
          id="nav-rooms"
        >
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="22" x2="9" y2="22.01"></line>
              <line x1="15" y1="22" x2="15" y2="22.01"></line>
              <line x1="9" y1="6" x2="9" y2="6.01"></line>
              <line x1="15" y1="6" x2="15" y2="6.01"></line>
              <line x1="9" y1="10" x2="9" y2="10.01"></line>
              <line x1="15" y1="10" x2="15" y2="10.01"></line>
              <line x1="9" y1="14" x2="9" y2="14.01"></line>
              <line x1="15" y1="14" x2="15" y2="14.01"></line>
            </svg>
          </span>
          <span className="nav-text">ตารางการใช้ห้อง</span>
        </button>

        {isStaff ? (
          <>
            <button
              className={`nav-item ${activeView === 'manage' ? 'active' : ''}`}
              onClick={() => onViewChange('manage')}
              id="nav-manage"
            >
              <span className="nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </span>
              <span className="nav-text">จัดการห้องเรียน</span>
            </button>

            <button
              className={`nav-item ${activeView === 'requests' ? 'active' : ''}`}
              onClick={() => onViewChange('requests')}
              id="nav-requests"
            >
              <span className="nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <span className="nav-text">หน้ารับคำร้อง</span>
              {pendingRequestsCount > 0 && (
                <span className="nav-pending-badge">{pendingRequestsCount}</span>
              )}
            </button>
          </>
        ) : (
          <button
            className={`nav-item ${activeView === 'requests' ? 'active' : ''}`}
            onClick={() => onViewChange('requests')}
            id="nav-student-requests"
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </span>
            <span className="nav-text">คำร้องของฉัน</span>
            {pendingRequestsCount > 0 && (
              <span className="nav-pending-badge">{pendingRequestsCount}</span>
            )}
          </button>
        )}

        {/* AI Advisor menu item */}
        {onOpenAiModal && (
          <button
            className="nav-item ai-nav-item"
            onClick={onOpenAiModal}
            id="nav-ai-advisor"
          >
            <span className="nav-icon">
              <span style={{ fontSize: '16px' }}>✨</span>
            </span>
            <span className="nav-text" style={{ fontWeight: 600 }}>ปรึกษา AI หาห้อง</span>
          </button>
        )}
      </nav>

      {/* Current Semester Badge Card */}
      <div className="semester-info-card">
        <div className="semester-card-label">ภาคการศึกษาปัจจุบัน</div>
        <div className="semester-card-title">ภาคต้น 2569</div>
        <div className="semester-card-status">
          <span className="status-dot-green"></span>
          <span>สัปดาห์ที่ 3 · เปิดการเรียน</span>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-help-link" onClick={() => alert('คู่มือการใช้งานระบบตารางเรียนและจัดการห้องเรียน Team 4')}>
          <span className="help-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </span>
          <span>ศูนย์ช่วยเหลือ</span>
        </button>

        {/* Profile Card (Clicking toggles info menu, does NOT auto-switch account) */}
        <div style={{ position: 'relative' }}>
          <div
            className="sidebar-user-card"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="คลิกเพื่อดูข้อมูลผู้ใช้งาน"
            id="sidebar-user-profile-btn"
          >
            <div className="user-avatar-circle">
              {user.initials || (user.name.includes('ณัฐวุฒิ') ? 'ณว' : user.name.includes('พิมพ์ชนก') ? 'พส' : user.name.charAt(0))}
            </div>
            <div className="user-info-text">
              <div className="user-name-text">{user.name}</div>
              <div className="user-role-text">
                {isStaff ? 'เจ้าหน้าที่จัดตาราง' : `นักศึกษา · ${user.id}`}
              </div>
            </div>
            <div className="user-caret-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 15 12 20 17 15"></polyline>
                <polyline points="7 9 12 4 17 9"></polyline>
              </svg>
            </div>
          </div>

          {/* User Info Popover (Non-auto-switch) */}
          {showProfileMenu && (
            <div className="sidebar-user-popover">
              <div className="popover-user-name">{user.name}</div>
              <div className="popover-user-meta">
                {isStaff ? 'สิทธิ์: เจ้าหน้าที่จัดตารางเรียน' : `รหัสนักศึกษา: ${user.id}`}
              </div>
              <div className="popover-user-dept">
                {user.department || 'วิทยาการคอมพิวเตอร์'}
              </div>
              <div className="popover-divider"></div>

              <button
                className="btn-popover-logout"
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                id="btn-popover-logout"
              >
                <span>Logout ออกจากระบบ</span>
                <span style={{ fontSize: '13px' }}>⎋</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
