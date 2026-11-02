import React from 'react';
import { DAYS, H0, H1, HH, overlap, t2m } from '../services/api';

export interface GridBlock {
  id?: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  start: string;
  end: string;
  title: string;
  l1?: string;
  l2?: string;
  c: { bg: string; bd: string; tx: string };
  cls?: string;
  editId?: string;
}

interface TimetableGridProps {
  blocks: GridBlock[];
  onBlockClick?: (meetingId: string) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({ blocks, onBlockClick }) => {
  const d = new Date().getDay();
  const todayIdx = d >= 1 && d <= 5 ? d - 1 : -1;

  // Lay out overlapping blocks side by side
  const preparedBlocks = blocks.map((b) => {
    const group = blocks.filter((o) => o.day === b.day && overlap(o, b));
    return {
      ...b,
      _n: group.length,
      _i: group.indexOf(b),
    };
  });

  const hours: JSX.Element[] = [];
  for (let h = H0; h < H1; h++) {
    hours.push(
      <span key={h} style={{ top: `${(h - H0) * HH}px` }}>
        {String(h).padStart(2, '0')}:00
      </span>
    );
  }

  return (
    <div className="ttwrap">
      <div className="tt" style={{ ['--hh' as any]: `${HH}px` }}>
        <div className="tt-head">
          <div></div>
          {DAYS.map((day, idx) => (
            <div key={day} className={idx === todayIdx ? 'today' : ''}>
              {day}
            </div>
          ))}
        </div>

        <div className="tt-body">
          <div className="tt-hours" style={{ height: `${(H1 - H0) * HH}px` }}>
            {hours}
          </div>

          {DAYS.map((day, idx) => {
            const dayBlocks = preparedBlocks.filter((b) => b.day === day);
            return (
              <div
                key={day}
                className={`tt-col ${idx === todayIdx ? 'today' : ''}`}
                style={{ height: `${(H1 - H0) * HH}px` }}
              >
                {dayBlocks.map((b, bIdx) => {
                  const top = ((t2m(b.start) - H0 * 60) / 60) * HH;
                  const h = ((t2m(b.end) - t2m(b.start)) / 60) * HH - 2;
                  const w = 100 / b._n;

                  return (
                    <div
                      key={b.id || bIdx}
                      className={`blk ${b.cls || ''}`}
                      data-edit={b.editId}
                      title={b.title}
                      onClick={() => b.editId && onBlockClick && onBlockClick(b.editId)}
                      style={{
                        top: `${top}px`,
                        height: `${h}px`,
                        left: `calc(${b._i * w}% + 3px)`,
                        width: `calc(${w}% - 6px)`,
                        background: b.c.bg,
                        borderColor: b.c.bd,
                        color: b.c.tx,
                        cursor: b.editId ? 'pointer' : 'default',
                      }}
                    >
                      <b>{b.title}</b>
                      {b.l1 && <>{b.l1}<br /></>}
                      {b.l2}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
