document.addEventListener("DOMContentLoaded", () => {
  const data = JSON.parse(localStorage.getItem("takumi_login_system"));

  if (!data) {
    console.warn("❌ No se encontraron datos en localStorage");
    return;
  }

  // Obtener el último usuario que inició sesión (de las sesiones)
  const sessions = data.sessions || {};
  let lastSession = null;
  let username = "Usuario";
  let userId = "ID no disponible";

  if (Object.keys(sessions).length > 0) {
    // Obtener la última sesión creada (por fecha)
    const lastSessionKey = Object.keys(sessions).sort((a, b) => {
      return new Date(sessions[b].createdAt) - new Date(sessions[a].createdAt);
    })[0];

    lastSession = sessions[lastSessionKey];
    
    // Buscar el usuario correspondiente en data.users
    const users = data.users || {};
    const user = users[lastSession.username]; // Asumiendo que session.username es la clave del usuario
    
    if (user) {
      username = user.realName || user.username || "Usuario";
      userId = user.id || "ID no disponible";
    }
  }

  // Insertar valores en HTML
  const usernameElement = document.getElementById("username");
  const userDomain = document.getElementById("user-domain");
  const userIdElement = document.getElementById("user-id");

  if (usernameElement) usernameElement.textContent = username;
  if (userDomain) userDomain.textContent = username;
  if (userIdElement) userIdElement.textContent = userId;
});