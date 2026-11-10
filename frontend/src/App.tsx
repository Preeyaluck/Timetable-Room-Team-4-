import { useState, useEffect } from 'react';
import {
  Course,
  Day,
  Enrollment,
  EventLog,
  Meeting,
  Room,
  RoomRequest,
  Section,
  User,
} from './types';
import {
  INITIAL_COURSES,
  INITIAL_ENROLLMENTS,
  INITIAL_MEETINGS,
  INITIAL_ROOMS,
  INITIAL_SECTIONS,
  apiFetchRooms,
  apiFetchMeetings,
  apiFetchCourses,
  apiFetchSections,
  apiFetchEnrollments,
  apiSyncTeam03,
} from './services/api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginScreen } from './components/LoginScreen';
import { MyTimetable } from './views/MyTimetable';
import { RoomSchedule } from './views/RoomSchedule';
import { RoomManagement } from './views/RoomManagement';
import { RoomRequestsView } from './views/RoomRequestsView';
import { EventsIntegration } from './views/EventsIntegration';
import { MeetingModal } from './components/MeetingModal';
import { RequestRoomModal } from './components/RequestRoomModal';
import { AiConsultantModal } from './components/AiConsultantModal';

export function App() {
  // Load saved user from localStorage, or null for first-time login
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('timetable_current_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Helper to determine initial view
  const getInitialView = (user: User | null): string => {
    if (!user) return 'timetable';
    const validViews = user.role === 'staff'
      ? ['rooms', 'manage', 'requests', 'events']
      : ['timetable', 'rooms', 'requests'];

    // Check hash first (e.g. #/rooms)
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && validViews.includes(hash)) {
      return hash;
    }

    // Check localStorage
    try {
      const savedView = localStorage.getItem('timetable_active_view');
      if (savedView && validViews.includes(savedView)) {
        return savedView;
      }
    } catch {
      // ignore
    }

    return user.role === 'staff' ? 'manage' : 'timetable';
  };

  const [view, setView] = useState<string>(() => getInitialView(currentUser));

  const handleViewChange = (newView: string) => {
    setView(newView);
    try {
      localStorage.setItem('timetable_active_view', newView);
      window.location.hash = `#/${newView}`;
    } catch {
      // ignore
    }
  };

  // Sync view when user clicks browser back/forward buttons
  useEffect(() => {
    const onHashChange = () => {
      if (!currentUser) return;
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const validViews = currentUser.role === 'staff'
        ? ['rooms', 'manage', 'requests', 'events']
        : ['timetable', 'rooms', 'requests'];
      if (hash && validViews.includes(hash) && hash !== view) {
        setView(hash);
        try {
          localStorage.setItem('timetable_active_view', hash);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [currentUser, view]);

  // Keep hash in sync with view
  useEffect(() => {
    if (currentUser) {
      const currentHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (currentHash !== view) {
        window.location.hash = `#/${view}`;
      }
    }
  }, [currentUser, view]);

  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS);
  const [meetings, setMeetings] = useState<Meeting[]>(INITIAL_MEETINGS);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(INITIAL_ENROLLMENTS);

  // Master live data loader from Cloudflare Workers + D1 Database
  const loadAllData = async (silentSync: boolean = false) => {
    try {
      if (silentSync) {
        // Silently sync latest from Team 03 in background
        await apiSyncTeam03().catch(() => { });
      }
      const [r, m, c, s, e] = await Promise.all([
        apiFetchRooms(),
        apiFetchMeetings(),
        apiFetchCourses(),
        apiFetchSections(),
        apiFetchEnrollments(),
      ]);
      if (r && r.length > 0) setRooms(r);
      if (m && m.length > 0) setMeetings(m);
      if (c && c.length > 0) setCourses(c);
      if (s && s.length > 0) setSections(s);
      if (e && e.length > 0) setEnrollments(e);
    } catch (err) {
      console.warn('loadAllData error:', err);
    }
  };

  // Keep live connection with Cloudflare Workers + D1 and Team 03 continuously
  useEffect(() => {
    loadAllData(true);
    // Background polling every 30 seconds to keep data continuously connected
    const interval = setInterval(() => {
      loadAllData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // AI Consultant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Student Room Requests default seed data
  const DEFAULT_ROOM_REQUESTS: RoomRequest[] = [
    {
      id: 'req_001',
      studentId: '69010042',
      studentName: 'ณัฐวุฒิ ใจดี',
      department: 'วิทยาการคอมพิวเตอร์',
      roomId: 'rm_sc303',
      day: 'Wed',
      start: '10:00',
      end: '12:00',
      purpose: 'ติวสอบกลางภาควิชาโครงสร้างข้อมูล (CS201)',
      attendees: 15,
      status: 'pending',
      createdAt: 'วันนี้ 09:15 น.',
    },
    {
      id: 'req_002',
      studentId: '6731503021',
      studentName: 'Miss Preeyaluk Moolpom',
      department: 'Software Engineering',
      roomId: 'rm_sc302',
      day: 'Tue',
      start: '13:00',
      end: '15:00',
      purpose: 'สัมมนาและนำเสนอโครงงานพัฒนาเว็บกลุ่มย่อย',
      attendees: 20,
      status: 'approved',
      createdAt: 'เมื่อวาน 14:30 น.',
    },
    {
      id: 'req_003',
      studentId: '65010042',
      studentName: 'Somchai Prasert (Team 03)',
      department: 'Software Engineering',
      roomId: 'rm_sc301',
      day: 'Mon',
      start: '09:00',
      end: '11:00',
      purpose: 'กิจกรรมชุมนุมเทคโนโลยีและคอมพิวเตอร์',
      attendees: 45,
      status: 'rejected',
      rejectReason: 'ห้อง SC301 มีคาบเรียน CS201 ประจำอยู่แล้วในวันและเวลาดังกล่าว',
      createdAt: 'เมื่อวาน 11:20 น.',
    },
  ];

  // Student Room Requests state with localStorage persistence
  const [roomRequests, setRoomRequests] = useState<RoomRequest[]>(() => {
    try {
      const saved = localStorage.getItem('timetable_room_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_ROOM_REQUESTS;
  });

  // Keep roomRequests in sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('timetable_room_requests', JSON.stringify(roomRequests));
    } catch (err) {
      console.warn('Failed to save roomRequests to localStorage', err);
    }
  }, [roomRequests]);

  const [requestRoomModal, setRequestRoomModal] = useState<{
    isOpen: boolean;
    roomId: string;
  }>({ isOpen: false, roomId: '' });

  const [aiServiceOnline, setAiServiceOnline] = useState<boolean>(true);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [seenEventIds, setSeenEventIds] = useState<Set<string>>(new Set());

  // Meeting modal states
  const [editingMeeting, setEditingMeeting] = useState<{
    isOpen: boolean;
    meeting: Meeting | null;
    preRoomId?: string;
  }>({ isOpen: false, meeting: null });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind?: 'ok' | 'bad' }[]>([]);

  const showToast = (msg: string, kind?: 'ok' | 'bad') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('timetable_current_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    const defaultView = user.role === 'staff' ? 'manage' : 'timetable';
    handleViewChange(defaultView);
    showToast(`Welcome, ${user.name}! (${user.role.toUpperCase()})`, 'ok');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('timetable_current_user');
      localStorage.removeItem('timetable_active_view');
      window.location.hash = '';
    } catch {
      // ignore
    }
    showToast('Signed out successfully.');
  };

  const logEvt = (dir: 'IN' | 'OUT' | 'API', name: string, payload: any, extra?: string) => {
    setEventLogs((prev) => [
      {
        dir,
        name,
        payload,
        extra,
        ts: new Date().toLocaleTimeString('en-GB'),
      },
      ...prev,
    ]);
  };

  const enrolledCount = (sectionId: string) => {
    const s = sections.find((item) => item.id === sectionId);
    if (!s) return 0;
    const enrolledUsers = enrollments.filter(
      (e) => e.section === sectionId && e.status === 'enrolled'
    ).length;
    return s.base + enrolledUsers;
  };

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);
  const getRoom = (id: string) => rooms.find((r) => r.id === id);
  const secLabel = (id: string) => {
    const s = getSec(id);
    const c = getCrs(s?.courseId || '');
    return `${c?.code || ''}-${s?.no || ''}`;
  };

  const emitSchedule = (action: string, m: Meeting) => {
    const payload = {
      event_id: 'evt_' + Date.now(),
      event_name: 'schedule.changed',
      action,
      meeting_id: m.id,
      section_id: m.sectionId,
      room_id: m.roomId,
      day: m.day,
      start_time: m.start,
      end_time: m.end,
      timestamp: new Date().toISOString(),
    };
    logEvt('OUT', 'schedule.changed', payload, '→ Notification Hub, Data & Analytics (mock)');
  };

  // Student submits room request
  const handleOpenRequestRoom = (roomId: string) => {
    setRequestRoomModal({ isOpen: true, roomId });
  };

  const handleSubmitRoomRequest = (data: {
    studentId: string;
    studentName: string;
    roomId: string;
    day: Day;
    start: string;
    end: string;
    purpose: string;
    attendees: number;
  }) => {
    const targetRoom = rooms.find((r) => r.id === data.roomId);
    const newReq: RoomRequest = {
      id: `req_${Date.now()}`,
      ...data,
      status: 'pending',
      createdAt: 'วันนี้ ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
    };
    setRoomRequests((prev) => [newReq, ...prev]);
    logEvt('API', `POST /api/rooms/${data.roomId}/request`, newReq, 'Student submitted room booking request');
    showToast(`ยื่นคำขอใช้ห้อง ${targetRoom?.name || ''} สำเร็จแล้ว เจ้าหน้าที่จะพิจารณาในไม่ช้า`, 'ok');
    setRequestRoomModal({ isOpen: false, roomId: '' });
  };

  // AI direct room booking request submission
  const handleAiRequestSubmit = (data: {
    roomId: string;
    day: Day;
    start: string;
    end: string;
    purpose: string;
    attendees: number;
  }) => {
    if (!currentUser) return;
    const targetRoom = rooms.find((r) => r.id === data.roomId);
    const newReq: RoomRequest = {
      id: `req_${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.name,
      department: currentUser.department || 'วิทยาการคอมพิวเตอร์',
      roomId: data.roomId,
      day: data.day,
      start: data.start,
      end: data.end,
      purpose: data.purpose,
      attendees: data.attendees,
      status: 'pending',
      createdAt: 'วันนี้ ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
    };
    setRoomRequests((prev) => [newReq, ...prev]);
    logEvt('API', `POST /api/rooms/${data.roomId}/request`, newReq, 'AI Advisor booking request');
    showToast(`ส่งคำขอใช้ห้อง ${targetRoom?.name || ''} ตามคำแนะนำของ AI สำเร็จแล้ว!`, 'ok');
    setIsAiModalOpen(false);
  };

  // Staff approves student room request
  const handleApproveRequest = (requestId: string) => {
    const targetReq = roomRequests.find((r) => r.id === requestId);
    if (!targetReq) return;

    // 1. Mark request as approved
    setRoomRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    );

    // 2. Schedule meeting into timetable
    const newMeeting: Meeting = {
      id: `mtg_${Date.now()}`,
      sectionId: sections[0].id,
      roomId: targetReq.roomId,
      day: targetReq.day,
      start: targetReq.start,
      end: targetReq.end,
    };
    setMeetings((prev) => [...prev, newMeeting]);
    emitSchedule('created', newMeeting);
    const targetRoom = rooms.find((r) => r.id === targetReq.roomId);
    showToast(`อนุมัติคำร้องขอใช้ห้อง ${targetRoom?.name || ''} เรียบร้อยแล้ว`, 'ok');
  };

  // Staff rejects student room request with optional reason
  const handleRejectRequest = (requestId: string, reason?: string) => {
    setRoomRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
            ...r,
            status: 'rejected',
            rejectReason: reason || 'ไม่สามารถจัดสรรห้องได้ตามช่วงเวลาที่ขอ',
          }
          : r
      )
    );
    showToast('ปฏิเสธคำร้องขอใช้ห้องเรียบร้อยแล้ว');
  };

  const handleSaveMeeting = (data: {
    id?: string;
    sectionId: string;
    roomId: string;
    day: Day;
    start: string;
    end: string;
  }) => {
    if (data.id) {
      // Update
      const updated = meetings.map((m) => (m.id === data.id ? { ...m, ...data } : m));
      setMeetings(updated);
      const m = updated.find((item) => item.id === data.id);
      if (m) emitSchedule('updated', m);
      logEvt('API', `PATCH /api/meetings/${data.id} → 200`, 'updated');
      showToast('Meeting updated · schedule.changed sent', 'ok');
    } else {
      // Create
      const newMtg: Meeting = {
        id: `mtg_${String(meetings.length + 1).padStart(2, '0')}`,
        ...data,
      };
      setMeetings([...meetings, newMtg]);
      emitSchedule('created', newMtg);
      logEvt('API', 'POST /api/meetings → 201', newMtg.id);
      showToast('Meeting created · schedule.changed sent', 'ok');
    }
    setEditingMeeting({ isOpen: false, meeting: null });
  };

  const handleDeleteMeeting = (id: string) => {
    const m = meetings.find((x) => x.id === id);
    if (!m) return;
    setMeetings((prev) => prev.filter((x) => x.id !== id));
    emitSchedule('deleted', m);
    logEvt('API', `DELETE /api/meetings/${id} → 204`, '');
    showToast('Meeting deleted · schedule.changed sent', 'ok');
    setConfirmDeleteId(null);
  };

  const handleSendEnrollment = (event: {
    event_id: string;
    student_id: string;
    section_id: string;
    action: 'enrolled' | 'dropped' | 'withdrawn';
  }) => {
    const before = enrolledCount(event.section_id);

    if (seenEventIds.has(event.event_id)) {
      logEvt(
        'IN',
        'enrollment.changed',
        event,
        '↻ duplicate event_id — ignored, no side effects (BR-07)'
      );
      showToast(`Duplicate ignored · count stays ${before}`);
      return;
    }

    setSeenEventIds((prev) => new Set(prev).add(event.event_id));

    setEnrollments((prev) => {
      const ex = prev.find(
        (e) => e.student === event.student_id && e.section === event.section_id
      );
      if (ex) {
        return prev.map((e) =>
          e.student === event.student_id && e.section === event.section_id
            ? { ...e, status: event.action }
            : e
        );
      } else {
        return [...prev, { student: event.student_id, section: event.section_id, status: event.action }];
      }
    });

    const after = event.action === 'enrolled' ? before + 1 : before - 1;
    const overMeetings = meetings.filter((m) => {
      const r = getRoom(m.roomId);
      return m.sectionId === event.section_id && r && after > r.capacity;
    });

    logEvt(
      'IN',
      'enrollment.changed',
      event,
      `upsert OK · ${secLabel(event.section_id)} count ${before} → ${after}` +
      (overMeetings.length
        ? ` · ⚠ over capacity in ${overMeetings.map((m) => getRoom(m.roomId)?.name).join(', ')}`
        : '')
    );

    showToast(
      `Processed · ${secLabel(event.section_id)} now ${after}` +
      (overMeetings.length ? ' · capacity conflict!' : ''),
      overMeetings.length ? 'bad' : 'ok'
    );
  };

  // If not logged in, render the Login Screen
  if (!currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind || ''}`}>
              {t.msg}
            </div>
          ))}
        </div>
      </>
    );
  }

  const isStaff = currentUser.role === 'staff';
  const pendingRequestsCount = isStaff
    ? roomRequests.filter((r) => r.status === 'pending').length
    : roomRequests.filter((r) => r.studentId === currentUser.id && r.status === 'pending').length;
  const deleteTargetMeeting = meetings.find((m) => m.id === confirmDeleteId);

  return (
    <div className="app-shell">
      <Sidebar
        activeView={view}
        onViewChange={handleViewChange}
        user={currentUser}
        onLogout={handleLogout}
        pendingRequestsCount={pendingRequestsCount}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      <div className="main-viewport">
        <Topbar
          activeView={view}
          user={currentUser}
          onLogout={handleLogout}
          pendingRequestsCount={pendingRequestsCount}
          roomRequests={roomRequests}
          rooms={rooms}
          onNavigateToRequests={() => handleViewChange('requests')}
          onOpenAiModal={() => setIsAiModalOpen(true)}
        />

        <main className="main-content">
          {/* Student Specific Views */}
          {!isStaff && view === 'timetable' && (
            <MyTimetable
              user={currentUser}
              courses={courses}
              sections={sections}
              rooms={rooms}
              meetings={meetings}
              enrollments={enrollments}
            />
          )}

          {/* Shared View: Room Schedule */}
          {view === 'rooms' && (
            <RoomSchedule
              isStaff={isStaff}
              rooms={rooms}
              meetings={meetings}
              sections={sections}
              courses={courses}
              enrolledCount={enrolledCount}
              onAddMeeting={(roomId) =>
                setEditingMeeting({ isOpen: true, meeting: null, preRoomId: roomId })
              }
              onEditMeeting={(meetingId) => {
                const target = meetings.find((m) => m.id === meetingId) || null;
                setEditingMeeting({ isOpen: true, meeting: target });
              }}
              onRequestRoom={handleOpenRequestRoom}
              onOpenAiAdvisor={() => setIsAiModalOpen(true)}
            />
          )}

          {/* Staff Specific Views (Room Management) */}
          {isStaff && view === 'manage' && (
            <RoomManagement
              isStaff={true}
              onSwitchToStaff={() => { }}
              meetings={meetings}
              rooms={rooms}
              sections={sections}
              courses={courses}
              enrolledCount={enrolledCount}
              onNewMeeting={() =>
                setEditingMeeting({ isOpen: true, meeting: null })
              }
              onEditMeeting={(meetingId) => {
                const target = meetings.find((m) => m.id === meetingId) || null;
                setEditingMeeting({ isOpen: true, meeting: target });
              }}
              onDeleteMeeting={(meetingId) => setConfirmDeleteId(meetingId)}
              onSaveMeeting={handleSaveMeeting}
              roomRequests={roomRequests}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
            />
          )}

          {/* Room Requests View (หน้ารับคำร้อง / คำร้องของฉัน) */}
          {view === 'requests' && (
            <RoomRequestsView
              currentUser={currentUser}
              rooms={rooms}
              roomRequests={roomRequests}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onOpenNewRequestModal={() =>
                setRequestRoomModal({ isOpen: true, roomId: rooms[0]?.id || '' })
              }
              onOpenAiAdvisor={() => setIsAiModalOpen(true)}
            />
          )}

          {isStaff && view === 'events' && (
            <EventsIntegration
              currentUser={currentUser}
              sections={sections}
              courses={courses}
              enrollments={enrollments}
              enrolledCount={enrolledCount}
              eventLogs={eventLogs}
              onClearLogs={() => setEventLogs([])}
              aiServiceOnline={aiServiceOnline}
              onToggleAi={() => {
                setAiServiceOnline(!aiServiceOnline);
                showToast(
                  !aiServiceOnline
                    ? 'AI service online'
                    : 'AI service down — fallback active'
                );
              }}
              onSendEnrollment={handleSendEnrollment}
              seenEventIds={seenEventIds}
            />
          )}
        </main>
      </div>

      {/* Meeting Modal (Staff CRUD) */}
      {editingMeeting.isOpen && (
        <MeetingModal
          meeting={editingMeeting.meeting}
          preRoomId={editingMeeting.preRoomId}
          rooms={rooms}
          sections={sections}
          courses={courses}
          meetings={meetings}
          enrolledCount={enrolledCount}
          onSave={handleSaveMeeting}
          onClose={() => setEditingMeeting({ isOpen: false, meeting: null })}
          aiServiceOnline={aiServiceOnline}
        />
      )}

      {/* Request Room Modal (Student Booking Request) */}
      {requestRoomModal.isOpen && (
        <RequestRoomModal
          currentUser={currentUser}
          initialRoomId={requestRoomModal.roomId}
          rooms={rooms}
          meetings={meetings}
          onSubmit={handleSubmitRoomRequest}
          onClose={() => setRequestRoomModal({ isOpen: false, roomId: '' })}
        />
      )}

      {/* AI Consultant Modal */}
      {isAiModalOpen && (
        <AiConsultantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          currentUser={currentUser}
          rooms={rooms}
          meetings={meetings}
          onRequestWithData={handleAiRequestSubmit}
        />
      )}

      {/* Floating AI Consultant FAB Button */}
      <button
        className="floating-ai-fab-btn"
        onClick={() => setIsAiModalOpen(true)}
        title="ปรึกษา AI ค้นหาห้องว่างและยื่นคำร้อง"
        id="btn-floating-ai-advisor"
      >
        <span className="fab-ai-sparkle">✨</span>
        <span className="fab-ai-text">ปรึกษา AI</span>
      </button>

      {/* Confirm Delete Dialog */}
      {confirmDeleteId && deleteTargetMeeting && (
        <div
          className="scrim"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteId(null)}
        >
          <div className="modal" style={{ width: 'min(440px, 100%)' }}>
            <div className="body">
              <h2>Delete this meeting?</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                {secLabel(deleteTargetMeeting.sectionId)} · {deleteTargetMeeting.day}{' '}
                {deleteTargetMeeting.start}–{deleteTargetMeeting.end} ·{' '}
                {getRoom(deleteTargetMeeting.roomId)?.name}. A schedule.changed event will be sent.
              </p>
            </div>
            <footer>
              <span></span>
              <div className="row">
                <button className="btn" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  style={{ background: '#c02a41', borderColor: '#c02a41' }}
                  onClick={() => handleDeleteMeeting(confirmDeleteId)}
                >
                  Delete meeting
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ''}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
