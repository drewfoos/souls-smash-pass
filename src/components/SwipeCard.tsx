"use client";

import { useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { type Character, CHARACTER_TYPE_COLORS, CHARACTER_TYPE_LABELS } from "@/data/characters";
import { CharacterImage } from "./CharacterImage";
import { Heart, X } from "lucide-react";
import type { VoteChoice } from "@/lib/firebase-user";

interface SwipeCardProps {
  character: Character;
  onSmash: () => void;
  onPass: () => void;
  isTop: boolean;
  index: number;
  /** Vote the signed-in user made in a previous game session (from Firebase). */
  previousVote?: VoteChoice;
  /**
   * Vote the user made in the CURRENT session for this character.
   * When set, the card is in read-only history-browsing mode:
   * – drag is disabled
   * – a prominent SMASH / PASS badge is displayed
   */
  historyVote?: VoteChoice;
}

export function SwipeCard({
  character,
  onSmash,
  onPass,
  isTop,
  index,
  previousVote,
  historyVote,
}: SwipeCardProps) {
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const smashOpacity = useTransform(x, [0, 60, 160], [0, 0.4, 1]);
  const passOpacity = useTransform(x, [-160, -60, 0], [1, 0.4, 0]);

  const smashOverlay = useTransform(
    x,
    [0, 200],
    ["rgba(240,192,64,0)", "rgba(240,192,64,0.10)"]
  );
  const passOverlay = useTransform(
    x,
    [-200, 0],
    ["rgba(232,51,74,0.10)", "rgba(232,51,74,0)"]
  );

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      setExitDirection("right");
      onSmash();
    } else if (info.offset.x < -threshold) {
      setExitDirection("left");
      onPass();
    }
  };

  const stackOffset = index * 8;
  const stackScale = 1 - index * 0.04;
  const stackOpacity = 1 - index * 0.2;
  const typeColors = CHARACTER_TYPE_COLORS[character.type];

  // In history-browsing mode: card is frozen, no drag, big vote badge shown
  const isHistoryMode = Boolean(historyVote);
  const isDraggable = isTop && !isHistoryMode;

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{
        zIndex: 10 - index,
        y: stackOffset,
        scale: stackScale,
      }}
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{
        opacity: isHistoryMode ? 1 : stackOpacity,
        scale: stackScale,
        y: stackOffset,
      }}
      exit={
        exitDirection === "right"
          ? { x: 500, rotate: 20, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }
          : exitDirection === "left"
            ? { x: -500, rotate: -20, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }
            : { opacity: 0, transition: { duration: 0.2 } }
      }
      transition={{
        // Scale snaps instantly so the promoting card doesn't visibly "grow"
        scale: { type: "tween", duration: 0.15 },
        // Everything else uses a spring for natural feel
        default: { type: "spring", stiffness: 260, damping: 24 },
      }}
    >
      <motion.div
        className={`relative w-full h-full rounded-2xl overflow-hidden select-none ${
          isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
        style={{
          x: isDraggable ? x : 0,
          rotate: isDraggable ? rotate : 0,
          boxShadow: "0 12.5px 100px -10px rgba(50, 50, 73, 0.4), 0 10px 10px -10px rgba(50, 50, 73, 0.3)",
        }}
        drag={isDraggable ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragEnd={isDraggable ? handleDragEnd : undefined}
        whileTap={isDraggable ? { scale: 0.98 } : undefined}
      >
        {/* Character image */}
        <div className="absolute inset-0">
          <CharacterImage character={character} priority={isTop} />
        </div>

        {/* Gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 via-45% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent" />

        {/* History-mode tint overlay */}
        {isHistoryMode && historyVote === "smash" && (
          <div className="absolute inset-0 bg-gold/5 pointer-events-none" />
        )}
        {isHistoryMode && historyVote === "pass" && (
          <div className="absolute inset-0 bg-pass/5 pointer-events-none" />
        )}

        {/* Swipe tint overlays (only in normal mode) */}
        {!isHistoryMode && isTop && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: smashOverlay }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: passOverlay }}
            />
          </>
        )}

        {/* History-mode: large static vote badge */}
        {isHistoryMode && historyVote && (
          <div
            className={`absolute top-10 z-20 ${
              historyVote === "smash" ? "left-5" : "right-5"
            }`}
          >
            <div
              className={`border-[3px] px-5 py-2 rounded-lg backdrop-blur-sm ${
                historyVote === "smash"
                  ? "-rotate-12 border-gold bg-gold/10"
                  : "rotate-12 border-crimson-bright bg-crimson-bright/10"
              }`}
            >
              <span
                className={`text-souls text-3xl md:text-4xl font-black tracking-widest drop-shadow ${
                  historyVote === "smash"
                    ? "text-gold drop-shadow-[0_0_16px_rgba(240,192,64,0.6)]"
                    : "text-crimson-bright drop-shadow-[0_0_16px_rgba(232,51,74,0.6)]"
                }`}
              >
                {historyVote === "smash" ? "SMASH" : "PASS"}
              </span>
            </div>
          </div>
        )}

        {/* Swipe stamps (only in normal voting mode) */}
        {!isHistoryMode && isTop && (
          <>
            <motion.div
              className="absolute top-10 left-5 z-20"
              style={{ opacity: smashOpacity }}
            >
              <div className="border-[3px] border-gold px-5 py-2 rounded-lg -rotate-12 bg-gold/10 backdrop-blur-sm">
                <span className="text-souls text-3xl md:text-4xl font-black text-gold tracking-widest drop-shadow-[0_0_16px_rgba(240,192,64,0.6)]">
                  SMASH
                </span>
              </div>
            </motion.div>

            <motion.div
              className="absolute top-10 right-5 z-20"
              style={{ opacity: passOpacity }}
            >
              <div className="border-[3px] border-crimson-bright px-5 py-2 rounded-lg rotate-12 bg-crimson-bright/10 backdrop-blur-sm">
                <span className="text-souls text-3xl md:text-4xl font-black text-crimson-bright tracking-widest drop-shadow-[0_0_16px_rgba(232,51,74,0.6)]">
                  PASS
                </span>
              </div>
            </motion.div>
          </>
        )}

        {/* "Previously voted" pill — only in normal voting mode, only on the top card */}
        {!isHistoryMode && isTop && previousVote && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm text-[10px] font-semibold tracking-wide whitespace-nowrap ${
                previousVote === "smash"
                  ? "bg-gold/20 border border-gold/40 text-gold"
                  : "bg-pass/15 border border-pass/35 text-pass/85"
              }`}
            >
              {previousVote === "smash" ? (
                <Heart size={9} fill="currentColor" />
              ) : (
                <X size={9} />
              )}
              Previously {previousVote === "smash" ? "smashed" : "passed"}
            </div>
          </div>
        )}

        {/* Character info — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-6 z-20">
          <h2 className="text-souls text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] leading-tight">
            {character.name}
          </h2>

          <div className="flex items-center gap-2 mb-2">
            <span
              className="type-pill"
              style={{
                background: typeColors.bg,
                color: typeColors.text,
                border: `1px solid ${typeColors.border}`,
              }}
            >
              {CHARACTER_TYPE_LABELS[character.type]}
            </span>
          </div>

          {character.description && (
            <p className="text-sm text-priscilla/55 leading-relaxed line-clamp-2">
              {character.description}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
