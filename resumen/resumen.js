document.addEventListener("DOMContentLoaded", () => {

  const container = document.getElementById("order-summary");
  const statusEl = document.getElementById("status");
  const MIN_UNIDADES = 40;

  const data = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");

  if (data.length === 0) {
    container.innerHTML = "<p>No hay productos en el pedido.</p>";
    return;
  }

  let totalUnidades = 0;

  container.innerHTML = "";

  // Construcción de productos en resumen
  data.forEach(it => {
    totalUnidades += Number(it.Cantidad);

    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `
      <span><strong>${it.Nombre}</strong> (${it.Cont})</span>
      <span>${it.Cantidad} unidades</span>
    `;
    container.appendChild(div);
  });

  const tot = document.createElement("h3");
  tot.textContent = `🔢 Total de unidades: ${totalUnidades}`;
  container.appendChild(tot);

  // Validación mínimo
  if (totalUnidades < MIN_UNIDADES) {
    const alert = document.createElement("p");
    alert.style.color = "red";
    alert.style.fontWeight = "bold";
    alert.textContent = `⚠️ El pedido mínimo es de ${MIN_UNIDADES} unidades.`;
    container.appendChild(alert);

    const btn = document.getElementById("sendBtn");
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  }

  // ================================
  // 📤 ENVÍO DEL PEDIDO (FORMSPREE)
  // ================================
  document.getElementById("sendBtn").addEventListener("click", async () => {

    if (totalUnidades < MIN_UNIDADES) {
      statusEl.textContent = "❌ No se puede enviar: mínimo 40 unidades.";
      return;
    }

    const name = document.getElementById("client_name").value.trim();
    const address = document.getElementById("client_address").value.trim();
    const phone = document.getElementById("client_phone").value.trim();
    const email = document.getElementById("client_email").value.trim();
    const obs = document.getElementById("obs")?.value || "";


    if (!name || !address || !phone) {
      statusEl.textContent = "⚠️ Completá nombre, dirección y teléfono.";
      return;
    }

    const pedidoTexto =
      data.map(it => `${it.Nombre} (${it.Cont}) — ${it.Cantidad} unidades`).join("\n");

const body = {
  proyecto: "ACTIVE COSMETIC",
  name,
  address,
  phone,
  email,
  total_unidades: totalUnidades,
  pedido: pedidoTexto,
  comentarios: obs,

  // 🆕 Subject limpio con prefijo + nombre del cliente
  _subject: `Pedido recibido – ${name}`,

  // Copia al cliente
  _cc: email
};


 
    statusEl.textContent = "📨 Enviando pedido...";

    try {
      const res = await fetch("https://formspree.io/f/xpwkzwoy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        statusEl.textContent = "✅ Pedido enviado correctamente.";
        showAlert("Pedido enviado correctamente ✔", true);

        // IMPORTANTE → borrar pedido al enviar
        sessionStorage.removeItem("pedidoGlobal");
      } else {
        showAlert("Error al enviar el pedido ❌", false);
        statusEl.textContent = "❌ Error al enviar.";
      }

    } catch (err) {
      showAlert("Error al enviar el pedido ❌", false);
      statusEl.textContent = "❌ Error al enviar.";
    }
  });


  // =====================================================
  // 📄 DESCARGAR PDF PROFESIONAL (CON LOGO + ENCABEZADO)
  // =====================================================
  document.getElementById("downloadPdfBtn").addEventListener("click", async () => {

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "mm", "a4");

      const data = JSON.parse(sessionStorage.getItem("pedidoGlobal") || "[]");
      if (data.length === 0) {
          alert("No hay productos en el pedido.");
          return;
      }

      const total = data.reduce((s, it) => s + Number(it.Cantidad), 0);

      // Fecha & hora
      const fecha = new Date().toLocaleDateString();
      const hora = new Date().toLocaleTimeString();

      // Cargar logo
      try {
          const logo = await fetch("../logos/activelogo.png")
              .then(res => res.blob())
              .then(blob => new Promise(resolve => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
              }));

          doc.addImage(logo, "PNG", 10, 10, 45, 25);
      } catch (e) {
          console.warn("⚠ No se pudo cargar el logo en PDF.");
      }

      let y = 45;

      // Encabezado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Resumen de pedido", 10, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Fecha: ${fecha}   -   Hora: ${hora}`, 10, y);
      y += 8;

      // Línea divisoria
      doc.setLineWidth(0.4);
      doc.line(10, y, 200, y);
      y += 12;

      // Título lista
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Productos seleccionados:", 10, y);
      y += 10;

      // Items
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      data.forEach(it => {

          doc.text(`• ${it.Nombre}`, 10, y);
          y += 6;
          doc.text(`  Presentación: ${it.Cont}`, 12, y);
          y += 6;
          doc.text(`  Cantidad: ${it.Cantidad} unidades`, 12, y);
          y += 8;

          // Línea separadora
          doc.setDrawColor(180);
          doc.setLineWidth(0.2);
          doc.line(10, y, 200, y);
          y += 6;

          if (y > 260) {
              doc.addPage();
              y = 20;
          }
      });

      // TOTAL
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(`TOTAL DE UNIDADES: ${total}`, 10, y);

      doc.save("pedido_ACTIVE_COSMETIC.pdf");
  });

});


// ============================
// 🔔 ALERTA VISUAL GLOBAL
// ============================
function showAlert(msg, success = false) {
    const box = document.getElementById("alertBox");
    const content = document.getElementById("alertContent");

    box.style.background = success ? "#15c415" : "#d7263d";
    content.textContent = msg;

    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 3000);
}
