// admin.js - Lógica de la página de administración
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
        
        // Actualizar estadísticas admin
        actualizarEstadisticasAdmin();
        
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

// Función para actualizar estadísticas admin
function actualizarEstadisticasAdmin() {
    const totalProductos = productos.length;
    const productosPorCategoria = {
        'camisas': productos.filter(p => p.categoria === 'camisas').length,
        'pantalones': productos.filter(p => p.categoria === 'pantalones').length,
        'zapatos': productos.filter(p => p.categoria === 'zapatos').length,
        'hoodies': productos.filter(p => p.categoria === 'hoodies').length,
        'accesorios': productos.filter(p => p.categoria === 'accesorios').length
    };
    
    // Actualizar contadores
    document.getElementById('totalProductsAdmin').textContent = totalProductos;
    document.getElementById('productCount').textContent = `${totalProductos} productos`;
    document.getElementById('camisasCount').textContent = `${productosPorCategoria.camisas} productos`;
    document.getElementById('pantalonesCount').textContent = `${productosPorCategoria.pantalones} productos`;
    document.getElementById('zapatosCount').textContent = `${productosPorCategoria.zapatos} productos`;
    document.getElementById('hoodiesCount').textContent = `${productosPorCategoria.hoodies} productos`;
    document.getElementById('accesoriosCount').textContent = `${productosPorCategoria.accesorios} productos`;
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
        
        if (productosFiltrados.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No hay productos en esta categoría</h3>
                    <p>¡Crea el primer producto!</p>
                    <button class="btn btn-primary" onclick="mostrarModalProducto()">
                        <i class="fas fa-plus"></i> Crear Producto
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = productosFiltrados.map(p => crearCardProductoAdmin(p)).join('');
        }
    });
}

// Función para crear card de producto (versión admin)
function crearCardProductoAdmin(producto) {
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
                    <small><i class="fas fa-user"></i> ${producto.creado_por || 'Sistema'}</small>
                    <small><i class="fas fa-calendar"></i> ${new Date(producto.created_at).toLocaleDateString()}</small>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editarProducto(${producto.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${producto.id})">
                        <i class="fas fa-trash"></i> Eliminar
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
                <p>¡Crea el primer producto!</p>
                <button class="btn btn-primary" onclick="mostrarModalProducto()">
                    <i class="fas fa-plus"></i> Crear Producto
                </button>
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
            
            // Mostrar resultado en la grid principal
            const grid = document.getElementById('productosGrid');
            if (grid) {
                grid.innerHTML = crearCardProductoAdmin(resultado);
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

// Función para buscar en toolbar admin
function buscarProductoAdmin() {
    const query = document.getElementById('adminSearch').value.trim();
    if (!query) {
        cargarProductos();
        return;
    }
    
    // Filtro local para mejor performance
    const productosFiltrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(query.toLowerCase()) || 
        p.codigo.toLowerCase().includes(query.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(query.toLowerCase())
    );
    
    if (productosFiltrados.length > 0) {
        const grid = document.getElementById('productosGrid');
        if (grid) {
            grid.innerHTML = productosFiltrados.map(p => crearCardProductoAdmin(p)).join('');
        }
        mostrarToast(`${productosFiltrados.length} productos encontrados`, 'success');
    } else {
        mostrarToast('No se encontraron productos', 'error');
    }
}

// Función para mostrar modal de producto
function mostrarModalProducto() {
    document.getElementById('productModal').classList.add('show');
    document.getElementById('productForm').reset();
}

// Función para cerrar modal
function cerrarModal() {
    document.getElementById('productModal').classList.remove('show');
}

// Función para editar producto
async function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    // Rellenar formulario con datos del producto
    document.getElementById('nombre').value = producto.nombre;
    document.getElementById('codigo').value = producto.codigo;
    document.getElementById('precio').value = producto.precio;
    document.getElementById('descripcion').value = producto.descripcion;
    document.getElementById('categoria').value = producto.categoria;
    document.getElementById('imagen_url').value = producto.imagen_url || '';
    
    // Cambiar título del modal
    document.querySelector('#productModal h3').innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
    
    // Cambiar comportamiento del formulario
    const form = document.getElementById('productForm');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const data = {
            nombre: document.getElementById('nombre').value,
            codigo: document.getElementById('codigo').value,
            precio: parseFloat(document.getElementById('precio').value),
            descripcion: document.getElementById('descripcion').value,
            categoria: document.getElementById('categoria').value,
            imagen_url: document.getElementById('imagen_url').value
        };

        try {
            const res = await fetch(`/api/productos/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            
            if(res.ok) {
                mostrarToast('Producto actualizado correctamente', 'success');
                cerrarModal();
                cargarProductos();
            } else {
                mostrarToast(result.error || "Error al actualizar producto", 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarToast("Error de conexión con el servidor", 'error');
        }
    };
    
    mostrarModalProducto();
}

// Función para eliminar producto
async function eliminarProducto(id) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        try {
            const res = await fetch(`/api/productos/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': token
                }
            });
            
            const resultado = await res.json();
            if (res.ok) {
                mostrarToast('Producto eliminado correctamente', 'success');
                cargarProductos();
            } else {
                mostrarToast(resultado.error || "Error al eliminar", 'error');
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            mostrarToast('Error al eliminar producto', 'error');
        }
    }
}

// Funciones placeholder para admin
function exportarProductos() {
    const dataStr = JSON.stringify(productos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `productos_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    mostrarToast('Productos exportados correctamente', 'success');
}

function importarProductos() {
    mostrarToast('Función de importación en desarrollo', 'info');
}

function generarReporte() {
    mostrarToast('Generando reporte...', 'info');
}

// Configurar formulario de producto
function configurarFormularioProducto() {
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.onsubmit = async function(e) {
            e.preventDefault();
            
            const data = {
                nombre: document.getElementById('nombre').value,
                codigo: document.getElementById('codigo').value,
                precio: parseFloat(document.getElementById('precio').value),
                descripcion: document.getElementById('descripcion').value,
                categoria: document.getElementById('categoria').value,
                imagen_url: document.getElementById('imagen_url').value
            };

            try {
                const res = await fetch('/api/productos', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify(data)
                });

                const result = await res.json();
                
                if(res.ok) {
                    mostrarToast('Producto creado correctamente', 'success');
                    cerrarModal();
                    cargarProductos();
                } else {
                    mostrarToast(result.error || "Error al crear producto", 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarToast("Error de conexión con el servidor", 'error');
            }
        };
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
    
    const adminSearch = document.getElementById('adminSearch');
    if (adminSearch) {
        adminSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarProductoAdmin();
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

// Inicializar página de administración
function inicializarAdmin() {
    const datosUsuario = obtenerDatosUsuario();
    token = datosUsuario.token;
    
    // Verificar autenticación y que sea admin
    if (!token) {
        mostrarToast('Por favor, inicia sesión primero', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    if (datosUsuario.nivelUsuario !== 'admin') {
        mostrarToast('Acceso denegado. Se requieren permisos de administrador.', 'error');
        setTimeout(() => {
            window.location.href = 'usuario.html';
        }, 1500);
        return;
    }
    
    // Mostrar información del usuario
    const userNameEl = document.getElementById('userName');
    if (userNameEl && datosUsuario.nombreUsuario) {
        userNameEl.textContent = datosUsuario.nombreUsuario.split(' ')[0];
    }
    
    // Configurar formulario de producto
    configurarFormularioProducto();
    
    // Configurar búsqueda
    configurarBusqueda();
    
    // Configurar dropdown de usuario
    configurarDropdownUsuario();
    
    // Cargar productos
    cargarProductos();
    
    // Hacer funciones globales para uso en HTML
    window.cerrarSesion = cerrarSesion;
    window.buscarProducto = buscarProducto;
    window.filtrarCategoria = filtrarCategoria;
    window.mostrarModalProducto = mostrarModalProducto;
    window.cerrarModal = cerrarModal;
    window.editarProducto = editarProducto;
    window.eliminarProducto = eliminarProducto;
    window.buscarProductoAdmin = buscarProductoAdmin;
    window.exportarProductos = exportarProductos;
    window.importarProductos = importarProductos;
    window.generarReporte = generarReporte;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarAdmin);