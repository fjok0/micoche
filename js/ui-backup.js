(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function abrirModalBackup() {
    $("backup-version").textContent = "Versión: " + MICOCHE_ARCHIVOS.etiquetaVersion();
    limpiarErrorBackup();
    MICOCHE_UI.abrirModal("modal-backup");
  }

  function mostrarErrorBackup(texto) {
    const e = $("backup-error");
    e.textContent = texto;
    e.classList.remove("oculto");
  }

  function limpiarErrorBackup() {
    const e = $("backup-error");
    e.textContent = "";
    e.classList.add("oculto");
  }

  /* ══════════════════════════════════════════
     EXPORTAR
  ══════════════════════════════════════════ */
  async function onExportarBackup() {
    limpiarErrorBackup();
    try {
      const backup = await MICOCHE.exportarBackup();
      const json = JSON.stringify(backup, null, 2);
      const fecha = new Date().toISOString().slice(0, 10);
      const filename = `micoche_backup_${fecha}.json`;

      // APK: menú nativo de compartir. Navegador: Web Share o descarga.
      await MICOCHE_ARCHIVOS.guardarOCompartir({
        filename:    filename,
        mime:        "application/json",
        text:        json,
        title:       "MICOCHE - copia de seguridad",
        dialogTitle: "Guardar copia de seguridad"
      });
    } catch (err) {
      console.error(err);
      MICOCHE_UI.mostrarToast("No se pudo exportar la copia de seguridad", "error");
      // Detalle técnico fijo en pantalla (no desaparece) para diagnosticar el fallo
      mostrarErrorBackup(
        "No se pudo exportar. Detalle: " + MICOCHE_ARCHIVOS.describir(err) +
        "  ·  Entorno: " + MICOCHE_ARCHIVOS.entorno()
      );
    }
  }

  /* ══════════════════════════════════════════
     IMPORTAR
  ══════════════════════════════════════════ */
  function onSeleccionarArchivoImportar() {
    $("input-importar-backup").click();
  }

  function onArchivoImportarSeleccionado(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    limpiarErrorBackup();

    const reader = new FileReader();
    reader.onerror = function () {
      mostrarErrorBackup("No se pudo leer el archivo seleccionado: " +
        MICOCHE_ARCHIVOS.describir(reader.error));
    };
    reader.onload = function () {
      let backup;
      try {
        backup = JSON.parse(reader.result);
      } catch (err) {
        MICOCHE_UI.mostrarToast("El archivo no es un JSON válido", "error");
        mostrarErrorBackup("El archivo seleccionado no es un JSON válido (" + file.name + ").");
        return;
      }

      MICOCHE_UI.confirmar(
        "Importar copia de seguridad",
        "Esto reemplazará todos los vehículos e incidencias actuales por los del archivo. Esta acción no se puede deshacer.",
        async function () {
          try {
            await MICOCHE.importarBackup(backup);
            MICOCHE_UI.cerrarModal("modal-backup");
            MICOCHE_UI.mostrarToast("Copia de seguridad importada", "ok");
            await MICOCHE_UI.mostrarListaVehiculos();
          } catch (err) {
            MICOCHE_UI.mostrarToast(err.message, "error");
            mostrarErrorBackup("No se pudo importar: " + MICOCHE_ARCHIVOS.describir(err));
          }
        },
        "Reemplazar"
      );
    };
    reader.readAsText(file);
  }

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  document.addEventListener("DOMContentLoaded", function () {
    $("btn-abrir-backup").addEventListener("click", abrirModalBackup);
    $("btn-exportar-backup").addEventListener("click", onExportarBackup);
    $("btn-importar-backup").addEventListener("click", onSeleccionarArchivoImportar);
    $("input-importar-backup").addEventListener("change", onArchivoImportarSeleccionado);
  });

})();
