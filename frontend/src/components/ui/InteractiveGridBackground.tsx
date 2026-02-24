"use client";

import { useEffect, useRef, useCallback } from "react";

const GRID_SIZE = 48;
const GLOW_RADIUS = 180;
const LINE_COLOR = "rgba(0, 0, 0, 0.04)";
const GLOW_COLOR = { r: 59, g: 130, b: 246 }; // blue-500

export function InteractiveGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const animationId = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const mx = mouse.current.x;
    const my = mouse.current.y;

    // Draw vertical lines
    for (let x = 0; x <= w; x += GRID_SIZE) {
      const dist = Math.abs(x - mx);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);

      if (dist < GLOW_RADIUS) {
        const intensity = 1 - dist / GLOW_RADIUS;
        const alpha = 0.08 + intensity * 0.18;
        ctx.strokeStyle = `rgba(${GLOW_COLOR.r}, ${GLOW_COLOR.g}, ${GLOW_COLOR.b}, ${alpha})`;
        ctx.lineWidth = 0.25 + intensity * 0.25;
      } else {
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = 0.25;
      }
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= h; y += GRID_SIZE) {
      const dist = Math.abs(y - my);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);

      if (dist < GLOW_RADIUS) {
        const intensity = 1 - dist / GLOW_RADIUS;
        const alpha = 0.08 + intensity * 0.18;
        ctx.strokeStyle = `rgba(${GLOW_COLOR.r}, ${GLOW_COLOR.g}, ${GLOW_COLOR.b}, ${alpha})`;
        ctx.lineWidth = 0.25 + intensity * 0.25;
      } else {
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = 0.25;
      }
      ctx.stroke();
    }

    // Draw radial glow at cursor position
    if (mx > 0 && my > 0) {
      const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, GLOW_RADIUS);
      gradient.addColorStop(0, `rgba(${GLOW_COLOR.r}, ${GLOW_COLOR.g}, ${GLOW_COLOR.b}, 0.07)`);
      gradient.addColorStop(0.5, `rgba(${GLOW_COLOR.r}, ${GLOW_COLOR.g}, ${GLOW_COLOR.b}, 0.03)`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
    animationId.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouse.current = { x: -1000, y: -1000 };
    };

    resize();
    window.addEventListener("resize", resize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    animationId.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 blur-[3px]"
      aria-hidden="true"
    />
  );
}
