# ═══════════════════════════════════════════════════════
# MICOCHE — Descarga de librerías locales
# Ejecutar UNA SOLA VEZ antes de arrancar el proyecto
# Desde PowerShell: .\descargar-libs.ps1
# ═══════════════════════════════════════════════════════

$libDir = "$PSScriptRoot\js\lib"
New-Item -ItemType Directory -Force $libDir | Out-Null

Write-Host "Descargando Dexie.js..." -ForegroundColor Cyan
Invoke-WebRequest `
  -Uri "https://unpkg.com/dexie@4.0.8/dist/dexie.min.js" `
  -OutFile "$libDir\dexie.min.js"

Write-Host "Descargando pdfmake..." -ForegroundColor Cyan
Invoke-WebRequest `
  -Uri "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js" `
  -OutFile "$libDir\pdfmake.min.js"

Write-Host "Descargando vfs_fonts (Roboto para pdfmake)..." -ForegroundColor Cyan
Invoke-WebRequest `
  -Uri "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js" `
  -OutFile "$libDir\vfs_fonts.js"

Write-Host ""
Write-Host "Librerias descargadas correctamente en js/lib/" -ForegroundColor Green
Write-Host "Ya puedes abrir el proyecto con Live Server en VS Code." -ForegroundColor Green
