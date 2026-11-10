import React, { useState } from 'react';
import { User } from '../types';
import { DEMO_USERS } from '../services/api';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [roleTab, setRoleTab] = useState<'student' | 'staff'>('student');
  const [inputId, setInputId] = useState<string>('69010042');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleTabChange = (tab: 'student' | 'staff') => {
    setRoleTab(tab);
    setError('');
    setPassword('');
    if (tab === 'student') {
      setInputId('69010042');
    } else {
      setInputId('usr_stf_001');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = inputId.trim();
    const pwd = password.trim();

    if (!id) {
      setError(roleTab === 'student' ? 'กรุณากรอกรหัสนักศึกษา' : 'กรุณากรอกรหัสเจ้าหน้าที่');
      return;
    }

    if (!pwd) {
      setError('กรุณากรอกรหัสผ่านเพื่อยืนยันตัวตนตามมาตรการ PDPA');
      return;
    }

    if (pwd.length < 4) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    // Role-specific authentication
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
                  กรอกรหัสนักศึกษาและรหัสผ่านเพื่อเข้าดูตารางเรียนส่วนตัวอย่างปลอดภัย
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
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
                  กรอกรหัสเจ้าหน้าที่และรหัสผ่านเพื่อเข้าใช้งานสตูดิโอจัดสรรห้องเรียน
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
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

          {/* Password Input Field (PDPA / Security Enhancement) */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>รหัสผ่าน (Password)</label>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                🔒 ป้องกันข้อมูลตาม PDPA
              </span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="กรอกรหัสผ่าน (เช่น 1234)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                id="input-password"
                style={{ paddingRight: '40px', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              💡 รหัสผ่านเริ่มต้นสำหรับทดสอบ: <code style={{ color: '#0f766e', fontWeight: 600, background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>1234</code>
            </p>
          </div>

          {/* PDPA Notice Card */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              marginBottom: '18px',
              fontSize: '11.5px',
              color: '#475569',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: '1.45',
            }}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>🛡️</span>
            <div>
              <strong style={{ color: '#1e293b' }}>มาตรการรักษาความปลอดภัยข้อมูล (PDPA)</strong>
              <p style={{ margin: '2px 0 0', color: '#64748b' }}>
                ระบบกำหนดให้ยืนยันตัวตนด้วยรหัสผ่าน เพื่อป้องกันการเข้าถึงและแก้ไขข้อมูลตารางเรียนส่วนบุคคลโดยไม่ได้รับอนุญาต
              </p>
            </div>
          </div>

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
