document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('contenedor-juegos');
  const form = document.getElementById('gameFilters');
  let db;

  // Abrir conexión a IndexedDB
  const request = indexedDB.open('GamesDB', 1);

  request.onerror = (event) =>
    console.error('❌ Error al abrir la base de datos:', event.target.error);

  request.onsuccess = (event) => {
    db = event.target.result;
    // No mostramos nada al principio
  };

  // Cuando se aplica el filtro
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (db) cargarJuegosFiltrados(db);
  });

  // ✅ Mostrar solo juegos filtrados
  function cargarJuegosFiltrados(db) {
    const genre = form.genre.value;
    const category = form.category.value;
    const price = form.price.value;
    const requirements = form.requirements.value;

    contenedor.innerHTML = ''; // Limpiar antes de mostrar

    const transaction = db.transaction(['games', 'gameImages'], 'readonly');
    const gamesStore = transaction.objectStore('games');
    const imagesStore = transaction.objectStore('gameImages');

    const cursorRequest = gamesStore.openCursor();
    let juegosEncontrados = 0;

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const game = cursor.value;

        const cumpleFiltros =
          (!genre || game.genre === genre) &&
          (!category || game.category === category) &&
          (!price || game.pricing === price) &&
          (!requirements || game.requirements === requirements);

        if (cumpleFiltros) {
          juegosEncontrados++;

          const imgRequest = imagesStore.get(game.id);
          imgRequest.onsuccess = () => {
            const imgData = imgRequest.result;
            const portada =
              imgData?.cover?.base64 ||
              'https://via.placeholder.com/315x250?text=Sin+portada';

            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.dataset.id = game.id;

            gameCard.innerHTML = `
              <img src="${portada}" alt="${game.title}" class="game-img">
              <button class="fav-btn" data-id="${game.id}" title="Agregar a Biblioteca">❤</button>
              <div class="game-info">
                <h3>${game.title}</h3>
                <p class="categoria">${game.category || 'Sin categoría'}</p>
                <p class="descripcion">${game.description?.length > 60
                  ? game.description.substring(0, 60) + '...'
                  : game.description || ''}</p>
                <p class="precio">${game.pricing === 'gratis'
                  ? 'Gratis'
                  : `$${(game.price || 0).toFixed(2)}`}</p>
              </div>
            `;

            gameCard.addEventListener('click', (e) => {
              if (!e.target.classList.contains('fav-btn')) {
                window.location.href = `perfil-juegos.html?id=${game.id}`;
              }
            });

            contenedor.appendChild(gameCard);
          };
        }

        cursor.continue();
      } else {
        if (juegosEncontrados === 0) {
          contenedor.innerHTML =
            '<p style="color:#fff; text-align:center;">No se encontraron juegos con los filtros seleccionados.</p>';
        }
      }
    };
  }

  // ✅ Botón de favoritos
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('fav-btn')) {
      e.stopPropagation();
      const gameId = e.target.dataset.id;

      let biblioteca = JSON.parse(localStorage.getItem('biblioteca')) || [];
      if (!biblioteca.includes(gameId)) {
        biblioteca.push(gameId);
        localStorage.setItem('biblioteca', JSON.stringify(biblioteca));
      }

      window.location.href = 'juegos favoritos.html';
    }
  });
});
