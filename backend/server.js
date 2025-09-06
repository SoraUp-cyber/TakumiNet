// =======================
// MÓDULOS NATIVOS DE NODE
// =======================
const fs = require("fs");
const path = require("path");
const http = require("http");

// =======================
// FRAMEWORKS Y CORE
// =======================
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");

// =======================
// BASE DE DATOS
// =======================
const sqlite3 = require("sqlite3").verbose();

// =======================
// SEGURIDAD Y AUTENTICACIÓN
// =======================
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =======================
// SOCKETS Y SUBIDA DE ARCHIVOS
// =======================
const { Server } = require("socket.io");
const multer = require("multer");
const formidable = require("formidable");

// =======================
// SEGURIDAD Y MIDDLEWARES
// =======================
require("dotenv").config();        // Variables de entorno
const helmet = require("helmet");   // Seguridad HTTP
const rateLimit = require("express-rate-limit");

// =======================
// CONSTANTES DE CONFIGURACIÓN
// =======================
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || "TU_SECRETO_SUPER_SEGURO";

const CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_SANDBOX_SECRET;
const REDIRECT_URI = process.env.PAYPAL_REDIRECT_URI;

// =======================
// APP EXPRESS
// =======================
const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// Configuración de sesiones
app.use(session({
  secret: SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // HTTPS = true
}));

// Rate limiting (ejemplo login/registro)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: "⚠️ Demasiados intentos, intenta más tarde."
});
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);

// Carpeta pública
app.use("/languages", express.static(path.join(__dirname, "languages")));

// =======================
// DIRECTORIOS Y BASE DE DATOS
// =======================
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB_PATH = path.join(DATA_DIR, "takuminet.sqlite");
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error("❌ Error DB:", err.message);
  console.log("✅ Base de datos conectada");
  createTables(); // ⚠️ Define esta función en otro archivo o aquí
});

// =======================
// HELPERS SQLITE ASÍNCRONOS
// =======================
const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

// =======================
// HELPERS EXTRA
// =======================
function parseGenres(genres) {
  if (!genres) return [];
  if (Array.isArray(genres)) return genres;
  if (typeof genres === "string") return genres.split(",").map((g) => g.trim());
  return [];
}

// =======================
// CREAR TABLAS SQLITE
// =======================
function createTables() {
  db.serialize(() => {

    // =======================
    // TABLA USUARIOS
    // =======================
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        descripcion TEXT,
        twitter TEXT,
        facebook TEXT,
        instagram TEXT,
        contacto_email TEXT,
        playGames INTEGER DEFAULT 0,
        distributeContent INTEGER DEFAULT 0,
        newsletter INTEGER DEFAULT 0,
        paypal_email TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
      )
    `, (err) => {
      if (err) console.error("❌ Error creando tabla usuarios:", err.message);
      else console.log("🟢 Tabla 'usuarios' lista");
    });

    // =======================
    // TABLA GAME_JAMS
    // =======================
    db.run(`
      CREATE TABLE IF NOT EXISTS game_jams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        titulo TEXT NOT NULL,
        descripcion_corta TEXT NOT NULL,
        url TEXT NOT NULL,
        tipo_jam TEXT NOT NULL,
        quien_vota TEXT NOT NULL,
        fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL,
        fecha_votacion TEXT NOT NULL,
        imagen_portada_base64 TEXT,
        contenido TEXT NOT NULL,
        criterios TEXT,
        hashtag TEXT,
        comunidad INTEGER DEFAULT 0,
        bloquear_subidas INTEGER DEFAULT 0,
        ocultar_resultados INTEGER DEFAULT 0,
        ocultar_submisiones INTEGER DEFAULT 0,
        visibilidad TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id)
      )
    `, (err) => {
      if (err) console.error(err.message);
      else console.log('🟢 Tabla "game_jams" lista');
    });
  });
}


// Página inicial siempre login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages/login.html"));
});


// =======================
// ACCESO A CUALQUIER PÁGINA
// =======================
app.get("/:page", (req, res) => {
  const pageName = req.params.page + ".html";
  const pagePath = path.join(__dirname, "pages", pageName);
  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).send("Página no encontrada");
  }
});

// =======================
// RUTAS USUARIOS
// =======================
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, playGames, distributeContent, newsletter } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO usuarios (username, email, password, playGames, distributeContent, newsletter)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const id = await runAsync(sql, [
      username,
      email,
      hashedPassword,
      playGames ? 1 : 0,
      distributeContent ? 1 : 0,
      newsletter ? 1 : 0
    ]);

    res.json({ ok: true, id });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ ok: false, error: 'Usuario o email ya existe' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =======================
// Login de usuarios
// =======================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Usuario y contraseña requeridos" });
    }

    const user = await getAsync("SELECT * FROM usuarios WHERE username = ?", [username]);
    if (!user) return res.status(401).json({ ok: false, error: "Usuario no encontrado" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "2h" });

    // Actualizar último login
    await runAsync("UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

    // Respuesta al frontend: solo campos necesarios + avatar
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar_base64: user.avatar || "",
        language: user.language || "es",
      },
    });
  } catch (err) {
    console.error("❌ Error en /api/login:", err);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});

// =======================
// Obtener usuario por ID con redes, biografía y contacto
// =======================
app.get("/api/usuario/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Consulta completa de usuario
    const user = await getAsync(`
      SELECT 
        id,
        username,
        avatar,
        descripcion,
        twitter,
        instagram,
        youtube,
        discord,
        contacto_email,
        language
      FROM usuarios
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    }

    // Respuesta JSON
    res.json({
      ok: true,
      usuario: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        descripcion: user.descripcion,
        twitter: user.twitter,
        instagram: user.instagram,
        youtube: user.youtube,
        discord: user.discord,
        contacto_email: user.contacto_email,
        language: user.language
      }
    });

  } catch (err) {
    console.error("❌ Error en /api/usuario/:id:", err);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});




// =======================
// Actualizar idioma del usuario
// =======================
app.put("/api/usuario/:id/language", async (req, res) => {
  try {
    const { id } = req.params;
    const { language } = req.body;

    await runAsync("UPDATE usuarios SET language = ? WHERE id = ?", [language, id]);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en PUT /api/usuario/:id/language:", err);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
});



// ----------------------- //
// Actualizar editar perfil//
// ----------------------- //
app.put('/api/usuario/:id/editar', (req, res) => {
  const userId = req.params.id;
  const {
    username,
    descripcion,
    twitter,
    instagram,
    contacto_email,
    youtube,
    discord
  } = req.body;

  // Validación básica
  if (!username) return res.status(400).json({ ok: false, error: 'El nombre de usuario es obligatorio' });

  // Actualizar usuario en SQLite
  const sql = `
    UPDATE usuarios SET
      username = ?,
      descripcion = ?,
      twitter = ?,
      instagram = ?,
      contacto_email = ?,
      youtube = ?,
      discord = ?
    WHERE id = ?
  `;
  
  db.run(
    sql,
    [username, descripcion, twitter, instagram, contacto_email, youtube, discord, userId],
    function(err) {
      if (err) {
        // Captura errores de UNIQUE
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ ok: false, error: 'El username o email ya existe' });
        }
        return res.status(500).json({ ok: false, error: 'Error actualizando usuario: ' + err.message });
      }
      res.json({ ok: true, message: 'Usuario actualizado correctamente' });
    }
  );
});



// =======================// 
//Actualizar avatar del usuario//
// =======================//

app.put("/api/usuario/:id/avatar", async (req, res) => {
  const { avatar } = req.body; // base64
  const { id } = req.params;

  if (!avatar) {
    return res.status(400).json({ ok: false, error: "No se envió avatar" });
  }

  try {
    await db.run("UPDATE usuarios SET avatar = ? WHERE id = ?", [avatar, id]);
    res.json({ ok: true, message: "Avatar actualizado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error al guardar en DB" });
  }
});


// =======================
// CREAR NUEVO JUEGO
// =======================
app.post("/api/juegos", (req, res) => {
  const body = req.body;

  if (!body.mediafire_link || body.mediafire_link.trim() === "") {
    return res.status(400).json({ ok: false, error: "Debes proporcionar un enlace de MediaFire" });
  }

  // Para POST /api/juegos
const nuevoJuego = {
  title: body.title || null,
  description: body.description || null,
  user_id: body.user_id || null,
  category: body.category || null,
  // ✅ Corregido: genres puede ser array o string
  genres: Array.isArray(body.genres)
    ? JSON.stringify(body.genres)
    : body.genres
      ? JSON.stringify(body.genres.split(","))
      : JSON.stringify([]),
  main_genre: body.main_genre || null,
  min_os: body.min_os || null,
  min_cpu: body.min_cpu || null,
  min_ram: body.min_ram || null,
  min_gpu: body.min_gpu || null,
  min_storage: body.min_storage || null,
  rec_os: body.rec_os || null,
  rec_cpu: body.rec_cpu || null,
  rec_ram: body.rec_ram || null,
  rec_gpu: body.rec_gpu || null,
  rec_storage: body.rec_storage || null,
  youtube_url: body.youtube_url || null,
  pricing: body.pricing || "gratis",
  price: body.price || 0,
  discount: body.discount || 0, // ✅ Nueva columna para ofertas
  mediafire_link: body.mediafire_link,
  cover_base64: body.cover_base64 || null,
  screenshots_base64: body.screenshots_base64
    ? JSON.stringify(body.screenshots_base64)
    : JSON.stringify([]),
  is_featured: body.is_featured ? 1 : 0,
  recommended: body.recommended ? 1 : 0,
  created_at: new Date().toISOString()
};

  const query = `
    INSERT INTO juegos
    (title, description, user_id, category, genres, main_genre, min_os, min_cpu, min_ram, min_gpu, min_storage,
     rec_os, rec_cpu, rec_ram, rec_gpu, rec_storage, youtube_url, pricing, price, discount, mediafire_link,
     cover_base64, screenshots_base64, is_featured, recommended, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  db.run(query, Object.values(nuevoJuego), function (err) {
    if (err) return res.status(500).json({ ok: false, error: "Error interno al agregar juego" });
    res.json({ ok: true, message: "Juego agregado correctamente", juego: { id: this.lastID, ...nuevoJuego } });
  });
});




// =======================
// OBTENER TODOS LOS JUEGOS
// =======================
app.get("/api/juegos", (req, res) => {
  db.all("SELECT * FROM juegos", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: "Error interno al obtener juegos" });
    rows = rows.map(j => ({
      ...j,
      genres: JSON.parse(j.genres),
      screenshots_base64: JSON.parse(j.screenshots_base64)
    }));
    res.json({ ok: true, juegos: rows });
  });
});

// =======================
// OBTENER JUEGOS DESTACADOS
// =======================
app.get("/api/juegos/destacados", (req, res) => {
  db.all("SELECT * FROM juegos WHERE is_featured = 1", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: "Error interno al obtener juegos destacados" });
    rows = rows.map(j => ({ ...j, genres: JSON.parse(j.genres), screenshots_base64: JSON.parse(j.screenshots_base64) }));
    res.json({ ok: true, juegos: rows });
  });
});

// =======================
// OBTENER JUEGOS RECOMENDADOS
// =======================
app.get("/api/juegos/recomendados", (req, res) => {
  db.all("SELECT * FROM juegos WHERE recommended = 1", [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: "Error interno al obtener juegos recomendados" });
    rows = rows.map(j => ({ ...j, genres: JSON.parse(j.genres), screenshots_base64: JSON.parse(j.screenshots_base64) }));
    res.json({ ok: true, juegos: rows });
  });
});

// =======================
// OBTENER JUEGO POR ID
// =======================
app.get("/api/juegos/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get("SELECT * FROM juegos WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: "Error interno" });
    if (!row) return res.status(404).json({ ok: false, error: "Juego no encontrado" });
    row.genres = JSON.parse(row.genres);
    row.screenshots_base64 = JSON.parse(row.screenshots_base64);
    res.json({ ok: true, juego: row });
  });
});

// =======================
// ACTUALIZAR JUEGO POR ID
// =======================
app.put("/api/juegos/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body;

  const query = `
    UPDATE juegos SET
      title = ?, 
      user_id = ?, 
      category = ?, 
      genres = ?, 
      main_genre = ?,
      min_os = ?, min_cpu = ?, min_ram = ?, min_gpu = ?, min_storage = ?,
      rec_os = ?, rec_cpu = ?, rec_ram = ?, rec_gpu = ?, rec_storage = ?,
      youtube_url = ?, 
      pricing = ?, 
      price = ?, 
      discount = ?,        -- <-- agregado
      mediafire_link = ?, 
      cover_base64 = ?, 
      screenshots_base64 = ?, 
      is_featured = ?, 
      recommended = ?
    WHERE id = ?
  `;

  // Para PUT /api/juegos/:id
const values = [
  body.title || null,
  body.user_id || null,
  body.category || null,
  Array.isArray(body.genres)
    ? JSON.stringify(body.genres)
    : body.genres
      ? JSON.stringify(body.genres.split(","))
      : JSON.stringify([]),
  body.main_genre || null,
  body.min_os || null,
  body.min_cpu || null,
  body.min_ram || null,
  body.min_gpu || null,
  body.min_storage || null,
  body.rec_os || null,
  body.rec_cpu || null,
  body.rec_ram || null,
  body.rec_gpu || null,
  body.rec_storage || null,
  body.youtube_url || null,
  body.pricing || "gratis",
  body.price || 0,
  body.discount || 0, // ✅ Nueva columna para ofertas
  body.mediafire_link || null,
  body.cover_base64 || null,
  body.screenshots_base64 ? JSON.stringify(body.screenshots_base64) : JSON.stringify([]),
  body.is_featured ? 1 : 0,
  body.recommended ? 1 : 0,
  id
  ];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ ok: false, error: "Error interno al actualizar" });
    res.json({ ok: true, message: "Juego actualizado correctamente" });
  });
});

// =======================
// ELIMINAR JUEGO POR ID
// =======================
app.delete("/api/juegos/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.run("DELETE FROM juegos WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ ok: false, error: "Error interno al eliminar" });
    res.json({ ok: true, message: "Juego eliminado correctamente" });
  });
});



// ===============================
// API: Obtener todas las Game Jams
// ===============================
app.get('/api/game_jams', (req, res) => {
  const sql = `SELECT * FROM game_jams ORDER BY created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener Game Jams:', err.message);
      return res.status(500).json({ ok: false, error: 'Error al obtener Game Jams' });
    }

    res.json({
      ok: true,
      jams: rows
    });
  });
});



// OBTENER UNA GAME JAM POR ID (SQLite)
// ===============================
app.get('/api/game_jams/:id', (req, res) => {
  const jamId = req.params.id;

  db.get(`SELECT * FROM game_jams WHERE id = ?`, [jamId], (err, row) => {
    if (err) {
      console.error('❌ Error al obtener Game Jam:', err.message);
      return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }

    if (!row) {
      return res.status(404).json({ ok: false, message: 'Game Jam no encontrada' });
    }

    res.json({ ok: true, jam: row });
  });
});


// Crear nuevo foro
app.post("/api/foros", (req, res) => {
  const { user_id, titulo, categoria, descripcion, etiquetas, imagen_base64 } = req.body;

  if (!user_id || !titulo || !categoria || !descripcion) {
    return res.status(400).json({ ok: false, error: "Campos obligatorios incompletos" });
  }

  const sql = `
    INSERT INTO foros (user_id, titulo, categoria, descripcion, etiquetas, imagen_base64)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.run(sql, [user_id, titulo, categoria, descripcion, etiquetas, imagen_base64], function(err) {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, foro_id: this.lastID });
  });
});

// Obtener todos los foros
app.get("/api/foros", (req, res) => {
  const sql = `SELECT * FROM foros ORDER BY created_at DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, foros: rows });
  });
});

// ==========================
// GET /api/foros/:id
// ==========================
app.get('/api/foros/:id', (req, res) => {
  const foroId = req.params.id;

  const sql = `SELECT * FROM foros WHERE id = ?`;
  db.get(sql, [foroId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ ok: false, error: 'Error en la base de datos' });
    }

    if (!row) {
      return res.status(404).json({ ok: false, error: 'Foro no encontrado' });
    }

    // Responder con el foro
    res.json({ ok: true, foro: row });
  });
});



// Obtener comentarios de un foro
app.get("/api/comentarios/:foro_id", (req, res) => {
  const foroId = req.params.foro_id;
  const sql = `SELECT * FROM comentarios WHERE foro_id = ? ORDER BY created_at ASC`;
  db.all(sql, [foroId], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, comentarios: rows });
  });
});

// Crear comentario
app.post("/api/comentarios", (req, res) => {
  const { foro_id, user_id, username, contenido } = req.body;
  if (!foro_id || !user_id || !username || !contenido) {
    return res.status(400).json({ ok: false, error: "Campos incompletos" });
  }
  const sql = `INSERT INTO comentarios (foro_id, user_id, username, contenido) VALUES (?, ?, ?, ?)`;
  db.run(sql, [foro_id, user_id, username, contenido], function(err) {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, comentario_id: this.lastID });
  });
});



// Toggle like
app.post("/api/comentarios/:id/like", (req, res) => {
  const comentario_id = parseInt(req.params.id);
  const { user_id } = req.body;
  if(!user_id) return res.status(400).json({ ok:false, error:"Usuario no identificado" });

  db.get(`SELECT type FROM comentario_votes WHERE comentario_id=? AND user_id=?`, 
    [comentario_id,user_id], (err,row) => {
      if(err) return res.status(500).json({ ok:false, error:err.message });

      if(row && row.type === "like") {
        // Quitar like
        db.run(`DELETE FROM comentario_votes WHERE comentario_id=? AND user_id=?`, 
          [comentario_id,user_id]);
        db.run(`UPDATE comentarios SET likes = likes - 1 WHERE id=?`, [comentario_id]);
      } else if(row && row.type === "dislike") {
        // Cambiar dislike a like
        db.run(`UPDATE comentario_votes SET type='like' WHERE comentario_id=? AND user_id=?`,
          [comentario_id,user_id]);
        db.run(`UPDATE comentarios SET likes = likes + 1, dislikes = dislikes - 1 WHERE id=?`, [comentario_id]);
      } else {
        // Nuevo like
        db.run(`INSERT INTO comentario_votes (comentario_id,user_id,type) VALUES (?,?,?)`,
          [comentario_id,user_id,"like"]);
        db.run(`UPDATE comentarios SET likes = likes + 1 WHERE id=?`, [comentario_id]);
      }

      db.get(`SELECT likes, dislikes FROM comentarios WHERE id=?`, [comentario_id], (err,row) => {
        if(err) return res.status(500).json({ ok:false, error:err.message });
        res.json({ ok:true, likes: row.likes, dislikes: row.dislikes });
      });
  });
});

// Toggle dislike (igual que like, invertido)
app.post("/api/comentarios/:id/dislike", (req, res) => {
  const comentario_id = parseInt(req.params.id);
  const { user_id } = req.body;
  if(!user_id) return res.status(400).json({ ok:false, error:"Usuario no identificado" });

  db.get(`SELECT type FROM comentario_votes WHERE comentario_id=? AND user_id=?`, 
    [comentario_id,user_id], (err,row) => {
      if(err) return res.status(500).json({ ok:false, error:err.message });

      if(row && row.type === "dislike") {
        // Quitar dislike
        db.run(`DELETE FROM comentario_votes WHERE comentario_id=? AND user_id=?`, 
          [comentario_id,user_id]);
        db.run(`UPDATE comentarios SET dislikes = dislikes - 1 WHERE id=?`, [comentario_id]);
      } else if(row && row.type === "like") {
        // Cambiar like a dislike
        db.run(`UPDATE comentario_votes SET type='dislike' WHERE comentario_id=? AND user_id=?`,
          [comentario_id,user_id]);
        db.run(`UPDATE comentarios SET dislikes = dislikes + 1, likes = likes - 1 WHERE id=?`, [comentario_id]);
      } else {
        // Nuevo dislike
        db.run(`INSERT INTO comentario_votes (comentario_id,user_id,type) VALUES (?,?,?)`,
          [comentario_id,user_id,"dislike"]);
        db.run(`UPDATE comentarios SET dislikes = dislikes + 1 WHERE id=?`, [comentario_id]);
      }

      db.get(`SELECT likes, dislikes FROM comentarios WHERE id=?`, [comentario_id], (err,row) => {
        if(err) return res.status(500).json({ ok:false, error:err.message });
        res.json({ ok:true, likes: row.likes, dislikes: row.dislikes });
      });
  });
});




// Endpoint para reportar comentario
app.post("/api/comentarios/reportar", async (req, res) => {
  const { comentario_id, user_id, motivo } = req.body;

  if (!user_id || !comentario_id) return res.json({ ok: false, error: "Datos incompletos" });

  try {
    // Guardar reporte en la base de datos
    await db.run(`
      INSERT INTO reportes (comentario_id, user_id, motivo, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [comentario_id, user_id, motivo]);

    // Contar reportes del mismo usuario (dueño del comentario)
    const comentario = await db.get("SELECT user_id FROM comentarios WHERE id = ?", [comentario_id]);
    const reportes = await db.get(`
      SELECT COUNT(*) as total FROM reportes
      WHERE comentario_id IN (SELECT id FROM comentarios WHERE user_id = ?)
    `, [comentario.user_id]);

    // Bloquear automáticamente si tiene >= 3 reportes
    if (reportes.total >= 3) {
      await db.run("UPDATE usuarios SET bloqueado = 1 WHERE id = ?", [comentario.user_id]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Error al reportar" });
  }
});



// Obtener todos los temas de una Game Jam
app.get('/api/jams/:jamId/temas', (req, res) => {
  const { jamId } = req.params;
  const sql = 'SELECT * FROM temas WHERE jam_id = ? ORDER BY id DESC';
  db.all(sql, [jamId], (err, rows) => {
    if (err) return res.json({ ok: false, error: err.message });
    res.json({ ok: true, temas: rows });
  });
});

// Crear un nuevo tema
app.post('/api/jams/:jamId/temas', (req, res) => {
  const { jamId } = req.params;
  const { titulo, descripcion, autor } = req.body;

  if (!titulo) return res.json({ ok: false, error: 'El título es obligatorio' });

  const sql = 'INSERT INTO temas (jam_id, titulo, descripcion, autor) VALUES (?, ?, ?, ?)';
  db.run(sql, [jamId, titulo, descripcion || '', autor || 'Invitado'], function(err) {
    if (err) return res.json({ ok: false, error: err.message });
    res.json({ ok: true, id: this.lastID });
  });
});

// Obtener un tema por ID
app.get('/api/temas/:temaId', (req, res) => {
  const { temaId } = req.params;
  const sql = 'SELECT * FROM temas WHERE id = ?';
  db.get(sql, [temaId], (err, row) => {
    if (err) return res.json({ ok: false, error: err.message });
    if (!row) return res.json({ ok: false, error: 'Tema no encontrado' });
    res.json({ ok: true, tema: row });
  });
});


// Obtener comentarios por tema
app.get("/api/comentarios/tema/:tema_id", (req, res) => {
  const temaId = req.params.tema_id;
  const sql = "SELECT * FROM comentarios_temas WHERE tema_id = ? ORDER BY created_at ASC";
  db.all(sql, [temaId], (err, rows) => {
    if (err) return res.json({ ok: false, error: err.message });
    res.json({ ok: true, comentarios: rows });
  });
});

// Crear comentario en un tema
app.post("/api/comentarios/tema", (req, res) => {
  const { tema_id, user_id, username, contenido } = req.body;
  if (!tema_id || !user_id || !username || !contenido) {
    return res.status(400).json({ ok: false, error: "Campos incompletos" });
  }
  const sql = `INSERT INTO comentarios_temas (tema_id, user_id, username, contenido) VALUES (?, ?, ?, ?)`;
  db.run(sql, [tema_id, user_id, username, contenido], function(err) {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, comentario_id: this.lastID });
  });
});



// ==========================
// Toggle LIKE para comentarios_temas
// ==========================
app.post("/api/comentarios/tema/:id/like", (req, res) => {
  const comentario_id = parseInt(req.params.id);
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ ok: false, error: "Usuario no identificado" });

  db.get(`SELECT type FROM comentario_temas_votes WHERE comentario_id=? AND user_id=?`,
    [comentario_id, user_id], (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });

      if (row && row.type === "like") {
        // Quitar like
        db.run(`DELETE FROM comentario_temas_votes WHERE comentario_id=? AND user_id=?`,
          [comentario_id, user_id]);
        db.run(`UPDATE comentarios_temas SET likes = likes - 1 WHERE id=?`, [comentario_id]);
      } else if (row && row.type === "dislike") {
        // Cambiar dislike a like
        db.run(`UPDATE comentario_temas_votes SET type='like' WHERE comentario_id=? AND user_id=?`,
          [comentario_id, user_id]);
        db.run(`UPDATE comentarios_temas SET likes = likes + 1, dislikes = dislikes - 1 WHERE id=?`, [comentario_id]);
      } else {
        // Nuevo like
        db.run(`INSERT INTO comentario_temas_votes (comentario_id,user_id,type) VALUES (?,?,?)`,
          [comentario_id, user_id, "like"]);
        db.run(`UPDATE comentarios_temas SET likes = likes + 1 WHERE id=?`, [comentario_id]);
      }

      db.get(`SELECT likes, dislikes FROM comentarios_temas WHERE id=?`, [comentario_id], (err, row) => {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        res.json({ ok: true, likes: row.likes, dislikes: row.dislikes });
      });
  });
});

// ==========================
// Toggle DISLIKE para comentarios_temas
// ==========================
app.post("/api/comentarios/tema/:id/dislike", (req, res) => {
  const comentario_id = parseInt(req.params.id);
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ ok: false, error: "Usuario no identificado" });

  db.get(`SELECT type FROM comentario_temas_votes WHERE comentario_id=? AND user_id=?`,
    [comentario_id, user_id], (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });

      if (row && row.type === "dislike") {
        // Quitar dislike
        db.run(`DELETE FROM comentario_temas_votes WHERE comentario_id=? AND user_id=?`,
          [comentario_id, user_id]);
        db.run(`UPDATE comentarios_temas SET dislikes = dislikes - 1 WHERE id=?`, [comentario_id]);
      } else if (row && row.type === "like") {
        // Cambiar like a dislike
        db.run(`UPDATE comentario_temas_votes SET type='dislike' WHERE comentario_id=? AND user_id=?`,
          [comentario_id, user_id]);
        db.run(`UPDATE comentarios_temas SET dislikes = dislikes + 1, likes = likes - 1 WHERE id=?`, [comentario_id]);
      } else {
        // Nuevo dislike
        db.run(`INSERT INTO comentario_temas_votes (comentario_id,user_id,type) VALUES (?,?,?)`,
          [comentario_id, user_id, "dislike"]);
        db.run(`UPDATE comentarios_temas SET dislikes = dislikes + 1 WHERE id=?`, [comentario_id]);
      }

      db.get(`SELECT likes, dislikes FROM comentarios_temas WHERE id=?`, [comentario_id], (err, row) => {
        if (err) return res.status(500).json({ ok: false, error: err.message });
        res.json({ ok: true, likes: row.likes, dislikes: row.dislikes });
      });
  });
});


// ==========================
// POST: calificar juego
// ==========================
app.post("/api/juegos/:juego_id/calificar", (req, res) => {
    const { juego_id } = req.params;
    const { user_id, username, valor } = req.body;

    if (!juego_id || !user_id || !username || !valor) {
        return res.status(400).json({ ok: false, error: "Faltan datos" });
    }

    // Insertar o actualizar calificación
    db.run(
        `INSERT INTO calificaciones_juego (juego_id, user_id, username, valor) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(juego_id, user_id) DO UPDATE SET valor = excluded.valor`,
        [juego_id, user_id, username, valor],
        function(err) {
            if (err) return res.status(500).json({ ok: false, error: err.message });
            res.json({ ok: true });
        }
    );
});

// ==========================
// GET: calificaciones de un juego
// ==========================
app.get("/api/juegos/:juego_id/calificaciones", (req, res) => {
    const { juego_id } = req.params;

    db.all(`SELECT valor FROM calificaciones_juego WHERE juego_id = ?`, [juego_id], (err, rows) => {
        if (err) return res.status(500).json({ ok: false, error: err.message });

        const total = rows.length;
        const promedio = total ? rows.reduce((acc, r) => acc + r.valor, 0) / total : 0;

        res.json({ ok: true, promedio, total });
    });
});





app.get("/api/juegos/:juego_id/calificaciones", (req, res) => {
    const { juego_id } = req.params;

    db.all(
        `SELECT user_id, username, valor 
         FROM calificaciones_juego 
         WHERE juego_id = ?`,
        [juego_id],
        (err, rows) => {
            if (err) return res.status(500).json({ ok: false, error: err.message });

            const total = rows.length;
            const promedio = total ? rows.reduce((acc, r) => acc + r.valor, 0) / total : 0;

            res.json({
                ok: true,
                juego_id,
                promedio,
                total,
                calificaciones: rows
            });
        }
    );
});

app.get("/api/juegos/:juegoId/estadisticas", (req, res) => {
  const { juegoId } = req.params;

  db.get(
    `SELECT visitas, descargas, seguidores
     FROM estadisticas_juego
     WHERE juego_id = ?`,
    [juegoId],
    (err, stats) => {
      if (err) return res.status(500).json({ ok: false, error: "Error DB" });

      db.get(
        `SELECT AVG(valor) as calificacion_promedio, COUNT(*) as total_votos
         FROM calificaciones_juego
         WHERE juego_id = ?`,
        [juegoId],
        (err2, calif) => {
          if (err2) return res.status(500).json({ ok: false, error: "Error DB" });

          res.json({
            ok: true,
            estadisticas: {
              visitas: stats?.visitas || 0,
              descargas: stats?.descargas || 0,
              seguidores: stats?.seguidores || 0,
              calificacion_promedio: calif?.calificacion_promedio || 0,
              total_votos: calif?.total_votos || 0
            }
          });
        }
      );
    }
  );
});



// ==========================
// Seguir usuario
// ==========================
app.post("/api/seguir", async (req, res) => {
  const { user_id, seguido_id } = req.body;

  if (!user_id || !seguido_id) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }

  try {
    // Verificar que ambos usuarios existen
    const usuarios = await allAsync(
      "SELECT id FROM usuarios WHERE id IN (?, ?)",
      [user_id, seguido_id]
    );

    if (usuarios.length < 2) {
      return res.status(400).json({ ok: false, error: "Usuario no encontrado" });
    }

    // Insertar si no existe
    await runAsync(
      "INSERT OR IGNORE INTO seguidores (user_id, seguido_id) VALUES (?, ?)",
      [user_id, seguido_id]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("Error en BD:", err);
    res.status(500).json({ ok: false, error: "Error de base de datos" });
  }
});

// ==========================
// Listar seguidos de un usuario
// ==========================
app.get("/api/seguidos/:user_id", (req, res) => {
  const { user_id } = req.params;

  db.all(
    `SELECT u.id, u.username
     FROM seguidores s
     JOIN usuarios u ON s.seguido_id = u.id
     WHERE s.user_id = ?`,
    [user_id],
    (err, rows) => {
      if (err) {
        console.error("Error consultando seguidos:", err);
        return res.status(500).json({ ok: false, error: "Error en el servidor" });
      }

      res.json({ ok: true, seguidos: rows });
    }
  );
});





// ==========================
// ENDPOINTS PARA MÚSICA
// ==========================

// Subir música (guardar enlace MediaFire)
app.post('/api/music/upload', (req, res) => {
    const { user_id, track_name, file_path, artist, album, genre, duration, bitrate, description } = req.body;

    if (!user_id || !file_path) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const sql = `
        INSERT INTO music_files (user_id, track_name, file_path, artist, album, genre, duration, bitrate, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [user_id, track_name, file_path, artist || null, album || null, genre || null, duration || null, bitrate || null, description || null], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ id: this.lastID });
    });
});

// Listar todas las canciones
app.get('/api/music/list', (req, res) => {
    const sql = `SELECT * FROM music_files WHERE status = 'active' ORDER BY date_uploaded DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

// Descargar canción (redirigir al enlace MediaFire)
app.get('/api/music/download/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT file_path FROM music_files WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!row) return res.status(404).json({ message: 'Canción no encontrada' });
        res.redirect(row.file_path); // redirige al enlace MediaFire
    });
});

// ==================== ENDPOINT: Subir enlace de código ====================
app.post('/api/code/upload', (req, res) => {
    const { user_id, file_name, file_path, file_type, description } = req.body;

    if (!user_id || !file_path) {
        return res.status(400).json({ message: 'user_id y file_path son obligatorios.' });
    }

    const sql = `INSERT INTO code_files (user_id, file_name, file_path, file_type, description)
                 VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [user_id, file_name, file_path, file_type, description], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Archivo agregado correctamente', id: this.lastID });
    });
});

// ==================== ENDPOINT: Listar todos los códigos ====================
app.get('/api/code/list', (req, res) => {
    const sql = `SELECT * FROM code_files WHERE status='active' ORDER BY date_uploaded DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

// ==================== ENDPOINT: Descargar/Redirigir enlace ====================
app.get('/api/code/download/:id', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT file_name, file_path FROM code_files WHERE id = ? AND status='active'`;
    db.get(sql, [id], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!row) return res.status(404).json({ message: 'Archivo no encontrado' });
        // Redirigir al enlace de MediaFire
        res.redirect(row.file_path);
    });
});

// ==================== ENDPOINT: Desactivar/Eliminar archivo ====================
app.delete('/api/code/:id', (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE code_files SET status='inactive' WHERE id=?`;
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Archivo desactivado correctamente' });
    });
});




// ==================== ENDPOINT: Listar todos los archivos ====================
app.get('/api/code/list', (req, res) => {
    const sql = `SELECT id, file_name, file_path FROM code_files WHERE status='active' ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});

// ==================== ENDPOINT: Buscar archivo por file_name ====================
app.get('/api/code/search', (req, res) => {
    const { q } = req.query; // Ejemplo: /api/code/search?q=nombreArchivo
    if (!q) return res.status(400).json({ message: 'Falta parámetro de búsqueda' });

    const sql = `
        SELECT id, file_name, file_path
        FROM code_files
        WHERE status='active' AND file_name LIKE ?
        ORDER BY id DESC
    `;
    db.all(sql, [`%${q}%`], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
});





app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("/index.html");

  // Intercambiar code por token
  const params = new URLSearchParams();
  params.append("client_id", "TU_CLIENT_ID");
  params.append("client_secret", "TU_CLIENT_SECRET");
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:3001/auth/discord/callback");

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Obtener info del usuario
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const userData = await userRes.json();

  // Guardar datos en sessionStorage vía query params (simple)
  res.redirect(`/index.html?username=${encodeURIComponent(userData.username)}&avatar=${encodeURIComponent(userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : "")}`);
});





// Endpoint para iniciar conexión
app.get("/stripe/connect", (req, res) => {
  const state = Math.random().toString(36).substring(2, 15); // CSRF protection
  req.session.stripeState = state;

  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.STRIPE_CLIENT_ID); 
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", "http://localhost:3001/stripe/callback");

  res.redirect(url.toString());
});

// Callback de Stripe
app.get("/stripe/callback", async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.session.stripeState) return res.send("Estado inválido, posible CSRF.");

  try {
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code: code,
    });

    // Aquí tienes el stripe_user_id del desarrollador
    const connectedAccountId = response.stripe_user_id;

    res.send(`Cuenta Stripe conectada: ${connectedAccountId}`);
  } catch (err) {
    console.error(err);
    res.send("Error al conectar Stripe");
  }
});






app.post('/api/cargar-sqlite', (req, res) => {
  const form = formidable({ multiples: false });

  form.parse(req, (err, fields, files) => {
    if(err) return res.json({ ok: false, error: err.message });
    if(!files.db) return res.json({ ok: false, error: "No se recibió archivo" });

    const dbFile = files.db.filepath; // ruta temporal
    const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, (err) => {
      if(err) return res.json({ ok:false, error: err.message });

      db.all("SELECT id, title, main_genre, price, user_id FROM juegos", (err, rows) => {
        if(err) return res.json({ ok:false, error: err.message });
        res.json({ ok:true, juegos: rows });

        // opcional: borrar archivo temporal
        fs.unlink(dbFile, ()=>{});
      });
    });
  });
});





// =======================
// INICIAR SERVIDOR
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
