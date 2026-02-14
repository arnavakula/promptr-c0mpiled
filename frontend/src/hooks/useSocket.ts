"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  getSocket,
  joinProject,
  leaveProject,
  disconnectSocket,
} from "@/lib/socket";

/** All event types the server can emit. */
export type SocketEventType =
  | "progress_update"
  | "questions_ready"
  | "spec_ready"
  | "prompts_generated"
  | "workflow_completed"
  | "workflow_failed"
  | "refinement_completed"
  | "joined_project"
  | "error";

export interface SocketEvent {
  type: SocketEventType;
  data: Record<string, unknown>;
}

interface UseSocketOptions {
  /** JWT token — socket connects when this is provided. */
  token: string | null;
  /** Project ID to join — room is joined/left reactively. */
  projectId?: number | null;
  /** Optional callback fired on every event. */
  onEvent?: (event: SocketEvent) => void;
}

interface UseSocketReturn {
  connected: boolean;
  lastEvent: SocketEvent | null;
  events: SocketEvent[];
}

const ALL_EVENTS: SocketEventType[] = [
  "progress_update",
  "questions_ready",
  "spec_ready",
  "prompts_generated",
  "workflow_completed",
  "workflow_failed",
  "refinement_completed",
  "joined_project",
  "error",
];

export function useSocket({
  token,
  projectId,
  onEvent,
}: UseSocketOptions): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Connect / disconnect based on token
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    const sock = getSocket(token);
    socketRef.current = sock;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    if (sock.connected) setConnected(true);

    // Listen to all server event types
    const handler = (type: SocketEventType) => (data: Record<string, unknown>) => {
      const event: SocketEvent = { type, data };
      console.log(`[Socket] ${type}:`, data);
      setLastEvent(event);
      setEvents((prev) => [...prev, event]);
      onEventRef.current?.(event);
    };

    const handlers = ALL_EVENTS.map((type) => {
      const h = handler(type);
      sock.on(type, h);
      return { type, h };
    });

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      handlers.forEach(({ type, h }) => sock.off(type, h));
    };
  }, [token]);

  // Join / leave project room
  useEffect(() => {
    if (!connected || !projectId) return;
    joinProject(projectId);
    return () => {
      leaveProject(projectId);
    };
  }, [connected, projectId]);

  return { connected, lastEvent, events };
}
