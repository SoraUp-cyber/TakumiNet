document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('id');
    const contenedorBoton = document.getElementById('contenedor-boton-juego');

    if (!gameId) return console.error('❌ No se encontró el ID del juego en la URL.');

    const request = indexedDB.open('GamesDB', 2);

    request.onerror = () => console.error('❌ Error al abrir la base de datos.');

    request.onsuccess = (event) => {
        const db = event.target.result;
        const tx = db.transaction(['games', 'gameImages', 'gameFiles'], 'readonly');
        const gamesStore = tx.objectStore('games');
        const imagesStore = tx.objectStore('gameImages');
        const filesStore = tx.objectStore('gameFiles');

        const getGame = gamesStore.get(gameId);
        const getImages = imagesStore.get(gameId);
        const getFile = filesStore.get(gameId);

        Promise.all([getGame, getImages, getFile].map(req =>
            new Promise(resolve => req.onsuccess = () => resolve(req.result))
        )).then(([game, images, fileData]) => {
            if (!game) return console.error('❌ Juego no encontrado.');

            const boton = document.createElement('button');
            boton.className = 'btn-juego';
            boton.innerHTML = game.pricing === 'gratis'
                ? `<i class="fas fa-download" style="margin-right: 6px;"></i> Descargar Juego`
                : `<i class="fab fa-paypal" style="margin-right: 6px;"></i> Comprar por $${game.price.toFixed(2)}`;

            boton.style.cssText = `
                background: linear-gradient(135deg, ${game.pricing === 'gratis' ? '#09ff2a' : '#ffc439'}, #1c1c1c);
                color: #ffffff;
                font-size: 18px;
                font-weight: bold;
                border: none;
                border-radius: 10px;
                padding: 14px 24px;
                cursor: pointer;
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 20px auto;
                text-align: center;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;

            boton.addEventListener('mouseover', () => boton.style.boxShadow = '0 4px 15px rgba(0,255,153,0.4)');
            boton.addEventListener('mouseout', () => boton.style.boxShadow = 'none');

            if (game.pricing === 'gratis') {
                boton.addEventListener('click', () => mostrarModalInstalacion(game, images, fileData));
            } else {
                boton.addEventListener('click', () => {
                    window.location.href = `paypal.html?id=${game.id}&price=${game.price}`;
                });
            }

            contenedorBoton.appendChild(boton);
        });
    };

    function mostrarModalInstalacion(game, images, fileData) {
        const base64Data = fileData?.file?.split(',')[1] || '';
        const fileSizeBytes = atob(base64Data).length;
        const sizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
        const requiredSpace = (fileSizeBytes * 1.1 / (1024 * 1024)).toFixed(2);

        const defaultPath = `C:\\Games\\${game.title.replace(/[^a-z0-9]/gi, '')}`;

        const modalHTML = `
        <div id="instalacion-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999;">
            <div style="background:#1c1c1c; color:#fff; border-radius:12px; width:500px; max-width:90%;">
                <div style="height:200px; background:#333; display:flex; align-items:center; justify-content:center;">
                    <img src="${images?.cover?.base64 || 'https://via.placeholder.com/500x200?text=Sin+portada'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="padding:20px;">
                    <h2>Instalar ${game.title}</h2>
                    <p>Tamaño descarga: ${sizeMB} MB</p>
                    <p>Espacio requerido: ${requiredSpace} MB</p>

                    <label>Ruta de instalación:</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="ruta-carpeta" value="${defaultPath}" style="flex:1; padding:8px; border-radius:6px; border:none; background:#333; color:#fff;">
                        <button id="explorar-carpeta" style="background:#555; color:#fff; padding:8px 12px; border:none; border-radius:6px;">Explorar</button>
                    </div>

                    <div style="margin-bottom:10px;"><input type="checkbox" id="auto-update" checked> <label for="auto-update">Actualización automática</label></div>
                    <div style="margin-bottom:10px;"><input type="checkbox" id="shortcut" checked> <label for="shortcut">Crear acceso directo</label></div>

                    <div style="display:flex; justify-content:space-between;">
                        <button id="cancelar-instalacion" style="background:#555; color:#fff; padding:8px 16px; border:none; border-radius:6px;">Cancelar</button>
                        <button id="confirmar-instalacion" style="background:#00c853; color:#fff; padding:8px 16px; border:none; border-radius:6px;">Instalar</button>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('explorar-carpeta').addEventListener('click', () => {
            const nuevaRuta = prompt("Ruta de instalación:", document.getElementById('ruta-carpeta').value);
            if (nuevaRuta) document.getElementById('ruta-carpeta').value = nuevaRuta;
        });

        document.getElementById('cancelar-instalacion').addEventListener('click', () => {
            document.getElementById('instalacion-modal').remove();
        });

        document.getElementById('confirmar-instalacion').addEventListener('click', () => {
            const btn = document.getElementById('confirmar-instalacion');
            btn.textContent = 'Instalando...';
            btn.disabled = true;
            setTimeout(() => {
                document.getElementById('instalacion-modal').remove();
                descargarJuego(game.id, fileData);
            }, 1000);
        });
    }

    function descargarJuego(id, fileData) {
        if (!fileData?.file) {
            alert('❌ No se encontró el archivo del juego.');
            return;
        }

        const base64 = fileData.file.split(',')[1];
        const byteCharacters = atob(base64);
        const byteArrays = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays[i] = byteCharacters.charCodeAt(i);
        }

        const blob = new Blob([byteArrays], { type: 'application/zip' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileData.fileName || 'juego.zip';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert('✅ Descarga completada con éxito.');
        }, 100);
    }
});
