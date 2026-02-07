const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Conectar a la base de datos (se creará automáticamente si no existe)
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Crear tablas
db.serialize(async () => {
    console.log('🚀 Inicializando base de datos SQLite...');
    
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nivel TEXT NOT NULL CHECK (nivel IN ('admin', 'usuario')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabla de productos - ACTUALIZADA CON IMAGEN Y CATEGORÍA
    db.run(`CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        codigo TEXT UNIQUE NOT NULL,
        precio REAL NOT NULL CHECK (precio > 0),
        descripcion TEXT NOT NULL,
        categoria TEXT DEFAULT 'sin-categoria',
        imagen_url TEXT,
        creado_por TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creado_por) REFERENCES users(email)
    )`);
    
    // Tabla del carrito
    db.run(`CREATE TABLE IF NOT EXISTS carrito (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        producto_nombre TEXT NOT NULL,
        producto_codigo TEXT NOT NULL,
        producto_precio REAL NOT NULL,
        cantidad INTEGER DEFAULT 1,
        subtotal REAL GENERATED ALWAYS AS (producto_precio * cantidad) STORED,
        agregado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES users(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id),
        UNIQUE(usuario_id, producto_id)
    )`);
    
    console.log('✅ Tablas creadas exitosamente');
    
    // Crear usuario administrador por defecto si no existe
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    db.get(`SELECT * FROM users WHERE email = ?`, ['admin@test.com'], (err, row) => {
        if (err) {
            console.error('❌ Error al verificar usuario admin:', err.message);
            return;
        }
        
        if (!row) {
            db.run(`INSERT INTO users (nombre, email, password, nivel) VALUES (?, ?, ?, ?)`, 
                ['Administrador', 'admin@test.com', adminPassword, 'admin'], 
                function(err) {
                    if (err) {
                        console.error('❌ Error al crear usuario admin:', err.message);
                    } else {
                        console.log('✅ Usuario administrador creado: admin@test.com / admin123');
                    }
                }
            );
        } else {
            console.log('ℹ️  Usuario administrador ya existe');
        }
    });
    
    // Crear usuario normal por defecto si no existe
    const userPassword = await bcrypt.hash('usuario123', 10);
    
    db.get(`SELECT * FROM users WHERE email = ?`, ['usuario@test.com'], (err, row) => {
        if (err) {
            console.error('❌ Error al verificar usuario normal:', err.message);
            return;
        }
        
        if (!row) {
            db.run(`INSERT INTO users (nombre, email, password, nivel) VALUES (?, ?, ?, ?)`, 
                ['Usuario Normal', 'usuario@test.com', userPassword, 'usuario'], 
                function(err) {
                    if (err) {
                        console.error('❌ Error al crear usuario normal:', err.message);
                    } else {
                        console.log('✅ Usuario normal creado: usuario@test.com / usuario123');
                    }
                }
            );
        } else {
            console.log('ℹ️  Usuario normal ya existe');
        }
    });
    
    // Esperar un poco para que se creen los usuarios antes de insertar productos
    setTimeout(() => {
        // Insertar productos de ejemplo si no existen
        db.get(`SELECT COUNT(*) as count FROM productos`, (err, row) => {
            if (err) {
                console.error('❌ Error al contar productos:', err.message);
                return;
            }
            
            if (row.count === 0) {
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
                
                productosEjemplo.forEach((producto, index) => {
                    setTimeout(() => {
                        db.run(`INSERT INTO productos (nombre, codigo, precio, descripcion, categoria, imagen_url, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)`, producto, (err) => {
                            if (err) {
                                console.error(`❌ Error al insertar producto ${index + 1}:`, err.message);
                            } else if (index === productosEjemplo.length - 1) {
                                console.log(`✅ ${productosEjemplo.length} productos de ejemplo insertados`);
                                
                                // Después de insertar productos, agregar algunos al carrito
                                agregarEjemplosAlCarrito();
                            }
                        });
                    }, index * 200);
                });
            } else {
                console.log(`ℹ️  Ya existen ${row.count} productos en la base de datos`);
                agregarEjemplosAlCarrito();
            }
        });
    }, 500);
});

// Función para agregar ejemplos al carrito
function agregarEjemplosAlCarrito() {
    console.log('🛒 Verificando ejemplos en carrito...');
    
    db.get(`SELECT * FROM carrito LIMIT 1`, (err, row) => {
        if (err || !row) {
            // Insertar productos de ejemplo en carrito del usuario admin
            db.get(`SELECT id FROM users WHERE email = ?`, ['admin@test.com'], (err, admin) => {
                if (admin) {
                    // Primero obtener los IDs de los productos
                    db.all(`SELECT id, nombre, codigo, precio FROM productos WHERE codigo IN ('ZAP-001', 'NIK-543', 'PAT-6638')`, [], (err, productos) => {
                        if (err) {
                            console.error('❌ Error al obtener productos:', err.message);
                            return;
                        }
                        
                        if (productos.length > 0) {
                            const productosCarrito = productos.map(p => [
                                admin.id, 
                                p.id, 
                                p.nombre, 
                                p.codigo, 
                                p.precio, 
                                p.codigo === 'ZAP-001' ? 2 : 1
                            ]);
                            
                            productosCarrito.forEach((item, index) => {
                                setTimeout(() => {
                                    db.run(`INSERT OR IGNORE INTO carrito (usuario_id, producto_id, producto_nombre, producto_codigo, producto_precio, cantidad) 
                                            VALUES (?, ?, ?, ?, ?, ?)`, item, (err) => {
                                        if (err) {
                                            console.error(`❌ Error al insertar en carrito:`, err.message);
                                        } else if (index === productosCarrito.length - 1) {
                                            console.log(`✅ ${productosCarrito.length} productos de ejemplo agregados al carrito`);
                                        }
                                    });
                                }, index * 200);
                            });
                        } else {
                            console.log('ℹ️  No se encontraron productos para agregar al carrito');
                        }
                    });
                } else {
                    console.log('ℹ️  Usuario admin no encontrado para agregar ejemplos al carrito');
                }
            });
        } else {
            console.log('ℹ️  Carrito ya tiene productos');
        }
    });
}

db.close((err) => {
    if (err) {
        console.error('❌ Error al cerrar la base de datos:', err.message);
    } else {
        console.log('✅ Base de datos inicializada correctamente');
        console.log('📊 Archivo de base de datos: database.db');
        console.log('\n📋 Tablas creadas:');
        console.log('   - users (usuarios)');
        console.log('   - productos (con imagen_url y categoría)');
        console.log('   - carrito');
        console.log('\n🔑 Usuarios de prueba:');
        console.log('   admin@test.com / admin123');
        console.log('   usuario@test.com / usuario123');
        console.log('\n📦 Productos de ejemplo:');
        console.log('   9 productos insertados con imágenes y categorías');
    }
});