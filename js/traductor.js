document.addEventListener("DOMContentLoaded", () => {
  const languageSelect = document.getElementById("language");
  const navegadorLang = navigator.language.slice(0, 2); // ej: "es", "en", "pt"
  const idiomasDisponibles = ["es", "en", "pt", "ja", "zh"];

  // Detectar idioma actual: localStorage > navegador > español
  const currentLang =
    localStorage.getItem("takumi_lang") ||
    (idiomasDisponibles.includes(navegadorLang) ? navegadorLang : "es");

  // Guardar en localStorage si no existía
  localStorage.setItem("takumi_lang", currentLang);

  // Si hay <select id="language">, asignar valor y escuchar cambios
  if (languageSelect) {
    languageSelect.value = currentLang;
    languageSelect.addEventListener("change", () => {
      const selectedLang = languageSelect.value;
      localStorage.setItem("takumi_lang", selectedLang);
      cargarIdioma(selectedLang);
    });
  }

  cargarIdioma(currentLang); // Cargar idioma inicial
});

async function cargarIdioma(lang) {
  try {
    const res = await fetch(`../languages/${lang}.json`);
    const traducciones = await res.json();
    traducirPagina(traducciones);
  } catch (error) {
    console.error("❌ Error cargando idioma:", error);
  }
}

function traducirPagina(traducciones) {
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const clave = elem.getAttribute("data-i18n");
    if (traducciones[clave]) {
      const tag = elem.tagName.toLowerCase();

      // Campos especiales
      if (tag === "input" || tag === "textarea") {
        elem.placeholder = traducciones[clave];
      } else if (tag === "option") {
        elem.textContent = traducciones[clave];
      } else {
        elem.innerHTML = traducciones[clave];
      }
    }
  });
}
