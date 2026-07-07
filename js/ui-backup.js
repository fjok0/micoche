(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function abrirModalBackup() {
    MICOCHE_UI.abrirModal("modal-backup");
  }

  /* ══════════════════════════════════════════
     EXPORTAR
  ══════════════════════════════════════════ */
  async function onExportarBackup() {
    try {
      const backup = await MICOCHE.exportarBackup();
      const json = JSON.stringify(backup, null, 2);
      const fecha = new Date().toISOString().slice(0, 10);
      const filename = `micoche_backup_${fecha}.json`;
      const blob = new Blob([json], { type: "application/json" });

      if (navigator.canShare && navigator.share) {
        const file = new File([blob], filename, { type: "application/json" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      }

      // Sin Web Share (o sin soporte de archivos): descarga directa
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      MICOCHE_UI.mostrarToast("No se pudo exportar la copia de seguridad", "error");
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

    const reader = new FileReader();
    reader.onload = function () {
      let backup;
      try {
        backup = JSON.parse(reader.result);
      } catch (err) {
        MICOCHE_UI.mostrarToast("El archivo no es un JSON válido", "error");
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
