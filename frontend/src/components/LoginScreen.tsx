import React, { useState } from 'react';
import { User } from '../types';
import { DEMO_USERS } from '../services/api';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [roleTab, setRoleTab] = useState<'student' | 'staff'>('student');
  const [inputId, setInputId] = useState<string>('69010042');
  const [error, setError] = useState<string>('');

  const handleTabChange = (tab: 'student' | 'staff') => {
    setRoleTab(tab);
    setError('');
    if (tab === 'student') {
      setInputId('69010042');
    } else {
      setInputId('usr_stf_001');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = inputId.trim();
    if (!id) {
      setError(roleTab === 'student' ? 'กรุณากรอกรหัสนักศึกษา' : 'กรุณากรอกรหัสเจ้าหน้าที่');
      return;
    }

    if (roleTab === 'student') {
      // Look up student from database / store
      if (DEMO_USERS[id] && DEMO_USERS[id].role === 'student') {
        onLogin(DEMO_USERS[id]);
      } else {
        // Enrolled student lookup
        onLogin({
          id,
          name: `นักศึกษา ${id}`,
          role: 'student',
          department: 'หลักสูตรวิทยาการคอมพิวเตอร์',
          initials: id.slice(-2),
        });
      }
    } else {
      // Staff authority check
      if (DEMO_USERS[id] && DEMO_USERS[id].role === 'staff') {
        onLogin(DEMO_USERS[id]);
      } else if (
        id.toLowerCase().includes('stf') ||
        id.toLowerCase().includes('staff') ||
        id === 'admin'
      ) {
        onLogin({
          id,
          name: 'เจ้าหน้าที่จัดตาราง',
          role: 'staff',
          department: 'หน่วยบริหารจัดการห้องเรียน',
          initials: 'จน',
        });
      } else {
        setError("ไม่พบรหัสเจ้าหน้าที่ หรือไม่มีสิทธิ์ในการจัดการห้องเรียน (ต้องมีสิทธิ์ 'room-planning')");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '20px',
        background: 'var(--bg-page, #f8fafc)',
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(440px, 100%)',
          boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(15, 23, 42, 0.08))',
          borderRadius: '18px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '28px 24px 20px',
            textAlign: 'center',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div
            className="brand-logo-icon"
            style={{
              width: '46px',
              height: '46px',
              fontSize: '22px',
              margin: '0 auto 12px',
              borderRadius: '12px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>
            ระบบตารางเรียน & จัดการห้องเรียน
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Identity & Academic Core · Team 4
          </p>
        </div>

        {/* Portal Type Switcher */}
        <div style={{ padding: '20px 24px 0' }}>
          <div className="view-mode-toggle-group" style={{ width: '100%', display: 'flex', padding: '4px' }}>
            <button
              className={`toggle-tab-btn ${roleTab === 'student' ? 'active' : ''}`}
              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
              onClick={() => handleTabChange('student')}
              type="button"
              id="tab-login-student"
            >
              🎓 เข้าสู่ระบบนักศึกษา
            </button>
            <button
              className={`toggle-tab-btn ${roleTab === 'staff' ? 'active' : ''}`}
              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
              onClick={() => handleTabChange('staff')}
              type="button"
              id="tab-login-staff"
            >
              🛡️ เข้าสู่ระบบเจ้าหน้าที่
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 28px' }}>
          {roleTab === 'student' ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <span className="timetable-status-pill success" style={{ fontSize: '11.5px' }}>
                  สิทธิ์นักศึกษา (Student Access)
                </span>
                <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  กรอกรหัสนักศึกษาของคุณเพื่อดูตารางเรียนส่วนตัวและยื่นคำขอใช้ห้องเรียน
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">รหัสนักศึกษา (Student ID)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น 69010042 หรือ 6731503021"
                  value={inputId}
                  onChange={(e) => {
                    setInputId(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  id="input-student-id"
                />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <span className="topbar-role-badge" style={{ fontSize: '11.5px', display: 'inline-flex' }}>
                  สิทธิ์เจ้าหน้าที่ (Staff Authority)
                </span>
                <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  กรอกรหัสเจ้าหน้าที่เพื่อเข้าใช้งานสตูดิโอจัดสรรห้องเรียนและพิจารณาคำร้อง
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">รหัสเจ้าหน้าที่ (Staff ID)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น usr_stf_001 หรือ staff"
                  value={inputId}
                  onChange={(e) => {
                    setInputId(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  id="input-staff-id"
                />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '10px 14px',
                fontSize: '12.5px',
                marginBottom: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-action-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}
            id="btn-login-submit"
          >
            เข้าสู่ระบบในฐานะ{roleTab === 'student' ? 'นักศึกษา' : 'เจ้าหน้าที่'} →
          </button>
        </form>
      </div>
    </div>
  );
};
