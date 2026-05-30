const map: Record<string, string> = {
  "invalid login credentials": "Email ou senha incorretos.",
  "invalid email or password": "Email ou senha incorretos.",
  "user already registered": "Este email já está cadastrado. Faça login.",
  "user already exists": "Este email já está cadastrado. Faça login.",
  "email already in use": "Este email já está cadastrado. Faça login.",
  "password should be at least 6 characters": "A senha deve ter no mínimo 6 caracteres.",
  "password is too short": "A senha é muito curta. Use no mínimo 6 caracteres.",
  "password is known to be weak and easy to guess. choose a different one.":
    "Esta senha é muito comum e fácil de adivinhar. Escolha uma mais forte.",
  "email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada.",
  "email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "over email send rate limit": "Muitas tentativas de envio de email. Aguarde alguns minutos.",
  "unable to validate email address: invalid format": "Formato de email inválido.",
  "signup requires a valid password": "Informe uma senha válida.",
  "user not found": "Usuário não encontrado.",
  "network request failed": "Falha de conexão. Verifique sua internet e tente novamente.",
  "failed to fetch": "Falha de conexão. Verifique sua internet e tente novamente.",
  "anonymous sign-ins are disabled": "Login anônimo está desativado.",
  "signups not allowed for this instance": "Cadastros estão desativados no momento.",
  "new password should be different from the old password":
    "A nova senha deve ser diferente da anterior.",
  "token has expired or is invalid": "Sessão expirada. Faça login novamente.",
  "token has expired": "Código expirado. Solicite um novo.",
  "otp_expired": "Código expirado. Solicite um novo.",
  "invalid otp": "Código inválido. Confira e tente novamente.",
  "token has expired or invalid": "Código expirado ou inválido. Solicite um novo.",
  "email link is invalid or has expired": "Código inválido ou expirado. Solicite um novo.",
  "for security purposes, you can only request this after": "Aguarde alguns segundos antes de pedir um novo código.",
};

export function traduzirErroAuth(err: unknown): string {
  const raw =
    (err as { message?: string } | null)?.message ??
    (typeof err === "string" ? err : "");
  if (!raw) return "Erro ao autenticar. Tente novamente.";
  const key = raw.toLowerCase().trim();
  if (map[key]) return map[key];
  for (const k of Object.keys(map)) {
    if (key.includes(k)) return map[k];
  }
  return "Erro ao autenticar. Tente novamente.";
}