'use client';

import * as React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BackgroundStar {
  x: number; y: number; size: number; baseOpacity: number;
  twinkleSpeed: number; twinklePhase: number;
  shineStart: number; shineDur: number;
}

interface MidStar {
  x: number; y: number; size: number; baseOpacity: number;
  twinkleSpeed: number; twinklePhase: number;
  driftX: number; driftY: number;
  shineStart: number; shineDur: number;
}

interface ForegroundStar {
  x: number; y: number; size: number; baseOpacity: number;
  twinkleSpeed: number; twinklePhase: number;
  shineStart: number; shineDur: number;
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

interface Planet {
  orbitBase: number;  // orbit radius when canvas min-dimension = 720
  periodMs: number;
  sizeBase: number;   // body radius at min-dimension = 720
  color: string;
  hiColor: string;
  phase: number;
  moon?: boolean;
  rings?: boolean;
  bands?: string[];
}

// ── Canvas component ───────────────────────────────────────────────────────────

export function UniverseCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const _canvasMaybe = canvasRef.current;
    if (!_canvasMaybe) return;

    // Don't run on mobile when panel is hidden
    if (_canvasMaybe.offsetParent === null && window.innerWidth < 768) return;

    const _ctxMaybe = _canvasMaybe.getContext('2d', { willReadFrequently: false });
    if (!_ctxMaybe) return;

    // Re-declare as non-nullable so TypeScript tracks the correct type inside
    // closures (closures don't inherit narrowing from outer if-guards).
    const canvas: HTMLCanvasElement = _canvasMaybe;
    const ctx: CanvasRenderingContext2D = _ctxMaybe;

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
      nextFireAt: 0,
    };

    function rnd(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    // Defined after rnd so phases are randomised once on mount
    const planets: Planet[] = [
      { orbitBase: 40,  periodMs: 5000,   sizeBase: 3,    color: '#9a9aa2', hiColor: '#c8c8d2', phase: rnd(0, Math.PI * 2) },
      { orbitBase: 67,  periodMs: 12000,  sizeBase: 5,    color: '#c8a468', hiColor: '#ead492', phase: rnd(0, Math.PI * 2) },
      { orbitBase: 97,  periodMs: 20000,  sizeBase: 5.5,  color: '#1e68cc', hiColor: '#4898e8', phase: rnd(0, Math.PI * 2), moon: true },
      { orbitBase: 132, periodMs: 38000,  sizeBase: 4,    color: '#c83a14', hiColor: '#e86030', phase: rnd(0, Math.PI * 2) },
      { orbitBase: 183, periodMs: 80000,  sizeBase: 13.5, color: '#b87840', hiColor: '#d8985a', phase: rnd(0, Math.PI * 2), bands: ['rgba(155,85,35,0.40)', 'rgba(85,45,18,0.28)', 'rgba(145,78,30,0.35)'] },
      { orbitBase: 238, periodMs: 160000, sizeBase: 11.5, color: '#d0b050', hiColor: '#ead072', phase: rnd(0, Math.PI * 2), rings: true },
      { orbitBase: 282, periodMs: 300000, sizeBase: 8.5,  color: '#50c0c8', hiColor: '#80e0e2', phase: rnd(0, Math.PI * 2) },
      { orbitBase: 315, periodMs: 500000, sizeBase: 7.5,  color: '#2840c8', hiColor: '#4860e2', phase: rnd(0, Math.PI * 2) },
    ];

    function initStars(w: number, h: number) {
      bgStars = Array.from({ length: 200 }, () => ({
        x: rnd(0, w), y: rnd(0, h),
        size: rnd(0.3, 0.8),
        baseOpacity: rnd(0.15, 0.35),
        twinkleSpeed: rnd(0.0003, 0.0008),
        twinklePhase: rnd(0, Math.PI * 2),
        shineStart: 0, shineDur: 0,
      }));

      midStars = Array.from({ length: 120 }, () => ({
        x: rnd(0, w), y: rnd(0, h),
        size: rnd(0.6, 1.4),
        baseOpacity: rnd(0.3, 0.6),
        twinkleSpeed: rnd(0.0005, 0.0015),
        twinklePhase: rnd(0, Math.PI * 2),
        driftX: rnd(-0.008, 0.008),
        driftY: rnd(-0.008, 0.008),
        shineStart: 0, shineDur: 0,
      }));

      fgStars = Array.from({ length: 35 }, () => ({
        x: rnd(0, w), y: rnd(0, h),
        size: rnd(1.2, 2.5),
        baseOpacity: rnd(0.5, 0.9),
        twinkleSpeed: rnd(0.001, 0.003),
        twinklePhase: rnd(0, Math.PI * 2),
        shineStart: 0, shineDur: 0,
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

    function shineBoost(s: { shineStart: number; shineDur: number }, t: number, prob: number, maxBoost: number): number {
      if (s.shineStart === 0 && Math.random() < prob) {
        s.shineStart = t;
        s.shineDur   = rnd(500, 1400);
      }
      if (s.shineStart === 0) return 0;
      const progress = (t - s.shineStart) / s.shineDur;
      if (progress >= 1) { s.shineStart = 0; return 0; }
      return Math.sin(progress * Math.PI) * maxBoost;
    }

    function drawBackgroundStars(t: number) {
      for (const s of bgStars) {
        const boost = shineBoost(s, t, 0.00005, 0.5);
        const op = Math.max(0, Math.min(1, s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.1 + boost));
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
        const boost = shineBoost(s, t, 0.0001, 0.55);
        const op = Math.max(0, Math.min(1, s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.12 + boost));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      }
    }

    function drawForegroundStars(t: number) {
      for (const s of fgStars) {
        const boost = shineBoost(s, t, 0.0003, 0.6);
        const op = Math.max(0, Math.min(1, s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.15 + boost));
        // Glow expands slightly when shining
        const gr = s.size * (4 + boost * 4);
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, gr);
        glow.addColorStop(0, `rgba(255,255,255,${op * 0.35})`);
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

    // Draw one half (front or back) of Saturn's tilted ring system
    function drawRingHalf(px: number, py: number, pr: number, front: boolean) {
      const innerR = pr * 1.45;
      const outerR = pr * 2.55;
      const tilt   = 0.36;

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, tilt);

      const rg = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
      rg.addColorStop(0,    'rgba(220,200,130,0.70)');
      rg.addColorStop(0.35, 'rgba(205,185,110,0.55)');
      rg.addColorStop(0.70, 'rgba(188,168,90,0.35)');
      rg.addColorStop(1,    'rgba(170,150,70,0)');

      ctx.beginPath();
      if (front) {
        // Bottom half of the compressed ellipse — appears in front of planet
        ctx.arc(0, 0, outerR, 0, Math.PI, false);
        ctx.arc(0, 0, innerR, Math.PI, 0, true);
      } else {
        // Top half — appears behind planet
        ctx.arc(0, 0, outerR, Math.PI, 0, false);
        ctx.arc(0, 0, innerR, 0, Math.PI, true);
      }
      ctx.closePath();
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.restore();
    }

    function drawSolarSystem(t: number) {
      const w  = canvas.width;
      const h  = canvas.height;
      const sc = Math.min(w, h) / 720;
      const cx = w * 0.5;
      const cy = h * 0.5;

      // Orbit paths
      for (const p of planets) {
        const orbitR = p.orbitBase * sc;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Sun corona
      const sunR = 18 * sc;
      const corona = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR * 6);
      corona.addColorStop(0,    'rgba(255,215,60,0.28)');
      corona.addColorStop(0.20, 'rgba(255,165,20,0.13)');
      corona.addColorStop(0.55, 'rgba(255,100,0,0.05)');
      corona.addColorStop(1,    'rgba(255,80,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, sunR * 6, 0, Math.PI * 2);
      ctx.fillStyle = corona;
      ctx.fill();

      // Sun body
      const sunGrd = ctx.createRadialGradient(cx - sunR * 0.3, cy - sunR * 0.35, 0, cx, cy, sunR);
      sunGrd.addColorStop(0,   '#fff8d0');
      sunGrd.addColorStop(0.4, '#ffd040');
      sunGrd.addColorStop(1,   '#ff7700');
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.fillStyle = sunGrd;
      ctx.fill();

      // Planets
      for (const p of planets) {
        const orbitR = p.orbitBase * sc;
        const angle  = (t / p.periodMs) * Math.PI * 2 + p.phase;
        const px     = cx + Math.cos(angle) * orbitR;
        const py     = cy + Math.sin(angle) * orbitR;
        const pr     = p.sizeBase * sc;

        // Saturn — back rings before planet body
        if (p.rings) drawRingHalf(px, py, pr, false);

        // Planet body
        const bodyGrd = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 0, px, py, pr);
        bodyGrd.addColorStop(0, p.hiColor);
        bodyGrd.addColorStop(1, p.color);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrd;
        ctx.fill();

        // Gas giant bands (Jupiter / could extend to others)
        if (p.bands) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.clip();
          const bandH = pr * 0.38;
          const offsets = [-pr * 0.52, 0, pr * 0.52];
          for (let i = 0; i < p.bands.length; i++) {
            ctx.fillStyle = p.bands[i];
            ctx.fillRect(px - pr, py + offsets[i] - bandH / 2, pr * 2, bandH);
          }
          ctx.restore();
        }

        // Earth's moon
        if (p.moon) {
          const mAngle = (t / 2800) * Math.PI * 2;
          const mR     = pr * 2.8;
          const mx     = px + Math.cos(mAngle) * mR;
          const my     = py + Math.sin(mAngle) * mR;
          ctx.beginPath();
          ctx.arc(mx, my, pr * 0.28, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,200,212,0.90)';
          ctx.fill();
        }

        // Saturn — front rings over planet body
        if (p.rings) drawRingHalf(px, py, pr, true);
      }
    }

    function animate(timestamp: number) {
      if (lastTime === 0) {
        lastTime = timestamp;
        // Schedule first shooting star 5–12s after start
        ss.nextFireAt = timestamp + rnd(5000, 12000);
      }
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
      drawSolarSystem(timestamp);

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
