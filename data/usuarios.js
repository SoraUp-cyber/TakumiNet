// db.js - Gestión avanzada de usuarios con IndexedDB para TakumiNet

let db;
const DB_NAME = 'TakumiNetDB';
const DB_VERSION = 1;
const STORE_NAME = 'usuarios';

/**
 * Abrir o crear base de datos IndexedDB con esquema actualizado
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db); // Ya abierta

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Error al abrir la base de datos IndexedDB'));

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'username' });
        store.createIndex('username', 'username', { unique: true });
        store.createIndex('email', 'email', { unique: true });
      }
    };
  });
}

/**
 * Hashear contraseña usando SHA-256 (Web Crypto API)
 * @param {string} password 
 * @returns {Promise<string>} hash hexadecimal
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validar datos de usuario antes de registrar
 * @param {string} username 
 * @param {string} email 
 * @param {string} password 
 */
function validarDatosUsuario(username, email, password) {
  if (!username || username.length < 3) throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
  if (!email || !email.includes('@')) throw new Error('Correo electrónico inválido');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
}

/**
 * Registrar un nuevo usuario en IndexedDB
 * @param {string} username 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function registrarUsuario(username, email, password) {
  try {
    validarDatosUsuario(username, email, password);
    await openDB();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Verificar si usuario o email ya existen
      const getUser = store.get(username);
      getUser.onsuccess = () => {
        if (getUser.result) {
          resolve({ success: false, message: 'El usuario ya existe' });
        } else {
          // Buscar email duplicado
          const indexEmail = store.index('email');
          const emailRequest = indexEmail.get(email);
          emailRequest.onsuccess = () => {
            if (emailRequest.result) {
              resolve({ success: false, message: 'El correo electrónico ya está registrado' });
            } else {
              const addRequest = store.add({ username, email, password: hashedPassword, creado: new Date() });
              addRequest.onsuccess = () => resolve({ success: true, message: 'Registro exitoso' });
              addRequest.onerror = () => resolve({ success: false, message: 'Error al registrar usuario' });
            }
          };
          emailRequest.onerror = () => resolve({ success: false, message: 'Error al validar correo electrónico' });
        }
      };

      getUser.onerror = () => resolve({ success: false, message: 'Error al verificar usuario' });
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Iniciar sesión con usuario y contraseña
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function loginUsuario(username, password) {
  try {
    if (!username || !password) throw new Error('Usuario y contraseña son obligatorios');
    await openDB();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(username);
      getRequest.onsuccess = () => {
        const user = getRequest.result;
        if (!user) {
          resolve({ success: false, message: 'Usuario no encontrado' });
        } else if (user.password === hashedPassword) {
          // Guardar sesión simulada
          sessionStorage.setItem('usuarioLogueado', username);
          resolve({ success: true, message: 'Login exitoso' });
        } else {
          resolve({ success: false, message: 'Contraseña incorrecta' });
        }
      };
      getRequest.onerror = () => resolve({ success: false, message: 'Error en login' });
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Cerrar sesión
 */
function logoutUsuario() {
  sessionStorage.removeItem('usuarioLogueado');
}

/**
 * Obtener usuario logueado (simulado con sessionStorage)
 * @returns {string|null}
 */
function getUsuarioLogueado() {
  return sessionStorage.getItem('usuarioLogueado');
}

/**
 * Listar todos los usuarios registrados (solo para fines de administración)
 * @returns {Promise<Array>}
 */
async function listarUsuarios() {
  await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const usuarios = [];

    store.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
        usuarios.push(cursor.value);
        cursor.continue();
      } else {
        resolve(usuarios);
      }
    };

    store.openCursor().onerror = () => reject('Error al listar usuarios');
  });
}

/**
 * Eliminar un usuario por username
 * @param {string} username 
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function eliminarUsuario(username) {
  await openDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const deleteRequest = store.delete(username);
    deleteRequest.onsuccess = () => resolve({ success: true, message: 'Usuario eliminado' });
    deleteRequest.onerror = () => resolve({ success: false, message: 'Error al eliminar usuario' });
  });
}

// Exportar funciones si usas módulos ES6
// export { registrarUsuario, loginUsuario, logoutUsuario, getUsuarioLogueado, listarUsuarios, eliminarUsuario };
