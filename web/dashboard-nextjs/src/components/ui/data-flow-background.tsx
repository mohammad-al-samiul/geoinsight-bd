"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Premium liquid-glass atmosphere:
 * aurora ribbons · soft beams · cursor glow · organic float ·
 * magnetic lean · drag trails · multi-spark bursts · depth bubbles.
 */

type Tone = "emerald" | "sky" | "glass" | "amber";
type Depth = "far" | "mid";

interface RiseBubble {
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  tone: Tone;
  depth: Depth;
  sway: number;
}

interface PlayBubble {
  id: string;
  left: string;
  top: string;
  size: number;
  tone: Tone;
  floatDelay: number;
  orbit: number;
}

const RISE: RiseBubble[] = [
  { left: "5%", size: 10, duration: 18, delay: 0, opacity: 0.34, tone: "emerald", depth: "far", sway: 22 },
  { left: "16%", size: 7, duration: 22, delay: 2.4, opacity: 0.28, tone: "sky", depth: "far", sway: -18 },
  { left: "30%", size: 12, duration: 20, delay: 5.5, opacity: 0.26, tone: "glass", depth: "far", sway: 26 },
  { left: "48%", size: 8, duration: 24, delay: 1.2, opacity: 0.3, tone: "emerald", depth: "far", sway: -14 },
  { left: "63%", size: 11, duration: 19, delay: 4, opacity: 0.27, tone: "sky", depth: "far", sway: 20 },
  { left: "78%", size: 9, duration: 23, delay: 7, opacity: 0.28, tone: "glass", depth: "far", sway: -22 },
  { left: "91%", size: 8, duration: 21, delay: 3.2, opacity: 0.26, tone: "amber", depth: "far", sway: 16 },
  { left: "10%", size: 22, duration: 13, delay: 0.6, opacity: 0.42, tone: "emerald", depth: "mid", sway: 28 },
  { left: "26%", size: 28, duration: 15, delay: 3.5, opacity: 0.36, tone: "sky", depth: "mid", sway: -24 },
  { left: "44%", size: 18, duration: 12, delay: 5.8, opacity: 0.44, tone: "glass", depth: "mid", sway: 32 },
  { left: "58%", size: 24, duration: 14, delay: 2, opacity: 0.38, tone: "amber", depth: "mid", sway: -20 },
  { left: "74%", size: 20, duration: 11, delay: 6.5, opacity: 0.4, tone: "sky", depth: "mid", sway: 26 },
  { left: "88%", size: 16, duration: 13.5, delay: 1.8, opacity: 0.38, tone: "emerald", depth: "mid", sway: -28 },
];

const RICH_RISE: RiseBubble[] = [
  { left: "38%", size: 15, duration: 16, delay: 2.8, opacity: 0.36, tone: "emerald", depth: "mid", sway: 18 },
  { left: "68%", size: 13, duration: 17, delay: 0.9, opacity: 0.32, tone: "glass", depth: "far", sway: -16 },
  { left: "20%", size: 11, duration: 14, delay: 4.6, opacity: 0.38, tone: "amber", depth: "mid", sway: 22 },
];

const PLAY: PlayBubble[] = [
  { id: "p1", left: "12%", top: "24%", size: 58, tone: "emerald", floatDelay: 0, orbit: 18 },
  { id: "p2", left: "30%", top: "62%", size: 44, tone: "sky", floatDelay: 0.7, orbit: 14 },
  { id: "p3", left: "50%", top: "30%", size: 72, tone: "glass", floatDelay: 1.3, orbit: 22 },
  { id: "p4", left: "68%", top: "66%", size: 50, tone: "emerald", floatDelay: 0.35, orbit: 16 },
  { id: "p5", left: "84%", top: "36%", size: 54, tone: "amber", floatDelay: 1.0, orbit: 15 },
  { id: "p6", left: "20%", top: "74%", size: 38, tone: "sky", floatDelay: 1.7, orbit: 12 },
];

const RICH_PLAY: PlayBubble[] = [
  { id: "p7", left: "56%", top: "50%", size: 46, tone: "sky", floatDelay: 0.55, orbit: 17 },
  { id: "p8", left: "40%", top: "78%", size: 40, tone: "emerald", floatDelay: 1.15, orbit: 13 },
];

const FILL: Record<Tone, { bg: string; border: string; glow: string; spark: string }> = {
  emerald: {
    bg: "radial-gradient(circle at 28% 24%, hsl(160 85% 82% / 0.68), hsl(160 65% 50% / 0.24) 36%, hsl(160 50% 28% / 0.08) 62%, transparent 78%)",
    border: "hsl(160 75% 72% / 0.52)",
    glow: "0 0 36px hsl(160 65% 50% / 0.4), 0 0 60px hsl(160 60% 40% / 0.14), inset 0 -8px 16px hsl(160 40% 18% / 0.18)",
    spark: "hsl(160 80% 70%)",
  },
  sky: {
    bg: "radial-gradient(circle at 28% 24%, hsl(199 95% 86% / 0.6), hsl(199 80% 56% / 0.22) 36%, hsl(199 60% 35% / 0.06) 62%, transparent 78%)",
    border: "hsl(199 90% 74% / 0.48)",
    glow: "0 0 36px hsl(199 85% 55% / 0.34), 0 0 56px hsl(199 70% 45% / 0.12), inset 0 -8px 16px hsl(199 40% 18% / 0.14)",
    spark: "hsl(199 90% 72%)",
  },
  glass: {
    bg: "radial-gradient(circle at 28% 24%, hsl(210 40% 98% / 0.45), hsl(210 30% 88% / 0.16) 40%, transparent 74%)",
    border: "hsl(210 40% 98% / 0.4)",
    glow: "0 0 30px hsl(210 40% 98% / 0.18), inset 0 -6px 14px hsl(220 40% 8% / 0.14)",
    spark: "hsl(210 40% 92%)",
  },
  amber: {
    bg: "radial-gradient(circle at 28% 24%, hsl(38 98% 80% / 0.55), hsl(38 85% 54% / 0.2) 38%, transparent 74%)",
    border: "hsl(38 92% 70% / 0.42)",
    glow: "0 0 32px hsl(38 90% 55% / 0.3), inset 0 -6px 14px hsl(30 40% 14% / 0.12)",
    spark: "hsl(38 95% 68%)",
  },
};

interface Burst {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface TrailDot {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface AmbientRipple {
  id: number;
  x: string;
  y: string;
  tone: "emerald" | "sky";
}

function useMagneticLean(
  mouseX: MotionValue<number>,
  mouseY: MotionValue<number>,
  strength: number,
  enabled: boolean,
) {
  const leanX = useSpring(0, { stiffness: 60, damping: 18, mass: 0.4 });
  const leanY = useSpring(0, { stiffness: 60, damping: 18, mass: 0.4 });

  useEffect(() => {
    if (!enabled) {
      leanX.set(0);
      leanY.set(0);
      return;
    }
    const unsubX = mouseX.on("change", (v) => leanX.set(v * strength));
    const unsubY = mouseY.on("change", (v) => leanY.set(v * strength));
    return () => {
      unsubX();
      unsubY();
    };
  }, [mouseX, mouseY, strength, enabled, leanX, leanY]);

  return { leanX, leanY };
}

function DraggableBubble({
  bubble,
  rich,
  reduceMotion,
  mouseX,
  mouseY,
  onBurst,
  onTrail,
}: {
  bubble: PlayBubble;
  rich: boolean;
  reduceMotion: boolean | null;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  onBurst: (x: number, y: number, color: string) => void;
  onTrail: (x: number, y: number, color: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const tone = FILL[bubble.tone];
  const size = bubble.size * (rich ? 1.14 : 1);
  const trailRef = useRef(0);
  const { leanX, leanY } = useMagneticLean(
    mouseX,
    mouseY,
    10 + bubble.orbit * 0.35,
    !reduceMotion && !dragging,
  );

  const o = bubble.orbit;

  return (
    <motion.div
      className="absolute z-[6]"
      style={{
        left: bubble.left,
        top: bubble.top,
        x: leanX,
        y: leanY,
      }}
    >
      <motion.div
        drag={!reduceMotion}
        dragMomentum
        dragElastic={0.22}
        dragTransition={{ power: 0.25, timeConstant: 280, bounceStiffness: 260, bounceDamping: 20 }}
        whileHover={reduceMotion ? undefined : { scale: 1.1 }}
        whileDrag={{ scale: 1.22, cursor: "grabbing", zIndex: 50 }}
        onDragStart={() => setDragging(true)}
        onDrag={(_, info) => {
          const now = performance.now();
          if (now - trailRef.current > 40) {
            trailRef.current = now;
            onTrail(info.point.x, info.point.y, tone.spark);
          }
        }}
        onDragEnd={(_, info) => {
          setDragging(false);
          onBurst(info.point.x, info.point.y, tone.spark);
        }}
        style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      >
        <motion.button
          type="button"
          aria-label="Drag decorative bubble"
          className="bubble-play"
          style={{
            width: size,
            height: size,
            background: tone.bg,
            borderColor: tone.border,
            boxShadow: tone.glow,
          }}
          animate={
            reduceMotion || dragging
              ? { x: 0, y: 0, scale: 1, rotate: 0 }
              : {
                  x: [0, o, o * 0.3, -o * 0.7, 0],
                  y: [0, -o * 1.1, o * 0.35, -o * 0.55, 0],
                  scale: [1, 1.06, 0.97, 1.04, 1],
                  rotate: [0, 3, -2, 2, 0],
                }
          }
          transition={
            reduceMotion || dragging
              ? { type: "spring", stiffness: 280, damping: 22 }
              : {
                  duration: 8.5 + bubble.floatDelay,
                  repeat: Infinity,
                  ease: [0.45, 0.05, 0.55, 0.95],
                  delay: bubble.floatDelay,
                }
          }
        >
          <span className="bubble-shine" />
          <span className="bubble-shine bubble-shine-b" />
          <span className="bubble-refraction" />
          <span className="bubble-ring" />
          <span className="bubble-ring bubble-ring-delay" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export function DataFlowBackground({
  className,
  intensity = "ambient",
}: {
  className?: string;
  intensity?: "ambient" | "rich";
}) {
  const rich = intensity === "rich";
  const reduceMotion = useReducedMotion();
  const rise = rich ? [...RISE, ...RICH_RISE] : RISE;
  const play = rich ? [...PLAY, ...RICH_PLAY] : PLAY;
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [trails, setTrails] = useState<TrailDot[]>([]);
  const [ripples, setRipples] = useState<AmbientRipple[]>([]);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const cursorPX = useMotionValue(-400);
  const cursorPY = useMotionValue(-400);
  const springX = useSpring(rawX, { stiffness: 50, damping: 22, mass: 0.55 });
  const springY = useSpring(rawY, { stiffness: 50, damping: 22, mass: 0.55 });
  const glowX = useSpring(cursorPX, { stiffness: 70, damping: 24, mass: 0.45 });
  const glowY = useSpring(cursorPY, { stiffness: 70, damping: 24, mass: 0.45 });

  const farX = useTransform(springX, (v) => v * 0.28);
  const farY = useTransform(springY, (v) => v * 0.28);
  const midX = useTransform(springX, (v) => v * 0.62);
  const midY = useTransform(springY, (v) => v * 0.62);
  const orbX = useTransform(springX, (v) => v * 0.48);
  const orbY = useTransform(springY, (v) => v * 0.48);
  const ribbonX = useTransform(springX, (v) => v * 0.35);
  const ribbonY = useTransform(springY, (v) => v * 0.35);

  useEffect(() => {
    if (reduceMotion) return;
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      rawX.set(nx * -28);
      rawY.set(ny * -18);
      cursorPX.set(e.clientX);
      cursorPY.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY, cursorPX, cursorPY, reduceMotion]);

  // Soft ambient ripples — breathing water feel
  useEffect(() => {
    if (reduceMotion) return;
    const spawn = () => {
      const id = Date.now() + Math.random();
      const next: AmbientRipple = {
        id,
        x: `${12 + Math.random() * 76}%`,
        y: `${18 + Math.random() * 60}%`,
        tone: Math.random() > 0.45 ? "emerald" : "sky",
      };
      setRipples((prev) => [...prev.slice(-3), next]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 4200);
    };
    spawn();
    const id = window.setInterval(spawn, rich ? 3200 : 4800);
    return () => window.clearInterval(id);
  }, [reduceMotion, rich]);

  const spawnBurst = (x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setBursts((prev) => [...prev.slice(-5), { id, x, y, color }]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1100);
  };

  const spawnTrail = (x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setTrails((prev) => [...prev.slice(-18), { id, x, y, color }]);
    window.setTimeout(() => {
      setTrails((prev) => prev.filter((t) => t.id !== id));
    }, 520);
  };

  return (
    <div
      className={cn(
        "bubble-stage overflow-hidden",
        rich ? "bubble-stage-rich" : "bubble-stage-ambient",
        className,
      )}
    >
      <span className="bubble-wash pointer-events-none" aria-hidden />
      <span className="bubble-mesh pointer-events-none" aria-hidden />
      <span className="bubble-caustic pointer-events-none" aria-hidden />
      <span className="bubble-horizon pointer-events-none" aria-hidden />

      {/* Soft diagonal light beams */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <span className="bubble-beam bubble-beam-a" />
        <span className="bubble-beam bubble-beam-b" />
        {rich ? <span className="bubble-beam bubble-beam-c" /> : null}
      </div>

      {/* Aurora ribbons */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={reduceMotion ? undefined : { x: ribbonX, y: ribbonY }}
        aria-hidden
      >
        <span className="bubble-ribbon bubble-ribbon-a" />
        <span className="bubble-ribbon bubble-ribbon-b" />
        {rich ? <span className="bubble-ribbon bubble-ribbon-c" /> : null}
      </motion.div>

      {/* Morphing aurora orbs */}
      <motion.div className="pointer-events-none absolute inset-0 z-[1]" style={{ x: orbX, y: orbY }} aria-hidden>
        <motion.span
          className="bubble-orb bubble-orb-a"
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 48, -24, 12, 0],
                  y: [0, 32, 56, 18, 0],
                  scale: [1, 1.14, 0.94, 1.08, 1],
                  borderRadius: ["50%", "46% 54% 52% 48%", "54% 46% 48% 52%", "50%"],
                }
          }
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="bubble-orb bubble-orb-b"
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, -52, 30, -16, 0],
                  y: [0, -40, 22, -10, 0],
                  scale: [1.05, 0.92, 1.16, 1.02, 1.05],
                  borderRadius: ["50%", "52% 48% 46% 54%", "48% 52% 54% 46%", "50%"],
                }
          }
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="bubble-orb bubble-orb-c"
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 28, -36, 10, 0],
                  y: [0, -28, 40, -12, 0],
                  scale: [1, 1.12, 0.98, 1.06, 1],
                }
          }
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Soft comet streaks */}
      {!reduceMotion ? (
        <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
          {Array.from({ length: rich ? 4 : 2 }).map((_, i) => (
            <span
              key={`comet-${i}`}
              className={cn("bubble-comet", i % 2 === 0 ? "bubble-comet-emerald" : "bubble-comet-sky")}
              style={{
                top: `${12 + ((i * 21) % 58)}%`,
                left: `${-10 + ((i * 17) % 30)}%`,
                animationDelay: `${i * 3.8 + 1.2}s`,
                animationDuration: `${9 + (i % 3) * 2.2}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Twinkling sparks */}
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
        {Array.from({ length: rich ? 18 : 12 }).map((_, i) => (
          <span
            key={`spark-${i}`}
            className="bubble-spark"
            style={{
              left: `${7 + ((i * 19) % 86)}%`,
              top: `${10 + ((i * 27) % 72)}%`,
              animationDelay: `${(i * 0.38) % 5.5}s`,
              animationDuration: `${2.6 + (i % 5) * 0.55}s`,
            }}
          />
        ))}
      </div>

      {/* Soft floating wisps */}
      {!reduceMotion ? (
        <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
          {Array.from({ length: rich ? 6 : 4 }).map((_, i) => (
            <span
              key={`wisp-${i}`}
              className={cn("bubble-wisp", i % 2 === 0 ? "bubble-wisp-emerald" : "bubble-wisp-sky")}
              style={{
                left: `${10 + ((i * 15) % 75)}%`,
                top: `${20 + ((i * 19) % 55)}%`,
                animationDelay: `${(i * 1.4) % 8}s`,
                animationDuration: `${14 + (i % 4) * 3}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* Rising depth layers */}
      {(["far", "mid"] as const).map((depth) => (
        <motion.div
          key={depth}
          className={cn("pointer-events-none absolute inset-0", `bubble-layer-${depth}`)}
          style={reduceMotion ? undefined : depth === "far" ? { x: farX, y: farY } : { x: midX, y: midY }}
          aria-hidden
        >
          {rise
            .filter((b) => b.depth === depth)
            .map((b, i) => {
              const tone = FILL[b.tone];
              return (
                <span
                  key={`${depth}-${i}`}
                  className={cn("bubble-rise", `bubble-depth-${depth}`)}
                  style={{
                    left: b.left,
                    width: b.size * (rich ? 1.08 : 1),
                    height: b.size * (rich ? 1.08 : 1),
                    opacity: b.opacity * (rich ? 1.15 : 0.9),
                    background: tone.bg,
                    borderColor: tone.border,
                    boxShadow: tone.glow,
                    animationDuration: `${b.duration * (rich ? 0.88 : 1)}s`,
                    animationDelay: `${b.delay}s`,
                    ["--bubble-sway" as string]: `${b.sway}px`,
                  }}
                >
                  <span className="bubble-shine" />
                  <span className="bubble-refraction" />
                </span>
              );
            })}
        </motion.div>
      ))}

      {/* Micro bubbles */}
      {Array.from({ length: rich ? 20 : 11 }).map((_, i) => (
        <span
          key={`micro-${i}`}
          className="bubble-micro pointer-events-none"
          aria-hidden
          style={{
            left: `${4 + ((i * 17) % 92)}%`,
            width: 2 + (i % 4),
            height: 2 + (i % 4),
            animationDuration: `${6.5 + (i % 7)}s`,
            animationDelay: `${(i * 0.48) % 7.5}s`,
            ["--micro-sway" as string]: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 6) * 3)}px`,
          }}
        />
      ))}

      {/* Ambient water ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className={cn("bubble-ambient-ripple pointer-events-none", `bubble-ambient-ripple-${r.tone}`)}
          style={{ left: r.x, top: r.y }}
          aria-hidden
        >
          <span />
          <span />
          <span />
        </span>
      ))}

      {/* Cursor soft glow */}
      {!reduceMotion ? (
        <motion.span
          className="bubble-cursor-glow pointer-events-none"
          style={{ left: glowX, top: glowY }}
          aria-hidden
        />
      ) : null}

      {/* Interactive bubbles */}
      <div className="absolute inset-0 z-[5]">
        {play.map((b) => (
          <DraggableBubble
            key={b.id}
            bubble={b}
            rich={rich}
            reduceMotion={reduceMotion}
            mouseX={springX}
            mouseY={springY}
            onBurst={spawnBurst}
            onTrail={spawnTrail}
          />
        ))}
      </div>

      {/* Drag trails */}
      {trails.map((t) => (
        <span
          key={t.id}
          className="bubble-trail pointer-events-none"
          style={{ left: t.x, top: t.y, background: t.color, boxShadow: `0 0 10px ${t.color}` }}
          aria-hidden
        />
      ))}

      {/* Multi-layer bursts */}
      {bursts.map((burst) => (
        <span key={burst.id} className="bubble-burst-wrap pointer-events-none" style={{ left: burst.x, top: burst.y }} aria-hidden>
          <span className="bubble-burst" style={{ borderColor: burst.color }} />
          <span className="bubble-burst bubble-burst-2" style={{ borderColor: burst.color }} />
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="bubble-burst-spark"
              style={{
                background: burst.color,
                ["--spark-angle" as string]: `${i * 60}deg`,
              }}
            />
          ))}
        </span>
      ))}

      <span className="bubble-dissolve pointer-events-none" aria-hidden />
    </div>
  );
}
