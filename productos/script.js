document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENT_ID = "1Q2V_gkxmSpZWAEIsfRNsuh_LQsgP5uUAKREQGmiDivI";
  const GID = "113327199";
  const MIN_UNIDADES = 40;

  const URL = `https://docs.google.com/spreadsheets/d/${DOCUMENT_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  const container = document.getElementById("products");
  const bar = document.getElementById("min-bar");
  const barText = document.getElementById("min-bar-text");
  const goSummaryBtn = document.getElementById("goSummaryBtn") || document.getElementById("go-summary");
  const alertBox = document.getElementById("alertBox");
  const alertContent = document.getElementById("alertContent");

  let products = [];

  function showAlert(msg, success = false) {
    if (!alertBox) {
      alert(msg);
      return;
    }
    alertBox.style.background = success ? "#15c415" : "#d7263d";
    alertContent.textContent = msg;
    alertBox.classList.add("show");
    setTimeout(() => alertBox.classList.remove("show"), 3000);
  }

  // ----------------------------
  // Cargar Google Sheets
  // ----------------------------
  async function loadProductsFromSheets() {
    try {
      const res = await fetch(URL);
      const text = await res.text();

      const json = JSON.parse(text.substring(47, text.length - 2));
      const rows = json.table.rows;


products = rows
  .slice(1) // IGNORAR TITULOS
  .map((r, i) => ({
    _idx: i,
    Familia: r.c[0]?.v || "General",
    Nombre: r.c[1]?.v || "Producto",
    SubFamilia: r.c[2]?.v || ""
  }));


      renderProducts();
      restoreQuantities();
      updateMinBar();
    } catch (err) {
      console.error("Error leyendo Google Sheets:", err);
      container.innerHTML = `<p style="color:#a00; text-align:center;">Error al cargar los productos. Revisá permisos de la Sheet.</p>`;
    }
  }

  // ----------------------------
  // Render visual (diseño intacto)
  // ----------------------------
  function renderProducts() {
    container.innerHTML = "";

    const groups = {};

    products.forEach(p => {
      if (!groups[p.Familia]) groups[p.Familia] = [];
      groups[p.Familia].push(p);
    });

    Object.keys(groups).forEach(fam => {
      const section = document.createElement("section");
      section.className = "group";
      section.innerHTML = `<h2>${fam}</h2>`;

      groups[fam].forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
          <div class="product-title">${p.Nombre}</div>
          <div class="quantity-controls">
            <button class="minus" data-idx="${p._idx}">-</button>
            <input type="number" min="0" value="0" data-idx="${p._idx}">
            <button class="plus" data-idx="${p._idx}">+</button>
          </div>
        `;

        section.appendChild(card);
      });

      container.appendChild(section);
    });

    // Eventos de botones e inputs
    container.querySelectorAll(".plus").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = e.currentTarget.dataset.idx;
        const inp = container.querySelector(`input[data-idx="${idx}"]`);
        inp.value = Number(inp.value || 0) + 1;
        onQuantityChange();
      });
    });

    container.querySelectorAll(".minus").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = e.currentTarget.dataset.idx;
        const inp = container.querySelector(`input[data-idx="${idx}"]`);
        inp.value = Math.max(0, Number(inp.value || 0) - 1);
        onQuantityChange();
      });
    });

    container.querySelectorAll(".quantity-controls input").forEach(inp => {
      inp.addEventListener("input", () => {
        if (inp.value === "" || Number(inp.value) < 0) inp.value = 0;
        onQuantityChange();
      });
    });
  }

  // ----------------------------
  // Guardar cantidades
  // ----------------------------
  function onQuantityChange() {
    saveToSession();
    updateMinBar();
  }

  function saveToSession() {
    const items = [];
    container.querySelectorAll(".quantity-controls input").forEach(inp => {
      const qty = Number(inp.value) || 0;
      if (qty > 0) {
        const p = products[inp.dataset.idx];
        items.push({ Nombre: p.Nombre, Cantidad: qty });
      }
    });

    sessionStorage.setItem("pedidoGlobal", JSON.stringify(items));
  }

  function restoreQuantities() {
    const saved = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");
    saved.forEach(it => {
      const found = products.find(p => p.Nombre === it.Nombre);
      if (found) {
        const inp = container.querySelector(`input[data-idx="${found._idx}"]`);
        if (inp) inp.value = it.Cantidad;
      }
    });
  }

  // ----------------------------
  // Barra de progreso
  // ----------------------------
  function updateMinBar() {
    const saved = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");
    const total = saved.reduce((s, it) => s + Number(it.Cantidad || 0), 0);

    const pct = Math.min(100, Math.round((total / MIN_UNIDADES) * 100));
    bar.style.width = pct + "%";

    if (total === 0) {
      barText.textContent = `0 / ${MIN_UNIDADES} unidades`;
      bar.style.background = "linear-gradient(90deg, #ffa800, #ffce4b)";
    } else if (total < MIN_UNIDADES) {
      const faltan = MIN_UNIDADES - total;
      barText.textContent = `Llevás ${total} de ${MIN_UNIDADES} unidades — faltan ${faltan}`;
      bar.style.background = "linear-gradient(90deg, #ffa800, #ffce4b)";
    } else {
      barText.textContent = `Llevás ${total} unidades — mínimo alcanzado ✔`;
      bar.style.background = "linear-gradient(90deg, #15c415, #5dff5d)";
    }
  }

  // ----------------------------
  // Botón Ir al resumen
  // ----------------------------
  if (goSummaryBtn) {
    goSummaryBtn.addEventListener("click", e => {
      const saved = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");
      const total = saved.reduce((s, it) => s + Number(it.Cantidad || 0), 0);

      if (total < MIN_UNIDADES) {
        e.preventDefault();
        showAlert(`El pedido mínimo es de ${MIN_UNIDADES} unidades. Actualmente llevás ${total}.`);
      } else {
        saveToSession();
      }
    });
  }

  // ----------------------------
  // Iniciar carga
  // ----------------------------
  loadProductsFromSheets();
});
