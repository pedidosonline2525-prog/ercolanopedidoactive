// =====================================================
// 🔐 FIX — BORRAR PEDIDO SOLO AL CERRAR PESTAÑA / NAVEGADOR
// =====================================================
// Ya no detectamos multitarea. Solo marcamos la sesión como activa.
sessionStorage.setItem("active_session", "1");


// =====================================================
// Tu código original arranca acá
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const DOCUMENT_ID = "1Q2V_gkxmSpZWAEIsfRNsuh_LQsgP5uUAKREQGmiDivI";
  const GID = "1348849928";
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
        .slice(1)
        .map((r, i) => ({
          _idx: i,
          Familia: r.c[0]?.v || "General",
          Nombre: r.c[1]?.v || "Producto",
          Tester30: r.c[3]?.v || "",
          Tester90: r.c[4]?.v || ""
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
  // Render visual
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

        const showTesters =
          !p.Familia.toUpperCase().includes("DEO") &&
          p.Tester30 !== "NO" &&
          p.Tester90 !== "NO";

        card.innerHTML = `
          <div class="product-title">${p.Nombre}</div>

          <div class="quantity-controls">
            <input type="number" min="" value="" class="mainQty" data-idx="${p._idx}">
          </div>

          ${showTesters ? `
            <div class="tester-row">
              <label>Tester 30ml</label>
              <input type="number" min="" value="" class="tester30" data-idx="${p._idx}">
            </div>

            <div class="tester-row">
              <label>Tester 90ml</label>
              <input type="number" min="" value="" class="tester90" data-idx="${p._idx}">
            </div>
          ` : ""}
        `;

        section.appendChild(card);
      });

      container.appendChild(section);
    });

    container.querySelectorAll("input").forEach(inp => {
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

    products.forEach(p => {
      const main = Number(document.querySelector(`.mainQty[data-idx="${p._idx}"]`)?.value || 0);
      const t30 = Number(document.querySelector(`.tester30[data-idx="${p._idx}"]`)?.value || 0);
      const t90 = Number(document.querySelector(`.tester90[data-idx="${p._idx}"]`)?.value || 0);

      if (main > 0 || t30 > 0 || t90 > 0) {
        items.push({
          Nombre: p.Nombre,
          Cantidad: main,
          Tester30: t30,
          Tester90: t90
        });
      }
    });

    sessionStorage.setItem("pedidoGlobal", JSON.stringify(items));
  }

  function restoreQuantities() {
    const saved = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");

    saved.forEach(it => {
      const found = products.find(p => p.Nombre === it.Nombre);
      if (found) {
        document.querySelector(`.mainQty[data-idx="${found._idx}"]`).value = it.Cantidad || 0;
        const t30 = document.querySelector(`.tester30[data-idx="${found._idx}"]`);
        const t90 = document.querySelector(`.tester90[data-idx="${found._idx}"]`);
        if (t30) t30.value = it.Tester30 || 0;
        if (t90) t90.value = it.Tester90 || 0;
      }
    });
  }

  // ----------------------------
  // Barra mínima
  // ----------------------------
  function updateMinBar() {
    const saved = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");
    const total = saved.reduce(
      (s, it) => s + Number(it.Cantidad || 0),
      0
    );

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
  // Validación para ir al resumen
  // ----------------------------
  if (goSummaryBtn) {
    goSummaryBtn.addEventListener("click", e => {
      const saved = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");

      const total = saved.reduce(
        (s, it) => s + Number(it.Cantidad || 0),
        0
      );

      if (total < MIN_UNIDADES) {
        e.preventDefault();
        showAlert(`El pedido mínimo es de ${MIN_UNIDADES} unidades. Actualmente llevás ${total}.`);
      } else {
        saveToSession();
      }
    });
  }

  loadProductsFromSheets();
});
