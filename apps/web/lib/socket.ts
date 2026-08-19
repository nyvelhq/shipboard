import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

// One socket per browser tab, reused across pages/navigations. Auth token
// is sent once at connect time via the handshake, verified server-side in
// RealtimeGateway.handleConnection.
export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;
  socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}
