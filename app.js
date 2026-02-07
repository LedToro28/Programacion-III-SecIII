const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_seguro_ecommerce_2024';

// Ruta de la base de datos
const dbPath = path.join(__dirname, 'src', 'database.db');

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
        // Activar claves foráneas
        db.run('PRAGMA foreign_keys = ON');
    }
});

// Funciones auxiliares para la base de datos
const dbHelpers = {
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    },
    
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },
    
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
};

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware para verificar token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Token requerido' });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
}

// --- VERIFICACIÓN DE TABLAS ---
async function verificarYEstructurarTablas() {
    try {
        console.log('🔍 Verificando estructura de tablas...');
        
        // Verificar/Crear tabla users
        await dbHelpers.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nivel TEXT NOT NULL CHECK (nivel IN ('admin', 'usuario')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar/Crear tabla productos
        await dbHelpers.run(`
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                codigo TEXT UNIQUE NOT NULL,
                precio REAL NOT NULL CHECK (precio > 0),
                descripcion TEXT NOT NULL,
                categoria TEXT DEFAULT 'sin-categoria',
                imagen_url TEXT,
                creado_por TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar/Crear tabla carrito
        await dbHelpers.run(`
            CREATE TABLE IF NOT EXISTS carrito (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar/Crear tabla pedidos
        await dbHelpers.run(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                estado VARCHAR(20) DEFAULT 'pendiente'
            )
        `);
        
        // Verificar/Crear tabla pedido_items
        await dbHelpers.run(`
            CREATE TABLE IF NOT EXISTS pedido_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL
            )
        `);
        
        // Insertar usuario admin por defecto si no existe
        const adminExists = await dbHelpers.get(
            "SELECT * FROM users WHERE email = 'admin@test.com'"
        );
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await dbHelpers.run(
                'INSERT INTO users (nombre, email, password, nivel) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin@test.com', hashedPassword, 'admin']
            );
            console.log('Usuario admin creado');
        }
        
        // Insertar usuario normal por defecto si no existe
        const userExists = await dbHelpers.get(
            "SELECT * FROM users WHERE email = 'usuario@test.com'"
        );
        
        if (!userExists) {
            const hashedPassword = await bcrypt.hash('usuario123', 10);
            await dbHelpers.run(
                'INSERT INTO users (nombre, email, password, nivel) VALUES (?, ?, ?, ?)',
                ['Usuario Normal', 'usuario@test.com', hashedPassword, 'usuario']
            );
            console.log('Usuario normal creado');
        }
        
        // Verificar si existen productos de ejemplo, si no, insertarlos
        const productosCount = await dbHelpers.get(
            "SELECT COUNT(*) as count FROM productos"
        );
        
        if (productosCount.count === 0) {
            const productosEjemplo = [
                ['Camisa Casual', 'CAM-001', 29.99, 'Camisa de algodón 100% casual para el día a día', 'camisas', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Pantalón Jeans', 'PAN-001', 49.99, 'Jeans clásicos azules de alta calidad', 'pantalones', 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Zapatos Deportivos', 'ZAP-001', 79.99, 'Zapatos deportivos para running y entrenamiento', 'zapatos', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Hoodie Básico', 'HOO-001', 39.99, 'Hoodie cómodo y cálido para el frío', 'hoodies', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Gafas de Sol', 'ACC-001', 24.99, 'Gafas de sol con protección UV 400', 'accesorios', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Camisa Formal', 'CAM-002', 39.99, 'Camisa formal para ocasiones especiales', 'camisas', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Zapatos de Vestir', 'ZAP-002', 89.99, 'Zapatos elegantes para ocasiones formales', 'zapatos', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Zapatos Nike Green', 'NIK-543', 99.99, 'Zapatos de alta calidad Nike color verde militar', 'zapatos', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Zapatos Deportivos AAA', 'PAT-6638', 69.99, 'Zapatos deportivos clase AAA', 'zapatos', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com']
            ];
            
            for (const producto of productosEjemplo) {
                await dbHelpers.run(
                    'INSERT INTO productos (nombre, codigo, precio, descripcion, categoria, imagen_url, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    producto
                );
            }
            console.log(`${productosEjemplo.length} productos de ejemplo insertados`);
        }
        
        console.log('Todas las tablas verificadas correctamente');
        
    } catch (error) {
        console.error('Error al verificar tablas:', error.message);
        throw error;
    }
}

// --- RUTAS DE USUARIO ---
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Email inválido" });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
        }
        
        const usuarioExistente = await dbHelpers.get(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (usuarioExistente) {
            return res.status(400).json({ error: "El email ya está registrado" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await dbHelpers.run(
            'INSERT INTO users (nombre, email, password, nivel) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, 'usuario']
        );
        
        console.log(`Usuario registrado: ${email} (usuario)`);
        
        res.status(201).json({ 
            message: "Usuario registrado con éxito",
            user: { 
                nombre, 
                email, 
                nivel: 'usuario'
            }
        });
    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: "Email y contraseña son requeridos" });
        }
        
        const user = await dbHelpers.get(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (!user) {
            console.log(`Intento de login fallido: Email no encontrado - ${email}`);
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Intento de login fallido: Contraseña incorrecta - ${email}`);
            return res.status(400).json({ error: "Contraseña incorrecta" });
        }
        
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email, 
                nivel: user.nivel,
                nombre: user.nombre 
            }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        console.log(`Login exitoso: ${user.email} (${user.nivel})`);
        res.json({ 
            token, 
            nivel: user.nivel,
            nombre: user.nombre,
            email: user.email
        });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// --- RUTAS DE PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await dbHelpers.all(
            'SELECT * FROM productos ORDER BY created_at DESC'
        );
        console.log(`Productos obtenidos: ${productos.length} registros`);
        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error.message);
        res.status(500).json({ error: "Error al obtener productos" });
    }
});

app.get('/api/productos/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        console.log(`Buscando producto con código: ${codigo}`);
        
        const producto = await dbHelpers.get(
            'SELECT * FROM productos WHERE codigo = ?',
            [codigo]
        );
        
        if (!producto) {
            console.log(`Producto no encontrado: ${codigo}`);
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        
        console.log(`Producto encontrado: ${producto.nombre}`);
        res.json(producto);
    } catch (error) {
        console.error('Error al buscar producto:', error.message);
        res.status(500).json({ error: "Error al buscar producto" });
    }
});

app.post('/api/productos', verifyToken, async (req, res) => {
    try {
        if (req.user.nivel !== 'admin') {
            console.log(`Acceso denegado: ${req.user.email} intentó crear producto sin permisos de admin`);
            return res.status(403).json({ 
                error: "Acceso denegado. Se requieren permisos de administrador." 
            });
        }
        
        const { nombre, codigo, precio, descripcion, categoria, imagen_url } = req.body;
        
        if (!nombre || !codigo || !precio || !descripcion) {
            return res.status(400).json({ 
                error: "Faltan datos (nombre, código, precio o descripción)" 
            });
        }
        
        if (precio <= 0 || isNaN(precio)) {
            return res.status(400).json({ 
                error: "El precio debe ser un número mayor a 0" 
            });
        }
        
        const existe = await dbHelpers.get(
            'SELECT * FROM productos WHERE codigo = ?',
            [codigo]
        );
        
        if (existe) {
            return res.status(400).json({ 
                error: "Ya existe un producto con ese código" 
            });
        }
        
        await dbHelpers.run(
            'INSERT INTO productos (nombre, codigo, precio, descripcion, categoria, imagen_url, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, codigo, parseFloat(precio), descripcion, categoria || 'sin-categoria', imagen_url, req.user.email]
        );
        
        const nuevoProducto = await dbHelpers.get(
            'SELECT * FROM productos WHERE codigo = ?',
            [codigo]
        );
        
        console.log(`Producto creado por ${req.user.email}: ${nombre} (${codigo}) - $${precio}`);
        res.status(201).json({ 
            message: "Producto creado con éxito", 
            producto: nuevoProducto 
        });
    } catch (error) {
        console.error('Error al crear producto:', error.message);
        res.status(500).json({ error: "Error al crear producto" });
    }
});

app.put('/api/productos/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.nivel !== 'admin') {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        
        const { id } = req.params;
        const { nombre, precio, descripcion, categoria, imagen_url } = req.body;
        
        const productoExistente = await dbHelpers.get(
            'SELECT * FROM productos WHERE id = ?',
            [id]
        );
        
        if (!productoExistente) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        
        if (precio && precio <= 0) {
            return res.status(400).json({ error: "Precio debe ser mayor a 0" });
        }
        
        await dbHelpers.run(
            'UPDATE productos SET nombre = ?, precio = ?, descripcion = ?, categoria = ?, imagen_url = ? WHERE id = ?',
            [nombre, precio, descripcion, categoria, imagen_url, id]
        );
        
        console.log(`Producto actualizado ID ${id} por ${req.user.email}`);
        res.json({ message: "Producto actualizado" });
    } catch (error) {
        console.error('Error al actualizar producto:', error.message);
        res.status(500).json({ error: "Error al actualizar producto" });
    }
});

app.delete('/api/productos/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.nivel !== 'admin') {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        
        const { id } = req.params;
        
        const productoExistente = await dbHelpers.get(
            'SELECT * FROM productos WHERE id = ?',
            [id]
        );
        
        if (!productoExistente) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        
        await dbHelpers.run(
            'DELETE FROM productos WHERE id = ?',
            [id]
        );
        
        console.log(`Producto eliminado ID ${id} por ${req.user.email}`);
        res.json({ message: "Producto eliminado" });
    } catch (error) {
        console.error('Error al eliminar producto:', error.message);
        res.status(500).json({ error: "Error al eliminar producto" });
    }
});

// --- RUTAS DEL CARRITO ---
app.get('/api/carrito', verifyToken, async (req, res) => {
    try {
        const carrito = await dbHelpers.all(
            `SELECT c.*, p.nombre, p.precio, p.codigo, p.imagen_url, p.categoria, (c.cantidad * p.precio) as subtotal 
             FROM carrito c 
             JOIN productos p ON c.producto_id = p.id 
             WHERE c.user_id = ?`,
            [req.user.id]
        );
        
        let total = 0;
        carrito.forEach(item => {
            total += item.subtotal;
        });
        
        console.log(`Carrito obtenido para ${req.user.email}: ${carrito.length} items`);
        res.json({ carrito, total: total.toFixed(2) });
    } catch (error) {
        console.error('Error al obtener carrito:', error.message);
        res.status(500).json({ error: "Error al obtener carrito" });
    }
});

app.get('/api/carrito/resumen', verifyToken, async (req, res) => {
    try {
        const carrito = await dbHelpers.all(
            `SELECT c.*, p.nombre, p.precio, p.codigo, p.imagen_url, p.categoria
             FROM carrito c 
             JOIN productos p ON c.producto_id = p.id 
             WHERE c.user_id = ?`,
            [req.user.id]
        );
        
        console.log(`Resumen carrito para ${req.user.email}: ${carrito.length} items`);
        res.json({ carrito });
    } catch (error) {
        console.error('❌ Error al obtener resumen:', error.message);
        res.status(500).json({ error: "Error al obtener resumen" });
    }
});

app.post('/api/carrito', verifyToken, async (req, res) => {
    try {
        const { producto_id, cantidad = 1 } = req.body;
        
        if (!producto_id) {
            return res.status(400).json({ error: "Producto ID es requerido" });
        }
        
        if (cantidad <= 0) {
            return res.status(400).json({ error: "La cantidad debe ser mayor a 0" });
        }
        
        const producto = await dbHelpers.get(
            'SELECT * FROM productos WHERE id = ?',
            [producto_id]
        );
        
        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        
        const itemExistente = await dbHelpers.get(
            'SELECT * FROM carrito WHERE user_id = ? AND producto_id = ?',
            [req.user.id, producto_id]
        );
        
        if (itemExistente) {
            const nuevaCantidad = itemExistente.cantidad + cantidad;
            await dbHelpers.run(
                'UPDATE carrito SET cantidad = ? WHERE id = ?',
                [nuevaCantidad, itemExistente.id]
            );
            
            console.log(`Cantidad actualizada: ${producto.nombre} (${nuevaCantidad})`);
            res.json({ 
                message: "Producto actualizado en el carrito", 
                producto: producto.nombre,
                cantidad: nuevaCantidad 
            });
        } else {
            await dbHelpers.run(
                'INSERT INTO carrito (user_id, producto_id, cantidad) VALUES (?, ?, ?)',
                [req.user.id, producto_id, cantidad]
            );
            
            console.log(`Producto agregado al carrito: ${producto.nombre} (${cantidad})`);
            res.status(201).json({ 
                message: "Producto agregado al carrito", 
                producto: producto.nombre,
                cantidad 
            });
        }
    } catch (error) {
        console.error('Error al agregar al carrito:', error.message);
        res.status(500).json({ error: "Error al agregar al carrito" });
    }
});

app.post('/api/carrito/agregar', verifyToken, async (req, res) => {
    try {
        const { producto_id, cantidad = 1 } = req.body;
        
        if (!producto_id) {
            return res.status(400).json({ error: "Producto ID es requerido" });
        }
        
        if (cantidad <= 0) {
            return res.status(400).json({ error: "La cantidad debe ser mayor a 0" });
        }
        
        const producto = await dbHelpers.get(
            'SELECT * FROM productos WHERE id = ?',
            [producto_id]
        );
        
        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        
        const itemExistente = await dbHelpers.get(
            'SELECT * FROM carrito WHERE user_id = ? AND producto_id = ?',
            [req.user.id, producto_id]
        );
        
        if (itemExistente) {
            const nuevaCantidad = itemExistente.cantidad + cantidad;
            await dbHelpers.run(
                'UPDATE carrito SET cantidad = ? WHERE id = ?',
                [nuevaCantidad, itemExistente.id]
            );
            
            console.log(`Cantidad actualizada: ${producto.nombre} (${nuevaCantidad})`);
            res.json({ 
                message: "Producto actualizado en el carrito", 
                producto: producto.nombre,
                cantidad: nuevaCantidad 
            });
        } else {
            await dbHelpers.run(
                'INSERT INTO carrito (user_id, producto_id, cantidad) VALUES (?, ?, ?)',
                [req.user.id, producto_id, cantidad]
            );
            
            console.log(`Producto agregado al carrito: ${producto.nombre} (${cantidad})`);
            res.status(201).json({ 
                message: "Producto agregado al carrito", 
                producto: producto.nombre,
                cantidad 
            });
        }
    } catch (error) {
        console.error('Error al agregar al carrito:', error.message);
        res.status(500).json({ error: "Error al agregar al carrito" });
    }
});

app.put('/api/carrito/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;
        
        if (!cantidad || cantidad <= 0) {
            return res.status(400).json({ error: "Cantidad debe ser mayor a 0" });
        }
        
        const item = await dbHelpers.get(
            'SELECT c.*, p.nombre FROM carrito c JOIN productos p ON c.producto_id = p.id WHERE c.id = ? AND c.user_id = ?',
            [id, req.user.id]
        );
        
        if (!item) {
            return res.status(404).json({ error: "Item no encontrado en el carrito" });
        }
        
        await dbHelpers.run(
            'UPDATE carrito SET cantidad = ? WHERE id = ?',
            [cantidad, id]
        );
        
        console.log(`Cantidad actualizada: ${item.nombre} a ${cantidad}`);
        res.json({ 
            message: "Cantidad actualizada",
            producto: item.nombre,
            cantidad 
        });
    } catch (error) {
        console.error('Error al actualizar carrito:', error.message);
        res.status(500).json({ error: "Error al actualizar carrito" });
    }
});

app.delete('/api/carrito/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await dbHelpers.get(
            'SELECT c.*, p.nombre FROM carrito c JOIN productos p ON c.producto_id = p.id WHERE c.id = ? AND c.user_id = ?',
            [id, req.user.id]
        );
        
        if (!item) {
            return res.status(404).json({ error: "Item no encontrado en el carrito" });
        }
        
        await dbHelpers.run('DELETE FROM carrito WHERE id = ?', [id]);
        
        console.log(`Producto eliminado del carrito: ${item.nombre}`);
        res.json({ 
            message: "Producto eliminado del carrito",
            producto: item.nombre 
        });
    } catch (error) {
        console.error('Error al eliminar del carrito:', error.message);
        res.status(500).json({ error: "Error al eliminar del carrito" });
    }
});

app.delete('/api/carrito', verifyToken, async (req, res) => {
    try {
        await dbHelpers.run(
            'DELETE FROM carrito WHERE user_id = ?',
            [req.user.id]
        );
        
        console.log(`Carrito vaciado para ${req.user.email}`);
        res.json({ message: "Carrito vaciado correctamente" });
    } catch (error) {
        console.error('Error al vaciar carrito:', error.message);
        res.status(500).json({ error: "Error al vaciar carrito" });
    }
});

app.post('/api/carrito/checkout', verifyToken, async (req, res) => {
    try {
        const carrito = await dbHelpers.all(
            `SELECT c.*, p.nombre, p.precio, p.codigo 
             FROM carrito c 
             JOIN productos p ON c.producto_id = p.id 
             WHERE c.user_id = ?`,
            [req.user.id]
        );
        
        if (carrito.length === 0) {
            return res.status(400).json({ error: "El carrito está vacío" });
        }
        
        let total = 0;
        carrito.forEach(item => {
            total += item.cantidad * item.precio;
        });
        
        const fechaPedido = new Date().toISOString();
        const resultado = await dbHelpers.run(
            'INSERT INTO pedidos (user_id, total, fecha, estado) VALUES (?, ?, ?, ?)',
            [req.user.id, total.toFixed(2), fechaPedido, 'pendiente']
        );
        
        const pedidoId = resultado.lastID;
        
        for (const item of carrito) {
            await dbHelpers.run(
                'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [pedidoId, item.producto_id, item.cantidad, item.precio]
            );
        }
        
        await dbHelpers.run('DELETE FROM carrito WHERE user_id = ?', [req.user.id]);
        
        console.log(`Pedido procesado #${pedidoId} para ${req.user.email} - Total: $${total.toFixed(2)}`);
        
        res.json({ 
            message: "Compra realizada con éxito", 
            pedido: {
                id: pedidoId,
                total: total.toFixed(2),
                fecha: fechaPedido,
                items: carrito.length
            }
        });
    } catch (error) {
        console.error('Error en checkout:', error.message);
        res.status(500).json({ error: "Error al procesar la compra" });
    }
});

// --- RUTAS DE PEDIDOS ---
app.get('/api/pedidos', verifyToken, async (req, res) => {
    try {
        const pedidos = await dbHelpers.all(
            'SELECT * FROM pedidos WHERE user_id = ? ORDER BY fecha DESC',
            [req.user.id]
        );
        
        console.log(`Historial de pedidos obtenido para ${req.user.email}: ${pedidos.length} pedidos`);
        res.json(pedidos);
    } catch (error) {
        console.error('Error al obtener pedidos:', error.message);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
});

app.get('/api/pedidos/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const pedido = await dbHelpers.get(
            'SELECT * FROM pedidos WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (!pedido) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }
        
        const items = await dbHelpers.all(
            `SELECT pi.*, p.nombre, p.codigo 
             FROM pedido_items pi 
             JOIN productos p ON pi.producto_id = p.id 
             WHERE pi.pedido_id = ?`,
            [id]
        );
        
        console.log(`Detalles del pedido #${id} obtenidos`);
        res.json({ pedido, items });
    } catch (error) {
        console.error('Error al obtener detalles del pedido:', error.message);
        res.status(500).json({ error: "Error al obtener detalles del pedido" });
    }
});

// --- RUTAS PARA SERVIR HTML ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para usuarios normales (nueva vista)
app.get('/usuario', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuario.html'));
});

// Ruta para administradores (nueva vista)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ruta de compatibilidad: redirige a la vista de usuario
app.get('/productos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuario.html'));
});

// RUTAS DE COMPATIBILIDAD PARA ENLACES ANTIGUOS
app.get('/productos.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuario.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/usuario.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuario.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/carrito', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'carrito.html'));
});

app.get('/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pedidos.html'));
});

// Ruta 404
app.use((req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: "Error interno del servidor" });
});

// --- INICIAR SERVIDOR ---
async function startServer() {
    try {
        // Verificar y crear tablas
        await verificarYEstructurarTablas();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`Servidor listo en http://localhost:${PORT}`);
        });
        
    } catch (error) {
        console.error('Error crítico al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Manejar señales de terminación
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM, cerrando servidor...');
    db.close();
    process.exit(0);
});

// Iniciar el servidor
startServer();