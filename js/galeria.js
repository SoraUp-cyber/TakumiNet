document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCaptura');
  const inputImagen = document.getElementById('inputImagen');
  const galeria = document.getElementById('galeriaCapturas');

  let capturas = JSON.parse(localStorage.getItem('capturas')) || [];

  function getCurrentUserData() {
    const token = sessionStorage.getItem('current_token');
    if (!token) return null;
    const appData = JSON.parse(localStorage.getItem('takumi_login_system')) || {};
    const session = appData.sessions?.[token];
    if (!session) return null;
    return appData.users?.[session.username.toLowerCase()];
  }

  function getAvatarAndUsername() {
    const userData = getCurrentUserData();
    const username = userData?.username || 'Invitado';
    const avatar = userData?.avatar || null;
    return { username, avatar };
  }

  function guardarCapturas() {
    localStorage.setItem('capturas', JSON.stringify(capturas));
  }

  function obtenerReaccionesUsuario() {
    const token = sessionStorage.getItem('current_token');
    if (!token) return {};
    return JSON.parse(localStorage.getItem(`reacciones_${token}`)) || {};
  }

  function guardarReaccionesUsuario(reacciones) {
    const token = sessionStorage.getItem('current_token');
    if (token) {
      localStorage.setItem(`reacciones_${token}`, JSON.stringify(reacciones));
    }
  }

  function obtenerReportesUsuario() {
    const token = sessionStorage.getItem('current_token');
    if (!token) return {};
    return JSON.parse(localStorage.getItem(`reportes_${token}`)) || {};
  }

  function guardarReportesUsuario(reportes) {
    const token = sessionStorage.getItem('current_token');
    if (token) {
      localStorage.setItem(`reportes_${token}`, JSON.stringify(reportes));
    }
  }

  function mostrarNotificacion(mensaje, tipo = 'info') {
    const noti = document.createElement('div');
    noti.className = `notificacion ${tipo}`;
    noti.innerText = mensaje;
    document.body.appendChild(noti);
    setTimeout(() => {
      noti.classList.add('mostrar');
      setTimeout(() => {
        noti.classList.remove('mostrar');
        setTimeout(() => noti.remove(), 500);
      }, 3000);
    }, 100);
  }

  function mostrarConfirmacionPersonalizada(mensaje, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const box = document.createElement('div');
    box.className = 'confirm-box';
    box.innerHTML = `
      <p>${mensaje}<br><small>⚠️ No podrás eliminarla después. Estará disponible para otros usuarios.</small></p>
      <button id="confirmYes">Sí, subir</button>
      <button id="confirmNo">Cancelar</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmYes').addEventListener('click', () => {
      callback(true);
      overlay.remove();
    });
    overlay.querySelector('#confirmNo').addEventListener('click', () => {
      callback(false);
      overlay.remove();
    });
  }

  function renderizarGaleria() {
    galeria.innerHTML = '';
    const reaccionesUsuario = obtenerReaccionesUsuario();
    const reportesUsuario = obtenerReportesUsuario();

    capturas.forEach((captura, index) => {
      const div = document.createElement('div');
      div.classList.add('captura-item');

      const { username, avatar } = getAvatarAndUsername();
      captura.likes = captura.likes || 0;
      captura.dislikes = captura.dislikes || 0;

      const reaccion = reaccionesUsuario[index];
      const yaReportado = reportesUsuario[index];

      div.innerHTML = `
        <div class="info-usuario">
          <div class="avatar">
            ${avatar ? `<img src="${avatar}" alt="Avatar">` : `<i class="fas fa-user"></i>`}
          </div>
          <span class="nombre-usuario">${username}</span>
        </div>
        <img src="${captura.imagen}" alt="Captura ${index}" class="captura-img">
        <div class="reacciones">
          <button class="btn-like" data-index="${index}">👍 <span>${captura.likes}</span></button>
          <button class="btn-dislike" data-index="${index}">👎 <span>${captura.dislikes}</span></button>
          <button class="btn-reportar" data-index="${index}">${yaReportado ? '✅ Reportado' : '🚩 Reportar'}</button>
        </div>
      `;

      galeria.appendChild(div);
    });

    // LIKE
    galeria.querySelectorAll('.btn-like').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = btn.dataset.index;
        const reacciones = obtenerReaccionesUsuario();
        const reaccionActual = reacciones[i];

        if (reaccionActual === 'like') {
          capturas[i].likes--;
          delete reacciones[i];
        } else {
          if (reaccionActual === 'dislike') capturas[i].dislikes--;
          capturas[i].likes++;
          reacciones[i] = 'like';
        }

        guardarCapturas();
        guardarReaccionesUsuario(reacciones);
        renderizarGaleria();
      });
    });

    // DISLIKE
    galeria.querySelectorAll('.btn-dislike').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = btn.dataset.index;
        const reacciones = obtenerReaccionesUsuario();
        const reaccionActual = reacciones[i];

        if (reaccionActual === 'dislike') {
          capturas[i].dislikes--;
          delete reacciones[i];
        } else {
          if (reaccionActual === 'like') capturas[i].likes--;
          capturas[i].dislikes++;
          reacciones[i] = 'dislike';
        }

        guardarCapturas();
        guardarReaccionesUsuario(reacciones);
        renderizarGaleria();
      });
    });

    // REPORTAR
    galeria.querySelectorAll('.btn-reportar').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = btn.dataset.index;
        const reportes = obtenerReportesUsuario();

        if (reportes[i]) {
          delete reportes[i];
          mostrarNotificacion("❌ Reporte eliminado.", "info");
        } else {
          mostrarConfirmacionPersonalizada(
            "⚠️ ¿Estás seguro de reportar esta imagen?\n\n🚫 Solo reporta contenido que infringe las normas (violencia, acoso, contenido ilegal o NSFW, etc).\n\nEste acto es irreversible.",
            (confirmado) => {
              if (!confirmado) return;
              reportes[i] = true;
              mostrarNotificacion("🚩 Imagen reportada. Gracias por ayudar a mantener la comunidad segura.", "warning");
              guardarReportesUsuario(reportes);
              renderizarGaleria();
            }
          );
          return;
        }

        guardarReportesUsuario(reportes);
        renderizarGaleria();
      });
    });
  }

  // SUBIR IMAGEN
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = inputImagen.files[0];
    if (!file) return;

    mostrarConfirmacionPersonalizada("¿Estás seguro de subir esta imagen?", (confirmado) => {
      if (!confirmado) return;

      const reader = new FileReader();
      reader.onload = function (event) {
        const nuevaCaptura = {
          imagen: event.target.result,
          fecha: new Date().toISOString(),
          likes: 0,
          dislikes: 0
        };
        capturas.push(nuevaCaptura);
        guardarCapturas();
        renderizarGaleria();
        inputImagen.value = '';
      };
      reader.readAsDataURL(file);
    });
  });

  renderizarGaleria();
});
