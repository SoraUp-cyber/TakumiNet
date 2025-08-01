document.addEventListener('DOMContentLoaded', function() {
  // Elementos del DOM
  const notificationBtn = document.querySelector('.notification-btn');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationsList = document.getElementById('notificationsList');
  const notificationBadge = document.getElementById('notificationBadge');
  const markReadBtn = document.getElementById('markReadBtn');
  
  // Estado del menú
  let isNotificationOpen = false;
  let notifications = [];
  let isLoading = false;

  // Función para cargar notificaciones desde el servidor
  async function loadNotifications() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingState();
    
    try {
      // Reemplaza esto con tu llamada real a la API
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('Error al cargar notificaciones');
      }
      
      notifications = await response.json();
      renderNotifications();
      
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage('No se pudieron cargar las notificaciones');
    } finally {
      isLoading = false;
    }
  }

  // Función para mostrar estado de carga
  function showLoadingState() {
    notificationsList.innerHTML = '<div class="loading">Cargando notificaciones...</div>';
  }

  // Función para mostrar mensaje de error
  function showErrorMessage(message) {
    notificationsList.innerHTML = `<div class="error">${message}</div>`;
  }

  // Función para renderizar notificaciones
  function renderNotifications() {
    notificationsList.innerHTML = '';
    
    if (!notifications || notifications.length === 0) {
      notificationsList.innerHTML = '<div class="empty">No tienes notificaciones</div>';
      notificationBadge.style.display = 'none';
      return;
    }
    
    // Contar notificaciones no leídas
    const unreadCount = notifications.filter(n => !n.read).length;
    updateBadge(unreadCount);
    
    // Renderizar cada notificación
    notifications.forEach(notification => {
      const notificationItem = document.createElement('div');
      notificationItem.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
      notificationItem.setAttribute('role', 'menuitem');
      notificationItem.setAttribute('data-id', notification.id);
      
      notificationItem.innerHTML = `
        <i class="notification-icon fas ${notification.icon || 'fa-bell'}"></i>
        <div class="notification-body">
          <p class="notification-text">${notification.text}</p>
          <time class="notification-time">${notification.time || 'Reciente'}</time>
        </div>
      `;
      
      notificationsList.appendChild(notificationItem);
    });
  }

  // Actualizar el badge de notificaciones
  function updateBadge(count) {
    notificationBadge.textContent = count;
    notificationBadge.style.display = count > 0 ? 'block' : 'none';
  }

  // Alternar visibilidad del menú
  function toggleNotifications() {
    isNotificationOpen = !isNotificationOpen;
    
    if (isNotificationOpen) {
      notificationDropdown.style.display = 'block';
      notificationDropdown.setAttribute('aria-hidden', 'false');
      notificationBtn.setAttribute('aria-expanded', 'true');
      
      // Cargar notificaciones solo cuando se abre
      loadNotifications();
    } else {
      notificationDropdown.style.display = 'none';
      notificationDropdown.setAttribute('aria-hidden', 'true');
      notificationBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // Marcar todas como leídas
  async function markAllAsRead() {
    try {
      // Reemplaza esto con tu llamada real a la API
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        notifications.forEach(n => n.read = true);
        renderNotifications();
      } else {
        throw new Error('Error al marcar como leídas');
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage('Error al actualizar notificaciones');
    }
  }

  // Marcar una notificación como leída
  async function markAsRead(notificationId) {
    try {
      // Reemplaza esto con tu llamada real a la API
      const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          renderNotifications();
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Event Listeners
  notificationBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleNotifications();
  });

  markReadBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    markAllAsRead();
  });

  notificationsList.addEventListener('click', function(e) {
    const notificationItem = e.target.closest('.notification-item');
    if (notificationItem) {
      const notificationId = notificationItem.getAttribute('data-id');
      markAsRead(notificationId);
    }
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.notification-wrapper') && 
        !e.target.closest('.notification-dropdown')) {
      if (isNotificationOpen) {
        toggleNotifications();
      }
    }
  });

  // Cerrar con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isNotificationOpen) {
      toggleNotifications();
    }
  });

  // Inicializar
  notificationBadge.style.display = 'none';
});