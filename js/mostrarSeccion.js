// archivo: tabs.js

document.addEventListener('DOMContentLoaded', () => {
  // Mostrar la sección y activar la pestaña clickeada
  window.mostrarSeccion = function(event, seccionId) {
    // Ocultar todas las secciones
    const secciones = document.querySelectorAll('.tab-section');
    secciones.forEach(sec => sec.style.display = 'none');

    // Quitar clase "active" a todos los botones
    const botones = document.querySelectorAll('.tab-btn');
    botones.forEach(btn => btn.classList.remove('active'));

    // Mostrar la sección seleccionada
    const seccion = document.getElementById(seccionId);
    if (seccion) seccion.style.display = 'block';

    // Marcar el botón clickeado como activo
    if (event.currentTarget) {
      event.currentTarget.classList.add('active');
    }
  };

  // Opcional: Mostrar la primera sección por defecto al cargar
  const primerBoton = document.querySelector('.tab-btn.active');
  if (primerBoton) {
    const seccionInicial = primerBoton.getAttribute('onclick').match(/'(.*?)'/)[1];
    mostrarSeccion({ currentTarget: primerBoton }, seccionInicial);
  }
});
