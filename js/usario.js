document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const avatarDiv = document.querySelector('.avatar');
    const avatarIcon = avatarDiv?.querySelector('i.fas.fa-user');
    const usernameElement = document.getElementById('mostrarNombre');
    
    // Constantes para las claves de almacenamiento
    const AVATAR_PREFIX = 'takumi_avatar_';
    const USER_PREFIX = 'takumi_usuario_';
    const SESSION_KEY = 'current_token';
    const STORAGE_KEY = 'takumi_login_system';

    // Verificar si hay una sesión activa
    function checkActiveSession() {
        const token = sessionStorage.getItem(SESSION_KEY);
        if (!token) return false;
        
        const appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        return !!appData.sessions?.[token];
    }

    // Obtener datos del usuario actual
    function getCurrentUserData() {
        const token = sessionStorage.getItem(SESSION_KEY);
        if (!token) return null;
        
        const appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        const session = appData.sessions?.[token];
        if (!session) return null;
        
        return appData.users?.[session.username.toLowerCase()];
    }

    // Cargar y mostrar el avatar
    function loadAvatar() {
        if (!avatarDiv) return;
        
        const userData = getCurrentUserData();
        if (!userData) {
            resetAvatar();
            return;
        }

        // Verificar si hay avatar en los datos del usuario
        if (userData.avatar) {
            displayAvatar(userData.avatar);
            return;
        }

        // Método legacy (búsqueda por clave)
        const avatarKey = findAvatarKey();
        if (avatarKey) {
            const avatarData = localStorage.getItem(avatarKey);
            if (avatarData) {
                displayAvatar(avatarData);
                // Migrar a nuevo sistema
                migrateAvatarToUserData(avatarData, userData.username.toLowerCase());
            } else {
                resetAvatar();
            }
        } else {
            resetAvatar();
        }
    }

    // Buscar clave de avatar (método legacy)
    function findAvatarKey() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(AVATAR_PREFIX)) {
                return key;
            }
        }
        return null;
    }

    // Migrar avatar al nuevo sistema de almacenamiento
    function migrateAvatarToUserData(avatarData, username) {
        const appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: {} };
        
        if (!appData.users[username]) {
            appData.users[username] = {};
        }
        
        appData.users[username].avatar = avatarData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        
        // Eliminar el dato legacy
        const oldKey = AVATAR_PREFIX + username;
        localStorage.removeItem(oldKey);
    }

    // Mostrar el avatar en el DOM
    function displayAvatar(avatarData) {
        // Crear elemento img para el avatar
        const img = document.createElement('img');
        img.src = avatarData;
        img.alt = 'Foto de perfil';
        img.classList.add('user-avatar');
        
        // Estilos para el avatar
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        
        // Ocultar el icono por defecto si existe
        if (avatarIcon) {
            avatarIcon.style.display = 'none';
        }
        
        // Limpiar el contenedor y añadir la imagen
        avatarDiv.innerHTML = '';
        avatarDiv.appendChild(img);
    }

    // Restablecer avatar a icono por defecto
    function resetAvatar() {
        if (!avatarDiv) return;
        
        avatarDiv.innerHTML = '';
        if (avatarIcon) {
            avatarIcon.style.display = 'block';
            avatarDiv.appendChild(avatarIcon);
        } else {
            const defaultIcon = document.createElement('i');
            defaultIcon.className = 'fas fa-user';
            avatarDiv.appendChild(defaultIcon);
        }
    }

    // Cargar el nombre de usuario
    function loadUsername() {
        if (!usernameElement) return;
        
        const userData = getCurrentUserData();
        if (userData?.username) {
            usernameElement.textContent = userData.username;
        } else {
            usernameElement.textContent = 'Invitado';
        }
    }

    // Verificar estado de sesión y cargar datos
    function initUserProfile() {
        const isLoggedIn = checkActiveSession();
        
        if (!isLoggedIn) {
            if (usernameElement) {
                usernameElement.textContent = 'Invitado';
            }
            resetAvatar();
            return;
        }
        
        loadAvatar();
        loadUsername();
    }

    // Inicializar
    initUserProfile();
});