const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

router.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario.toUpperCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign({ id: user.id, nombre: user.nombre }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, nombre: user.nombre });
});

module.exports = router;
