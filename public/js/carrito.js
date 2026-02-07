// carrito.js - Lógica de la página del carrito (VERSIÓN CORREGIDA)
import { obtenerDatosUsuario, mostrarInformacionUsuario, cerrarSesion } from './auth.js';

let token;
let carritoItems = [];

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

// Función para configurar el buscador
function configurarBuscador() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    if (!searchInput || !searchButton) return;
    
    function realizarBusqueda() {
        const termino = searchInput.value.trim();
        if (termino) {
            // Redirigir a la página de productos con el término de búsqueda
            window.location.href = `/productos?search=${encodeURIComponent(termino)}`;
        } else {
            mostrarToast('Por favor, ingresa un término de búsqueda', 'info');
        }
    }
    
    // Evento al hacer clic en el botón
    searchButton.addEventListener('click', realizarBusqueda);
    
    // Evento al presionar Enter en el input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            realizarBusqueda();
        }
    });
}

// Función para cargar el carrito
async function cargarCarrito() {
    mostrarLoading(true);
    try {
        const res = await fetch('/api/carrito/resumen', {
            method: 'GET',
            headers: { 
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await res.json();
        
        if (res.ok) {
            carritoItems = data.carrito || [];
            
            if (carritoItems.length === 0) {
                mostrarCarritoVacio();
            } else {
                mostrarCarrito(carritoItems);
                actualizarResumenCarrito(carritoItems);
            }
        } else {
            mostrarError(data.error || "Error al cargar el carrito");
            mostrarCarritoVacio();
        }
    } catch (error) {
        console.error('Error al cargar carrito:', error);
        mostrarError("Error de conexión con el servidor");
        mostrarCarritoVacio();
    } finally {
        mostrarLoading(false);
    }
}

// Función para mostrar carrito vacío
function mostrarCarritoVacio() {
    document.getElementById('carritoStatus').style.display = 'none';
    document.getElementById('carritoVacio').style.display = 'flex';
    document.getElementById('carritoItems').style.display = 'none';
    
    // Actualizar contador del navbar
    document.getElementById('cartCounter').textContent = '0';
}

// Función para mostrar el carrito con productos
function mostrarCarrito(items) {
    document.getElementById('carritoStatus').style.display = 'none';
    document.getElementById('carritoVacio').style.display = 'none';
    document.getElementById('carritoItems').style.display = 'block';
    
    // Actualizar contador de items
    document.getElementById('itemsCount').textContent = `${items.length} ${items.length === 1 ? 'producto' : 'productos'} en tu carrito`;
    
    // Mostrar productos
    const contenedor = document.getElementById('listaCarrito');
    contenedor.innerHTML = items.map(item => crearCardProducto(item)).join('');
    
    // Actualizar contador del navbar
    document.getElementById('cartCounter').textContent = items.length.toString();
}

// Función para crear card de producto en el carrito (CORREGIDA)
function crearCardProducto(item) {
    const subtotal = (item.cantidad * item.precio).toFixed(2);
    const imagenUrl = item.imagen_url || 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60';
    
    return `
        <div class="cart-product-card" data-id="${item.id}">
            <div class="product-image-container">
                <img src="${imagenUrl}" 
                     alt="${item.nombre}" 
                     onerror="this.src='https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60'">
            </div>
            
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${item.nombre}</h3>
                    <span class="product-price">${item.precio.toFixed(2)}</span>
                </div>
                
                <span class="product-code">${item.codigo}</span>
                
                <p class="product-description">${item.descripcion || 'Sin descripción disponible'}</p>
                
                <div class="product-meta">
                    <small><i class="fas fa-tag"></i> ${item.categoria || 'Sin categoría'}</small>
                    <small><i class="fas fa-clock"></i> Agregado hoy</small>
                </div>
                
                <div class="quantity-section">
                    <div class="quantity-controls">
                        <span class="quantity-label">Cantidad:</span>
                        <div class="quantity-buttons">
                            <button class="quantity-btn decrement-btn" data-id="${item.id}" ${item.cantidad <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" 
                                   id="cantidad-${item.id}" 
                                   class="quantity-input"
                                   value="${item.cantidad}" 
                                   min="1" 
                                   max="99">
                            <button class="quantity-btn increment-btn" data-id="${item.id}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="product-subtotal">
                        <span class="subtotal-label">Subtotal:</span>
                        <span class="subtotal-value">$${subtotal}</span>
                    </div>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-danger" onclick="eliminarDelCarrito(${item.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Función para actualizar resumen del carrito
function actualizarResumenCarrito(items) {
    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.cantidad * item.precio;
    });
    
    const envio = 5.00;
    const descuento = 0.00;
    const total = subtotal + envio - descuento;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('envio').textContent = envio.toFixed(2);
    document.getElementById('descuento').textContent = descuento.toFixed(2);
    document.getElementById('total').textContent = total.toFixed(2);
}

// Función para mostrar error
function mostrarError(mensaje) {
    mostrarToast(mensaje, 'error');
}

// Función para vaciar el carrito
async function vaciarCarrito() {
    if (!confirm('¿Estás seguro de vaciar todo tu carrito? Esta acción no se puede deshacer.')) return;
    
    mostrarLoading(true);
    try {
        const res = await fetch('/api/carrito', {
            method: 'DELETE',
            headers: { 
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await res.json();
        if (res.ok) {
            mostrarToast('✅ Carrito vaciado correctamente', 'success');
            cargarCarrito();
        } else {
            mostrarError(result.error || "Error al vaciar el carrito");
        }
    } catch (error) {
        console.error('Error al vaciar carrito:', error);
        mostrarError('Error al vaciar el carrito');
    } finally {
        mostrarLoading(false);
    }
}

// Función para eliminar un producto del carrito
async function eliminarDelCarrito(itemId) {
    if (!confirm('¿Eliminar este producto del carrito?')) return;
    
    mostrarLoading(true);
    try {
        const res = await fetch(`/api/carrito/${itemId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await res.json();
        if (res.ok) {
            mostrarToast('✅ Producto eliminado del carrito', 'success');
            cargarCarrito();
        } else {
            mostrarError(result.error || "Error al eliminar del carrito");
        }
    } catch (error) {
        console.error('Error al eliminar del carrito:', error);
        mostrarError('Error al eliminar del carrito');
    } finally {
        mostrarLoading(false);
    }
}

// Función para actualizar cantidad (CORREGIDA)
async function actualizarCantidad(itemId, nuevaCantidad) {
    if (nuevaCantidad < 1 || nuevaCantidad > 99) return;
    
    mostrarLoading(true);
    try {
        const res = await fetch(`/api/carrito/${itemId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ cantidad: nuevaCantidad })
        });
        
        const result = await res.json();
        if (res.ok) {
            // Actualizar localmente
            const itemIndex = carritoItems.findIndex(item => item.id === itemId);
            if (itemIndex !== -1) {
                carritoItems[itemIndex].cantidad = nuevaCantidad;
                actualizarResumenCarrito(carritoItems);
                
                // Actualizar el input
                const input = document.getElementById(`cantidad-${itemId}`);
                if (input) {
                    input.value = nuevaCantidad;
                }
                
                // Actualizar subtotal en la tarjeta
                const subtotalElement = document.querySelector(`[data-id="${itemId}"] .subtotal-value`);
                if (subtotalElement) {
                    const precio = carritoItems[itemIndex].precio;
                    subtotalElement.textContent = `$${(nuevaCantidad * precio).toFixed(2)}`;
                }
                
                // Actualizar estado del botón de decremento
                const decrementBtn = document.querySelector(`[data-id="${itemId}"] .decrement-btn`);
                if (decrementBtn) {
                    decrementBtn.disabled = nuevaCantidad <= 1;
                }
                
                mostrarToast('✅ Cantidad actualizada', 'success');
            }
        } else {
            mostrarError(result.error || "Error al actualizar cantidad");
            cargarCarrito(); // Recargar para mostrar estado correcto
        }
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        mostrarError('Error al actualizar cantidad');
    } finally {
        mostrarLoading(false);
    }
}

// Función para actualizar cantidad desde input (CORREGIDA)
function actualizarCantidadInput(itemId) {
    const input = document.getElementById(`cantidad-${itemId}`);
    const nuevaCantidad = parseInt(input.value);
    
    if (nuevaCantidad >= 1 && nuevaCantidad <= 99) {
        actualizarCantidad(itemId, nuevaCantidad);
    } else {
        // Revertir al valor anterior
        const item = carritoItems.find(item => item.id === itemId);
        if (item) {
            input.value = item.cantidad;
        } else {
            input.value = 1;
        }
        mostrarError('La cantidad debe ser entre 1 y 99');
    }
}

// Función para incrementar cantidad
function incrementarCantidad(itemId) {
    const input = document.getElementById(`cantidad-${itemId}`);
    if (!input) return;
    
    const nuevaCantidad = parseInt(input.value) + 1;
    if (nuevaCantidad <= 99) {
        input.value = nuevaCantidad;
        actualizarCantidad(itemId, nuevaCantidad);
    }
}

// Función para decrementar cantidad
function decrementarCantidad(itemId) {
    const input = document.getElementById(`cantidad-${itemId}`);
    if (!input) return;
    
    const nuevaCantidad = parseInt(input.value) - 1;
    if (nuevaCantidad >= 1) {
        input.value = nuevaCantidad;
        actualizarCantidad(itemId, nuevaCantidad);
    }
}

// Configurar eventos de cantidad (NUEVA FUNCIÓN)
function configurarEventosCantidad() {
    // Eventos para botones de incremento
    document.querySelectorAll('.increment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            incrementarCantidad(parseInt(itemId));
        });
    });
    
    // Eventos para botones de decremento
    document.querySelectorAll('.decrement-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            decrementarCantidad(parseInt(itemId));
        });
    });
    
    // Eventos para inputs de cantidad
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const id = this.id.replace('cantidad-', '');
            actualizarCantidadInput(parseInt(id));
        });
        
        // También actualizar al presionar Enter
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const id = this.id.replace('cantidad-', '');
                actualizarCantidadInput(parseInt(id));
            }
        });
    });
}

// Función para procesar pago
async function procesarPago() {
    const total = document.getElementById('total').textContent;
    
    if (confirm(`¿Proceder con el pago de $${total}?\n\n(Esta es una simulación, no se realizará ningún cargo real)`)) {
        mostrarLoading(true);
        try {
            const res = await fetch('/api/carrito/checkout', {
                method: 'POST',
                headers: { 
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await res.json();
            if (res.ok) {
                mostrarToast('✅ ' + result.message, 'success');
                
                // Mostrar detalles del pedido
                setTimeout(() => {
                    alert(`🎉 ¡Compra realizada con éxito!\n\n📦 Pedido #${result.pedido.id}\n💰 Total: $${result.pedido.total}\n📅 Fecha: ${new Date(result.pedido.fecha).toLocaleDateString()}\n📦 Productos: ${result.pedido.items}\n\nGracias por tu compra.`);
                }, 500);
                
                cargarCarrito();
            } else {
                mostrarError('❌ ' + (result.error || "Error al procesar el pago"));
            }
        } catch (error) {
            console.error('Error al procesar pago:', error);
            mostrarError('Error al procesar el pago');
        } finally {
            mostrarLoading(false);
        }
    }
}

// Función para guardar producto para después (placeholder)
function guardarParaDespues(productoId) {
    mostrarToast('⚠️ Función en desarrollo: Guardar para después', 'info');
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

// Mostrar información del usuario en la página
function mostrarInfoUsuarioEnPagina() {
    const datosUsuario = obtenerDatosUsuario();
    
    // Navbar
    const userNameEl = document.getElementById('userName');
    if (userNameEl && datosUsuario.nombreUsuario) {
        userNameEl.textContent = datosUsuario.nombreUsuario.split(' ')[0];
    }
    
    // Sidebar
    document.getElementById('userNameDisplay').textContent = datosUsuario.nombreUsuario || 'Invitado';
    document.getElementById('userEmailDisplay').textContent = datosUsuario.emailUsuario || 'N/A';
    document.getElementById('userLevelDisplay').textContent = datosUsuario.nivelUsuario === 'admin' ? 'Administrador' : 'Usuario Estándar';
}

// Inicializar página del carrito
function inicializarCarrito() {
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
    mostrarInfoUsuarioEnPagina();
    
    // Configurar dropdown de usuario
    configurarDropdownUsuario();
    
    // Configurar buscador
    configurarBuscador();
    
    // Cargar el carrito
    cargarCarrito();
    
    // Configurar eventos de cantidad después de cargar los productos
    setTimeout(() => {
        configurarEventosCantidad();
    }, 100);
    
    // Hacer funciones globales para uso en HTML
    window.cerrarSesion = cerrarSesion;
    window.vaciarCarrito = vaciarCarrito;
    window.eliminarDelCarrito = eliminarDelCarrito;
    window.procesarPago = procesarPago;
    window.guardarParaDespues = guardarParaDespues;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarCarrito);