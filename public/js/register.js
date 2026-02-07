// register.js - Lógica de la página de registro (Versión Actualizada)
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    // Validación de fortaleza de contraseña en tiempo real
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            let text = '';
            let color = '#ef4444';
            
            // Validaciones de fortaleza
            if (password.length >= 6) strength++;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            // Determinar texto y color
            switch(strength) {
                case 0:
                case 1:
                    text = 'Muy débil';
                    color = '#ef4444';
                    break;
                case 2:
                    text = 'Débil';
                    color = '#f59e0b';
                    break;
                case 3:
                    text = 'Aceptable';
                    color = '#3b82f6';
                    break;
                case 4:
                    text = 'Fuerte';
                    color = '#10b981';
                    break;
                case 5:
                    text = 'Muy fuerte';
                    color = '#059669';
                    break;
            }
            
            // Actualizar barra de fortaleza
            strengthBar.style.width = `${(strength / 5) * 100}%`;
            strengthBar.style.backgroundColor = color;
            strengthText.textContent = text;
            strengthText.style.color = color;
        });
    }
    
    // Manejo del formulario de registro
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validaciones
            const nombre = document.getElementById('nombre').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            // Validar nombre
            if (nombre.length < 3) {
                mostrarError('El nombre debe tener al menos 3 caracteres');
                return;
            }
            
            // Validar email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                mostrarError('Por favor, ingresa un email válido');
                return;
            }
            
            // Validar contraseña
            if (password.length < 6) {
                mostrarError('La contraseña debe tener al menos 6 caracteres');
                return;
            }
            
            // Mostrar carga
            const submitBtn = registerForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
            submitBtn.disabled = true;
            
            // Preparar datos para enviar
            const data = {
                nombre: nombre,
                email: email,
                password: password,
                nivel: 'usuario' // Siempre será usuario
            };
            
            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await res.json();
                
                if(res.ok) {
                    // Éxito
                    mostrarExito('¡Cuenta creada con éxito! Redirigiendo...');
                    
                    // Limpiar formulario
                    registerForm.reset();
                    
                    // Redirigir al login después de 2 segundos
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                    
                } else {
                    // Error del servidor
                    mostrarError(result.error || "Error en el registro");
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarError("Error de conexión con el servidor");
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Función para mostrar errores
    function mostrarError(mensaje) {
        // Eliminar mensaje anterior si existe
        const errorExistente = document.querySelector('.error-message');
        if (errorExistente) errorExistente.remove();
        
        // Crear elemento de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${mensaje}</span>
        `;
        
        // Insertar antes del formulario
        registerForm.insertBefore(errorDiv, registerForm.firstChild);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    // Función para mostrar éxito
    function mostrarExito(mensaje) {
        // Eliminar mensaje anterior si existe
        const exitoExistente = document.querySelector('.success-message');
        if (exitoExistente) exitoExistente.remove();
        
        // Crear elemento de éxito
        const exitoDiv = document.createElement('div');
        exitoDiv.className = 'success-message';
        exitoDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${mensaje}</span>
        `;
        
        // Insertar antes del formulario
        registerForm.insertBefore(exitoDiv, registerForm.firstChild);
    }
});