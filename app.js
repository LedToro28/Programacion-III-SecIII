const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Configuración para Render
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_seguro_ecommerce_2024';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ruta de la base de datos - Ajustada para Render
let dbPath;
if (NODE_ENV === 'production') {
    // En Render, usar ruta absoluta en /tmp para persistencia temporal
    dbPath = '/tmp/database.db';
} else {
    dbPath = path.join(__dirname, 'database.db');
}

console.log(`🟢 Entorno: ${NODE_ENV}`);
console.log(`📁 Ruta BD: ${dbPath}`);

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
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

// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de CORS para producción
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware de logging mejorado
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// Middleware para verificar token
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(403).json({ error: 'Token requerido' });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(401).json({ error: 'Token inválido' });
        }
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
            console.log('👑 Usuario admin creado');
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
            console.log('👤 Usuario normal creado');
        }
        
        // Verificar si existen productos de ejemplo
        const productosCount = await dbHelpers.get(
            "SELECT COUNT(*) as count FROM productos"
        );
        
        if (productosCount.count === 0) {
            const productosEjemplo = [
                ['Camisa Casual', 'CAM-001', 29.99, 'Camisa de algodón 100% casual para el día a día', 'camisas', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Pantalón Jeans', 'PAN-001', 49.99, 'Jeans clásicos azules de alta calidad', 'pantalones', 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Zapatos Deportivos', 'ZAP-001', 79.99, 'Zapatos deportivos para running y entrenamiento', 'zapatos', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Hoodie Básico', 'HOO-001', 39.99, 'Hoodie cómodo y cálido para el frío', 'hoodies', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com'],
                ['Gafas de Sol', 'ACC-001', 24.99, 'Gafas de sol con protección UV 400', 'accesorios', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', 'admin@test.com']
            ];
            
            for (const producto of productosEjemplo) {
                await dbHelpers.run(
                    'INSERT INTO productos (nombre, codigo, precio, descripcion, categoria, imagen_url, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    producto
                );
            }
            console.log(`📦 ${productosEjemplo.length} productos de ejemplo insertados`);
        }
        
        console.log('✅ Todas las tablas verificadas correctamente');
        
    } catch (error) {
        console.error('❌ Error al verificar tablas:', error.message);
        throw error;
    }
}

// --- RUTAS DE API ---

// Ruta de salud para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: dbPath 
    });
});

// ... [TODAS LAS RUTAS RESTANTES SE MANTIENEN IGUAL] ...
// (Login, registro, productos, carrito, pedidos - exactamente igual que en tu archivo original)

// --- RUTAS PARA SERVIR HTML ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para usuarios normales
app.get('/usuario', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuario.html'));
});

// Ruta para administradores
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ruta de compatibilidad
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

// Ruta 404 para API
app.use('/api/*', (req, res) => {
    console.log(`❌ Ruta API no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ error: "Ruta API no encontrada" });
});

// Ruta 404 para HTML
app.use((req, res) => {
    console.log(`❌ Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('💥 Error no manejado:', err.message);
    console.error(err.stack);
    
    if (req.url.startsWith('/api')) {
        res.status(500).json({ 
            error: "Error interno del servidor",
            message: NODE_ENV === 'development' ? err.message : 'Error interno'
        });
    } else {
        res.status(500).send(`
            <html>
                <head><title>Error 500</title></head>
                <body>
                    <h1>Error 500 - Error interno del servidor</h1>
                    <p>${NODE_ENV === 'development' ? err.message : 'Por favor, intenta más tarde.'}</p>
                    <a href="/">Volver al inicio</a>
                </body>
            </html>
        `);
    }
});

// --- INICIAR SERVIDOR ---
async function startServer() {
    try {
        // Verificar y crear tablas
        await verificarYEstructurarTablas();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════╗
║    🚀 E-commerce App - ${NODE_ENV.toUpperCase()}        ║
║    👉 URL: http://localhost:${PORT}              ║
║    📁 Base de datos: ${dbPath}        ║
║    🕒 ${new Date().toLocaleString()}          ║
╚══════════════════════════════════════════╝
            `);
        });
        
    } catch (error) {
        console.error('💀 Error crítico al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Manejar señales de terminación
process.on('SIGTERM', () => {
    console.log('📴 Recibida señal SIGTERM, cerrando servidor...');
    db.close();
    process.exit(0);
});

// Iniciar el servidor
startServer();