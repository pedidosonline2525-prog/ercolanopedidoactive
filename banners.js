document.addEventListener("DOMContentLoaded", cargarBanners);

async function cargarBanners() {
    const SHEET_ID = "1Q2V_gkxmSpZWAEIsfRNsuh_LQsgP5uUAKREQGmiDivI";
    const GID = "0";
    const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

    console.log("banners.js → cargando CSV…");

    try {
        const respuesta = await fetch(URL);
        const csv = await respuesta.text();
        console.log("banners.js → CSV recibido");

        const filas = csv.trim().split("\n").map(f => f.split(","));
        const datos = filas.slice(1);
        const banners = datos.filter(f => f[0] && f[0].trim() !== "");
        console.log("banners.js → banners válidos:", banners.length);

        const contenedor = document.querySelector(".banners-container");
        if (!contenedor) {
            console.error("banners.js → ERROR: no existe .banners-container en el HTML");
            return;
        }

        // Helper: limpia la URL que viene del sheet
        function cleanUrl(s) {
            if (!s) return "";
            let t = s.trim();
            // quitar comillas si las trae
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
                t = t.slice(1, -1).trim();
            }
            return t;
        }

        // Extraer ID de distintos tipos de links de Drive
        function extractDriveId(url) {
            if (!url) return null;
            // /d/ID/
            let m = url.match(/\/d\/([^\/\?]+)(?:[\/\?]|$)/);
            if (m && m[1]) return m[1];
            // id=ID
            m = url.match(/[?&]id=([^&]+)/);
            if (m && m[1]) return m[1];
            return null;
        }

        // Generar posibles URLs públicas para probar
        function candidateUrlsFromDriveId(id) {
            if (!id) return [];
            return [
                `https://drive.google.com/uc?export=view&id=${id}`,       // funciona en muchos casos
                `https://drive.google.com/uc?export=download&id=${id}`,   // fuerza descarga (a veces muestra)
                `https://drive.google.com/thumbnail?authuser=0&sz=w1600&id=${id}`, // miniatura grande
                `https://lh3.googleusercontent.com/d/${id}`,              // intento alternativo (menos confiable)
            ];
        }

        // Intenta una lista de URLs secuencialmente hasta que alguna cargue
        function tryLoadImage(urls, imgElement, filaIndex) {
            return new Promise(resolve => {
                let idx = 0;
                function intentar() {
                    if (idx >= urls.length) {
                        resolve(false);
                        return;
                    }
                    const u = urls[idx++];
                    console.log(`banners.js → intentando (fila ${filaIndex}):`, u);
                    // asignar src y esperar eventos
                    imgElement.src = u;
                    const onLoad = () => {
                        cleanup();
                        console.log(`banners.js → imagen cargada OK (fila ${filaIndex}) -> ${u}`);
                        resolve(true);
                    };
                    const onError = () => {
                        cleanup();
                        console.warn(`banners.js → fallo cargando (fila ${filaIndex}) -> ${u}`);
                        intentar(); // probar siguiente
                    };
                    function cleanup() {
                        imgElement.removeEventListener("load", onLoad);
                        imgElement.removeEventListener("error", onError);
                    }
                    imgElement.addEventListener("load", onLoad);
                    imgElement.addEventListener("error", onError);
                }
                intentar();
            });
        }

        // Procesar cada fila
        for (let i = 0; i < banners.length; i++) {
            const fila = banners[i];
            const rawUrl = cleanUrl(fila[0]);
            const texto = fila[2] ? fila[2].trim() : "";

            // preparar contenedor
            const div = document.createElement("div");
            div.className = "banner-item";
            const img = document.createElement("img");
            img.alt = texto || "banner";
            // mostrar placeholder pequeño hasta que cargue o falle
            img.width = 300;
            img.height = 150;

            const p = document.createElement("p");
            p.textContent = texto;

            div.appendChild(img);
            div.appendChild(p);
            contenedor.appendChild(div);

            // Si la URL es un link directo (no Drive) probar directo
            if (!/drive\.google\.com|docs\.google\.com|drive\.googleusercontent\.com|lh3\.googleusercontent\.com/.test(rawUrl)) {
                // intento directo con la URL que venga
                const success = await tryLoadImage([rawUrl], img, i + 2);
                if (!success) {
                    console.error(`banners.js → ERROR cargando (fila ${i + 2}):`, rawUrl);
                }
                continue;
            }

            // extraer ID y generar candidates
            const id = extractDriveId(rawUrl);
            if (!id) {
                console.error("banners.js → No se pudo extraer ID en fila", i + 2, rawUrl);
                continue;
            }

            const candidates = candidateUrlsFromDriveId(id);
            const ok = await tryLoadImage(candidates, img, i + 2);
            if (!ok) {
                console.error(`banners.js → ERROR cargando (fila ${i + 2}):`, candidates[0]);
            }
        }

        console.log("banners.js → BANNERS LISTOS");
    } catch (error) {
        console.error("banners.js → ERROR GENERAL:", error);
    }
}
