/**
 * CarbonLoop — Self-contained JSON-file persistence layer.
 *
 * Every user gets their own GameState (from `lib/game.ts`), so all mission,
 * carbon, points, and reward logic is delegated to the existing packages.
 * This module only handles storage and lookup — no game rules live here.
 *
 * Data is persisted to `.data/` in the project root. This directory is
 * gitignored. For production, swap this module for a Supabase adapter.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { type GameState, initialState } from "@/lib/game";

// ---------------------------------------------------------------------------
// Data directory
// ---------------------------------------------------------------------------

const DATA_DIR = join(process.cwd(), ".data");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Generic JSON store
// ---------------------------------------------------------------------------

function loadStore<T>(name: string, fallback: T): T {
  ensureDataDir();
  const path = join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function saveStore<T>(name: string, data: T): void {
  ensureDataDir();
  const path = join(DATA_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// User model
// ---------------------------------------------------------------------------

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
};

export type UserProfile = {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
  preferences: {
    notifications: boolean;
    darkMode: boolean;
  };
};

type UsersStore = { users: User[] };
type ProfilesStore = { profiles: UserProfile[] };
type SessionsStore = { sessions: Array<{ id: string; userId: string; expiresAt: string }> };
type GameStatesStore = { states: Array<{ userId: string; state: GameState }> };

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export function findUserByEmail(email: string): User | undefined {
  const store = loadStore<UsersStore>("users", { users: [] });
  return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  const store = loadStore<UsersStore>("users", { users: [] });
  return store.users.find((u) => u.id === id);
}

export function createUser(email: string, name: string, passwordHash: string): User {
  const store = loadStore<UsersStore>("users", { users: [] });
  if (store.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("A user with this email already exists.");
  }
  const user: User = {
    id: randomUUID(),
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  saveStore("users", store);

  // Create profile automatically
  const profiles = loadStore<ProfilesStore>("profiles", { profiles: [] });
  profiles.profiles.push({
    userId: user.id,
    displayName: name,
    email: user.email,
    createdAt: user.createdAt,
    preferences: { notifications: true, darkMode: true },
  });
  saveStore("profiles", profiles);

  // Initialize empty game state
  saveGameState(user.id, initialState());

  return user;
}

// ---------------------------------------------------------------------------
// Profile operations
// ---------------------------------------------------------------------------

export function getProfile(userId: string): UserProfile | undefined {
  const store = loadStore<ProfilesStore>("profiles", { profiles: [] });
  return store.profiles.find((p) => p.userId === userId);
}

export function updateProfile(userId: string, updates: Partial<Pick<UserProfile, "displayName" | "preferences">>): UserProfile | undefined {
  const store = loadStore<ProfilesStore>("profiles", { profiles: [] });
  const index = store.profiles.findIndex((p) => p.userId === userId);
  if (index === -1) return undefined;
  if (updates.displayName !== undefined) store.profiles[index].displayName = updates.displayName;
  if (updates.preferences !== undefined) store.profiles[index].preferences = { ...store.profiles[index].preferences, ...updates.preferences };
  saveStore("profiles", store);
  return store.profiles[index];
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

export function createSession(userId: string): string {
  const store = loadStore<SessionsStore>("sessions", { sessions: [] });
  // Clean expired sessions
  const now = new Date().toISOString();
  store.sessions = store.sessions.filter((s) => s.expiresAt > now);
  const session = {
    id: randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  store.sessions.push(session);
  saveStore("sessions", store);
  return session.id;
}

export function getSessionUserId(sessionId: string): string | null {
  const store = loadStore<SessionsStore>("sessions", { sessions: [] });
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (session.expiresAt < new Date().toISOString()) {
    // Expired
    destroySession(sessionId);
    return null;
  }
  return session.userId;
}

export function destroySession(sessionId: string): void {
  const store = loadStore<SessionsStore>("sessions", { sessions: [] });
  store.sessions = store.sessions.filter((s) => s.id !== sessionId);
  saveStore("sessions", store);
}

// ---------------------------------------------------------------------------
// Game state operations (per-user GameState from game.ts)
// ---------------------------------------------------------------------------

export function getGameState(userId: string): GameState {
  const store = loadStore<GameStatesStore>("game_states", { states: [] });
  const entry = store.states.find((s) => s.userId === userId);
  return entry?.state ?? initialState();
}

export function saveGameState(userId: string, state: GameState): void {
  const store = loadStore<GameStatesStore>("game_states", { states: [] });
  const index = store.states.findIndex((s) => s.userId === userId);
  if (index === -1) {
    store.states.push({ userId, state });
  } else {
    store.states[index].state = state;
  }
  saveStore("game_states", store);
}
