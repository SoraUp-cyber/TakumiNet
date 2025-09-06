// =======================================
// 1️⃣ DEPENDENCIAS
// =======================================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// =======================================
// 2️⃣ CONFIGURACIONES INICIALES
// =======================================
const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || 'TU_SECRETO_SUPER_SEGURO';

// Permitir solicitudes desde cualquier origen
app.use(cors());

// Middleware para parsear JSON y URL-encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =======================================
// 3️⃣ BASE DE DATOS SQLITE
// =======================================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB_PATH = path.join(DATA_DIR, 'takuminet.sqlite');
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error('❌ Error al conectar DB:', err.message);
  console.log('✅ Base de datos conectada');
  createTables(startServer);
});

// =======================================
// 4️⃣ FUNCIONES ASÍNCRONAS SQLITE
// =======================================
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// =======================================
// 5️⃣ CONFIGURACIÓN PASSPORT + JWT
// =======================================
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await getAsync('SELECT id, username, email FROM usuarios WHERE id = ?', [jwt_payload.id]);
      if (user) return done(null, user);
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

app.use(passport.initialize());

// =======================================
// 6️⃣ CREACIÓN DE TABLAS
// =======================================
function createTables(callback) {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        playGames INTEGER DEFAULT 0,
        distributeContent INTEGER DEFAULT 0,
        newsletter INTEGER DEFAULT 0,
        paypal_email TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
      )
    `, (err) => {
      if (err) return console.error('❌ Error al crear tabla usuarios:', err.message);
      console.log("✅ Tabla 'usuarios' creada correctamente");
      if (callback) callback();
    });
  });
}

// =======================================
// 📌 INICIAR SERVIDOR
// =======================================
function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}

// =======================================
// 📌 RUTAS DE USUARIOS CON JWT
// =======================================

// Registro de usuario
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, playGames, distributeContent, newsletter } = req.body;
    if (!username || !email || !password) 
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO usuarios (username, email, password, playGames, distributeContent, newsletter)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const id = await runAsync(sql, [
      username, email, hashedPassword,
      playGames ? 1 : 0,
      distributeContent ? 1 : 0,
      newsletter ? 1 : 0
    ]);

    res.json({ ok: true, id });
  } catch (err) {
    if (err.message.includes('UNIQUE')) 
      return res.status(400).json({ ok: false, error: 'Usuario o email ya existe' });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Login usuario
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) 
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña requeridos' });

    // Buscar usuario en SQLite
    const user = await getAsync('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ ok: false, error: 'Usuario no encontrado' });

    // Comparar contraseña
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });

    // Crear JWT
    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '2h' });

    // Actualizar último login
    await runAsync(`UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

    // Retornar datos del usuario
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_base64: user.avatar || ""
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint para obtener usuario por id
app.get("/api/usuario/:id", (req, res) => {
  const userId = req.params.id;

  const query = `SELECT id, username, avatar FROM usuarios WHERE id = ?`;
  db.get(query, [userId], (err, row) => {
    if (err) return res.json({ ok: false, error: err.message });
    if (!row) return res.json({ ok: false, error: "Usuario no encontrado" });

    res.json({ ok: true, usuario: row });
  });
});


app.put('/api/usuario/:id/editar', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, currentPassword, newPassword, avatar } = req.body;
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ ok: false, error: "No autorizado" });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    if (decoded.id != id) return res.status(403).json({ ok: false, error: "Token inválido" });

    const user = await getAsync('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

    // Verificar contraseña actual
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ ok: false, error: "Contraseña actual incorrecta" });

    // Actualizar datos
    const updates = [];
    const params = [];
    if (username) { updates.push('username = ?'); params.push(username); }
    if (newPassword) { 
      const hash = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?'); 
      params.push(hash); 
    }
    if (avatar) { updates.push('avatar = ?'); params.push(avatar); }
    params.push(id);

    if (updates.length > 0) {
      await runAsync(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

