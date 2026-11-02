import React from 'react';
import { User } from '../types';

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  user,
  onLogout,
}) => {
  const isStaff = user.role === 'staff';

  // Strict role-based tabs (Students never see or access Room Management)
  const tabs: [string, string][] = isStaff
    ? [
        ['manage', 'Room Management'],
        ['rooms', 'Room Schedule'],
        ['events', 'Events & Integration'],
      ]
    : [
        ['timetable', 'My Timetable'],
        ['rooms', 'Room Schedule'],
      ];

  return (
    <header>
      <div className="bar">
        <div className="brand">
          <div className="logo">▦</div>
          <div>
            Timetable & Room
            <small>Identity & Academic Core · Team 4</small>
          </div>
        </div>

        <nav>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={activeView === key ? 'on' : ''}
              onClick={() => onViewChange(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="right">
          <div className="user">
            <div className="avatar" style={{ background: isStaff ? '#b7791f' : 'var(--brand)' }}>
              {user.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </b>
              <span>{isStaff ? 'Staff (Room Planner)' : `Student · ${user.id}`}</span>
            </div>
          </div>

          <button
            className="btn sm"
            onClick={onLogout}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            title="Log out and switch account"
          >
            <span>Sign Out</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>⎋</span>
          </button>
        </div>
      </div>
    </header>
  );
};
