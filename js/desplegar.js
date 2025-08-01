// Función para mostrar/ocultar el menú desplegable
function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  const isHidden = dropdown.getAttribute('aria-hidden') === 'true';
  
  // Cerrar todos los menús primero
  closeAllDropdowns();
  
  // Abrir o cerrar este menú
  dropdown.setAttribute('aria-hidden', !isHidden);
  document.querySelector('.user-profile').setAttribute('aria-expanded', isHidden);
  
  // Posicionar el menú correctamente
  positionDropdown();
}

// Función para cerrar todos los menús desplegables
function closeAllDropdowns() {
  const openMenus = document.querySelectorAll('[aria-hidden="false"]');
  openMenus.forEach(menu => {
    menu.setAttribute('aria-hidden', 'true');
  });
  
  const expandedButtons = document.querySelectorAll('[aria-expanded="true"]');
  expandedButtons.forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

// Posicionar el menú desplegable correctamente
function positionDropdown() {
  const dropdown = document.getElementById('userDropdown');
  const profileBtn = document.querySelector('.user-profile');
  
  if (dropdown.getAttribute('aria-hidden') === 'false') {
    const rect = profileBtn.getBoundingClientRect();
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
    dropdown.style.top = `${rect.bottom}px`;
  }
}

// Función para cerrar sesión
function logoutUser() {
  // Eliminar datos de autenticación
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('username');
  
  // Actualizar el nombre de usuario a "Invitado"
  document.getElementById('mostrarNombre').textContent = 'Invitado';
  
  // Cerrar el menú
  closeAllDropdowns();
  
  // Mostrar notificación
  showNotification('Has cerrado sesión correctamente');
  
  // Redirigir a la página principal después de 1 segundo
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// Mostrar notificación
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('userDropdown');
  const profileBtn = document.querySelector('.user-profile');
  
  if (!dropdown.contains(event.target) && !profileBtn.contains(event.target)) {
    closeAllDropdowns();
  }
});

// Actualizar el nombre de usuario al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  const username = localStorage.getItem('username');
  if (username) {
    document.getElementById('mostrarNombre').textContent = username;
  }
  
  // Agregar evento al botón de cerrar sesión
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logoutUser();
    });
  }
  
  // Ajustar menú en redimensionamiento
  window.addEventListener('resize', positionDropdown);
});

// Añadir estilos para la notificación y el menú
const style = document.createElement('style');
style.textContent = `
  .user-dropdown {
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px 0;
    min-width: 200px;
    z-index: 1000;
    display: none;
  }
  
  .user-dropdown[aria-hidden="false"] {
    display: block;
  }
  
  .dropdown-group {
    padding: 4px 0;
  }
  
  .menu-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    color: #333;
    text-decoration: none;
    transition: background 0.2s;
  }
  
  .menu-item:hover {
    background: #f5f5f5;
  }
  
  .menu-item i {
    margin-right: 10px;
    width: 20px;
    text-align: center;
  }
  
  .logout {
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  
  .divider {
    border: none;
    border-top: 1px solid #eee;
    margin: 4px 0;
  }
  
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }
  
  .notification.fade-out {
    animation: fadeOut 0.5s ease-out forwards;
  }
  
  @keyframes slideIn {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes fadeOut {
    to { opacity: 0; transform: translateY(20px); }
  }
`;
document.head.appendChild(style);