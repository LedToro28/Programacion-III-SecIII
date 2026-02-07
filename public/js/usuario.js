// usuario.js - Lógica de la página de productos para usuarios
import { obtenerDatosUsuario, cerrarSesion } from './auth.js';

let token, productos = [];
let categoriaActual = 'todos';

// Función para mostrar toast notifications
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.className = `toast ${tipo} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Función para mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const spinner = document.getElementById('loadingSpinner');
    if (mostrar) {
        spinner.classList.add('show');
    } else {
        spinner.classList.remove('show');
    }
}

// Función para agregar producto al carrito
async function agregarAlCarrito(productoId, productoNombre) {
    try {
        const res = await fetch('/api/carrito/agregar', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ producto_id: productoId, cantidad: 1 })
        });

        const result = await res.json();
        if (res.ok) {
            mostrarToast(`✅ ${productoNombre} agregado al carrito`, 'success');
            actualizarResumenCarrito();
        } else {
            mostrarToast(result.error || "Error al agregar al carrito", 'error');
        }
    } catch (error) {
        console.error('Error al agregar al carrito:', error);
        mostrarToast("Error de conexión con el servidor", 'error');
    }
}

// Función para actualizar resumen del carrito
async function actualizarResumenCarrito() {
    try {
        const res = await fetch('/api/carrito/resumen', {
            method: 'GET',
            headers: { 
                'Authorization': token
            }
        });
        
        if (res.ok) {
            const data = await res.json();
            const contador = document.getElementById('cartCounter');
            if (contador) {
                contador.textContent = data.carrito ? data.carrito.length : 0;
            }
        }
    } catch (error) {
        console.error('Error al obtener resumen:', error);
    }
}

// Función para cargar productos
async function cargarProductos() {
    mostrarLoading(true);
    try {
        const res = await fetch('/api/productos');
        productos = await res.json();
        
        if (productos.length === 0) {
            mostrarProductosVacios();
            return;
        }
        
        // Actualizar contador de productos
        document.getElementById('totalProducts').textContent = productos.length;
        
        // Renderizar productos
        renderizarProductos();
        
        // Mostrar la sección actual
        mostrarSeccionCategoria(categoriaActual);
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarToast('Error al cargar los productos', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Función para renderizar productos
function renderizarProductos() {
    const categorias = ['todos', 'camisas', 'pantalones', 'zapatos', 'hoodies', 'accesorios'];
    
    categorias.forEach(categoria => {
        const gridId = categoria === 'todos' ? 'productosGrid' : `${categoria}Grid`;
        const grid = document.getElementById(gridId);
        
        if (!grid) return;
        
        let productosFiltrados = categoria === 'todos' 
            ? productos 
            : productos.filter(p => p.categoria === categoria);
        
        // Actualizar contador de productos por categoría
        if (categoria === 'todos') {
            document.getElementById('productCount').textContent = `${productosFiltrados.length} productos`;
        } else {
            const countElement = document.getElementById(`${categoria}Count`);
            if (countElement) {
                countElement.textContent = `${productosFiltrados.length} productos`;
            }
        }
        
        if (productosFiltrados.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No hay productos en esta categoría</h3>
                    <p>¡Pronto añadiremos más productos!</p>
                </div>
            `;
        } else {
            grid.innerHTML = productosFiltrados.map(p => crearCardProducto(p)).join('');
        }
    });
}

// Función para crear card de producto
function crearCardProducto(producto) {
    return `
        <div class="product-card" data-id="${producto.id}" data-categoria="${producto.categoria || 'sin-categoria'}">
            ${producto.categoria ? `<span class="product-badge">${producto.categoria}</span>` : ''}
            
            <div class="product-image">
                <img src="${producto.imagen_url || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'}" 
                     alt="${producto.nombre}" 
                     onerror="this.src='https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'">
            </div>
            
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${producto.nombre}</h3>
                    <span class="product-price">${producto.precio.toFixed(2)}</span>
                </div>
                
                <span class="product-code">${producto.codigo}</span>
                
                <p class="product-description">${producto.descripcion}</p>
                
                <div class="product-meta">
                    <small><i class="fas fa-tag"></i> ${producto.categoria || 'Sin categoría'}</small>
                    <small><i class="fas fa-calendar"></i> ${new Date(producto.created_at).toLocaleDateString()}</small>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="agregarAlCarrito(${producto.id}, '${producto.nombre.replace(/'/g, "\\'")}')">
                        <i class="fas fa-shopping-cart"></i> Agregar al Carrito
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Función para mostrar productos vacíos
function mostrarProductosVacios() {
    document.querySelectorAll('.products-grid').forEach(grid => {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No hay productos disponibles</h3>
                <p>¡Pronto añadiremos nuevos productos a nuestra tienda!</p>
            </div>
        `;
    });
}

// Función para filtrar por categoría
function filtrarCategoria(categoria) {
    categoriaActual = categoria;
    
    // Actualizar botones activos
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes(`'${categoria}'`)) {
            btn.classList.add('active');
        }
    });
    
    // Mostrar sección correspondiente
    mostrarSeccionCategoria(categoria);
}

// Función para mostrar sección de categoría
function mostrarSeccionCategoria(categoria) {
    document.querySelectorAll('.category-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const seccion = document.getElementById(categoria);
    if (seccion) {
        seccion.classList.add('active');
        window.scrollTo({ top: seccion.offsetTop - 100, behavior: 'smooth' });
    }
}

// Función para buscar producto
async function buscarProducto() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        cargarProductos();
        return;
    }
    
    mostrarLoading(true);
    try {
        const res = await fetch(`/api/productos/${query}`);
        if (res.ok) {
            const resultado = await res.json();
            
            // Mostrar resultado en todas las grids
            const grid = document.getElementById('productosGrid');
            if (grid) {
                grid.innerHTML = crearCardProducto(resultado);
            }
            
            mostrarToast(`Producto encontrado: ${resultado.nombre}`, 'success');
        } else {
            const error = await res.json();
            mostrarToast(error.error || "Producto no encontrado", 'error');
            cargarProductos();
        }
    } catch (error) {
        console.error('Error al buscar:', error);
        mostrarToast('Error al buscar producto', 'error');
    } finally {
        mostrarLoading(false);
    }
}

// Configurar búsqueda
function configurarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarProducto();
            }
        });
    }
}

// Configurar dropdown de usuario
function configurarDropdownUsuario() {
    const userBtn = document.querySelector('.user-btn');
    const dropdown = document.querySelector('.dropdown-menu');
    
    if (userBtn && dropdown) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }
}

// Inicializar página de productos para usuario
function inicializarUsuario() {
    const datosUsuario = obtenerDatosUsuario();
    token = datosUsuario.token;
    
    // Verificar autenticación
    if (!token) {
        mostrarToast('Por favor, inicia sesión primero', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // Mostrar información del usuario
    const userNameEl = document.getElementById('userName');
    if (userNameEl && datosUsuario.nombreUsuario) {
        userNameEl.textContent = datosUsuario.nombreUsuario.split(' ')[0];
    }
    
    // Configurar búsqueda
    configurarBusqueda();
    
    // Configurar dropdown de usuario
    configurarDropdownUsuario();
    
    // Cargar productos
    cargarProductos();
    
    // Actualizar resumen del carrito
    actualizarResumenCarrito();
    
    // Hacer funciones globales para uso en HTML
    window.cerrarSesion = cerrarSesion;
    window.agregarAlCarrito = agregarAlCarrito;
    window.buscarProducto = buscarProducto;
    window.filtrarCategoria = filtrarCategoria;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarUsuario);