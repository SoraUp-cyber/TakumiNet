const express = require('express');
const router = express.Router();
const { createUser, findUser } = require('../models/User');

// Registro de usuario
router.post('/register', (req, res) => {
  const { username, email, password, preferences } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  // Verificar si ya existe el usuario
  findUser({ $or: [{ username }, { email }] }, (err, existingUser) => {
    if (err) return res.status(500).json({ mensaje: "Error interno" });

    if (existingUser) {
      return res.status(400).json({ mensaje: "El usuario o email ya existe" });
    }

    // Guardar usuario
    createUser({
      username,
      email,
      password, // Aquí puedes luego encriptar con bcrypt
      preferences,
      createdAt: new Date()
    }, (err, newUser) => {
      if (err) return res.status(500).json({ mensaje: "Error al registrar usuario" });
      res.json({
        mensaje: "Usuario registrado exitosamente",
        datos: { id: newUser._id, username: newUser.username, email: newUser.email }
      });
    });
  });
});

// Login de usuario
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  findUser({ username, password }, (err, user) => {
    if (err) return res.status(500).json({ mensaje: "Error interno" });

    if (!user) {
      return res.status(400).json({ mensaje: "Credenciales incorrectas" });
    }

    res.json({
      mensaje: "Inicio de sesión exitoso",
      datos: { id: user._id, username: user.username, email: user.email }
    });
  });
});

module.exports = router;
