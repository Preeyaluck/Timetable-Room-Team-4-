import React, { useState } from 'react';
import { Meeting, Room, User } from '../types';
import { DAYS, timeOpts, t2m } from '../services/api';

interface RequestRoomModalProps {
  currentUser: User;
  initialRoomId: string;
  rooms: Room[];
  meetings: Meeting[];
  onSubmit: (requestData: {
    studentId: string;
    studentName: string;
    roomId: string;
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    start: string;
    end: string;
    purpose: string;
    attendees: number;
  }) => void;
  onClose: () => void;
}

export const RequestRoomModal: React.FC<RequestRoomModalProps> = ({
  currentUser,
  initialRoomId,
  rooms,
  meetings,
  onSubmit,
  onClose,
}) => {
  const [roomId, setRoomId] = useState<string>(initialRoomId || rooms[0]?.id || '');
  const [day, setDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'>('Mon');
  const [start, setStart] = useState<string>('13:00');
  const [end, setEnd] = useState<string>('15:00');
  const [purpose, setPurpose] = useState<string>('');
  const [attendees, setAttendees] = useState<number>(15);

  const selectedRoom = rooms.find((r) => r.id === roomId) || rooms[0];

  // Validation
  const errors: string[] = [];
  if (t2m(end) <= t2m(start)) {
    errors.push('End time must be after start time.');
  }

  // Check if room is booked by class
  const conflictingMeeting = meetings.find(
    (m) =>
      m.roomId === roomId &&
      m.day === day &&
      t2m(m.start) < t2m(end) &&
      t2m(start) < t2m(m.end)
  );

  if (conflictingMeeting) {
    errors.push(
      `Room is already booked on ${day} (${conflictingMeeting.start}–${conflictingMeeting.end}). Please pick another time or room.`
    );
  }

  if (selectedRoom && attendees > selectedRoom.capacity) {
    errors.push(
      `Attendees (${attendees}) exceed ${selectedRoom.name} capacity (${selectedRoom.capacity} seats).`
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;
    if (!purpose.trim()) {
      alert('Please state the purpose for using this classroom.');
      return;
    }

    onSubmit({
      studentId: currentUser.id,
      studentName: currentUser.name,
      roomId,
      day,
      start,
      end,
      purpose: purpose.trim(),
      attendees: Number(attendees) || 1,
    });
  };

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header>
          <div>
            <h2>Request Room Booking</h2>
            <small style={{ color: 'var(--muted)' }}>
              Submit room usage request to Staff Room Planner
            </small>
          </div>
          <button className="btn sm" onClick={onClose} type="button">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="body">
            <div className="form2">
              <label className="field">
                Select Classroom
                <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.capacity} seats ({r.building})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Day of Week
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value as any)}
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
                Start Time
                <select value={start} onChange={(e) => setStart(e.target.value)}>
                  {timeOpts.slice(0, -1).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                End Time
                <select value={end} onChange={(e) => setEnd(e.target.value)}>
                  {timeOpts.slice(1).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              Purpose / Activity Name
              <input
                type="text"
                placeholder="e.g. SWE204 Group Project Discussion, Tutoring Session"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </label>

            <div className="form2">
              <label className="field">
                Estimated Attendees
                <input
                  type="number"
                  min="1"
                  max={selectedRoom ? selectedRoom.capacity : 100}
                  value={attendees}
                  onChange={(e) => setAttendees(Number(e.target.value))}
                  required
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="pill brand" style={{ width: 'fit-content', marginTop: '16px' }}>
                  Requester: {currentUser.name} ({currentUser.id})
                </span>
              </div>
            </div>

            {/* Diagnostics */}
            {errors.length > 0 ? (
              <div className="alert bad" style={{ margin: 0 }}>
                <div className="ico">!</div>
                <div>
                  <b>Cannot request this slot:</b>
                  <ul>
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="alert ok" style={{ margin: 0 }}>
                <div className="ico">✓</div>
                <div>
                  <b>Slot is available!</b> {selectedRoom?.name} is free on {day} ({start}–{end}).
                </div>
              </div>
            )}
          </div>

          <footer>
            <small style={{ color: 'var(--muted)', alignSelf: 'center' }}>
              Staff will review and approve your request.
            </small>
            <div className="row">
              <button className="btn" type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn primary"
                type="submit"
                disabled={errors.length > 0}
              >
                Send Request to Staff →
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};
