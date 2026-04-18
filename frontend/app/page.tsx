"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showEnter, setShowEnter] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;;

    const N = 10000;
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
    const tx = new Float32Array(N), ty = new Float32Array(N), tz = new Float32Array(N);
    const hue = new Float32Array(N), phase = new Float32Array(N);

    let W = 0, H = 0, CX = 0, CY = 0, dpr = 1;
    let appState = 0;
    let mouseX = -9999, mouseY = -9999;
    let t = 0, rotY = 0;
    const FOV = 550, CAMERA_Z = 600;
    const REPEL_RADIUS = 100, REPEL_FORCE = 8;
    const PHI = Math.PI * (1 + Math.sqrt(5));
    let rafId = 0;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = window.innerWidth; H = window.innerHeight;
      CX = W / 2; CY = H / 2;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.scale(dpr, dpr);
      if (appState === 0) initSphereTargets();
    }

    function initSphereTargets() {
      const R = Math.min(W, H) * (Math.min(W, H) > 1200 ? 0.28 : 0.38);
      for (let i = 0; i < N; i++) {
        const polar = Math.acos(1 - 2 * (i + 0.5) / N);
        const azim = PHI * i;
        tx[i] = Math.sin(polar) * Math.cos(azim) * R;
        ty[i] = Math.sin(polar) * Math.sin(azim) * R;
        tz[i] = Math.cos(polar) * R;
      }
    }

    function initParticles() {
      for (let i = 0; i < N; i++) {
        px[i] = (Math.random() - 0.5) * W * 2;
        py[i] = (Math.random() - 0.5) * H * 2;
        pz[i] = (Math.random() - 0.5) * 1000;
        vx[i] = vy[i] = vz[i] = 0;
        hue[i] = (i / N) * 60 + 25;
        phase[i] = Math.random() * Math.PI * 2;
      }
    }

    function sampleTextPositions(phrase: string) {
      const cW = Math.floor(W), cH = Math.floor(H);
      const off = document.createElement("canvas");
      off.width = cW; off.height = cH;
      const c2 = off.getContext("2d")!;
      const words = phrase.split(" ");
      const lines: string[] = [];
      let cur = "";
      const maxChars = phrase.length > 25 ? 12 : 20;
      words.forEach(w => {
        if ((cur + w).length > maxChars) { lines.push(cur.trim()); cur = w + " "; }
        else cur += w + " ";
      });
      lines.push(cur.trim());
      let fs = Math.min(cW * 0.72 / (maxChars * 0.5), cH * 0.50 / lines.length, 180);
      if (phrase.length > 30) fs *= 0.8;
      c2.fillStyle = "#fff";
      c2.font = `900 ${fs}px Arial Black, Arial, sans-serif`;
      c2.textAlign = "center"; c2.textBaseline = "middle";
      const lh = fs * 1.1;
      const startY = cH / 2 - ((lines.length - 1) * lh / 2);
      lines.forEach((line, i) => c2.fillText(line, cW / 2, startY + i * lh));
      const data = c2.getImageData(0, 0, cW, cH).data;
      const pts: number[] = [];
      for (let y = 0; y < cH; y++) {
        for (let x = 0; x < cW; x++) {
          if (data[(y * cW + x) * 4 + 3] > 120)
            pts.push(x - cW / 2 + (Math.random() - 0.5) * 0.8, y - cH / 2 + (Math.random() - 0.5) * 0.8);
        }
      }
      for (let i = pts.length / 2 - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const ia = i * 2, ja = j * 2;
        let tmp = pts[ia]; pts[ia] = pts[ja]; pts[ja] = tmp;
        tmp = pts[ia + 1]; pts[ia + 1] = pts[ja + 1]; pts[ja + 1] = tmp;
      }
      return pts;
    }

    function formWord(phrase: string) {
      appState = 1;
      const pts = sampleTextPositions(phrase);
      const pCount = pts.length / 2;
      for (let i = 0; i < N; i++) {
        const idx = (i % pCount) * 2;
        tx[i] = pts[idx]; ty[i] = pts[idx + 1]; tz[i] = 0;
      }
      rotY = 0; t = 0;
      setTimeout(() => { appState = 2; }, 2200);
    }

    function update() {
      t += 0.005;
      if (appState === 0) rotY += 0.006;
      const jitter = appState === 0 ? 1.8 : 0;
      for (let i = 0; i < N; i++) {
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        let tX = tx[i] * cosY - tz[i] * sinY;
        let tY = ty[i];
        let tZ = tx[i] * sinY + tz[i] * cosY;
        if (appState === 0) {
          tX += Math.sin(t * 8 + phase[i]) * jitter;
          tY += Math.cos(t * 9 + phase[i]) * jitter;
          tZ += Math.sin(t * 7 + phase[i] * 2) * jitter;
        }
        const sp = appState === 0 ? 0.02 : 0.022;
        vx[i] += (tX - px[i]) * sp;
        vy[i] += (tY - py[i]) * sp;
        vz[i] += (tZ - pz[i]) * sp;
        if (appState >= 1 && mouseX > 0) {
          const scale = FOV / (FOV + pz[i] + CAMERA_Z);
          const sx = px[i] * scale + CX, sy = py[i] * scale + CY;
          const rdx = sx - mouseX, rdy = sy - mouseY;
          const d2 = rdx * rdx + rdy * rdy;
          if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
            const d = Math.sqrt(d2);
            const mag = REPEL_FORCE * (1 - d / REPEL_RADIUS) * 5;
            vx[i] += (rdx / d) * mag; vy[i] += (rdy / d) * mag;
          }
        }
        vx[i] *= 0.82; vy[i] *= 0.82; vz[i] *= 0.82;
        px[i] += vx[i]; py[i] += vy[i]; pz[i] += vz[i];
      }
    }

    function draw() {
      ctx.fillStyle = "rgba(5,5,5,0.22)";
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        const zPos = pz[i] + CAMERA_Z;
        if (zPos < 10) continue;
        const scale = FOV / zPos;
        const sx = px[i] * scale + CX, sy = py[i] * scale + CY;
        const spd = Math.sqrt(vx[i] ** 2 + vy[i] ** 2 + vz[i] ** 2);
        let a = Math.min(1, (0.18 + spd * 0.1) * (scale * 0.65));
        let size = (0.4 + spd * 0.12) * scale;
        let h: number, s: number, l: number;
        if (appState >= 1) {
          h = 42; s = 95; l = 65;
          a = Math.min(1, a * 1.6);
          size *= 0.9;
        } else {
          h = (hue[i] + t * 15) % 80 + 25;
          s = 85; l = 68;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.1, size), 0, 6.2832);
        ctx.fillStyle = `hsla(${h},${s}%,${l}%,${a})`;
        ctx.fill();
      }
    }

    function loop() {
      update(); draw();
      rafId = requestAnimationFrame(loop);
    }

    canvas.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY; });
    canvas.addEventListener("mouseleave", () => { mouseX = -9999; mouseY = -9999; });
    canvas.addEventListener("dblclick", () => {
      appState = 0;
      initSphereTargets();
    });

    resize();
    initParticles();
    loop();

    const t1 = setTimeout(() => formWord("CreditMind"), 1800);
    const t2 = setTimeout(() => setShowSubtitle(true), 3400);
    const t3 = setTimeout(() => setShowEnter(true), 4400);

    const onResize = () => { ctx.resetTransform(); resize(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div style={{ background: "#050505", width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", cursor: "default" }} />

      {/* Top subtitle */}
      <div style={{
        position: "fixed", top: 40, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, textAlign: "center",
        opacity: showSubtitle ? 1 : 0, transition: "opacity 1.2s ease",
      }}>
        <p style={{
          color: "rgba(201,168,76,0.5)", fontSize: 11,
          fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.3em",
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          AI-Native Credit Intelligence Platform
        </p>
      </div>

      {/* Enter button */}
      <div style={{
        position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        opacity: showEnter ? 1 : 0, transition: "opacity 1.2s ease",
        pointerEvents: showEnter ? "auto" : "none",
      }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "rgba(201,168,76,0.08)",
            border: "1px solid rgba(201,168,76,0.5)",
            color: "#C9A84C",
            padding: "13px 40px",
            borderRadius: 50,
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.1em",
            cursor: "pointer",
            fontWeight: 600,
            transition: "all 0.25s ease",
            boxShadow: "0 0 28px rgba(201,168,76,0.14)",
          }}
          onMouseEnter={e => {
            const btn = e.currentTarget;
            btn.style.background = "rgba(201,168,76,0.18)";
            btn.style.boxShadow = "0 0 40px rgba(201,168,76,0.3)";
            btn.style.borderColor = "rgba(201,168,76,0.8)";
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget;
            btn.style.background = "rgba(201,168,76,0.08)";
            btn.style.boxShadow = "0 0 28px rgba(201,168,76,0.14)";
            btn.style.borderColor = "rgba(201,168,76,0.5)";
          }}
        >
          Enter Dashboard →
        </button>
        <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.05em" }}>
          move cursor over text · double-click to reset sphere
        </p>
      </div>
    </div>
  );
}
