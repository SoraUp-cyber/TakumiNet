 document.getElementById('toggle-rules').addEventListener('click', function() {
    const rules = document.getElementById('rules-content');
    const isHidden = window.getComputedStyle(rules).display === 'none';

    if (isHidden) {
      rules.style.display = 'block';
      this.textContent = 'Ocultar reglas para crear un foro';

      // Espera mínima y hace scroll suave
      setTimeout(() => {
        rules.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else {
      rules.style.display = 'none';
      this.textContent = 'Mostrar reglas para crear un foro';
    }
  });