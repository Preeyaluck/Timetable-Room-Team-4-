import React from 'react';
import { Room } from '../types';

interface BuildingMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export const BuildingMapModal: React.FC<BuildingMapModalProps> = ({
  isOpen,
  onClose,
  rooms,
  selectedRoomId,
  onSelectRoom,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog map-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">แผนผังอาคารวิทยาศาสตร์ ชั้น 3</h3>
            <p className="modal-subtitle">ผังแสดงตำแหน่งห้องเรียน ห้องปฏิบัติการ และสถานะการใช้งาน</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="map-canvas-container">
          <div className="building-hallway">โถงทางเดินหลัก (Central Hallway - Floor 3)</div>
          <div className="floorplan-rooms-grid">
            {rooms.map((r) => {
              const isSelected = r.id === selectedRoomId;
              return (
                <div
                  key={r.id}
                  className={`floorplan-room-box ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectRoom(r.id);
                    onClose();
                  }}
                >
                  <div className="fp-room-header">
                    <span className="fp-room-name">{r.name}</span>
                    <span className="fp-room-badge">{r.capacity} ที่นั่ง</span>
                  </div>
                  <div className="fp-room-type">{r.type || 'ห้องบรรยาย'}</div>
                  <div className="fp-room-features">
                    {r.features?.join(' · ') || 'โปรเจกเตอร์ · Wi-Fi'}
                  </div>
                  <div className="fp-click-hint">คลิกเพื่อดูตารางห้องนี้ ↗</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn outline" onClick={onClose}>ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  );
};
