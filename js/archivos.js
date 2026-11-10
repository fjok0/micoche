// ============================================================
// MICOCHE - Guardar / compartir archivos (JSON, PDF)
//
// Dentro del APK (Capacitor) el WebView de Android NO admite
// navigator.share con archivos ni descargas de blobs, asi que se
// usan los plugins nativos Filesystem + Share: el archivo se escribe
// en la cache de la app y se abre el menu nativo de compartir
// (Drive, Gmail, WhatsApp, Archivos...).
//
// En el navegador (PWA) se mantiene el comportamiento web: Web Share
// con archivos si esta disponible y, si no, descarga directa.
//
// Se llama a los plugins con Capacitor.nativePromise (lo inyecta el
// puente nativo), por lo que no hace falta ningun bundler ni libreria.
// ============================================================

(function () {
    "use strict";

    function esNativo() {
        return !!(window.Capacitor &&
                  typeof window.Capacitor.isNativePlatform === "function" &&
                  window.Capacitor.isNativePlatform() &&
                  typeof window.Capacitor.nativePromise === "function");
    }

    function webPuedeCompartir(mime) {
        try {
            return !!(navigator.canShare && navigator.canShare({
                files: [new File(["x"], "x", { type: mime })]
            }));
        } catch (e) { return false; }
    }

    /** true si hay alguna via de "compartir" (nativa o Web Share). */
    function puedeCompartir(mime) {
        return esNativo() || webPuedeCompartir(mime);
    }

    function blobABase64(blob) {
        return new Promise(function (resolve, reject) {
            const r = new FileReader();
            r.onload = function () {
                const s = String(r.result);
                resolve(s.slice(s.indexOf(",") + 1));
            };
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    }

    function esCancelacion(err) {
        if (!err) return false;
        const msg = String(err.message || err).toLowerCase();
        return err.name === "AbortError" || msg.indexOf("cancel") !== -1 || msg.indexOf("abort") !== -1;
    }

    // ---------------- via nativa (APK) ----------------

    function describir(err) {
        if (!err) return "(sin detalle)";
        if (typeof err === "string") return err;
        const partes = [];
        if (err.message) partes.push(err.message);
        if (err.code) partes.push("codigo " + err.code);
        if (!partes.length) { try { partes.push(JSON.stringify(err)); } catch (e) { partes.push(String(err)); } }
        return partes.join(" | ");
    }

    async function compartirNativo(opts) {
        const cap = window.Capacitor;

        // Texto -> utf8; binario (PDF) -> base64 (sin "encoding")
        const escritura = {
            path:      opts.filename,
            directory: "CACHE",
            recursive: true
        };
        if (typeof opts.text === "string") {
            escritura.data = opts.text;
            escritura.encoding = "utf8";
        } else {
            escritura.data = opts.base64;
        }

        let res;
        try {
            res = await cap.nativePromise("Filesystem", "writeFile", escritura);
        } catch (err) {
            throw new Error("[APK] Filesystem.writeFile: " + describir(err));
        }
        if (!res || !res.uri) {
            throw new Error("[APK] Filesystem.writeFile no devolvio ruta: " + describir(res));
        }

        try {
            await cap.nativePromise("Share", "share", {
                title:       opts.title || opts.filename,
                dialogTitle: opts.dialogTitle || "Guardar o compartir",
                files:       [res.uri]
            });
        } catch (err) {
            if (esCancelacion(err)) return "cancelado";
            throw new Error("[APK] Share.share (" + res.uri + "): " + describir(err));
        }
        return "compartido";
    }

    // ---------------- via web (navegador / PWA) ----------------

    async function compartirOdescargarWeb(opts, soloDescarga) {
        let blob;
        if (typeof opts.text === "string") {
            blob = new Blob([opts.text], { type: opts.mime });
        } else if (opts.blob) {
            blob = opts.blob;
        } else {
            const bin = atob(opts.base64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            blob = new Blob([bytes], { type: opts.mime });
        }

        if (!soloDescarga && navigator.canShare && navigator.share) {
            const file = new File([blob], opts.filename, { type: opts.mime });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: opts.title || opts.filename });
                } catch (err) {
                    if (esCancelacion(err)) return "cancelado";
                    throw new Error("[web] navigator.share: " + describir(err));
                }
                return "compartido";
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = opts.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // No revocar al instante: en Chrome Android cancela la descarga
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        return "descargado";
    }

    /**
     * Guarda/comparte un archivo.
     * @param {{filename:string, mime:string, title?:string, dialogTitle?:string,
     *          text?:string, base64?:string, blob?:Blob}} opts
     *        Pasar el contenido en "text" (JSON, utf8) o en "base64" (PDF) o "blob" (solo web).
     * @param {boolean} [soloDescarga] en web fuerza descarga directa (ignorado en el APK)
     * @returns {Promise<"compartido"|"descargado"|"cancelado">}
     */
    async function guardarOCompartir(opts, soloDescarga) {
        if (esNativo()) {
            if (typeof opts.text !== "string" && typeof opts.base64 !== "string") {
                opts = Object.assign({}, opts, { base64: await blobABase64(opts.blob) });
            }
            return compartirNativo(opts);
        }
        return compartirOdescargarWeb(opts, soloDescarga);
    }

    /** Resumen del entorno, para diagnosticar fallos en un movil real. */
    function entorno() {
        const cap = window.Capacitor;
        return "nativo=" + esNativo() +
               ", plataforma=" + (cap && typeof cap.getPlatform === "function" ? cap.getPlatform() : "web") +
               ", nativePromise=" + !!(cap && cap.nativePromise) +
               ", navigator.share=" + (typeof navigator.share) +
               ", navigator.canShare=" + (typeof navigator.canShare);
    }

    window.MICOCHE_ARCHIVOS = { esNativo, puedeCompartir, guardarOCompartir, describir, entorno };
})();
