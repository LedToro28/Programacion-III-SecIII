// auth.js - Funciones de autenticación comunes
export function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Por favor, inicia sesión primero');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

export function obtenerDatosUsuario() {
    return {
        token: localStorage.getItem('token'),
        nivelUsuario: localStorage.getItem('nivelUsuario'),
        nombreUsuario: localStorage.getItem('nombreUsuario'),
        emailUsuario: localStorage.getItem('emailUsuario')
    };
}

export function mostrarInformacionUsuario() {
    const { nombreUsuario, nivelUsuario, emailUsuario } = obtenerDatosUsuario();
    
    const userNameEl = document.getElementById('userName');
    const userLevelEl = document.getElementById('userLevel');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) userNameEl.textContent = nombreUsuario || 'Invitado';
    if (userLevelEl) userLevelEl.textContent = nivelUsuario || 'N/A';
    if (userEmailEl) userEmailEl.textContent = emailUsuario || 'N/A';
}

export function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('nivelUsuario');
    localStorage.removeItem('nombreUsuario');
    localStorage.removeItem('emailUsuario');
    window.location.href = 'index.html';
}