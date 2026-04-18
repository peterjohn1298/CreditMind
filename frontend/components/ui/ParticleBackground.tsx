"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    type P = { x: number; y: number; vx: number; vy: number; opacity: number; size: number; phase: number };
    const N = 160;
    let particles: P[] = [];
    let W = 0, H = 0, rafId = 0, t = 0;

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    }

    function init() {
      particles = Array.from({ length: N }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.35 + 0.08),
        opacity: Math.random() * 0.22 + 0.04,
        size: Math.random() * 1.4 + 0.4,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function loop() {
      t += 0.007;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx + Math.sin(t + p.phase) * 0.12;
        p.y += p.vy;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        if (p.x < -6) p.x = W + 6;
        if (p.x > W + 6) p.x = -6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 6.2832);
        ctx.fillStyle = `rgba(201,168,76,${p.opacity})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(loop);
    }

    resize();
    init();
    loop();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", resize); };
  }, [pathname]);

  if (pathname === "/") return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}
