import { AchievementUnlockModal } from "@/components/progress/AchievementUnlockModal";
import type { UnlockedAchievement } from "@/lib/achievements-api";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface AchievementUnlockContextValue {
  queueUnlocks: (items: UnlockedAchievement[]) => void;
}

const AchievementUnlockContext = createContext<AchievementUnlockContextValue | undefined>(undefined);

export function AchievementUnlockProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<UnlockedAchievement | null>(null);
  const queueRef = useRef<UnlockedAchievement[]>([]);

  const dequeue = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setCurrent(next);
  }, []);

  const queueUnlocks = useCallback(
    (items: UnlockedAchievement[]) => {
      if (!items.length) return;
      queueRef.current.push(...items);
      setCurrent((active) => active ?? queueRef.current.shift() ?? null);
    },
    [],
  );

  const handleClose = useCallback(() => {
    dequeue();
  }, [dequeue]);

  const value = useMemo(() => ({ queueUnlocks }), [queueUnlocks]);

  return (
    <AchievementUnlockContext.Provider value={value}>
      {children}
      <AchievementUnlockModal achievement={current} visible={current != null} onClose={handleClose} />
    </AchievementUnlockContext.Provider>
  );
}

export function useAchievementUnlocks() {
  const ctx = useContext(AchievementUnlockContext);
  if (!ctx) throw new Error("useAchievementUnlocks must be used within AchievementUnlockProvider");
  return ctx;
}

export function useAchievementUnlocksOptional() {
  return useContext(AchievementUnlockContext);
}
