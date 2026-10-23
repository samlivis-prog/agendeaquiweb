"use strict";

const bcrypt = require("bcryptjs");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { randomUUID } = require("node:crypto");

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || "";
const databaseUrl = process.env.DATABASE_URL || "";
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!databaseUrl) throw new Error("Configure DATABASE_URL para conectar ao PostgreSQL.");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("Configure FRONTEND_ORIGINS com a origem publicada do frontend.");
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
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
    next();
  } catch {
    response.status(401).json({ error: "Sessão expirada. Entre novamente." });
  }
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, clinicId: user.clinic_id, role: user.role, email: user.email },
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
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS records (
      clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('doctors', 'appointments')),
      record_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (clinic_id, kind, record_id)
    );
    CREATE INDEX IF NOT EXISTS records_clinic_kind_idx ON records (clinic_id, kind);
  `);

  const clinicCount = await pool.query("SELECT COUNT(*)::int AS count FROM clinics");
  if (clinicCount.rows[0].count > 0) return;

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error("Banco vazio: defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 12 caracteres) para criar o usuário administrador inicial.");
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
    "SELECT id, clinic_id, email, password_hash, role FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    response.status(401).json({ error: "E-mail ou senha inválidos." });
    return;
  }
  response.json({ token: createToken(user), user: { email: user.email, role: user.role } });
}));

app.get("/api/auth/me", requireAuth, (request, response) => {
  response.json({ user: { email: request.user.email, role: request.user.role } });
});

app.post("/api/users", requireAuth, asyncRoute(async (request, response) => {
  if (request.user.role !== "owner") {
    response.status(403).json({ error: "Somente o administrador pode criar usuários." });
    return;
  }
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    response.status(400).json({ error: "Informe um e-mail válido e uma senha com pelo menos 12 caracteres." });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await pool.query(
      "INSERT INTO users (id, clinic_id, email, password_hash, role) VALUES ($1, $2, $3, $4, 'staff')",
      [randomUUID(), request.user.clinicId, email, passwordHash]
    );
  } catch (error) {
    if (error.code === "23505") {
      response.status(409).json({ error: "Já existe uma conta com esse e-mail." });
      return;
    }
    throw error;
  }
  response.status(201).json({ user: { email, role: "staff" } });
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
