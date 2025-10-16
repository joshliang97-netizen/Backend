// backend/app.js
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = process.env.JWT_SECRET || "FrutyLukySuperSecret2025";

// Base de datos MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// -------------------- Helpers --------------------
async function getConfigRTP() {
  const [rows] = await db.query("SELECT rtp FROM configuracion LIMIT 1");
  return rows.length ? rows[0].rtp : 25;
}
function generarToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: "3h" });
}
function autenticarToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).send("Token requerido");
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send("Token inválido");
    req.user = user;
    next();
  });
}

// -------------------- Jugadores --------------------
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO usuarios (username, password, saldo) VALUES (?, ?, 500)", [username, hash]);
    res.send("Usuario creado con éxito con 500 créditos iniciales");
  } catch {
    res.status(400).send("El usuario ya existe");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query("SELECT * FROM usuarios WHERE username = ?", [username]);
  if (!rows.length) return res.status(401).send("Usuario no encontrado");

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).send("Contraseña incorrecta");

  const token = generarToken(user);
  res.json({ id: user.id, username: user.username, saldo: user.saldo, token });
});

app.post("/apostar", autenticarToken, async (req, res) => {
  const { apuesta } = req.body;
  const userId = req.user.id;

  const [[user]] = await db.query("SELECT * FROM usuarios WHERE id = ?", [userId]);
  if (!user || user.saldo < apuesta) return res.status(400).send("Saldo insuficiente");

  const rtp = await getConfigRTP();
  const esGanador = Math.random() < rtp / 100;
  let premio = esGanador ? apuesta * 10 : 0;
  const nuevoSaldo = user.saldo - apuesta + premio;

  await db.query("UPDATE usuarios SET saldo = ? WHERE id = ?", [nuevoSaldo, userId]);
  await db.query("INSERT INTO jugadas (user_id, apuesta, premio, fecha) VALUES (?, ?, ?, NOW())", [userId, apuesta, premio]);

  res.json({
    resultado: esGanador ? "🎉 ¡Ganaste!" : "❌ No ganaste esta vez",
    premio,
    saldo: nuevoSaldo
  });
});

// -------------------- Administración --------------------
app.post("/admin/login", async (req, res) => {
  const { usuario, password } = req.body;
  const [rows] = await db.query("SELECT * FROM admin WHERE usuario = ?", [usuario]);
  if (!rows.length) return res.status(401).send("Usuario incorrecto");

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).send("Contraseña incorrecta");

  res.json({ mensaje: "Acceso concedido" });
});

app.get("/admin/estadisticas", async (req, res) => {
  const [[stats]] = await db.query("SELECT COUNT(*) AS totalJugadas, SUM(apuesta) AS totalApuestas, SUM(premio) AS totalPremios FROM jugadas");
  const gananciasSistema = (stats.totalApuestas || 0) - (stats.totalPremios || 0);
  const porcentajeRetorno = stats.totalApuestas
    ? ((stats.totalPremios / stats.totalApuestas) * 100).toFixed(2)
    : 0;
  res.json({ ...stats, gananciasSistema, porcentajeRetorno });
});

app.post("/admin/rtp", async (req, res) => {
  const { nuevoRTP } = req.body;
  await db.query("UPDATE configuracion SET rtp = ? WHERE id = 1", [nuevoRTP]);
  res.send("RTP actualizado con éxito");
});

// -------------------- Servidor --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🎰 Fruty Luky API activa en puerto ${PORT}`));
