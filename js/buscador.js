document.addEventListener("DOMContentLoaded", () => {
  const STYLES = {
    resultBox: {
      position: "absolute",
      top: "calc(100% + 4px)",
      left: "0",
      right: "0",
      backgroundColor: "#222",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
      maxHeight: "220px",
      overflowY: "auto",
      zIndex: "1000",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      color: "#eee",
      padding: "6px 0",
      userSelect: "none",
      border: "none",
      display: "none"
    },
    resultItem: {
      padding: "10px 20px",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
      fontWeight: "500",
      color: "#00bcd4"
    },
    hoverItem: {
      backgroundColor: "#333"
    },
    noResults: {
      padding: "10px 20px",
      color: "#aaa",
      fontStyle: "italic"
    }
  };

  const searchForm = document.querySelector(".search-box");
  if (!searchForm) return;

  const searchInput = document.querySelector(".search-input");
  if (!searchInput) return;

  const resultBox = document.createElement("div");
  resultBox.id = "search-results";
  resultBox.setAttribute("role", "listbox");
  resultBox.setAttribute("aria-expanded", "false");
  Object.assign(resultBox.style, STYLES.resultBox);

  searchForm.style.position = "relative";
  searchForm.appendChild(resultBox);

  const clearResults = () => {
    resultBox.innerHTML = "";
    resultBox.style.display = "none";
    resultBox.setAttribute("aria-expanded", "false");
  };

  const showResults = () => {
    resultBox.style.display = "block";
    resultBox.setAttribute("aria-expanded", "true");
  };

  // 🧠 NUEVO: función para obtener juegos desde IndexedDB
  function buscarJuegosEnIndexedDB(query) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("GamesDB", 1);
      request.onerror = () => reject("Error al abrir la base de datos.");
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction("games", "readonly");
        const store = transaction.objectStore("games");

        const juegos = [];
        store.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            const game = cursor.value;
            if (
              game &&
              game.title &&
              game.title.toLowerCase().includes(query)
            ) {
              juegos.push(game);
            }
            cursor.continue();
          } else {
            resolve(juegos);
          }
        };
      };
    });
  }

  const handleInput = debounce(async () => {
    const query = searchInput.value.trim().toLowerCase();
    clearResults();

    if (!query) return;

    try {
      const juegos = await buscarJuegosEnIndexedDB(query);

      if (juegos.length === 0) {
        const noResults = document.createElement("div");
        noResults.textContent = "No se encontraron juegos";
        Object.assign(noResults.style, STYLES.noResults);
        resultBox.appendChild(noResults);
        showResults();
        return;
      }

      juegos.forEach((juego) => {
        if (!juego.id) return;

        const item = document.createElement("div");
        item.textContent = juego.title;
        item.setAttribute("role", "option");
        Object.assign(item.style, STYLES.resultItem);

        item.addEventListener("mouseenter", () =>
          Object.assign(item.style, STYLES.hoverItem)
        );
        item.addEventListener("mouseleave", () =>
          Object.assign(item.style, STYLES.resultItem)
        );

        item.addEventListener("click", () => {
          window.location.href = `perfil-juegos.html?id=${encodeURIComponent(
            juego.id
          )}`;
        });

        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            window.location.href = `perfil-juegos.html?id=${encodeURIComponent(
              juego.id
            )}`;
          }
        });

        item.tabIndex = 0;
        resultBox.appendChild(item);
      });

      showResults();
    } catch (error) {
      console.error("Error al buscar en IndexedDB:", error);
    }
  }, 300);

  searchInput.addEventListener("input", handleInput);
  searchInput.addEventListener("focus", handleInput);

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (resultBox.children.length > 0) {
      const firstResult = resultBox.firstChild;
      if (firstResult) firstResult.click();
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) {
      clearResults();
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearResults();
      searchInput.blur();
    }
  });

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
});
