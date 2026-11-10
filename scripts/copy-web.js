// ============================================================
// Copia los archivos de la PWA a www/ para que Capacitor
// los empaquete dentro del APK.
// Se ejecuta antes de "npx cap sync".
// ============================================================
const fs   = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dst  = path.join(root, "www");

function copyRecursive(srcPath, dstPath) {
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dstPath)) fs.mkdirSync(dstPath, { recursive: true });
        for (const f of fs.readdirSync(srcPath)) {
            copyRecursive(path.join(srcPath, f), path.join(dstPath, f));
        }
    } else {
        fs.copyFileSync(srcPath, dstPath);
    }
}

// limpiar www/ si existe
if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
}
fs.mkdirSync(dst, { recursive: true });

// archivos / carpetas que forman la PWA
const items = [
    "index.html",
    "manifest.webmanifest",
    "service-worker.js",
    "css",
    "js",
    "assets"
];

for (const item of items) {
    const src = path.join(root, item);
    const out = path.join(dst, item);
    if (fs.existsSync(src)) {
        copyRecursive(src, out);
        console.log("copiado:", item);
    } else {
        console.warn("  no existe:", item);
    }
}

console.log("Web assets copiados a www/");
