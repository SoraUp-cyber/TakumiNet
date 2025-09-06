document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".header_tab");
  const contents = {
    vista: document.getElementById("tab-vista"), // Asegúrate de tener este en tu HTML
    comunidad: document.getElementById("tab-comunidad")
  };

  tabs.forEach(tab => {
    tab.addEventListener("click", e => {
      e.preventDefault();
      const target = tab.dataset.tab;

      // Quitar clase activa a todas las pestañas
      tabs.forEach(t => t.classList.remove("active"));

      // Ocultar todos los contenidos
      Object.values(contents).forEach(c => {
        if (c) c.style.display = "none";
      });

      // Activar pestaña y mostrar contenido
      tab.classList.add("active");
      if (contents[target]) {
        contents[target].style.display = "block";
      }
    });
  });
});

