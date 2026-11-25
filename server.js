require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");
const { Pool } = require("pg");
const PgSession = require("connect-pg-simple")(session);
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const fs = require("fs");
const path = require("path");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean)
);

app.set("trust proxy", 1);
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "dev-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: isProduction, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
    done(null, result.rows[0] || false);
  } catch (err) { done(err); }
});

async function upsertOAuthUser(provider, profile, email) {
  const providerId = String(profile.id);
  const displayName = (profile.displayName || profile.username || "Usuário").slice(0, 120);
  const avatar = profile.photos?.[0]?.value || null;
  const normalizedEmail = email ? email.toLowerCase() : null;
  const isAdmin = normalizedEmail && adminEmails.has(normalizedEmail);

  const result = await pool.query(`
    INSERT INTO users(provider, provider_id, email, display_name, avatar_url, status, role)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(provider, provider_id) DO UPDATE SET
      email=COALESCE(EXCLUDED.email, users.email),
      display_name=EXCLUDED.display_name,
      avatar_url=COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      role=CASE WHEN $8 THEN 'admin' ELSE users.role END,
      status=CASE WHEN $8 THEN 'approved' ELSE users.status END
    RETURNING *`,
    [provider, providerId, normalizedEmail, displayName, avatar,
     isAdmin ? "approved" : "pending", isAdmin ? "admin" : "user", !!isAdmin]
  );
  return result.rows[0];
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (_at, _rt, profile, done) => {
    try {
      const email = profile.emails?.find(e => e.verified)?.value || profile.emails?.[0]?.value;
      done(null, await upsertOAuthUser("google", profile, email));
    } catch (e) { done(e); }
  }));
}

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ["identify", "email"]
  }, async (_at, _rt, profile, done) => {
    try {
      const email = profile.email_verified ? profile.email : null;
      done(null, await upsertOAuthUser("discord", profile, email));
    } catch (e) { done(e); }
  }));
}

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const signedIn = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: "Faça login." });
const approved = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Faça login." });
  if (req.user.status !== "approved") return res.status(403).json({ error: "Sua conta ainda não foi liberada pelo administrador." });
  next();
};
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin" || req.user.status !== "approved")
    return res.status(403).json({ error: "Acesso exclusivo do administrador." });
  next();
};

app.get("/auth/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).send("Login Google ainda não configurado.");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});
app.get("/auth/google/callback", (req, res, next) =>
  passport.authenticate("google", { failureRedirect: "/?login=erro" })(req, res, next),
  (req, res) => res.redirect("/")
);
app.get("/auth/discord", (req, res, next) => {
  if (!process.env.DISCORD_CLIENT_ID) return res.status(503).send("Login Discord ainda não configurado.");
  passport.authenticate("discord")(req, res, next);
});
app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/?login=erro" }),
  (_req, res) => res.redirect("/")
);
app.post("/auth/logout", (req, res, next) => req.logout(err => {
  if (err) return next(err);
  req.session.destroy(() => res.json({ ok: true }));
}));

app.get("/api/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  const { id, display_name, email, avatar_url, status, role } = req.user;
  res.json({ user: { id, display_name, email, avatar_url, status, role } });
});

app.get("/api/titles", signedIn, approved, asyncRoute(async (_req, res) => {
  const result = await pool.query("SELECT id,title,synopsis,kind,category,poster_url,banner_url,year,age_rating,featured FROM titles WHERE active=true ORDER BY featured DESC, created_at DESC");
  res.json(result.rows);
}));
app.get("/api/titles/:id", signedIn, approved, asyncRoute(async (req, res) => {
  const result = await pool.query("SELECT id,title,synopsis,kind,category,poster_url,banner_url,playback_url,year,age_rating FROM titles WHERE id=$1 AND active=true", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Título não encontrado." });
  res.json(result.rows[0]);
}));
app.get("/api/admin/users", signedIn, adminOnly, asyncRoute(async (_req, res) => {
  const r = await pool.query("SELECT id,display_name,email,provider,status,role,created_at FROM users ORDER BY created_at DESC");
  res.json(r.rows);
}));
app.patch("/api/admin/users/:id", signedIn, adminOnly, asyncRoute(async (req, res) => {
  const { status, role } = req.body;
  if (status && !["pending","approved","blocked"].includes(status)) return res.status(400).json({error:"Status inválido."});
  if (role && !["user","admin"].includes(role)) return res.status(400).json({error:"Perfil inválido."});
  const r = await pool.query(
    "UPDATE users SET status=COALESCE($1,status), role=COALESCE($2,role) WHERE id=$3 RETURNING id,status,role",
    [status || null, role || null, req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({error:"Usuário não encontrado."});
  res.json(r.rows[0]);
}));
app.post("/api/admin/titles", signedIn, adminOnly, asyncRoute(async (req, res) => {
  const { title, synopsis="", kind, category="Destaques", poster_url="", banner_url="", playback_url, year=null, age_rating="Livre", featured=false } = req.body;
  if (!title || !["movie","series"].includes(kind) || !playback_url) return res.status(400).json({error:"Informe título, tipo e endereço autorizado do vídeo."});
  let parsed;
  try { parsed = new URL(playback_url); } catch { return res.status(400).json({error:"Endereço de reprodução inválido."}); }
  if (!["https:","http:"].includes(parsed.protocol)) return res.status(400).json({error:"Endereço inválido."});
  const r = await pool.query(
    `INSERT INTO titles(title,synopsis,kind,category,poster_url,banner_url,playback_url,year,age_rating,featured)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [title,synopsis,kind,category,poster_url,banner_url,playback_url,year,age_rating,!!featured]
  );
  res.status(201).json({id:r.rows[0].id});
}));
app.delete("/api/admin/titles/:id", signedIn, adminOnly, asyncRoute(async (req,res) => {
  await pool.query("UPDATE titles SET active=false WHERE id=$1",[req.params.id]);
  res.json({ok:true});
}));
app.put("/api/progress/:id", signedIn, approved, asyncRoute(async (req,res) => {
  const seconds = Math.max(0, Math.min(86400, Number(req.body.seconds) || 0));
  await pool.query(`INSERT INTO watch_progress(user_id,title_id,seconds) VALUES($1,$2,$3)
    ON CONFLICT(user_id,title_id) DO UPDATE SET seconds=EXCLUDED.seconds,updated_at=NOW()`,
    [req.user.id, req.params.id, seconds]);
  res.json({ok:true});
}));

app.get("/api/admin/health", signedIn, adminOnly, asyncRoute(async (_req,res) => {
  await pool.query("SELECT 1");
  res.json({database:"ok", app:"ok"});
}));

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({error:"Erro interno. Consulte os logs do servidor."});
});

async function start() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`MUKA FLIX ativo na porta ${port}`));
}
start().catch(err => { console.error("Falha ao iniciar:", err); process.exit(1); });
