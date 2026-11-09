import React, { useState } from 'react';
import { Course, Day, Meeting, Room, Section, Suggestion } from '../types';
import { DAYS, timeOpts, t2m } from '../services/api';

interface MeetingModalProps {
  meeting: Meeting | null;
  preRoomId?: string;
  rooms: Room[];
  sections: Section[];
  courses: Course[];
  meetings: Meeting[];
  enrolledCount: (sectionId: string) => number;
  onSave: (meetingData: { id?: string; sectionId: string; roomId: string; day: Day; start: string; end: string }) => void;
  onDelete?: (meetingId: string) => void;
  onClose: () => void;
  aiServiceOnline: boolean;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({
  meeting,
  preRoomId,
  rooms,
  sections,
  courses,
  meetings,
  enrolledCount,
  onSave,
  onClose,
  aiServiceOnline,
}) => {
  const [form, setForm] = useState({
    sectionId: meeting ? meeting.sectionId : sections[0]?.id || '',
    roomId: meeting ? meeting.roomId : preRoomId || rooms[0]?.id || '',
    day: meeting ? meeting.day : ('Mon' as Day),
    start: meeting ? meeting.start : '09:00',
    end: meeting ? meeting.end : '11:00',
  });

  const [attempt, setAttempt] = useState<{ http: number; errors: string[] } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggLoading, setSuggLoading] = useState(false);
  const [suggMode, setSuggMode] = useState<'ai' | 'fallback' | null>(null);

  const getSec = (id: string) => sections.find((s) => s.id === id);
  const getCrs = (id: string) => courses.find((c) => c.id === id);
  const getRoom = (id: string) => rooms.find((r) => r.id === id);

  const secLabel = (id: string) => {
    const s = getSec(id);
    if (!s) return id;
    const c = getCrs(s.courseId);
    return `${c?.code || ''}-${s.no}`;
  };

  // Check logic (mirrors BR-01, BR-02, FR-07)
  const validateForm = () => {
    const errors: string[] = [];
    let http = 200;

    if (!form.sectionId || !form.roomId || !form.day || !form.start || !form.end) {
      return { ok: false, http: 400, errors: ['Missing required fields.'] };
    }

    if (t2m(form.end) <= t2m(form.start)) {
      errors.push('Invalid time: end time must be after start time (CHECK start_time < end_time).');
      http = 400;
    }

    const roomObj = getRoom(form.roomId);
    const n = enrolledCount(form.sectionId);

    if (http === 200) {
      const clash = meetings.filter(
        (m) =>
          m.id !== meeting?.id &&
          m.roomId === form.roomId &&
          m.day === form.day &&
          t2m(m.start) < t2m(form.end) &&
          t2m(form.start) < t2m(m.end)
      );

      clash.forEach((m) => {
        errors.push(
          `Time clash (BR-01): ${roomObj?.name || ''} is already booked ${m.day} ${m.start}–${m.end} by ${secLabel(m.sectionId)}.`
        );
      });

      if (errors.length) http = 409;
    }

    if (roomObj && n > roomObj.capacity) {
      errors.push(
        `Over capacity (BR-02): ${secLabel(form.sectionId)} has ${n} enrolled students but ${roomObj.name} seats ${roomObj.capacity}.`
      );
      if (http === 200) http = 400;
    }

    return { ok: errors.length === 0, http, errors };
  };

  const currentValidation = validateForm();
  const room = getRoom(form.roomId);
  const n = enrolledCount(form.sectionId);

  // Suggest algorithm (with AI fallback)
  const handleSuggest = async () => {
    setSuggLoading(true);
    setSuggestions(null);

    const dur = t2m(form.end) - t2m(form.start) > 0 ? t2m(form.end) - t2m(form.start) : 120;
    const enrolledN = enrolledCount(form.sectionId);
    const out: Suggestion[] = [];

    // Simulate AI latency or immediate scan
    if (aiServiceOnline) {
      await new Promise((r) => setTimeout(r, 600));
      setSuggMode('ai');
    } else {
      await new Promise((r) => setTimeout(r, 150));
      setSuggMode('fallback');
    }

    for (const day of DAYS) {
      for (const r of rooms) {
        if (r.capacity < enrolledN) continue;
        for (let s = 8 * 60; s + dur <= 18 * 60; s += 30) {
          const c = { roomId: r.id, day, start: m2t(s), end: m2t(s + dur) };
          if (
            meetings.some(
              (m) =>
                m.id !== meeting?.id &&
                m.roomId === r.id &&
                m.day === day &&
                t2m(m.start) < t2m(c.end) &&
                t2m(c.start) < t2m(m.end)
            )
          ) {
            continue;
          }
          if (
            meetings.some(
              (m) =>
                m.id !== meeting?.id &&
                m.sectionId === form.sectionId &&
                m.day === day &&
                t2m(m.start) < t2m(c.end) &&
                t2m(c.start) < t2m(m.end)
            )
          ) {
            continue;
          }

          const score =
            (r.id === form.roomId ? 0 : 30) +
            (day === form.day ? 0 : 20 + Math.abs(DAYS.indexOf(day) - DAYS.indexOf(form.day)) * 4) +
            Math.abs(s - t2m(form.start || '09:00')) / 10 +
            (r.capacity - enrolledN) / 8;

          out.push({
            ...c,
            score,
            why: [
              r.id === form.roomId ? 'same room' : `room ${r.name}`,
              day === form.day ? 'same day' : day,
              `${r.capacity - enrolledN} spare seats`,
            ].join(' · '),
          });
        }
      }
    }

    setSuggestions(out.sort((a, b) => a.score - b.score).slice(0, 5));
    setSuggLoading(false);
  };

  const handleApplySuggestion = (s: Suggestion) => {
    setForm((prev) => ({
      ...prev,
      roomId: s.roomId,
      day: s.day,
      start: s.start,
      end: s.end,
    }));
    setAttempt(null);
    setSuggestions(null);
    setSuggMode(null);
  };

  const handleSave = () => {
    const res = validateForm();
    if (!res.ok) {
      setAttempt(res);
      return;
    }
    onSave({
      id: meeting?.id,
      ...form,
    });
  };

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header>
          <div>
            <h2>{meeting ? 'Edit meeting' : 'New meeting'}</h2>
            <small style={{ color: 'var(--muted)' }}>
              {meeting ? `PATCH /api/meetings/${meeting.id}` : 'POST /api/meetings'}
            </small>
          </div>
          <button className="btn sm" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="body">
          <label className="field">
            Section
            <select
              value={form.sectionId}
              onChange={(e) => {
                setForm({ ...form, sectionId: e.target.value });
                setAttempt(null);
              }}
            >
              {sections.map((s) => {
                const c = getCrs(s.courseId);
                return (
                  <option key={s.id} value={s.id}>
                    {secLabel(s.id)} — {c?.name} ({enrolledCount(s.id)} enrolled)
                  </option>
                );
              })}
            </select>
          </label>

          <div className="form2">
            <label className="field">
              Room
              <select
                value={form.roomId}
                onChange={(e) => {
                  setForm({ ...form, roomId: e.target.value });
                  setAttempt(null);
                }}
              >
                {rooms.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {x.capacity} seats · {x.building}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Day
              <select
                value={form.day}
                onChange={(e) => {
                  setForm({ ...form, day: e.target.value as any });
                  setAttempt(null);
                }}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form2">
            <label className="field">
              Start
              <select
                value={form.start}
                onChange={(e) => {
                  setForm({ ...form, start: e.target.value });
                  setAttempt(null);
                }}
              >
                {timeOpts.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              End
              <select
                value={form.end}
                onChange={(e) => {
                  setForm({ ...form, end: e.target.value });
                  setAttempt(null);
                }}
              >
                {timeOpts.slice(1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row">
            <span className="pill">{n} enrolled</span>
            <span className="pill">{room?.capacity} seats in {room?.name}</span>
            <span className={`pill ${room && n > room.capacity ? 'bad' : 'ok'}`}>
              {room && n > room.capacity ? 'Over capacity' : 'Capacity OK'}
            </span>
          </div>

          {attempt ? (
            <div className="alert bad" style={{ margin: 0 }}>
              <div className="ico" aria-hidden="true">×</div>
              <div>
                <b>Save rejected · HTTP {attempt.http} {attempt.http === 409 ? 'Conflict' : 'Bad Request'}</b>
                <ul>
                  {attempt.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : currentValidation.ok ? (
            <div className="alert ok" style={{ margin: 0 }}>
              <div className="ico" aria-hidden="true">✓</div>
              <div><b>No conflicts found.</b> Safe to save.</div>
            </div>
          ) : (
            <div className="alert warn" style={{ margin: 0 }}>
              <div className="ico" aria-hidden="true">!</div>
              <div>
                <b>Conflict check · would return HTTP {currentValidation.http}</b>
                <ul>
                  {currentValidation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div>
            <div className="row spread">
              <h3>Alternative slots</h3>
              <button
                className="btn sm"
                onClick={handleSuggest}
                disabled={suggLoading}
              >
                {suggLoading ? (
                  <>
                    <span className="spin"></span> Asking AI…
                  </>
                ) : (
                  'Suggest available slots'
                )}
              </button>
            </div>

            {suggMode && (
              <div
                style={{ marginTop: '8px' }}
                className={`pill ${suggMode === 'ai' ? 'brand' : 'warn'}`}
              >
                {suggMode === 'ai'
                  ? 'AI-ranked suggestions'
                  : 'AI unavailable → deterministic scan fallback (BR-05)'}
              </div>
            )}

            {suggestions && (
              suggestions.length > 0 ? (
                suggestions.map((s, idx) => (
                  <div key={idx} className="sugg">
                    <div>
                      <b>{s.day} {s.start}–{s.end}</b> · {getRoom(s.roomId)?.name}
                      <br />
                      <small style={{ color: 'var(--muted)' }}>{s.why}</small>
                    </div>
                    <button
                      className="btn sm primary"
                      onClick={() => handleApplySuggestion(s)}
                    >
                      Use
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">No free slots found</div>
              )
            )}
          </div>
        </div>

        <footer>
          <small style={{ color: 'var(--muted)', alignSelf: 'center' }}>
            Checks run server-side in a D1 transaction.
          </small>
          <div className="row">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" onClick={handleSave}>
              {meeting ? 'Save changes' : 'Create meeting'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

function m2t(m: number): string {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
