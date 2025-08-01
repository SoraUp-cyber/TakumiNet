document.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.replace('#', ''));
        const token = params.get('access_token');

        if (token) {
            fetch("https://discord.com/api/users/@me", {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(user => {
                // Mostrar el nombre y avatar en el menú
                document.getElementById("mostrarNombre").textContent = user.username;

                const avatarElement = document.querySelector(".user-profile .avatar");
                avatarElement.innerHTML = `
                    <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" alt="Avatar" style="width:30px;height:30px;border-radius:50%;">
                `;

                localStorage.setItem("discordUser", JSON.stringify(user));
            })
            .catch(error => console.error("Error obteniendo usuario:", error));
        }
    } else {
        // Si no hay token, revisar localStorage
        const storedUser = localStorage.getItem("discordUser");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            document.getElementById("mostrarNombre").textContent = user.username;

            const avatarElement = document.querySelector(".user-profile .avatar");
            avatarElement.innerHTML = `
                <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" alt="Avatar" style="width:30px;height:30px;border-radius:50%;">
            `;
        }
    }
});
