let db;

function abrirBaseDatos() {
  const request = indexedDB.open('TakumiNetDB', 1);

  request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('usuarios')) {
      const store = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
      store.createIndex('username', 'username', { unique: true });
      store.createIndex('email', 'email', { unique: true });
      // Agregamos índice para contraseñas
      store.createIndex('password', 'password', { unique: false });
    }
    
    // Crear almacén para contraseñas
    if (!db.objectStoreNames.contains('contraseñas')) {
      const passwordStore = db.createObjectStore('contraseñas', { keyPath: 'userId' });
      passwordStore.createIndex('userId', 'userId', { unique: true });
      passwordStore.createIndex('hash', 'hash', { unique: false });
      passwordStore.createIndex('salt', 'salt', { unique: false });
    }
  };

  request.onsuccess = function(event) {
    db = event.target.result;
    console.log('Base de datos abierta');
  };

  request.onerror = function(event) {
    console.error('Error al abrir DB:', event.target.errorCode);
  };
}

// Función para generar un salt aleatorio
function generarSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

// Función para hashear contraseña con salt
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => ('0' + b.toString(16)).slice(-2)).join('');
  return hashHex;
}

async function registrarUsuario(username, email, password, callback) {
  const transaction = db.transaction(['usuarios', 'contraseñas'], 'readwrite');
  const store = transaction.objectStore('usuarios');
  const passwordStore = transaction.objectStore('contraseñas');

  // Primero verificamos si el usuario ya existe
  const index = store.index('username');
  const checkRequest = index.get(username);

  checkRequest.onsuccess = async function() {
    if (checkRequest.result) {
      callback(false, 'El nombre de usuario ya está en uso');
      return;
    }

    try {
      // Si no existe, agregamos el usuario
      const nuevoUsuario = { username, email };
      const addRequest = store.add(nuevoUsuario);
      
      addRequest.onsuccess = async function(event) {
        const userId = event.target.result;
        
        // Generar salt y hash para la contraseña
        const salt = generarSalt();
        const hash = await hashPassword(password, salt);
        
        // Guardar la información de contraseña
        const passwordData = {
          userId,
          hash,
          salt,
          createdAt: new Date().toISOString()
        };
        
        const addPasswordRequest = passwordStore.add(passwordData);
        
        addPasswordRequest.onsuccess = function() {
          callback(true, 'Usuario registrado con éxito');
        };
        
        addPasswordRequest.onerror = function() {
          callback(false, 'Error al guardar la contraseña');
        };
      };

      addRequest.onerror = function() {
        callback(false, 'Error al registrar usuario');
      };
    } catch (error) {
      callback(false, 'Error en el proceso de registro: ' + error.message);
    }
  };

  checkRequest.onerror = function() {
    callback(false, 'Error al verificar usuario');
  };
}

async function loginUsuario(username, password, callback) {
  const transaction = db.transaction(['usuarios', 'contraseñas'], 'readonly');
  const store = transaction.objectStore('usuarios');
  const passwordStore = transaction.objectStore('contraseñas');
  const index = store.index('username');

  const request = index.get(username);

  request.onsuccess = async function() {
    const usuario = request.result;
    if (!usuario) {
      callback(false, 'Usuario no encontrado');
      return;
    }
    
    // Buscar información de contraseña
    const passwordRequest = passwordStore.get(usuario.id);
    
    passwordRequest.onsuccess = async function() {
      const passwordData = passwordRequest.result;
      if (!passwordData) {
        callback(false, 'Error de autenticación');
        return;
      }
      
      try {
        // Verificar contraseña
        const hash = await hashPassword(password, passwordData.salt);
        
        if (hash === passwordData.hash) {
          // Guardar información de sesión
          sessionStorage.setItem('currentUser', JSON.stringify({
            id: usuario.id,
            username: usuario.username,
            email: usuario.email
          }));
          
          callback(true, 'Login exitoso');
        } else {
          callback(false, 'Contraseña incorrecta');
        }
      } catch (error) {
        callback(false, 'Error en la verificación: ' + error.message);
      }
    };
    
    passwordRequest.onerror = function() {
      callback(false, 'Error al verificar credenciales');
    };
  };

  request.onerror = function() {
    callback(false, 'Error al buscar usuario');
  };
}

// Función para cambiar contraseña
async function cambiarContraseña(userId, oldPassword, newPassword, callback) {
  const transaction = db.transaction(['contraseñas'], 'readwrite');
  const passwordStore = transaction.objectStore('contraseñas');
  
  const request = passwordStore.get(userId);
  
  request.onsuccess = async function() {
    const passwordData = request.result;
    if (!passwordData) {
      callback(false, 'No se encontró información de contraseña');
      return;
    }
    
    try {
      // Verificar contraseña actual
      const oldHash = await hashPassword(oldPassword, passwordData.salt);
      
      if (oldHash !== passwordData.hash) {
        callback(false, 'La contraseña actual es incorrecta');
        return;
      }
      
      // Generar nuevo salt y hash
      const newSalt = generarSalt();
      const newHash = await hashPassword(newPassword, newSalt);
      
      // Actualizar información de contraseña
      passwordData.hash = newHash;
      passwordData.salt = newSalt;
      passwordData.updatedAt = new Date().toISOString();
      
      const updateRequest = passwordStore.put(passwordData);
      
      updateRequest.onsuccess = function() {
        callback(true, 'Contraseña actualizada con éxito');
      };
      
      updateRequest.onerror = function() {
        callback(false, 'Error al actualizar la contraseña');
      };
    } catch (error) {
      callback(false, 'Error en el proceso de cambio de contraseña: ' + error.message);
    }
  };
  
  request.onerror = function() {
    callback(false, 'Error al buscar información de contraseña');
  };
}

// Función para cerrar sesión
function cerrarSesion() {
  sessionStorage.removeItem('currentUser');
  // Redirigir a la página de inicio o login
  window.location.href = 'login.html';
}

// Función para verificar si hay un usuario con sesión activa
function verificarSesion() {
  const userData = sessionStorage.getItem('currentUser');
  if (userData) {
    return JSON.parse(userData);
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  abrirBaseDatos();

  // Registro
  const formRegister = document.getElementById('registerForm');
  if (formRegister) {
    formRegister.addEventListener('submit', e => {
      e.preventDefault();

      const username = formRegister.username.value.trim();
      const email = formRegister.email.value.trim();
      const password = formRegister.password.value;
      const confirmPassword = formRegister.confirmPassword.value;

      if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }

      registrarUsuario(username, email, password, (success, message) => {
        alert(message);
        if (success) {
          formRegister.reset();
          // Puedes redirigir al login o lo que quieras
          window.location.href = 'login.html';
        }
      });
    });
  }

  // Login
  const formLogin = document.getElementById('loginForm');
  if (formLogin) {
    formLogin.addEventListener('submit', e => {
      e.preventDefault();

      const username = formLogin.username.value.trim();
      const password = formLogin.password.value;

      loginUsuario(username, password, (success, message) => {
        alert(message);
        if (success) {
          // Usuario logueado
          console.log('Usuario:', username);
          // Aquí redirige o muestra la página principal
          window.location.href = 'index.html';
        }
      });
    });
  }
  
  // Botón de cerrar sesión
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      cerrarSesion();
    });
  }
  
  // Verificar sesión activa
  const currentUser = verificarSesion();
  if (currentUser) {
    // Actualizar elementos de la UI con información del usuario
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
      usernameElement.textContent = currentUser.username;
    }
  }
});