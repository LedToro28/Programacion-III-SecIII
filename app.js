const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'secreto_evaluacion_ecommerce';

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// BASES DE DATOS TEMPORALES
const users = [];
const productos = []; // Nueva base de datos para Fase 3

// --- RUTAS DE USUARIOS (Evaluación 2) ---

app.post('/api/register', async (req, res) => {
    try {
        const { nombre, email, password, nivel } = req.body;
        if (!nombre || !email || !password || !nivel) return res.status(400).json({ error: "Faltan datos" });
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ nombre, email, password: hashedPassword, nivel });
        res.status(201).json({ message: "Usuario registrado" });
    } catch (error) { res.status(500).json({ error: "Error en registro" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ email: user.email, nivel: user.nivel }, JWT_SECRET);
        // Devolvemos el nivel para que el frontend sepa si mostrar opciones de admin
        return res.json({ token, nivel: user.nivel }); 
    }
    res.status(401).json({ error: "Credenciales inválidas" });
});

// --- RUTAS DE PRODUCTOS (Evaluación 3) ---

// 1. Ver todos los productos (Acceso público)
app.get('/api/productos', (req, res) => {
    res.json(productos);
});

// 2. Buscar un producto por su código único
app.get('/api/productos/:codigo', (req, res) => {
    const producto = productos.find(p => p.codigo === req.params.codigo);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
});

// 3. Crear un producto (REQUISITO: Solo Admin y Precio > 0)
app.post('/api/productos', (req, res) => {
    const { nombre, codigo, precio, descripcion, nivelUsuario } = req.body;

    // Validación de seguridad: Solo nivel 'admin' [25 pts]
    if (nivelUsuario !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
    }

    // Validación de precio: Debe ser mayor a 0 [15 pts]
    if (!precio || precio <= 0) {
        return res.status(400).json({ error: "El precio debe ser un número mayor a 0" });
    }

    // Validación de campos obligatorios [60 pts por CRUD]
    if (!nombre || !codigo || !descripcion) {
        return res.status(400).json({ error: "Faltan datos (nombre, código o descripción)" });
    }

    // Verificar si el código ya existe para evitar duplicados
    const existe = productos.find(p => p.codigo === codigo);
    if (existe) return res.status(400).json({ error: "Ya existe un producto con ese código" });

    const nuevoProducto = { nombre, codigo, precio, descripcion };
    productos.push(nuevoProducto);

    res.status(201).json({ message: "Producto creado con éxito", producto: nuevoProducto });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`📦 Trabajando en rama: feature/productos`);
});