import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket Signaling"])

class RoomManager:
    def __init__(self):
        # meeting_code -> list of dicts: {"socket": WebSocket, "peer_id": str, "display_name": str}
        self.rooms: Dict[str, List[dict]] = {}

    async def connect(self, websocket: WebSocket, meeting_code: str):
        await websocket.accept()
        if meeting_code not in self.rooms:
            self.rooms[meeting_code] = []

    def disconnect(self, websocket: WebSocket, meeting_code: str) -> dict:
        disconnected_peer = None
        if meeting_code in self.rooms:
            peer_list = self.rooms[meeting_code]
            for peer in peer_list:
                if peer["socket"] == websocket:
                    disconnected_peer = peer
                    peer_list.remove(peer)
                    break
            if len(self.rooms[meeting_code]) == 0:
                del self.rooms[meeting_code]
        return disconnected_peer

    async def broadcast_to_room(self, meeting_code: str, message: dict, sender_socket: WebSocket = None):
        if meeting_code in self.rooms:
            for peer in self.rooms[meeting_code]:
                if sender_socket is None or peer["socket"] != sender_socket:
                    try:
                        await peer["socket"].send_json(message)
                    except Exception:
                        pass

    async def send_to_peer(self, meeting_code: str, target_peer_id: str, message: dict):
        if meeting_code in self.rooms:
            for peer in self.rooms[meeting_code]:
                if peer["peer_id"] == target_peer_id:
                    try:
                        await peer["socket"].send_json(message)
                    except Exception:
                        pass
                    break

manager = RoomManager()

@router.websocket("/ws/meetings/{meeting_code}")
async def websocket_signaling(websocket: WebSocket, meeting_code: str):
    await manager.connect(websocket, meeting_code)
    current_peer_id = None

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                continue

            msg_type = payload.get("type")

            if msg_type == "join":
                current_peer_id = payload.get("peer_id")
                display_name = payload.get("display_name", "Guest")
                is_muted = payload.get("is_muted", False)
                is_video_on = payload.get("is_video_on", True)

                # Store connection info
                manager.rooms[meeting_code].append({
                    "socket": websocket,
                    "peer_id": current_peer_id,
                    "display_name": display_name
                })

                # Existing peers in room
                existing_peers = [
                    {
                        "peer_id": p["peer_id"],
                        "display_name": p["display_name"]
                    }
                    for p in manager.rooms[meeting_code]
                    if p["socket"] != websocket
                ]

                # Send room join confirmation to caller
                await websocket.send_json({
                    "type": "room-joined",
                    "your_peer_id": current_peer_id,
                    "existing_peers": existing_peers
                })

                # Broadcast peer-joined to rest of room
                await manager.broadcast_to_room(
                    meeting_code,
                    {
                        "type": "peer-joined",
                        "peer_id": current_peer_id,
                        "display_name": display_name,
                        "is_muted": is_muted,
                        "is_video_on": is_video_on
                    },
                    sender_socket=websocket
                )

            elif msg_type in ["offer", "answer", "ice-candidate"]:
                target_id = payload.get("target_id")
                if target_id:
                    await manager.send_to_peer(meeting_code, target_id, payload)

            elif msg_type == "media-state":
                await manager.broadcast_to_room(meeting_code, payload, sender_socket=websocket)

            elif msg_type == "chat-message":
                await manager.broadcast_to_room(meeting_code, payload)

            elif msg_type == "host-action":
                target_id = payload.get("target_id")
                if target_id:
                    await manager.send_to_peer(meeting_code, target_id, payload)

            elif msg_type == "ping":
                # Keep-alive — respond with pong
                try:
                    await websocket.send_json({"type": "pong"})
                except Exception:
                    pass

    except WebSocketDisconnect:
        disconnected_peer = manager.disconnect(websocket, meeting_code)
        if disconnected_peer:
            await manager.broadcast_to_room(meeting_code, {
                "type": "peer-left",
                "peer_id": disconnected_peer["peer_id"],
                "display_name": disconnected_peer["display_name"]
            })
