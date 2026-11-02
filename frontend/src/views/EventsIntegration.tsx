import React, { useState } from 'react';
import { Course, Enrollment, EventLog, Section, User } from '../types';

interface EventsIntegrationProps {
  currentUser: User;
  sections: Section[];
  courses: Course[];
  enrollments: Enrollment[];
  enrolledCount: (sectionId: string) => number;
  eventLogs: EventLog[];
  onClearLogs: () => void;
  aiServiceOnline: boolean;
  onToggleAi: () => void;
  onSendEnrollment: (event: {
    event_id: string;
    student_id: string;
    section_id: string;
    action: 'enrolled' | 'dropped' | 'withdrawn';
  }) => void;
  seenEventIds: Set<string>;
}

export const EventsIntegration: React.FC<EventsIntegrationProps> = ({
  currentUser,
  sections,
  courses,
  enrollments,
  enrolledCount,
  eventLogs,
  onClearLogs,
  aiServiceOnline,
  onToggleAi,
  onSendEnrollment,
  seenEventIds,
}) => {
  const [draft, setDraft] = useState({
    event_id: 'evt_20260920_001',
    student_id: currentUser.id,
    section_id: sections[6]?.id || sections[0]?.id || 'sec_swe305_01',
    action: 'enrolled' as 'enrolled' | 'dropped' | 'withdrawn',
  });

  const [lastSentId, setLastSentId] = useState<string>('');

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);
  const secLabel = (id: string) => {
    const s = getSec(id);
    const c = getCrs(s?.courseId || '');
    return `${c?.code || ''}-${s?.no || ''}`;
  };

  const payload = {
    event_id: draft.event_id,
    event_name: 'enrollment.changed',
    student_id: draft.student_id,
    section_id: draft.section_id,
    action: draft.action,
    timestamp: '(now)',
  };

  const handleSend = () => {
    setLastSentId(draft.event_id);
    onSendEnrollment(draft);
  };

  const handleReplay = () => {
    const idToReplay = lastSentId || draft.event_id;
    onSendEnrollment({
      ...draft,
      event_id: idToReplay,
    });
  };

  return (
    <>
      <h1>
        Events & Integration{' '}
        {currentUser.role === 'student' && (
          <span className="pill warn">Dev console · visible for demo</span>
        )}
      </h1>
      <p className="sub">
        Mock integration console for the MVP: inbound <code>enrollment.changed</code> (Team 03) and outbound{' '}
        <code>schedule.changed</code> (Notification Hub, Data & Analytics).
      </p>

      <div className="grid-ev">
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="card pad" style={{ display: 'grid', gap: '12px' }}>
            <div>
              <h2>Inbound · enrollment.changed</h2>
              <small style={{ color: 'var(--muted)' }}>
                Idempotent upsert on (student_id, section_id)
              </small>
            </div>

            <label className="field">
              event_id
              <input
                value={draft.event_id}
                onChange={(e) => setDraft({ ...draft, event_id: e.target.value })}
              />
            </label>

            <label className="field">
              student_id
              <select
                value={draft.student_id}
                onChange={(e) => setDraft({ ...draft, student_id: e.target.value })}
              >
                <option value={currentUser.id}>{currentUser.id}</option>
              </select>
            </label>

            <label className="field">
              section_id
              <select
                value={draft.section_id}
                onChange={(e) => setDraft({ ...draft, section_id: e.target.value })}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              action
              <select
                value={draft.action}
                onChange={(e) =>
                  setDraft({ ...draft, action: e.target.value as any })
                }
              >
                <option value="enrolled">enrolled</option>
                <option value="dropped">dropped</option>
                <option value="withdrawn">withdrawn</option>
              </select>
            </label>

            <pre>{JSON.stringify(payload, null, 2)}</pre>

            <div className="row">
              <button className="btn primary" onClick={handleSend}>
                Send event
              </button>
              <button
                className="btn"
                onClick={handleReplay}
                disabled={seenEventIds.size === 0}
              >
                ↻ Replay last event
              </button>
            </div>
          </div>

          <div className="card pad" style={{ display: 'grid', gap: '10px' }}>
            <h2>Section seat counts</h2>
            {sections.map((s) => {
              const n = enrolledCount(s.id);
              const mine = enrollments.find(
                (e) => e.student === currentUser.id && e.section === s.id && e.status === 'enrolled'
              );
              return (
                <div key={s.id} className="row spread">
                  <span>
                    <b>{secLabel(s.id)}</b> {mine && <span className="pill brand">you</span>}
                  </span>
                  <span>
                    {n} / {s.capacity}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="card pad row spread">
            <div>
              <h3>AI suggestion service</h3>
              <small style={{ color: 'var(--muted)' }}>
                Simulate outage → deterministic fallback (BR-05)
              </small>
            </div>
            <button
              className={`sw ${aiServiceOnline ? 'on' : ''}`}
              onClick={onToggleAi}
              aria-label="Toggle AI service"
            ></button>
          </div>
        </div>

        <div className="card">
          <div className="pad row spread">
            <h2>Event log</h2>
            <button className="btn sm" onClick={onClearLogs}>
              Clear
            </button>
          </div>
          <div className="pad" style={{ paddingTop: 0 }}>
            <div className="log">
              {eventLogs.length > 0 ? (
                eventLogs.map((l, idx) => (
                  <div key={idx} className="logi">
                    <div className="h">
                      <span
                        className={`pill ${
                          l.dir === 'IN' ? 'brand' : l.dir === 'OUT' ? 'ok' : ''
                        }`}
                      >
                        {l.dir}
                      </span>
                      <b>{l.name}</b>
                      {l.extra && (
                        <small style={{ color: 'var(--muted)' }}>{l.extra}</small>
                      )}
                      <time>{l.ts}</time>
                    </div>
                    <pre>
                      {typeof l.payload === 'string'
                        ? l.payload
                        : JSON.stringify(l.payload, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="empty">
                  No events yet. Send an enrollment event or edit a meeting.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
