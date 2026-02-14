import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let socket: Socket | null = null;

/**
 * Get or create the Socket.IO client singleton.
 * Connects with JWT auth token. Call disconnect() to tear down.
 */
export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    path: "/ws/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
}

/**
 * Join a project room to receive real-time updates.
 */
export function joinProject(projectId: number): void {
  if (!socket?.connected) {
    console.warn("[Socket] Not connected — cannot join project");
    return;
  }
  socket.emit("join_project", { project_id: projectId });
}

/**
 * Leave a project room.
 */
export function leaveProject(projectId: number): void {
  if (!socket?.connected) return;
  socket.emit("leave_project", { project_id: projectId });
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null).
 */
export function getSocketInstance(): Socket | null {
  return socket;
}
