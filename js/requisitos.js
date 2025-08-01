// Función para manejar los requisitos del sistema
function manejarRequisitos(gameData) {
  if (!gameData.systemRequirements) return;

  // Determinar qué tipo de requisitos tenemos
  if (gameData.systemRequirements.tipo === 'Mínimos') {
    // Solo tenemos requisitos mínimos
    const min = gameData.systemRequirements;
    
    // Requisitos mínimos
    document.getElementById('so').textContent = min.so || 'No especificado';
    document.getElementById('procesador').textContent = min.procesador || 'No especificado';
    document.getElementById('ram').textContent = min.ram || 'No especificado';
    document.getElementById('gpu').textContent = min.gpu || 'No especificado';
    document.getElementById('almacenamiento').textContent = min.almacenamiento || 'No especificado';
    
    // Ocultar sección de requisitos recomendados
    const seccionesH3 = document.querySelectorAll('.perfil-juego h3');
    for (let i = 0; i < seccionesH3.length; i++) {
      if (seccionesH3[i].textContent === 'Requisitos recomendados:') {
        seccionesH3[i].style.display = 'none';
        const siguienteUL = seccionesH3[i].nextElementSibling;
        if (siguienteUL && siguienteUL.tagName === 'UL') {
          siguienteUL.style.display = 'none';
        }
        break;
      }
    }
  } 
  else if (gameData.systemRequirements.tipo === 'Recomendados') {
    // Solo tenemos requisitos recomendados
    const rec = gameData.systemRequirements;
    
    // Ocultar sección de requisitos mínimos
    const seccionesH3 = document.querySelectorAll('.perfil-juego h3');
    for (let i = 0; i < seccionesH3.length; i++) {
      if (seccionesH3[i].textContent === 'Requisitos del sistema:') {
        seccionesH3[i].style.display = 'none';
        const siguienteUL = seccionesH3[i].nextElementSibling;
        if (siguienteUL && siguienteUL.tagName === 'UL') {
          siguienteUL.style.display = 'none';
        }
        break;
      }
    }
    
    // Requisitos recomendados
    const soElements = document.querySelectorAll('#so');
    const procesadorElements = document.querySelectorAll('#procesador');
    const ramElements = document.querySelectorAll('#ram');
    const gpuElements = document.querySelectorAll('#gpu');
    const almacenamientoElements = document.querySelectorAll('#almacenamiento');
    
    if (soElements.length > 1) soElements[1].textContent = rec.so || 'No especificado';
    if (procesadorElements.length > 1) procesadorElements[1].textContent = rec.procesador || 'No especificado';
    if (ramElements.length > 1) ramElements[1].textContent = rec.ram || 'No especificado';
    if (gpuElements.length > 1) gpuElements[1].textContent = rec.gpu || 'No especificado';
    if (almacenamientoElements.length > 1) almacenamientoElements[1].textContent = rec.almacenamiento || 'No especificado';
  }
  else {
    // Formato antiguo o no hay requisitos específicos
    const min = gameData.systemRequirements.min || {};
    const rec = gameData.systemRequirements.rec || {};

    // Requisitos mínimos
    document.getElementById('so').textContent = min.os || 'No especificado';
    document.getElementById('procesador').textContent = min.processor || 'No especificado';
    document.getElementById('ram').textContent = min.ram || 'No especificado';
    document.getElementById('gpu').textContent = min.gpu || 'No especificado';
    document.getElementById('almacenamiento').textContent = min.storage || 'No especificado';

    // Requisitos recomendados
    const soElements = document.querySelectorAll('#so');
    const procesadorElements = document.querySelectorAll('#procesador');
    const ramElements = document.querySelectorAll('#ram');
    const gpuElements = document.querySelectorAll('#gpu');
    const almacenamientoElements = document.querySelectorAll('#almacenamiento');
    
    if (soElements.length > 1) soElements[1].textContent = rec.os || 'No especificado';
    if (procesadorElements.length > 1) procesadorElements[1].textContent = rec.processor || 'No especificado';
    if (ramElements.length > 1) ramElements[1].textContent = rec.ram || 'No especificado';
    if (gpuElements.length > 1) gpuElements[1].textContent = rec.gpu || 'No especificado';
    if (almacenamientoElements.length > 1) almacenamientoElements[1].textContent = rec.storage || 'No especificado';
  }
}