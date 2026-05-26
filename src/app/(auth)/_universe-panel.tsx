'use client';

import * as React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BackgroundStar {
  x: number; y: number; size: number; baseOpacity: number;
  twinkleSpeed: number; twinklePhase: number;
}

interface MidStar {
  x: number; y: number; size: number; baseOpacity: number;
  twinkleSpeed: number; twinklePhase: number;
  driftX: number; driftY: number;
}

interface ForegroundStar {
  x: number; y: number; size: number; baseOpacity: number;
  twinkleSpeed: number; twinklePhase: number;
}

interface Nebula {
  cx: number; cy: number;
  driftAmpX: number; driftAmpY: number;
  cycle: number;
  clockwise: boolean;
  radius: number;
  r: number; g: number; b: number; maxOpacity: number;
  phaseOffset: number;
}

interface ShootingStar {
  active: boolean;
  startX: number; startY: number;
  angle: number; length: number;
  startTime: number;
  duration: number;
  nextFireAt: number;
}

// ── Canvas component ───────────────────────────────────────────────────────────

export function UniverseCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Don't run on mobile when panel is hidden
    if (canvas.offsetParent === null && window.innerWidth < 768) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    let rafId = 0;
    let lastTime = 0;

    let bgStars: BackgroundStar[] = [];
    let midStars: MidStar[] = [];
    let fgStars: ForegroundStar[] = [];

    const nebulae: Nebula[] = [
      {
        cx: 0.25, cy: 0.35, driftAmpX: 0.04, driftAmpY: 0.025,
        cycle: 110000, clockwise: true, radius: 0.38,
        r: 120, g: 60, b: 180, maxOpacity: 0.06, phaseOffset: 0,
      },
      {
        cx: 0.70, cy: 0.65, driftAmpX: 0.03, driftAmpY: 0.02,
        cycle: 95000, clockwise: false, radius: 0.30,
        r: 180, g: 140, b: 40, maxOpacity: 0.04, phaseOffset: Math.PI * 0.7,
      },
      {
        cx: 0.50, cy: 0.20, driftAmpX: 0.015, driftAmpY: 0.03,
        cycle: 130000, clockwise: true, radius: 0.25,
        r: 40, g: 80, b: 160, maxOpacity: 0.05, phaseOffset: Math.PI * 1.3,
      },
    ];

    const ss: ShootingStar = {
      active: false, startX: 0, startY: 0, angle: 0,
      length: 0, startTime: 0, duration: 0,
      nextFireAt: 0, // set after first frame
    };

    function rnd(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function initStars(w: number, h: number) {
      bgStars = Array.from({ length: 200 }, () => ({
        x: rnd(0, w), y: rnd(0, h),
        size: rnd(0.3, 0.8),
        baseOpacity: rnd(0.15, 0.35),
        twinkleSpeed: rnd(0.0003, 0.0008),
        twinklePhase: rnd(0, Math.PI * 2),
      }));

      midStars = Array.from({ length: 120 }, () => ({
        x: rnd(0, w), y: rnd(0, h),
        size: rnd(0.6, 1.4),
        baseOpacity: rnd(0.3, 0.6),
        twinkleSpeed: rnd(0.0005, 0.0015),
        twinklePhase: rnd(0, Math.PI * 2),
        driftX: rnd(-0.008, 0.008),
        driftY: rnd(-0.008, 0.008),
      }));

      fgStars = Array.from({ length: 35 }, () => ({
        x: rnd(0, w), y: rnd(0, h),
        size: rnd(1.2, 2.5),
        baseOpacity: rnd(0.5, 0.9),
        twinkleSpeed: rnd(0.001, 0.003),
        twinklePhase: rnd(0, Math.PI * 2),
      }));
    }

    function setCanvasSize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initStars(canvas.width, canvas.height);
    }

    function drawNebulae(t: number) {
      const w = canvas.width;
      const h = canvas.height;
      for (const n of nebulae) {
        const theta = (t / n.cycle) * Math.PI * 2 * (n.clockwise ? 1 : -1) + n.phaseOffset;
        const cx = (n.cx + Math.cos(theta) * n.driftAmpX) * w;
        const cy = (n.cy + Math.sin(theta) * n.driftAmpY) * h;
        const r = n.radius * w;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${n.maxOpacity})`);
        grd.addColorStop(0.4, `rgba(${n.r},${n.g},${n.b},${n.maxOpacity * 0.5})`);
        grd.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    }

    function drawBackgroundStars(t: number) {
      for (const s of bgStars) {
        const op = Math.max(0, s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.1);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      }
    }

    function drawMidStars(t: number) {
      const w = canvas.width;
      const h = canvas.height;
      for (const s of midStars) {
        s.x += s.driftX;
        s.y += s.driftY;
        if (s.x < 0) s.x = w;
        else if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h;
        else if (s.y > h) s.y = 0;
        const op = Math.max(0, s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.12);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      }
    }

    function drawForegroundStars(t: number) {
      for (const s of fgStars) {
        const op = Math.max(0, Math.min(1, s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.15));
        // Outer glow
        const gr = s.size * 4;
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, gr);
        glow.addColorStop(0, `rgba(255,255,255,${op * 0.3})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(s.x, s.y, gr, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,252,240,${op})`;
        ctx.fill();
      }
    }

    function drawShootingStar(t: number) {
      if (!ss.active) {
        if (t >= ss.nextFireAt) {
          const w = canvas.width;
          const h = canvas.height;
          ss.startX    = rnd(w * 0.45, w * 0.95);
          ss.startY    = rnd(h * 0.02, h * 0.35);
          ss.angle     = rnd(Math.PI * 0.58, Math.PI * 0.72);
          ss.length    = rnd(80, 140);
          ss.duration  = rnd(500, 700);
          ss.startTime = t;
          ss.active    = true;
        }
        return;
      }

      const elapsed  = t - ss.startTime;
      const progress = Math.min(1, elapsed / ss.duration);
      const headDist = ss.length * progress;
      const tailDist = ss.length * Math.max(0, progress - 0.35);
      const hx = ss.startX + Math.cos(ss.angle) * headDist;
      const hy = ss.startY + Math.sin(ss.angle) * headDist;
      const tx = ss.startX + Math.cos(ss.angle) * tailDist;
      const ty = ss.startY + Math.sin(ss.angle) * tailDist;

      const peakOpacity = 0.7 * Math.sin(progress * Math.PI);
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${peakOpacity})`);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (progress >= 1) {
        ss.active      = false;
        ss.nextFireAt  = t + rnd(8000, 20000);
      }
    }

    function drawGalaxyCore(t: number) {
      const w  = canvas.width;
      const h  = canvas.height;
      const cx = w * 0.40;
      const cy = h * 0.55;
      const rx = w * 0.15;
      const ry = h * 0.08;
      const rot = (t / 180000) * Math.PI * 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(1, ry / rx);

      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grd.addColorStop(0,   'rgba(200,170,255,0.025)');
      grd.addColorStop(0.5, 'rgba(200,170,255,0.015)');
      grd.addColorStop(1,   'rgba(200,170,255,0)');
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.restore();
    }

    function animate(timestamp: number) {
      if (lastTime === 0) {
        lastTime = timestamp;
        // Schedule first shooting star 5–12s after start
        ss.nextFireAt = timestamp + rnd(5000, 12000);
      }
      const rawDelta = timestamp - lastTime;
      // Clamp delta so a hidden tab waking up doesn't cause position jumps
      const _delta = Math.min(rawDelta, 16); // eslint-disable-line @typescript-eslint/no-unused-vars
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawNebulae(timestamp);

      // Rotate entire star field around canvas centre — one revolution per 10 minutes
      const starAngle = (timestamp / 600000) * Math.PI * 2;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(starAngle);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      drawBackgroundStars(timestamp);
      drawMidStars(timestamp);
      drawForegroundStars(timestamp);
      ctx.restore();

      drawShootingStar(timestamp);
      drawGalaxyCore(timestamp);

      rafId = requestAnimationFrame(animate);
    }

    setCanvasSize();

    const ro = new ResizeObserver(setCanvasSize);
    ro.observe(canvas.parentElement!);

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
