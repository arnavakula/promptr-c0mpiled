"use client";

import { useState } from "react";
import { useSocket, SocketEvent } from "@/hooks/useSocket";

export default function TestWebSocket() {
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number>(1);
  const [email, setEmail] = useState("test@promptr.dev");
  const [password, setPassword] = useState("testpass123");
  const [status, setStatus] = useState("Not connected");

  const { connected, events } = useSocket({
    token,
    projectId: token ? projectId : null,
    onEvent: (e: SocketEvent) => {
      console.log("Event received:", e);
    },
  });

  const login = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        setStatus("Logged in — connecting socket...");
      } else {
        setStatus(`Login failed: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setStatus(`Login error: ${err}`);
    }
  };

  const triggerEmit = async () => {
    if (!token) return;
    try {
      await fetch(`http://localhost:8000/api/debug/emit/${projectId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus("Emit triggered — check events below");
    } catch (err) {
      setStatus(`Emit error: ${err}`);
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: "monospace", maxWidth: 700 }}>
      <h1>WebSocket Test</h1>

      <div style={{ marginBottom: 16 }}>
        <strong>Connection: </strong>
        <span style={{ color: connected ? "green" : "red" }}>
          {connected ? "CONNECTED" : "DISCONNECTED"}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Status: </strong>{status}
      </div>

      {!token ? (
        <div style={{ marginBottom: 16 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            style={{ marginRight: 8, padding: 4 }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
            style={{ marginRight: 8, padding: 4 }}
          />
          <button onClick={login} style={{ padding: "4px 12px" }}>
            Login & Connect
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <label>
            Project ID:{" "}
            <input
              type="number"
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              style={{ width: 60, padding: 4, marginRight: 8 }}
            />
          </label>
          <button onClick={triggerEmit} style={{ padding: "4px 12px" }}>
            Send Test Event
          </button>
        </div>
      )}

      <h2>Events ({events.length})</h2>
      <div
        style={{
          background: "#111",
          color: "#0f0",
          padding: 16,
          borderRadius: 8,
          maxHeight: 400,
          overflow: "auto",
          fontSize: 13,
        }}
      >
        {events.length === 0 && <div>No events yet...</div>}
        {events.map((e, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>[{e.type}]</strong>{" "}
            {JSON.stringify(e.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
