document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const mostrarNombre = document.getElementById('mostrarNombre');
    const inputNombre = document.getElementById('nombre-real');
    const btnGuardar = document.getElementById('guardar-perfil-btn');
    const STORAGE_KEY = 'takumi_login_system'; // Clave para el sistema unificado

    // Función para mostrar notificación
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Función para actualizar el nombre en la interfaz
    function actualizarNombreEnUI(nombre) {
        if (mostrarNombre) {
            mostrarNombre.textContent = nombre || 'Invitado';
        }
    }

    // Obtener usuario actual desde el sistema unificado
    function getCurrentUser() {
        const token = sessionStorage.getItem('current_token');
        if (!token) return null;

        const appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        const session = appData.sessions?.[token];
        if (!session) return null;

        return appData.users?.[session.username.toLowerCase()];
    }

    // Cargar datos iniciales del usuario
    function cargarDatosUsuario() {
        const usuario = getCurrentUser();

        if (usuario) {
            if (inputNombre) inputNombre.value = usuario.username || '';
            actualizarNombreEnUI(usuario.username);
            return usuario;
        } else {
            // Datos por defecto si no hay usuario
            actualizarNombreEnUI('Invitado');
            if (inputNombre) inputNombre.value = '';
            return null;
        }
    }

    // Guardar cambios en el perfil
    async function guardarPerfil(nuevoNombre) {
        return new Promise((resolve, reject) => {
            setTimeout(() => { // Simulamos operación asíncrona
                try {
                    const token = sessionStorage.getItem('current_token');
                    if (!token) {
                        reject(new Error('No hay sesión activa'));
                        return;
                    }

                    const appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: {}, sessions: {} };
                    const session = appData.sessions[token];
                    if (!session) {
                        reject(new Error('Sesión inválida'));
                        return;
                    }

                    const userKey = session.username.toLowerCase();
                    if (!appData.users[userKey]) {
                        reject(new Error('Usuario no encontrado'));
                        return;
                    }

                    // Actualizar datos del usuario
                    appData.users[userKey].username = nuevoNombre;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

                    resolve({
                        success: true,
                        username: nuevoNombre
                    });
                } catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }

    // Cargar datos al iniciar
    const usuarioActual = cargarDatosUsuario();

    // Escuchar cambios en el botón guardar
    if (btnGuardar && inputNombre) {
        btnGuardar.addEventListener('click', async () => {
            const nuevoNombre = inputNombre.value.trim();
            
            if (!nuevoNombre || nuevoNombre.length < 3) {
                showNotification('El nombre debe tener al menos 3 caracteres', 'error');
                inputNombre.focus();
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                const result = await guardarPerfil(nuevoNombre);
                if (result.success) {
                    actualizarNombreEnUI(result.username);
                    showNotification('Perfil actualizado correctamente');
                }
            } catch (error) {
                console.error('Error al guardar perfil:', error);
                showNotification(error.message || 'Error al guardar los cambios', 'error');
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            }
        });
    }

    // Validación en tiempo real
    if (inputNombre) {
        inputNombre.addEventListener('input', () => {
            const nombre = inputNombre.value.trim();
            if (nombre.length > 0 && nombre.length < 3) {
                inputNombre.classList.add('invalid');
            } else {
                inputNombre.classList.remove('invalid');
            }
        });
    }

    // Añadir estilos dinámicos
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            background-color: #4CAF50;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .notification.error {
            background-color: #f44336;
        }
        
        .invalid {
            border-color: #f44336 !important;
        }
        
        .fa-spinner {
            margin-right: 8px;
        }
    `;
    document.head.appendChild(style);
});