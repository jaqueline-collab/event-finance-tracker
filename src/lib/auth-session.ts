// Cache em memória do usuário autenticado, alimentado por onAuthStateChange
// no __root.tsx. Evita que cada gravação dispare supabase.auth.getSession(),
// que disputa a trava de auth com a renovação de token.

let cachedUserId: string | null = null;
let cachedAccessToken: string | null = null;

export function setCachedUserId(id: string | null) {
  cachedUserId = id;
}

export function getCachedUserId(): string | null {
  return cachedUserId;
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}