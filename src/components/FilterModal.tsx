"use client";

import { useState, useEffect } from "react";
import {
  getAvailableTypes,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
  characters,
  type CharacterType,
} from "@/data/characters";
import { Filter, X as XIcon, Crown, Users, Bug, Sparkles, Swords, Flame } from "lucide-react";

const TYPE_ICONS: Record<CharacterType, React.ReactNode> = {
  boss: <Crown size={14} />,
  npc: <Users size={14} />,
  mob: <Bug size={14} />,
  summon: <Sparkles size={14} />,
  mc: <Swords size={14} />,
  merchant: <Users size={14} />,
};

interface FilterModalProps {
  onClose: () => void;
  onApply: (types?: CharacterType[]) => void;
  currentTypes: CharacterType[] | null;
}

export function FilterModal({ onClose, onApply, currentTypes }: FilterModalProps) {
  const [selected, setSelected] = useState<Set<CharacterType>>(
    new Set(currentTypes ?? [])
  );
  const availableTypes = getAvailableTypes();

  const toggle = (type: CharacterType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredCount =
    selected.size === 0
      ? characters.length
      : characters.filter((c) => selected.has(c.type)).length;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="card-dark w-full max-w-sm p-6 animate-fade-in-up space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-souls text-lg font-bold text-gold flex items-center gap-2">
            <Filter size={18} />
            Filter & Restart
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center
              text-priscilla/30 hover:text-priscilla hover:bg-dark-700/50 transition-all"
          >
            <XIcon size={16} />
          </button>
        </div>

        <p className="text-xs text-ash">
          Select types to include. Leave all unchecked for everything.
        </p>

        <div className="space-y-2">
          {availableTypes.map(({ type, count }) => {
            const colors = CHARACTER_TYPE_COLORS[type];
            const isSelected = selected.has(type);
            return (
              <button
                key={type}
                onClick={() => toggle(type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                style={{
                  background: isSelected ? colors.bg : "rgba(42,42,56,0.4)",
                  border: `1.5px solid ${isSelected ? colors.border : "rgba(58,58,74,0.4)"}`,
                  color: isSelected ? colors.text : "rgba(224,218,232,0.4)",
                }}
              >
                <span className="shrink-0">{TYPE_ICONS[type]}</span>
                <span className="flex-1 font-medium text-sm">{CHARACTER_TYPE_LABELS[type]}</span>
                <span className="text-xs opacity-50 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-ash tabular-nums">{filteredCount} characters</span>
          <button
            onClick={() => {
              const types = selected.size > 0 ? Array.from(selected) : undefined;
              onApply(types);
            }}
            disabled={filteredCount === 0}
            className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Flame size={14} />
            <span className="relative z-10">Start</span>
          </button>
        </div>
      </div>
    </div>
  );
}
