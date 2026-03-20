"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/context/GameContext";

interface Props {
  onComplete: () => void;
}

// Elden Ring colour palette for confetti
const CONFETTI_COLORS = [
  "#ffd700", // gold
  "#ffe44d", // bright gold
  "#daa520", // dim gold
  "#ff5277", // pass / crimson
  "#2ee89a", // smash / green
  "#a78bfa", // ranni purple
  "#ff6b35", // ember
  "#ffffff",
];

type ParticleShape = "rect" | "circle" | "diamond";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationVelocity: number;
  opacity: number;
  shape: ParticleShape;
}

function spawnParticle(canvasWidth: number, canvasHeight: number, atTop = false): Particle {
  const shapes: ParticleShape[] = ["rect", "circle", "diamond"];
  return {
    x: Math.random() * canvasWidth,
    y: atTop ? -10 : Math.random() * canvasHeight * 0.4,
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 3 + 1.5,
    size: Math.random() * 9 + 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationVelocity: (Math.random() - 0.5) * 0.18,
    opacity: 1,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = p.color;

  if (p.shape === "rect") {
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
  } else if (p.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // diamond
    ctx.beginPath();
    ctx.moveTo(0, -p.size / 2);
    ctx.lineTo(p.size / 2, 0);
    ctx.lineTo(0, p.size / 2);
    ctx.lineTo(-p.size / 2, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export function CelebrationScreen({ onComplete }: Props) {
  const { stats } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Auto-dismiss after 4.5 s
  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Canvas confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip animation when reduced motion is preferred
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];

    // Initial burst — fill the top half
    for (let i = 0; i < 180; i++) {
      particles.push(spawnParticle(canvas.width, canvas.height, false));
    }

    let frame = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Keep spawning for the first ~3 s (180 frames @ 60 fps)
      if (frame < 180 && Math.random() < 0.7) {
        particles.push(spawnParticle(canvas.width, canvas.height, true));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.995; // air drag
        p.rotation += p.rotationVelocity;

        // Fade out in the bottom quarter of the screen
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.025;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 60) {
          particles.splice(i, 1);
          continue;
        }

        drawParticle(ctx, p);
      }

      frame++;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const total = stats.smashed + stats.passed;
  const smashPct = total > 0 ? Math.round((stats.smashed / total) * 100) : 0;

  const verdict =
    smashPct >= 80 ? "Maidenless Behavior"
    : smashPct >= 60 ? "Down Horrendous"
    : smashPct >= 40 ? "Perfectly Balanced"
    : smashPct >= 20 ? "Picky Tarnished"
    : "Heart of Stone";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-abyss cursor-pointer select-none"
      onClick={onComplete}
      role="dialog"
      aria-modal="true"
      aria-label="Celebration — you finished the game"
    >
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Radial glow behind text */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,215,0,0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        {/* Rune symbol */}
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.05 }}
          className="text-6xl md:text-8xl mb-4 text-gold"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 0 20px rgba(255,215,0,0.5))" }}
        >
          ✦
        </motion.div>

        {/* GREAT RUNE */}
        <motion.h1
          initial={{ opacity: 0, y: 50, scale: 0.75 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.35 }}
          className="text-souls font-black text-gold leading-none"
          style={{
            fontSize: "clamp(3rem, 10vw, 6rem)",
            textShadow: "0 0 40px rgba(255,215,0,0.45), 0 0 80px rgba(255,215,0,0.2)",
          }}
        >
          GREAT RUNE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.3em" }}
          animate={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ delay: 0.75, duration: 0.6 }}
          className="text-souls text-xl md:text-2xl font-bold text-gold/55 tracking-[0.3em] mt-1 mb-8"
        >
          RESTORED
        </motion.p>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.45, ease: "easeOut" }}
          className="flex items-center justify-center gap-10 mb-4"
        >
          <div className="text-center">
            <div
              className="text-souls font-black text-smash tabular-nums"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              {stats.smashed}
            </div>
            <div className="text-xs text-ash mt-0.5">Smashed</div>
          </div>

          <div className="text-xl text-dark-600 text-souls">/</div>

          <div className="text-center">
            <div
              className="text-souls font-black text-pass tabular-nums"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              {stats.passed}
            </div>
            <div className="text-xs text-ash mt-0.5">Passed</div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-souls text-sm text-gold/45 tracking-widest mb-12"
        >
          {verdict}
        </motion.p>

        {/* Tap-to-continue prompt */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.2, 0.5] }}
          transition={{ delay: 2.2, duration: 1.6, repeat: Infinity, repeatType: "reverse" }}
          className="text-xs text-ash/30 tracking-wider"
          aria-live="polite"
        >
          tap anywhere to see your full results
        </motion.p>
      </div>
    </div>
  );
}
