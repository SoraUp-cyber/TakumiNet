async function cargarUsuario() {
  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("userId");

  const usernameSpan = document.getElementById("current-username");
  const passwordInput = document.getElementById("contrasena-actual");
  const avatarCircle = document.getElementById("avatar-circle");
  const avatarIcon = document.getElementById("avatar-icon");

  try {
    const res = await fetch(`http://localhost:3001/api/usuario/${userId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    const usuario = data.usuario;
    usernameSpan.textContent = usuario.username || "Invitado";
    passwordInput.value = sessionStorage.getItem("password") || "123456";

    if (usuario.avatar) {
      avatarCircle.style.backgroundImage = `url(${usuario.avatar})`;
      avatarCircle.style.backgroundSize = "cover";
      avatarCircle.style.backgroundPosition = "center";
      avatarIcon.style.display = "none";
    }
  } catch (err) {
    console.error("Error cargando usuario:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", cargarUsuario);
