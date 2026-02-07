// login.js - Lógica de la página de login (ACTUALIZADO)
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await res.json();

                if(res.ok && result.token) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('nivelUsuario', result.nivel);
                    localStorage.setItem('nombreUsuario', result.nombre);
                    localStorage.setItem('emailUsuario', result.email);
                    
                    alert(`Login exitoso. Bienvenido ${result.nombre}!`);
                    
                    // Redirigir según el nivel del usuario
                    if (result.nivel === 'admin') {
                        window.location.href = '/admin';  // Cambiado de 'admin.html' a '/admin'
                    } else {
                        window.location.href = '/usuario'; // Cambiado de 'productos.html' a '/usuario'
                    }
                } else {
                    alert(result.error || "Credenciales incorrectas");
                }
            } catch (error) {
                console.error('Error:', error);
                alert("Error de conexión con el servidor");
            }
        });
    }
});