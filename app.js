const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'secreto_evaluacion_ecommerce';

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const users = [];

app.post('/api/register', async (req, res) => {
    try {
        const { nombre, email, password, nivel } = req.body;

        if (!nombre || !email || !password || !nivel) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const usuarioExistente = users.find(u => u.email === email);
        if (usuarioExistente) {
            return res.status(400).json({ error: "El correo ya está registrado" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = { 
            nombre, 
            email, 
            password: hashedPassword, 
            nivel 
        };
        users.push(nuevoUsuario);

        res.status(201).json({ message: "Usuario registrado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor durante el registro" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email y contraseña requeridos" });
        }

        const usuario = users.find(u => u.email === email);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const esValida = await bcrypt.compare(password, usuario.password);
        if (!esValida) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        const token = jwt.sign(
            { email: usuario.email, nivel: usuario.nivel }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.json({ 
            message: "Login exitoso", 
            token: token 
        });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor durante el login" });
    }
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en http://localhost:${PORT}");
});