document.addEventListener('DOMContentLoaded', async () => {
  const contenedor = document.getElementById('contenedor-boton-juego');
  const gameId = new URLSearchParams(window.location.search).get('id');

  if (!gameId) {
    contenedor.innerHTML = '<p style="color:red">ID de juego no encontrado en la URL.</p>';
    return;
  }

  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('GamesDB', 2);
    request.onerror = () => reject('Error al abrir la base de datos.');
    request.onsuccess = (event) => resolve(event.target.result);
  });

  const tx = db.transaction(['games', 'gameFiles'], 'readonly');
  const gamesStore = tx.objectStore('games');
  const filesStore = tx.objectStore('gameFiles');

  const gameData = await new Promise((resolve, reject) => {
    const request = gamesStore.get(gameId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('No se encontró el juego.');
  });

  if (!gameData) {
    contenedor.innerHTML = '<p style="color:red">Juego no encontrado en la base de datos.</p>';
    return;
  }

  const fileData = await new Promise((resolve, reject) => {
    const request = filesStore.get(gameId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('No se encontró el archivo del juego.');
  });

  if (!fileData || !fileData.file) {
    contenedor.innerHTML = '<p style="color:red">No hay archivo ZIP asociado a este juego.</p>';
    return;
  }

  contenedor.innerHTML = ''; // Limpia el contenedor

  if (gameData.pricing === 'gratis') {
    const btnGratis = document.createElement('button');
    btnGratis.className = 'boton-juego';
    btnGratis.textContent = 'Descargar Gratis';
    btnGratis.onclick = () => descargarJuego(fileData);
    contenedor.appendChild(btnGratis);
  } else {
    const price = gameData.price || 1;
    const btnPago = document.createElement('a');
    btnPago.className = 'boton-juego';
    btnPago.textContent = `Comprar por $${price} USD con PayPal`;
    btnPago.href = `https://www.paypal.me/TuUsuarioPayPal/${price}`;
    btnPago.target = '_blank';
    btnPago.rel = 'noopener noreferrer';
    contenedor.appendChild(btnPago);
  }
});

function descargarJuego(fileData) {
  const link = document.createElement('a');
  link.href = fileData.file;
  link.download = fileData.fileName || 'juego.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
