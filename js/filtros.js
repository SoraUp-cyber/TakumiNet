document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('contenedor-juegos');
  const form = document.getElementById('gameFilters');
  const resetBtn = document.getElementById('resetFilters');
  let db;

  // 🔸 Mostrar estado (cargando, error, sin resultados)
  function mostrarEstado(mensaje, tipo = 'estado') {
    contenedor.innerHTML = `<div class="${tipo}">${mensaje}</div>`;
  }

  // 🔹 Abrir IndexedDB
  const request = indexedDB.open('GamesDB', 2);

  request.onerror = (event) =>
    console.error('❌ Error al abrir la base de datos:', event.target.error);

  request.onsuccess = (event) => {
    db = event.target.result;
    cargarJuegosFiltrados(db);
  };

  // 🔹 Al aplicar filtros
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (db) cargarJuegosFiltrados(db);
  });

  // 🔹 Botón para borrar filtros
  resetBtn.addEventListener('click', () => {
    form.reset();
    if (db) cargarJuegosFiltrados(db);
  });

  // 🔹 Mostrar juegos según filtros
  function cargarJuegosFiltrados(db) {
    const genre = form.genre.value;
    const category = form.category.value;
    const price = form.price.value;
    const requirements = form.requirements.value;

    mostrarEstado('Cargando juegos...');

    const tx = db.transaction(['games', 'gameImages'], 'readonly');
    const gamesStore = tx.objectStore('games');
    const imagesStore = tx.objectStore('gameImages');

    const cursor = gamesStore.openCursor();
    let juegos = [];

    cursor.onsuccess = async (e) => {
      const current = e.target.result;

      if (current) {
        const game = current.value;
        const cumple =
          (!genre || game.genre === genre) &&
          (!category || game.category === category) &&
          (!price || game.pricing === price) &&
          (!requirements || game.requirements === requirements);

        if (cumple) juegos.push(game);
        current.continue();
      } else {
        if (juegos.length === 0) {
          mostrarEstado('No se encontraron juegos con los filtros seleccionados.', 'sin-juegos');
          return;
        }

        mostrarJuegos(juegos, imagesStore);
      }
    };
  }

  // 🔹 Mostrar tarjetas de juegos
  async function mostrarJuegos(juegos, imagesStore) {
    contenedor.innerHTML = '';

    for (const juego of juegos) {
      const portada = await obtenerPortada(juego.id, imagesStore);

      const card = document.createElement('div');
      card.className = 'juego-card';
      card.dataset.id = juego.id;

      card.innerHTML = `
        <div class="juego-portada">
          <img src="${portada}" alt="${juego.title}" class="portada-img">
        </div>
        <div class="juego-info">
          <h3>${juego.title}</h3>
          <p class="juego-categoria">${juego.category || 'Sin categoría'} • ${juego.genre || 'Sin género'}</p>
          <p class="juego-descripcion">${juego.description?.slice(0, 60) || 'Sin descripción'}${juego.description?.length > 60 ? '...' : ''}</p>
          <div class="juego-metadata">
            <span class="juego-precio">${juego.pricing === 'gratis' ? 'Gratis' : `$${(juego.price || 0).toFixed(2)}`}</span>
            <button class="fav-btn" data-id="${juego.id}" title="Agregar a Biblioteca">❤</button>
          </div>
        </div>
      `;

      // Ir a perfil
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('fav-btn')) {
          window.location.href = `perfil-juegos.html?id=${juego.id}`;
        }
      });

      // Hover efecto
      card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.02)');
      card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');

      contenedor.appendChild(card);
    }
  }

  // 🔹 Obtener portada
  function obtenerPortada(gameId, store) {
    return new Promise((resolve) => {
      const req = store.get(gameId);
      req.onsuccess = () => {
        const portada = req.result?.cover?.base64;
        resolve(portada || 'https://via.placeholder.com/315x250?text=Sin+portada');
      };
      req.onerror = () => resolve('https://via.placeholder.com/315x250?text=Sin+portada');
    });
  }

  // 🔹 Botón de favoritos
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('fav-btn')) {
      e.stopPropagation();
      const id = e.target.dataset.id;

      let biblioteca = JSON.parse(localStorage.getItem('biblioteca')) || [];
      if (!biblioteca.includes(id)) {
        biblioteca.push(id);
        localStorage.setItem('biblioteca', JSON.stringify(biblioteca));
      }

      window.location.href = 'juegos favoritos.html';
    }
  });
});
