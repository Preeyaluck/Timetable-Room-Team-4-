import { useState, useEffect } from 'react';
import {
  Course,
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
  DEMO_USERS,
  apiFetchRooms,
  apiFetchMeetings,
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
  // Load saved user or default to ณัฐวุฒิ ใจดี (69010042)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('timetable_current_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEMO_USERS['69010042'] || null;
  });

  const [view, setView] = useState<string>(() => {
    return currentUser?.role === 'staff' ? 'manage' : 'timetable';
  });

  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [courses] = useState<Course[]>(INITIAL_COURSES);
  const [sections] = useState<Section[]>(INITIAL_SECTIONS);
  const [meetings, setMeetings] = useState<Meeting[]>(INITIAL_MEETINGS);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(INITIAL_ENROLLMENTS);

  // Sync with live Cloudflare Worker API on mount (if available)
  useEffect(() => {
    let active = true;
    Promise.all([apiFetchRooms(), apiFetchMeetings()]).then(([r, m]) => {
      if (active) {
        if (r && r.length > 0) setRooms(r);
        if (m && m.length > 0) setMeetings(m);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // AI Consultant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Student Room Requests state with all 3 statuses (pending, approved, rejected)
  const [roomRequests, setRoomRequests] = useState<RoomRequest[]>([
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
      studentId: '69010088',
      studentName: 'กิตติศักดิ์ มั่งมี',
      department: 'เทคโนโลยีสารสนเทศ',
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
  ]);

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
    if (user.role === 'staff') {
      setView('manage');
    } else {
      setView('timetable');
    }
    showToast(`Welcome, ${user.name}! (${user.role.toUpperCase()})`, 'ok');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('timetable_current_user');
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
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    start: string;
    end: string;
    purpose: string;
    attendees: number;
  }) => {
    const newReq: RoomRequest = {
      id: `req_${Date.now()}`,
      ...data,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString('en-GB'),
    };
    setRoomRequests((prev) => [newReq, ...prev]);
    logEvt('API', `POST /api/rooms/${data.roomId}/request`, newReq, 'Student submitted room booking request');
    setRequestRoomModal({ isOpen: false, roomId: '' });
  };

  // AI direct room booking request submission
  const handleAiRequestSubmit = (data: {
    roomId: string;
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
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
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
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
  const pendingRequestsCount = roomRequests.filter((r) => r.status === 'pending').length;
  const deleteTargetMeeting = meetings.find((m) => m.id === confirmDeleteId);

  return (
    <div className="app-shell">
      <Sidebar
        activeView={view}
        onViewChange={setView}
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
          onNavigateToRequests={() => setView('requests')}
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
              onSwitchToStaff={() => {}}
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
