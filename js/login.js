document.addEventListener('DOMContentLoaded', () => {
  // Crear estilos directamente desde JS
  const style = document.createElement('style');
  style.textContent = `
    .mensaje-error {
      background-color: #f44336;
      color: white;
      padding: 12px;
      border-radius: 5px;
      text-align: center;
      margin-bottom: 15px;
      font-family: Arial, sans-serif;
    }
  `;
  document.head.appendChild(style);

  // Crear contenedor para mensajes si no existe
  let msgContainer = document.createElement('div');
  msgContainer.id = 'mensaje-container';
  document.body.prepend(msgContainer);

  const loginForm = document.querySelector('form');
  const usernameInput = document.querySelector('input[placeholder="Usuario o Apodo"]');
  const passwordInput = document.querySelector('input[placeholder="Contraseña"]');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username || !password) {
        mostrarMensaje('Por favor completa todos los campos.');
        return;
      }

      const users = JSON.parse(localStorage.getItem('users')) || [];

      const user = users.find(u => 
        (u.username === username || u.email === username) &&
        u.password === password
      );

      if (user) {
        localStorage.setItem('currentUser', JSON.stringify({
          username: user.username,
          email: user.email
        }));
        mostrarMensaje('Inicio de sesión exitoso. Redirigiendo...', 'green');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        mostrarMensaje('Primero debes crear una cuenta en <b>registro.html</b>');
      }
    });
  }

  function mostrarMensaje(texto, color = 'red') {
    msgContainer.innerHTML = `
      <div class="mensaje-error" style="background-color: ${color === 'green' ? '#4CAF50' : '#f44336'}">
        ${texto}
      </div>
    `;

    setTimeout(() => {
      msgContainer.innerHTML = '';
    }, 3000);
  }
});
