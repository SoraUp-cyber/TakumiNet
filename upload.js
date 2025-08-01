const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const router = express.Router();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: 'tu_nombre',
  api_key: 'tu_api_key',
  api_secret: 'tu_api_secret'
});

// Configurar Multer (temporal local)
const upload = multer({ dest: 'temp/' });

// PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://usuario:password@localhost:5432/tu_bd'
});

router.post('/upload-game', upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'screenshots' },
  { name: 'game_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      genres,
      'main-genre': mainGenre,
      videoUrl,
      pricing,
      price
    } = req.body;

    // Subir portada
    const portada = await cloudinary.uploader.upload(req.files['cover'][0].path);
    const portadaUrl = portada.secure_url;

    // Subir capturas
    const screenshots = [];
    for (const img of req.files['screenshots']) {
      const result = await cloudinary.uploader.upload(img.path);
      screenshots.push(result.secure_url);
      fs.unlinkSync(img.path);
    }

    // Subir ZIP del juego
    const zipFile = req.files['game_file'][0];
    const zip = await cloudinary.uploader.upload(zipFile.path, {
      resource_type: "raw"
    });
    const zipUrl = zip.secure_url;
    fs.unlinkSync(zipFile.path);

    // Guardar en base de datos
    await pool.query(`
      INSERT INTO juegos (titulo, descripcion, categoria, genero, genero_principal, portada_url, screenshots, zip_url, video_url, precio, tipo_precio)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      title, description, category, genres, mainGenre,
      portadaUrl, JSON.stringify(screenshots), zipUrl, videoUrl,
      price || 0, pricing
    ]);

    res.send('Juego subido con éxito');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al subir el juego');
  }
});

module.exports = router;
