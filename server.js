"use strict";

const bcrypt = require("bcryptjs");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { createHash, randomBytes, randomUUID } = require("node:crypto");

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || "";
const databaseUrl = process.env.DATABASE_URL || "";
const frontendUrl = process.env.FRONTEND_URL || "";
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || smtpUser;
const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass && smtpFrom && frontendUrl);
const mailTransport = smtpConfigured
  ? import("nodemailer").then(({ createTransport }) => createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    }))
  : null;
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
let frontendResetBaseUrl = "";

if (!databaseUrl) throw new Error("Configure DATABASE_URL para conectar ao PostgreSQL.");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("Configure FRONTEND_ORIGINS com a origem publicada do frontend.");
}
if (smtpConfigured) {
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error("SMTP_PORT deve ser uma porta válida.");
  }
  let parsedFrontendUrl;
  try {
    parsedFrontendUrl = new URL(frontendUrl);
  } catch {
    throw new Error("FRONTEND_URL deve conter o endereço completo da página publicada.");
  }
  if (parsedFrontendUrl.search || parsedFrontendUrl.hash
    || (process.env.NODE_ENV === "production" && parsedFrontendUrl.protocol !== "https:")
    || (process.env.NODE_ENV === "production" && !allowedOrigins.includes(parsedFrontendUrl.origin))) {
    throw new Error("FRONTEND_URL deve usar HTTPS e pertencer a uma origem listada em FRONTEND_ORIGINS.");
  }
  parsedFrontendUrl.pathname = `${parsedFrontendUrl.pathname.replace(/\/+$/, "")}/`;
  frontendResetBaseUrl = parsedFrontendUrl.toString();
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: true } : undefined
});

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use((request, response, next) => {
  const origin = request.get("origin");
  const isLocalDevelopment = process.env.NODE_ENV !== "production"
    && origin
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

  if (origin && !allowedOrigins.includes(origin) && !isLocalDevelopment) {
    response.status(403).json({ error: "Origem não autorizada." });
    return;
  }
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "2mb" }));

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function requireAuth(request, response, next) {
  const token = (request.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    response.status(401).json({ error: "Sessão expirada. Entre novamente." });
    return;
  }
  try {
    request.user = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "agendeaqui-api",
      audience: "agendeaqui-web"
    });
  } catch {
    response.status(401).json({ error: "Sessão expirada. Entre novamente." });
    return;
  }
  pool.query(
    "SELECT clinic_id, email, role, doctor_id, auth_version FROM users WHERE id = $1 AND clinic_id = $2",
    [request.user.sub, request.user.clinicId]
  ).then((result) => {
    const user = result.rows[0];
    if (!user) {
      response.status(401).json({ error: "Esta conta não está mais ativa. Entre novamente." });
      return;
    }
    if (request.user.authVersion !== user.auth_version) {
      response.status(401).json({ error: "Sua sessão foi encerrada. Entre novamente." });
      return;
    }
    request.user.email = user.email;
    request.user.role = user.role;
    request.user.doctorId = user.doctor_id;
    next();
  }).catch(next);
}

function requireDoctor(request, response, next) {
  if (request.user.role !== "doctor" || !request.user.doctorId) {
    response.status(403).json({ error: "Acesso exclusivo ao usuário médico vinculado." });
    return;
  }
  next();
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      clinicId: user.clinic_id,
      role: user.role,
      doctorId: user.doctor_id,
      authVersion: user.auth_version,
      email: user.email
    },
    jwtSecret,
    { expiresIn: "12h", issuer: "agendeaqui-api", audience: "agendeaqui-web" }
  );
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinics (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clinic_settings (
      clinic_id UUID PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
      palette TEXT NOT NULL DEFAULT 'sage',
      logo_data TEXT,
      tagline TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id);
    CREATE TABLE IF NOT EXISTS records (
      clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('doctors', 'appointments')),
      record_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (clinic_id, kind, record_id)
    );
    CREATE INDEX IF NOT EXISTS records_clinic_kind_idx ON records (clinic_id, kind);
    CREATE TABLE IF NOT EXISTS clinical_records (
      clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      appointment_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      content JSONB NOT NULL,
      updated_by UUID NOT NULL REFERENCES users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (clinic_id, appointment_id)
    );
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT '';
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    UPDATE users SET role = 'attendant' WHERE role = 'staff';
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'attendant', 'doctor'));
    CREATE UNIQUE INDEX IF NOT EXISTS users_clinic_doctor_unique_idx
      ON users (clinic_id, doctor_id) WHERE role = 'doctor';
  `);

  const clinicCount = await pool.query("SELECT COUNT(*)::int AS count FROM clinics");
  if (clinicCount.rows[0].count > 0) return;

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    throw new Error("Banco vazio: defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 8 caracteres) para criar o usuário administrador inicial.");
  }

  const clinicId = randomUUID();
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO clinics (id, name) VALUES ($1, $2)", [clinicId, "Meu consultório"]);
    await client.query(
      "INSERT INTO users (id, clinic_id, email, password_hash, role) VALUES ($1, $2, $3, $4, 'owner')",
      [userId, clinicId, email, passwordHash]
    );
    await client.query("COMMIT");
    console.info(`Conta inicial criada para ${email}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.get("/api/health", (request, response) => response.json({ status: "ok" }));

app.post("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (request, response) => response.status(429).json({ error: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." })
}), asyncRoute(async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const result = await pool.query(
    "SELECT id, clinic_id, email, password_hash, role, doctor_id, auth_version FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    response.status(401).json({ error: "E-mail ou senha inválidos." });
    return;
  }
  response.json({
    token: createToken(user),
    user: { email: user.email, role: user.role, doctorId: user.doctor_id }
  });
}));

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (request, response) => response.status(429).json({ error: "Muitas solicitações. Aguarde alguns minutos e tente novamente." })
});
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (request, response) => response.status(429).json({ error: "Muitas tentativas. Solicite um novo link e tente novamente." })
});

app.post("/api/auth/password-reset/request", passwordResetRequestLimiter, asyncRoute(async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ error: "Informe um endereço de e-mail válido." });
    return;
  }
  if (!mailTransport) {
    response.status(503).json({ error: "A recuperação por e-mail ainda não está configurada. Entre em contato com o suporte da clínica." });
    return;
  }
  const result = await pool.query(
    "SELECT id, email FROM users WHERE lower(email) = $1",
    [email]
  );
  const user = result.rows[0];
  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const tokenId = randomUUID();
    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes')`,
      [tokenId, user.id, tokenHash]
    );
    const resetUrl = new URL(`?resetToken=${encodeURIComponent(rawToken)}`, frontendResetBaseUrl).toString();
    try {
      const transport = await mailTransport;
      await transport.sendMail({
        from: smtpFrom,
        to: user.email,
        subject: "Redefinição de senha do AgendeAqui",
        text: `Recebemos uma solicitação para redefinir a senha da sua conta AgendeAqui.\n\nUse este link em até 30 minutos para criar uma nova senha:\n${resetUrl}\n\nSe você não solicitou a redefinição, ignore esta mensagem.`,
        html: `<p>Recebemos uma solicitação para redefinir a senha da sua conta AgendeAqui.</p><p><a href="${resetUrl}">Criar uma nova senha</a></p><p>O link expira em 30 minutos e só pode ser usado uma vez. Se você não solicitou a redefinição, ignore esta mensagem.</p>`
      });
      await pool.query(
        "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND id <> $2 AND used_at IS NULL",
        [user.id, tokenId]
      );
    } catch (error) {
      await pool.query("DELETE FROM password_reset_tokens WHERE id = $1", [tokenId]);
      console.error("Não foi possível enviar o e-mail de redefinição de senha.", error);
    }
  }
  response.status(202).json({
    message: "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."
  });
}));

app.post("/api/auth/password-reset/complete", passwordResetLimiter, asyncRoute(async (request, response) => {
  const token = typeof request.body?.token === "string" ? request.body.token : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!/^[a-f0-9]{64}$/i.test(token) || password.length < 8) {
    response.status(400).json({ error: "O link é inválido ou expirou. Solicite uma nova redefinição; a senha deve ter pelo menos 8 caracteres." });
    return;
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tokenResult = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );
    const resetToken = tokenResult.rows[0];
    if (!resetToken) {
      await client.query("ROLLBACK");
      response.status(400).json({ error: "O link é inválido ou expirou. Solicite uma nova redefinição." });
      return;
    }
    const userResult = await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [resetToken.user_id]
    );
    if (!userResult.rowCount) {
      await client.query("ROLLBACK");
      response.status(400).json({ error: "O link é inválido ou expirou. Solicite uma nova redefinição." });
      return;
    }
    const tokenValidity = await client.query(
      "SELECT 1 FROM password_reset_tokens WHERE id = $1 AND used_at IS NULL AND expires_at > NOW()",
      [resetToken.id]
    );
    if (!tokenValidity.rowCount) {
      await client.query("ROLLBACK");
      response.status(400).json({ error: "O link já foi utilizado ou expirou. Solicite uma nova redefinição." });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      "UPDATE users SET password_hash = $2, auth_version = auth_version + 1 WHERE id = $1",
      [resetToken.user_id, passwordHash]
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [resetToken.user_id]
    );
    await client.query("COMMIT");
    response.json({ message: "Senha redefinida. Entre novamente com a nova senha." });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/auth/me", requireAuth, (request, response) => {
  response.json({
    user: {
      email: request.user.email,
      role: request.user.role,
      doctorId: request.user.doctorId || null
    }
  });
});

app.get("/api/clinic/settings", requireAuth, asyncRoute(async (request, response) => {
  const result = await pool.query(
    "SELECT palette, logo_data, tagline FROM clinic_settings WHERE clinic_id = $1",
    [request.user.clinicId]
  );
  const settings = result.rows[0] || { palette: "sage", logo_data: null, tagline: "" };
  response.json({
    settings: { palette: settings.palette, logo: settings.logo_data, tagline: settings.tagline || "" }
  });
}));

app.put("/api/clinic/settings", requireAuth, asyncRoute(async (request, response) => {
  if (request.user.role !== "owner") {
    response.status(403).json({ error: "Somente o administrador pode alterar a aparência da clínica." });
    return;
  }
  const palette = request.body?.palette;
  const logo = request.body?.logo;
  const tagline = typeof request.body?.tagline === "string" ? request.body.tagline.trim() : "";
  const supportedPalettes = [
    "sage", "ocean", "violet", "terracotta", "rose",
    "lavender", "sky", "teal", "forest", "amber", "slate", "coral", "plum"
  ];
  if (!supportedPalettes.includes(palette)
    || tagline.length > 100
    || (logo !== null && (typeof logo !== "string"
      || logo.length > 700000
      || !/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)))) {
    response.status(400).json({ error: "Escolha uma paleta válida, uma frase de até 100 caracteres e uma imagem PNG, JPG ou WebP reduzida." });
    return;
  }
  const result = await pool.query(
    `INSERT INTO clinic_settings (clinic_id, palette, logo_data, tagline)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (clinic_id)
     DO UPDATE SET palette = EXCLUDED.palette, logo_data = EXCLUDED.logo_data,
                   tagline = EXCLUDED.tagline, updated_at = NOW()
     RETURNING palette, logo_data, tagline`,
    [request.user.clinicId, palette, logo, tagline]
  );
  response.json({
    settings: {
      palette: result.rows[0].palette,
      logo: result.rows[0].logo_data,
      tagline: result.rows[0].tagline
    }
  });
}));

app.get("/api/users", requireAuth, asyncRoute(async (request, response) => {
  if (request.user.role !== "owner") {
    response.status(403).json({ error: "Somente o administrador pode consultar os usuários." });
    return;
  }
  const result = await pool.query(
    "SELECT id, email, role, doctor_id FROM users WHERE clinic_id = $1 ORDER BY created_at, email",
    [request.user.clinicId]
  );
  response.json({
    users: result.rows.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor_id
    }))
  });
}));

app.post("/api/users", requireAuth, asyncRoute(async (request, response) => {
  if (request.user.role !== "owner") {
    response.status(403).json({ error: "Somente o administrador pode criar usuários." });
    return;
  }
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const role = request.body.role;
  const doctorId = typeof request.body.doctorId === "string" ? request.body.doctorId : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8
    || !["attendant", "doctor"].includes(role) || (role === "doctor" && !doctorId)) {
    response.status(400).json({ error: "Informe e-mail, senha válida, tipo de usuário e, para médico, o profissional vinculado." });
    return;
  }
  if (role === "doctor") {
    const doctor = await pool.query(
      "SELECT 1 FROM records WHERE clinic_id = $1 AND kind = 'doctors' AND record_id = $2",
      [request.user.clinicId, doctorId]
    );
    if (!doctor.rowCount) {
      response.status(400).json({ error: "O médico selecionado não está cadastrado neste consultório." });
      return;
    }
  }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await pool.query(
      "INSERT INTO users (id, clinic_id, email, password_hash, role, doctor_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), request.user.clinicId, email, passwordHash, role, role === "doctor" ? doctorId : null]
    );
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_email_key") {
      response.status(409).json({ error: "Já existe uma conta com esse e-mail." });
      return;
    }
    if (error.code === "23505") {
      response.status(409).json({ error: "Este médico já possui uma conta de acesso." });
      return;
    }
    throw error;
  }
  response.status(201).json({ user: { email, role, doctorId: role === "doctor" ? doctorId : null } });
}));

app.patch("/api/users/:id", requireAuth, asyncRoute(async (request, response) => {
  if (request.user.role !== "owner") {
    response.status(403).json({ error: "Somente o administrador pode editar usuários." });
    return;
  }
  const { id } = request.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    response.status(404).json({ error: "Usuário não encontrado neste consultório." });
    return;
  }
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const role = request.body?.role;
  const doctorId = typeof request.body?.doctorId === "string" ? request.body.doctorId : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !["attendant", "doctor"].includes(role)
    || (role === "doctor" && !doctorId)
    || (password && password.length < 8)) {
    response.status(400).json({ error: "Informe um e-mail válido, tipo de usuário, vínculo médico quando necessário e senha com pelo menos 8 caracteres." });
    return;
  }
  const targetResult = await pool.query(
    "SELECT id, role FROM users WHERE id = $1 AND clinic_id = $2",
    [id, request.user.clinicId]
  );
  const target = targetResult.rows[0];
  if (!target) {
    response.status(404).json({ error: "Usuário não encontrado neste consultório." });
    return;
  }
  if (target.role === "owner" || id === request.user.sub) {
    response.status(403).json({ error: "A conta administradora não pode ser editada por esta tela." });
    return;
  }
  if (role === "doctor") {
    const doctor = await pool.query(
      "SELECT 1 FROM records WHERE clinic_id = $1 AND kind = 'doctors' AND record_id = $2",
      [request.user.clinicId, doctorId]
    );
    if (!doctor.rowCount) {
      response.status(400).json({ error: "O médico selecionado não está cadastrado neste consultório." });
      return;
    }
  }
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  try {
    const result = await pool.query(
      `UPDATE users
       SET email = $3, role = $4, doctor_id = $5,
           password_hash = COALESCE($6, password_hash),
           auth_version = auth_version + CASE WHEN $6 IS NULL THEN 0 ELSE 1 END
       WHERE id = $1 AND clinic_id = $2
       RETURNING id, email, role, doctor_id`,
      [id, request.user.clinicId, email, role, role === "doctor" ? doctorId : null, passwordHash]
    );
    response.json({
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        doctorId: result.rows[0].doctor_id
      }
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_email_key") {
      response.status(409).json({ error: "Já existe uma conta com esse e-mail." });
      return;
    }
    if (error.code === "23505") {
      response.status(409).json({ error: "Este médico já possui uma conta de acesso." });
      return;
    }
    throw error;
  }
}));

app.delete("/api/users/:id", requireAuth, asyncRoute(async (request, response) => {
  if (request.user.role !== "owner") {
    response.status(403).json({ error: "Somente o administrador pode excluir usuários." });
    return;
  }
  const { id } = request.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    response.status(404).json({ error: "Usuário não encontrado neste consultório." });
    return;
  }
  if (id === request.user.sub) {
    response.status(403).json({ error: "Você não pode excluir sua própria conta." });
    return;
  }
  const clinicalRecord = await pool.query(
    "SELECT 1 FROM clinical_records WHERE clinic_id = $1 AND updated_by = $2 LIMIT 1",
    [request.user.clinicId, id]
  );
  if (clinicalRecord.rowCount) {
    response.status(409).json({ error: "Este usuário atualizou prontuários e não pode ser excluído para preservar o histórico clínico." });
    return;
  }
  const result = await pool.query(
    "DELETE FROM users WHERE id = $1 AND clinic_id = $2 AND role <> 'owner' RETURNING id",
    [id, request.user.clinicId]
  );
  if (!result.rowCount) {
    response.status(404).json({ error: "Usuário não encontrado ou conta administradora protegida." });
    return;
  }
  response.json({ deleted: true });
}));

app.get("/api/state", requireAuth, asyncRoute(async (request, response) => {
  const result = await pool.query(
    "SELECT kind, data FROM records WHERE clinic_id = $1 ORDER BY updated_at, record_id",
    [request.user.clinicId]
  );
  const state = { doctors: [], appointments: [] };
  result.rows.forEach((row) => state[row.kind].push(row.data));
  response.json(state);
}));

app.get("/api/medical-records", requireAuth, requireDoctor, asyncRoute(async (request, response) => {
  const result = await pool.query(
    `SELECT clinical.appointment_id, clinical.content, clinical.updated_at
     FROM clinical_records AS clinical
     JOIN records AS appointment
       ON appointment.clinic_id = clinical.clinic_id
       AND appointment.kind = 'appointments'
       AND appointment.record_id = clinical.appointment_id
     WHERE clinical.clinic_id = $1
       AND clinical.doctor_id = $2
       AND appointment.data->>'doctorId' = $2
     ORDER BY clinical.updated_at DESC`,
    [request.user.clinicId, request.user.doctorId]
  );
  response.json({
    records: result.rows.map((row) => ({
      appointmentId: row.appointment_id,
      content: row.content,
      updatedAt: row.updated_at
    }))
  });
}));

app.put("/api/medical-records/:appointmentId", requireAuth, requireDoctor, asyncRoute(async (request, response) => {
  const appointmentId = request.params.appointmentId;
  const fields = [
    "complaint", "history", "anamnesis", "examination",
    "diagnosis", "conduct", "prescription", "followUp"
  ];
  const content = {};
  for (const field of fields) {
    const value = request.body?.[field] ?? "";
    if (typeof value !== "string" || value.length > 10000) {
      response.status(400).json({ error: "Cada campo do prontuário deve ser texto com até 10.000 caracteres." });
      return;
    }
    content[field] = value.trim();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const appointmentResult = await client.query(
      "SELECT data FROM records WHERE clinic_id = $1 AND kind = 'appointments' AND record_id = $2 FOR UPDATE",
      [request.user.clinicId, appointmentId]
    );
    const appointment = appointmentResult.rows[0]?.data;
    if (!appointment || appointment.doctorId !== request.user.doctorId) {
      await client.query("ROLLBACK");
      response.status(404).json({ error: "Consulta não encontrada na agenda deste médico." });
      return;
    }

    const result = await client.query(
      `INSERT INTO clinical_records (clinic_id, appointment_id, doctor_id, content, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (clinic_id, appointment_id)
       DO UPDATE SET content = EXCLUDED.content, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       WHERE clinical_records.doctor_id = EXCLUDED.doctor_id
       RETURNING appointment_id, content, updated_at`,
      [request.user.clinicId, appointmentId, request.user.doctorId, JSON.stringify(content), request.user.sub]
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      response.status(409).json({ error: "O prontuário pertence a outro médico." });
      return;
    }
    await client.query("COMMIT");
    response.json({
      record: {
        appointmentId: result.rows[0].appointment_id,
        content: result.rows[0].content,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/records/:kind/sync", requireAuth, asyncRoute(async (request, response) => {
  const { kind } = request.params;
  if (!["doctors", "appointments"].includes(kind)) {
    response.status(404).json({ error: "Tipo de registro desconhecido." });
    return;
  }
  const upserts = request.body.upserts;
  const deletedIds = request.body.deletedIds;
  if (!Array.isArray(upserts) || !Array.isArray(deletedIds)
    || upserts.length > 1000 || deletedIds.length > 1000
    || upserts.some((item) => !item || typeof item.id !== "string" || item.id.length > 200)
    || deletedIds.some((id) => typeof id !== "string" || id.length > 200)) {
    response.status(400).json({ error: "Alterações inválidas." });
    return;
  }

  if (kind === "doctors" && deletedIds.length) {
    const linkedDoctor = await pool.query(
      "SELECT 1 FROM users WHERE clinic_id = $1 AND role = 'doctor' AND doctor_id = ANY($2::text[]) LIMIT 1",
      [request.user.clinicId, deletedIds]
    );
    if (linkedDoctor.rowCount) {
      response.status(409).json({ error: "Não é possível excluir um médico vinculado a uma conta de acesso." });
      return;
    }
  }

  if (kind === "appointments") {
    if (deletedIds.length) {
      const existingMedicalRecords = await pool.query(
        "SELECT 1 FROM clinical_records WHERE clinic_id = $1 AND appointment_id = ANY($2::text[]) LIMIT 1",
        [request.user.clinicId, deletedIds]
      );
      if (existingMedicalRecords.rowCount) {
        response.status(409).json({ error: "Não é possível excluir uma consulta que possui prontuário clínico." });
        return;
      }
    }
    const appointmentsWithRecords = upserts.map((appointment) => appointment.id);
    if (appointmentsWithRecords.length) {
      const existingMedicalRecords = await pool.query(
        "SELECT appointment_id, doctor_id FROM clinical_records WHERE clinic_id = $1 AND appointment_id = ANY($2::text[])",
        [request.user.clinicId, appointmentsWithRecords]
      );
      const appointmentById = new Map(upserts.map((appointment) => [appointment.id, appointment]));
      const changedDoctor = existingMedicalRecords.rows.some((record) => (
        appointmentById.get(record.appointment_id)?.doctorId !== record.doctor_id
      ));
      if (changedDoctor) {
        response.status(409).json({ error: "Não é possível transferir para outro médico uma consulta que possui prontuário." });
        return;
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of upserts) {
      await client.query(
        `INSERT INTO records (clinic_id, kind, record_id, data)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (clinic_id, kind, record_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [request.user.clinicId, kind, item.id, JSON.stringify(item)]
      );
    }
    if (deletedIds.length) {
      await client.query(
        "DELETE FROM records WHERE clinic_id = $1 AND kind = $2 AND record_id = ANY($3::text[])",
        [request.user.clinicId, kind, deletedIds]
      );
    }
    await client.query("COMMIT");
    response.json({ saved: upserts.length, deleted: deletedIds.length });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.use((error, request, response, next) => {
  console.error("Erro na API AgendeAqui.", error);
  if (response.headersSent) {
    next(error);
    return;
  }
  response.status(500).json({ error: "Não foi possível concluir a operação. Tente novamente." });
});

(async () => {
  await initializeDatabase();
  app.listen(port, () => console.info(`AgendeAqui API escutando na porta ${port}.`));
})().catch((error) => {
  console.error("Falha ao iniciar a API AgendeAqui.", error);
  process.exitCode = 1;
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
