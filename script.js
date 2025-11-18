// --- CONFIGURACIÓN EMAILJS ---
const EMAILJS_SERVICE_ID = "service_zhmxodo";
const EMAILJS_TEMPLATE_ID = "template_ow38tym";
const EMAILJS_PUBLIC_KEY = "public_xxxxxxxxxxx"; // tu clave real

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// --- VARIABLES ---
const productsContainer = document.getElementById('products');
const statusEl = document.getElementById('status');
const sendBtn = document.getElementById('sendBtn');
let products = [];

// --- NOMBRE FIJO DE LA MARCA PARA TODO EL SISTEMA ---
const brandName = "ACTIVE COSMETIC";

// --- CARGAR PRODUCTOS ---
fetch('productos.xlsx')
  .then(res => res.arrayBuffer())
  .then(ab => {
    const workbook = XLSX.read(new Uint8Array(ab), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    products = json.map(r => ({
      Familia: r['Familia'] || r['FAMILIA'] || '',
      Nombre: r['Nombre'] || r['NOMBRE'] || '',
      Cont: r['Cont.'] || r['CONT.'] || '',
      Precio: parseFloat(r['COSTO FINAL CON PROMO'] || r['Precio con IVA'] || 0)
    }));

    renderProducts();
    restoreQuantities();
  })
  .catch(err => {
    statusEl.textContent = '❌ Error al leer productos.xlsx.';
    console.error(err);
  });

// --- RENDERIZAR PRODUCTOS AGRUPADOS POR FAMILIA ---
function renderProducts() {
  const groups = {};
  products.forEach((p, i) => {
    const f = p.Familia || 'Sin familia';
    if (!groups[f]) groups[f] = [];
    groups[f].push({ ...p, _idx: i });
  });

  productsContainer.innerHTML = '';

  for (const fam in groups) {
    const g = document.createElement('section');
    g.className = 'group';
    g.innerHTML = `<h2>${fam}</h2>`;

    groups[fam].forEach(p => {
      const div = document.createElement('div');
      div.className = 'product';
      div.innerHTML = `
        <span class='name'>${p.Nombre}</span>
        <span class='cont'>${p.Cont}</span>
        <span class='price'>$${p.Precio.toFixed(2)}</span>
        <span class='qty'><input type='number' min='0' value='0' data-idx='${p._idx}'/></span>
        <span class='subtotal'>$0.00</span>
      `;
      g.appendChild(div);
    });

    productsContainer.appendChild(g);
  }

  // Fila de total general
  const totalRow = document.createElement('div');
  totalRow.className = 'total-row';
  totalRow.innerHTML = `
    <span></span><span></span><span></span>
    <strong>Total General:</strong>
    <strong id="total-general">$0.00</strong>
  `;
  productsContainer.appendChild(totalRow);

  document.querySelectorAll('.qty input').forEach(inp => {
    inp.addEventListener('input', () => {
      updateTotals();
      saveToGlobalOrder();
    });
  });
}

// --- CALCULAR SUBTOTALES Y TOTAL GENERAL ---
function updateTotals() {
  let total = 0;
  document.querySelectorAll('.product').forEach(prod => {
    const inp = prod.querySelector('.qty input');
    const idx = Number(inp.dataset.idx);
    const qty = Number(inp.value) || 0;
    const price = Number(products[idx].Precio) || 0;
    const subtotal = qty * price;
    prod.querySelector('.subtotal').textContent = `$${subtotal.toFixed(2)}`;
    total += subtotal;
  });
  document.getElementById('total-general').textContent = `$${total.toFixed(2)}`;
}

// --- GUARDAR PEDIDO GLOBAL ---
function saveToGlobalOrder() {
  const saved = JSON.parse(localStorage.getItem("pedidoGlobal") || "[]");
  const items = [];

  // Tomar todos los productos con cantidad > 0
  document.querySelectorAll('.qty input').forEach(inp => {
    const q = Number(inp.value) || 0;
    if (q > 0) {
      const p = products[inp.dataset.idx];
      items.push({
        Marca: brandName,
        Nombre: p.Nombre,
        Cont: p.Cont,
        Precio: p.Precio,
        Cantidad: q,
        Subtotal: p.Precio * q
      });
    }
  });

  // Eliminar productos anteriores de esta marca
  const withoutThisBrand = saved.filter(it => it.Marca !== brandName);

  // Agregar los nuevos
  const combined = [...withoutThisBrand, ...items];

  localStorage.setItem("pedidoGlobal", JSON.stringify(combined));
}

// --- RESTAURAR CANTIDADES AL VOLVER ---
function restoreQuantities() {
  const saved = JSON.parse(localStorage.getItem("pedidoGlobal") || "[]");
  const current = saved.filter(it => it.Marca === brandName);

  document.querySelectorAll('.qty input').forEach(inp => {
    const p = products[inp.dataset.idx];
    const found = current.find(it => it.Nombre === p.Nombre && it.Cont === p.Cont);
    if (found) {
      inp.value = found.Cantidad;
    }
  });
  updateTotals();
}

// --- ENVIAR PEDIDO GLOBAL ---
sendBtn.addEventListener('click', async () => {
  const name = document.getElementById('client_name').value.trim();
  const address = document.getElementById('client_address').value.trim();
  const phone = document.getElementById('client_phone').value.trim();
  const email = document.getElementById('client_email').value.trim();

  if (!name || !address || !phone) {
    statusEl.textContent = '⚠️ Completá nombre, dirección y teléfono antes de enviar.';
    return;
  }

  const items = JSON.parse(localStorage.getItem("pedidoGlobal") || "[]");
  if (items.length === 0) {
    statusEl.textContent = '⚠️ No se seleccionó ningún producto.';
    return;
  }

  const total = items.reduce((sum, it) => sum + parseFloat(it.Subtotal), 0);
  const order_text = 
    `📦 Pedido de: ${name}\n🏠 Dirección: ${address}\n📞 Teléfono: ${phone}\n\n` +
    items.map(it => `${it.Marca} - ${it.Nombre} (${it.Cont}) - $${it.Precio} x ${it.Cantidad} = $${it.Subtotal.toFixed(2)}`).join('\n') +
    `\n\n💰 TOTAL GENERAL: $${total.toFixed(2)}`;

  const templateParams = {
    user_name: name,
    user_phone: phone,
    user_address: address,
    order_text,
    order_total: total.toFixed(2)
  };

  statusEl.textContent = '📦 Enviando pedido...';
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    statusEl.textContent = '✅ Pedido enviado correctamente.';
    localStorage.removeItem("pedidoGlobal");
  } catch (err) {
    console.error("Error al enviar:", err);
    statusEl.textContent = '❌ Error al enviar el pedido.';
  }
});

// === CONTADOR GLOBAL DE PEDIDO ===
function updateCartCount() {
  const items = JSON.parse(localStorage.getItem("pedidoGlobal") || "[]");
  const totalQty = items.reduce((sum, it) => sum + Number(it.Cantidad || 0), 0);
  const badge = document.getElementById("cart-count");
  if (badge) badge.textContent = totalQty;
}

// === Escuchar cambios globales ===
document.addEventListener("DOMContentLoaded", updateCartCount);
window.addEventListener("storage", e => {
  if (e.key === "pedidoGlobal") updateCartCount();
});

// Cada vez que guardamos, recalculamos
const _saveToGlobalOrder = saveToGlobalOrder;
saveToGlobalOrder = function() {
  _saveToGlobalOrder();
  updateCartCount();
};
