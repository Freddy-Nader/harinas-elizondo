import { TEST_USERS } from "./db";

/**
 * The only application-level mock of the integration suite: who is signed in. setup.ts
 * makes `getAuth().api.getSession()` return this user, so the real `requireRole`,
 * `requireUser` and permission rules run on top of it (RF-01).
 */
export type TestSessionUser = { id: string; name: string; email: string; role: string; employeeId: string | null; active: boolean };

let current: TestSessionUser | null = null;

/** Signs in one of the seeded users, or a custom one, for the next action calls. */
export function signInAs(user: keyof typeof TEST_USERS | TestSessionUser) {
  current = typeof user === "string" ? { ...TEST_USERS[user] } : user;
}

export function signOut() {
  current = null;
}

export function currentSession() {
  return current ? { user: current } : null;
}
