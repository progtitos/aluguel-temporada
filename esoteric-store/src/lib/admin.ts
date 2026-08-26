// Único e-mail autorizado a acessar o painel administrativo.
// Usado tanto na tela de login (para disparar o código OTP) quanto no
// middleware (para bloquear qualquer outra conta que eventualmente consiga
// autenticar, ex.: se um dia o cadastro automático for reativado).
export const ADMIN_EMAIL = 'thiagopeixotto@gmail.com';
