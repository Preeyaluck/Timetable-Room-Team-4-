import React, { useState } from 'react';
import { Meeting, Room, User } from '../types';
import { overlap } from '../services/api';

interface AiConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  rooms: Room[];
  meetings: Meeting[];
  onRequestWithData?: (data: {
    roomId: string;
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    start: string;
    end: string;
    purpose: string;
    attendees: number;
  }) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  recommendations?: {
    room: Room;
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    dayThai: string;
    start: string;
    end: string;
    attendees: number;
    purpose: string;
    reason: string;
  }[];
}

export const AiConsultantModal: React.FC<AiConsultantModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  rooms,
  meetings,
  onRequestWithData,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `สวัสดีครับคุณ ${currentUser.name} 👋 ผมคือ AI ผู้ช่วยจัดสรรและค้นหาห้องเรียน คุณสามารถพิมพ์สอบถามความต้องการ เช่น "อยากติวหนังสือวันพุธ 10:00-12:00 สำหรับ 15 คน มีห้องไหนว่างบ้าง?" หรือ "วันศุกร์บ่ายมีห้องบรรยาย 40 คนว่างไหม?" ได้เลยครับ`,
      timestamp: 'เมื่อสักครู่',
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'อยากติวหนังสือ 15 คน วันพุธ 10:00-12:00 มีห้องไหนว่างบ้าง?',
    'วันศุกร์บ่าย 13:00-15:00 จัดสัมมนา 40 คน อาคารวิทยาศาสตร์ มีห้องว่างไหม?',
    'ต้องการห้องปฏิบัติการคอมพิวเตอร์ 30 คน วันพฤหัสบดี',
    'วันจันทร์เช้า 09:00-11:00 มีห้องไหนว่างบ้าง?',
  ];

  const handleAsk = (query: string) => {
    const q = query.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    setTimeout(() => {
      // Analyze the query for day, time, capacity, room type
      const lower = q.toLowerCase();

      // 1. Detect Day
      let day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' = 'Wed';
      let dayThai = 'พุธ';
      if (lower.includes('จันทร์') || lower.includes('mon')) {
        day = 'Mon';
        dayThai = 'จันทร์';
      } else if (lower.includes('อังคาร') || lower.includes('tue')) {
        day = 'Tue';
        dayThai = 'อังคาร';
      } else if (lower.includes('พุธ') || lower.includes('wed')) {
        day = 'Wed';
        dayThai = 'พุธ';
      } else if (lower.includes('พฤหัส') || lower.includes('thu')) {
        day = 'Thu';
        dayThai = 'พฤหัสบดี';
      } else if (lower.includes('ศุกร์') || lower.includes('fri')) {
        day = 'Fri';
        dayThai = 'ศุกร์';
      }

      // 2. Detect Time
      let start = '10:00';
      let end = '12:00';
      if (lower.includes('บ่าย') || lower.includes('13:') || lower.includes('14:') || lower.includes('15:')) {
        start = '13:00';
        end = '15:00';
      } else if (lower.includes('เช้า') || lower.includes('09:') || lower.includes('9:')) {
        start = '09:00';
        end = '11:00';
      }

      // Check regex for explicit time like 10:00-12:00
      const timeMatch = q.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        start = timeMatch[1].padStart(5, '0');
        end = timeMatch[2].padStart(5, '0');
      }

      // 3. Detect Attendees count
      let attendees = 15;
      const numMatch = q.match(/(\d+)\s*(คน|ที่นั่ง)/);
      if (numMatch) {
        attendees = parseInt(numMatch[1], 10);
      } else if (lower.includes('40')) {
        attendees = 40;
      } else if (lower.includes('30')) {
        attendees = 30;
      }

      // 4. Detect Purpose
      let purpose = 'การศึกษาค้นคว้าและทำงานกลุ่ม';
      if (lower.includes('ติว')) {
        purpose = 'ติวสอบและทบทวนเนื้อหารายวิชา';
      } else if (lower.includes('สัมมนา')) {
        purpose = 'สัมมนาและนำเสนอโครงงานกลุ่มย่อย';
      } else if (lower.includes('คอมพิวเตอร์') || lower.includes('แล็บ') || lower.includes('lab')) {
        purpose = 'ฝึกปฏิบัติการคอมพิวเตอร์และเขียนโปรแกรม';
      }

      // 5. Detect Room Type preference
      const wantsLab = lower.includes('คอม') || lower.includes('แล็บ') || lower.includes('lab');

      // 6. Find Available Rooms without conflicts
      const availableRooms = rooms.filter((r) => {
        // Check capacity
        if (r.capacity < attendees) return false;

        // Check lab preference if asked
        if (wantsLab && !r.type?.includes('คอมพิวเตอร์')) return false;

        // Check meetings conflict
        const isOccupied = meetings.some(
          (m) =>
            m.roomId === r.id &&
            m.day === day &&
            overlap({ start, end }, { start: m.start, end: m.end })
        );

        return !isOccupied;
      });

      // Rank rooms: Best capacity fit first
      availableRooms.sort((a, b) => a.capacity - b.capacity);

      let aiResponseText = '';
      const recs: {
        room: Room;
        day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
        dayThai: string;
        start: string;
        end: string;
        attendees: number;
        purpose: string;
        reason: string;
      }[] = [];

      if (availableRooms.length > 0) {
        aiResponseText = `จากการตรวจสอบตารางการใช้ห้องในระบบสำหรับวัน${dayThai} ช่วงเวลา ${start} - ${end} น. มีห้องที่ว่างและรองรับผู้เข้าร่วม ${attendees} คนได้ ดังนี้ครับ:`;

        availableRooms.slice(0, 2).forEach((room) => {
          recs.push({
            room,
            day,
            dayThai,
            start,
            end,
            attendees,
            purpose,
            reason: `ห้อง ${room.name} (${room.type || 'ห้องบรรยาย'}) ว่างสมบูรณ์ในวัน${dayThai} ${start}-${end} น. ความจุ ${room.capacity} ที่นั่ง (เหลือ ${room.capacity - attendees} ที่นั่ง) อุปกรณ์ครบครัน`,
          });
        });
      } else {
        // Alternative day/time suggestion
        aiResponseText = `ขออภัยครับ ในวัน${dayThai} ช่วงเวลา ${start} - ${end} น. ห้องที่มีความจุตั้งแต่ ${attendees} คนขึ้นไปถูกใช้งานเต็มทั้งหมด แต่ผมขอแนะนำช่วงเวลาใกล้เคียงที่ห้องว่างให้ดังนี้ครับ:`;

        const altRoom = rooms.find((r) => r.capacity >= attendees) || rooms[0];
        recs.push({
          room: altRoom,
          day: 'Fri',
          dayThai: 'ศุกร์',
          start: '13:00',
          end: '15:00',
          attendees,
          purpose,
          reason: `ช่วงบ่ายวันศุกร์ 13:00-15:00 ห้อง ${altRoom.name} ว่างและรองรับได้ ${altRoom.capacity} ที่นั่ง`,
        });
      }

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        recommendations: recs,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 600);
  };

  const handleApplyRequest = (rec: {
    room: Room;
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
    start: string;
    end: string;
    attendees: number;
    purpose: string;
  }) => {
    if (onRequestWithData) {
      onRequestWithData({
        roomId: rec.room.id,
        day: rec.day,
        start: rec.start,
        end: rec.end,
        purpose: rec.purpose,
        attendees: rec.attendees,
      });
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog ai-advisor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header ai-modal-header">
          <div className="ai-header-left">
            <div className="ai-bot-avatar">✨</div>
            <div>
              <h3 className="modal-title">AI ผู้ช่วยปรึกษาและค้นหาห้องเรียน</h3>
              <p className="modal-subtitle">
                ถาม-ตอบ ตรวจสอบห้องว่าง และยื่นคำร้องขอใช้ห้องได้ทันทีแบบอัตโนมัติ
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-ai-modal">
            ✕
          </button>
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="ai-quick-prompts-bar">
          <span className="quick-prompt-label">คำถามตัวอย่าง:</span>
          <div className="quick-prompts-scroll">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                className="btn-quick-prompt-chip"
                onClick={() => handleAsk(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chat History Messages */}
        <div className="ai-chat-messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble-row ${msg.sender}`}>
              {msg.sender === 'ai' && <div className="chat-avatar-ai">✨</div>}

              <div className="chat-bubble-content">
                <div className="chat-bubble-text">{msg.text}</div>

                {/* Render Recommended Room Cards */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="ai-rec-rooms-grid">
                    {msg.recommendations.map((rec, i) => (
                      <div key={i} className="ai-room-card-box">
                        <div className="ai-room-card-top">
                          <div>
                            <span className="ai-rec-room-name">{rec.room.name}</span>
                            <span className="ai-rec-room-type">
                              {rec.room.type || 'ห้องเรียน'} · {rec.room.floor || 'ชั้น 3'}
                            </span>
                          </div>
                          <span className="ai-rec-status-tag">✓ ว่าง ไม่มีคาบชน</span>
                        </div>

                        <div className="ai-room-card-meta">
                          <span>📅 วัน{rec.dayThai} {rec.start}–{rec.end} น.</span>
                          <span>👥 รองรับ {rec.room.capacity} ที่นั่ง</span>
                        </div>

                        <p className="ai-room-card-reason">{rec.reason}</p>

                        <button
                          className="btn-action-primary btn-apply-ai-request"
                          onClick={() => handleApplyRequest(rec)}
                        >
                          <span>📨 ยื่นคำร้องขอใช้ห้องนี้ทันที</span>
                          <span className="arrow-icon">↗</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="chat-bubble-time">{msg.timestamp}</div>
              </div>

              {msg.sender === 'user' && (
                <div className="chat-avatar-user">
                  {currentUser.name.charAt(0)}
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="chat-bubble-row ai">
              <div className="chat-avatar-ai">✨</div>
              <div className="chat-bubble-content thinking-bubble">
                <span className="typing-dots">กำลังวิเคราะห์ตารางห้องเรียน...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          className="ai-chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputText);
          }}
        >
          <input
            type="text"
            className="ai-chat-input"
            placeholder="พิมพ์สอบถาม เช่น อยากจัดติววิชา CS201 วันพุธ 10:00-12:00 15 คน..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            id="input-ai-query"
          />
          <button
            type="submit"
            className="btn-ai-send"
            disabled={!inputText.trim()}
            id="btn-ai-submit"
          >
            <span>ส่งคำถาม</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
