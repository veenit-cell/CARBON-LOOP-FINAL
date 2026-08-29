"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import {
  type CompletionOutcome,
  type DerivedGame,
  type GameState,
  completeMission,
  derive,
  initialState,
  redeemReward,
  resetGame,
  startMission,
} from "@/lib/game";

const STORAGE_KEY = "carbonloop.save.v1";

/**
 * localStorage is player-controlled input, so a loaded save is untrusted. `derive`
 * runs the ledger through the scoring package's own validation, which rejects
 * tampered or corrupt histories — reuse it rather than duplicating a schema here.
 */
function parseSave(raw: string): GameState {
  const candidate = JSON.parse(raw) as GameState;
  derive(candidate);
  return candidate;
}

function loadSave(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? initialState() : parseSave(raw);
  } catch {
    // A corrupt or tampered save must not brick the game; start a clean one.
    return initialState();
  }
}

// The save file is the store and React subscribes to it, which is exactly what
// `useSyncExternalStore` is for: no load-on-mount effect, no double render, and an
// empty server snapshot so the SSR markup matches what hydration expects.
const SERVER_SNAPSHOT = initialState();
let snapshot: GameState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): GameState {
  snapshot ??= loadSave();
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing the save is a real external change: without reacting to it,
  // two open tabs silently clobber each other's progress on the next write.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    snapshot = loadSave();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Commits a save and notifies every view. Returns a warning when it could not persist. */
function publish(next: GameState): string | null {
  snapshot = next;
  let warning: string | null = null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    warning = "This browser blocked local storage, so progress will not survive a refresh.";
  }
  for (const listener of listeners) listener();
  return warning;
}

export type GameApi = {
  state: GameState;
  derived: DerivedGame;
  /** Last rejected action, in player-facing words. */
  notice: string | null;
  lastCompletion: CompletionOutcome | null;
  start: (questTemplateId: string) => void;
  complete: (questRunId: string) => void;
  redeem: (rewardItemId: string) => void;
  reset: () => void;
  dismissCompletion: () => void;
};

export function useGame(): GameApi {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletionOutcome | null>(null);

  // A failed write outranks the action's own message: losing progress is the thing
  // the player needs to be told about.
  const commit = useCallback((next: GameState, message: string | null) => {
    setNotice(publish(next) ?? message);
  }, []);

  const start = useCallback(
    (questTemplateId: string) => {
      const result = startMission(state, questTemplateId, new Date().toISOString());
      if (result.ok) commit(result.state, null);
      else setNotice(result.message);
    },
    [commit, state],
  );

  const complete = useCallback(
    (questRunId: string) => {
      const result = completeMission(state, questRunId, new Date().toISOString());
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setLastCompletion(result.outcome);
      commit(result.state, null);
    },
    [commit, state],
  );

  const redeem = useCallback(
    (rewardItemId: string) => {
      const result = redeemReward(state, rewardItemId, new Date().toISOString());
      if (result.ok) commit(result.state, "Mock reward reserved. No payment, delivery, or cash value occurs.");
      else setNotice(result.message);
    },
    [commit, state],
  );

  const reset = useCallback(() => {
    setLastCompletion(null);
    commit(resetGame(), null);
  }, [commit]);

  const derived = useMemo(() => derive(state), [state]);
  const dismissCompletion = useCallback(() => setLastCompletion(null), []);

  return { state, derived, notice, lastCompletion, start, complete, redeem, reset, dismissCompletion };
}
