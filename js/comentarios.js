document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formComentario');
    const input = document.getElementById('inputComentario');
    const contenedorComentarios = document.getElementById('comentarios');
    const STORAGE_KEY = 'takumi_login_system';
    const SESSION_KEY = 'current_token';

    // Utilidad: obtener datos de sesión
    function getCurrentUser() {
        const token = sessionStorage.getItem(SESSION_KEY);
        if (!token) return null;

        const appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        const session = appData.sessions?.[token];
        if (!session) return null;

        return appData.users?.[session.username.toLowerCase()];
    }

    // Renderizar comentario individual
    function crearComentarioHTML(texto, user) {
        const div = document.createElement('div');
        div.classList.add('comentario');

        const nombre = user?.username || 'Invitado';
        const fecha = new Date().toLocaleString();
        const avatar = user?.avatar || null;

        div.innerHTML = `
            <div class="comentario-header">
                <div class="avatar">
                    ${avatar ? `<img src="${avatar}" alt="avatar" class="user-avatar">` : `<i class="fas fa-user"></i>`}
                </div>
                <strong>${nombre}</strong>
                <span class="fecha">${fecha}</span>
            </div>
            <p class="texto">${texto}</p>
            <div class="acciones">
                <button class="like">👍 <span>0</span></button>
                <button class="dislike">👎 <span>0</span></button>
                <button class="reportar">🚩 Reportar</button>
            </div>
        `;

        // Eventos de like/dislike
        const likeBtn = div.querySelector('.like');
        const dislikeBtn = div.querySelector('.dislike');

        likeBtn.addEventListener('click', () => {
            const span = likeBtn.querySelector('span');
            span.textContent = parseInt(span.textContent) + 1;
        });

        dislikeBtn.addEventListener('click', () => {
            const span = dislikeBtn.querySelector('span');
            span.textContent = parseInt(span.textContent) + 1;
        });

        div.querySelector('.reportar').addEventListener('click', () => {
            alert('Comentario reportado. Será revisado por el equipo de moderación.');
        });

        return div;
    }

    // Publicar nuevo comentario
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = input.value.trim();
        if (!texto) return;

        const user = getCurrentUser();
        const comentario = crearComentarioHTML(texto, user);
        contenedorComentarios.prepend(comentario); // Añade arriba

        input.value = '';
    });
});
