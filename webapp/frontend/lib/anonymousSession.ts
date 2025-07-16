const anonymousSessionKey =
  process.env.NEXT_PUBLIC_ANONYMOUS_SESSION_ID_KEY || "vanity-session-id";

export function getAnonymousSessionId() {
  const sessionId = localStorage.getItem(anonymousSessionKey);
  if (sessionId) {
    return sessionId;
  }
  const newSessionId = crypto.randomUUID();
  localStorage.setItem(anonymousSessionKey, newSessionId);
  return newSessionId;
}
