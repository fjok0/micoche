(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  let vehiculoActualId = null;
  let incidenciaEditandoId = null;

  /* ══════════════════════════════════════════
     NAVEGACIÓN: mostrar detalle de un vehículo
  ══════════════════════════════════════════ */
  async function mostrarDetalleVehiculo(id) {
    vehiculoActualId = id;
    $("vista-vehiculos").classList.add("oculto");
    $("action-bar-vehiculos").classList.add("oculto");
    $("vista-detalle").classList.remove("oculto");
    $("action-bar-detalle").classList.remove("oculto");
    await refrescarDetalleVehiculo();
  }

  async function refrescarDetalleVehiculo() {
    if (!vehiculoActualId) return;
    const v = await MICOCHE.getVehiculo(vehiculoActualId);
    if (!v) {
      await MICOCHE_UI.mostrarListaVehiculos();
      return;
    }

    $("detalle-marca-modelo").textContent = `${v.marca} ${v.modelo}`;
    $("detalle-matricula").textContent = v.matricula;

    await renderCostePorAnio();
    await renderIncidencias();
  }

  /* ══════════════════════════════════════════
     COSTE POR AÑO
  ══════════════════════════════════════════ */
  async function renderCostePorAnio() {
    const porAnio = await MICOCHE.getCostePorAnio(vehiculoActualId);
    const total = await MICOCHE.getCosteTotal(vehiculoActualId);
    const caja = $("coste-anio-caja");

    if (porAnio.length === 0) {
      caja.innerHTML = '<p class="modal-texto" style="margin-bottom:0;">Todavía no hay incidencias registradas.</p>';
      return;
    }

    let html = "";
    for (const item of porAnio) {
      html += `
        <div class="coste-anio-item">
          <span class="coste-anio-label">${item.anio}</span>
          <span class="coste-anio-valor">${MICOCHE_UI.formatearMoneda(item.total)}</span>
        </div>
      `;
    }
    html += `
      <div class="coste-total-fila">
        <span class="coste-total-label">Total acumulado</span>
        <span class="coste-total-valor">${MICOCHE_UI.formatearMoneda(total)}</span>
      </div>
    `;
    caja.innerHTML = html;
  }

  /* ══════════════════════════════════════════
     LISTA DE INCIDENCIAS
  ══════════════════════════════════════════ */
  async function renderIncidencias() {
    const incidencias = await MICOCHE.getIncidencias(vehiculoActualId);
    const lista = $("lista-incidencias");
    lista.innerHTML = "";

    if (incidencias.length === 0) {
      lista.innerHTML = '<li class="lista-vacia">Sin incidencias todavía.<br>Pulsa "+ Incidencia" para registrar la primera.</li>';
      return;
    }

    const ahora = Date.now();
    for (const inc of incidencias) {
      const li = document.createElement("li");
      li.className = "incidencia-item";
      li.tabIndex = 0;
      const claseCoste = inc.coste === 0 ? "incidencia-coste coste-cero" : "incidencia-coste";
      const esProgramada = new Date(inc.fecha).getTime() > ahora;
      const puntoProgramada = esProgramada
        ? '<span class="incidencia-punto-programada" title="Programada (fecha futura)"></span>'
        : "";
      li.innerHTML = `
        <div class="incidencia-contenido">
          ${puntoProgramada}
          <span class="incidencia-tipo-badge">${escapeHtml(MICOCHE.getLabelTipoIncidencia(inc.tipo))}</span>
          <div class="incidencia-asunto">${escapeHtml(inc.asunto)}</div>
          <div class="incidencia-fecha">${MICOCHE_UI.formatearFechaLarga(inc.fecha)}</div>
        </div>
        <span class="${claseCoste}">${MICOCHE_UI.formatearMoneda(inc.coste)}</span>
      `;
      li.addEventListener("click", function () {
        editarIncidencia(inc.id);
      });
      lista.appendChild(li);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function datetimeLocalDesdeISO(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ══════════════════════════════════════════
     MODAL INCIDENCIA — alta / edición
  ══════════════════════════════════════════ */
  function poblarSelectTiposIncidencia() {
    const select = $("incidencia-tipo");
    MICOCHE.TIPOS_INCIDENCIA.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.valor;
      opt.textContent = t.label;
      select.appendChild(opt);
    });
  }

  function abrirModalNuevaIncidencia() {
    incidenciaEditandoId = null;
    $("form-incidencia").reset();
    $("incidencia-fecha").value = datetimeLocalDesdeISO(new Date().toISOString());
    $("btn-borrar-incidencia-modal").classList.add("oculto");
    MICOCHE_UI.abrirModal("modal-incidencia");
  }

  async function editarIncidencia(id) {
    const inc = await MICOCHE.getIncidencia(id);
    if (!inc) return;
    incidenciaEditandoId = id;
    $("incidencia-fecha").value = datetimeLocalDesdeISO(inc.fecha);
    $("incidencia-tipo").value = inc.tipo;
    $("incidencia-asunto").value = inc.asunto;
    $("incidencia-coste").value = inc.coste;
    $("btn-borrar-incidencia-modal").classList.remove("oculto");
    MICOCHE_UI.abrirModal("modal-incidencia");
  }

  async function onSubmitIncidencia(e) {
    e.preventDefault();
    const datos = {
      fecha: $("incidencia-fecha").value,
      tipo: $("incidencia-tipo").value,
      asunto: $("incidencia-asunto").value,
      coste: $("incidencia-coste").value
    };

    try {
      if (incidenciaEditandoId) {
        await MICOCHE.actualizarIncidencia(incidenciaEditandoId, datos);
      } else {
        await MICOCHE.crearIncidencia(vehiculoActualId, datos);
      }
    } catch (err) {
      MICOCHE_UI.mostrarToast(err.message, "error");
      return;
    }

    MICOCHE_UI.cerrarModal("modal-incidencia");
    MICOCHE_UI.mostrarToast("Guardado", "ok");
    await refrescarDetalleVehiculo();
  }

  function onBorrarIncidencia() {
    if (!incidenciaEditandoId) return;
    const id = incidenciaEditandoId;
    MICOCHE_UI.confirmar(
      "Borrar incidencia",
      "Esta incidencia se borrará permanentemente.",
      async function () {
        await MICOCHE.borrarIncidencia(id);
        MICOCHE_UI.cerrarModal("modal-incidencia");
        MICOCHE_UI.mostrarToast("Incidencia borrada", "ok");
        await refrescarDetalleVehiculo();
      }
    );
  }

  /* ══════════════════════════════════════════
     ACCIONES SOBRE EL VEHÍCULO DESDE EL DETALLE
  ══════════════════════════════════════════ */
  function onBorrarVehiculoDesdeDetalle() {
    if (!vehiculoActualId) return;
    const id = vehiculoActualId;
    MICOCHE_UI.confirmar(
      "Borrar vehículo",
      "Se borrará el vehículo y todas sus incidencias registradas. Esta acción no se puede deshacer.",
      async function () {
        await MICOCHE.borrarVehiculo(id);
        MICOCHE_UI.mostrarToast("Vehículo borrado", "ok");
        await MICOCHE_UI.mostrarListaVehiculos();
      }
    );
  }

  /* ══════════════════════════════════════════
     EXPORTAR PDF
  ══════════════════════════════════════════ */
  function abrirModalExportar() {
    const puedeCompartir = !!(navigator.canShare && navigator.share);
    $("btn-compartir-pdf").classList.toggle("oculto", !puedeCompartir);
    MICOCHE_UI.abrirModal("modal-exportar");
  }

  async function onDescargarPdf() {
    try {
      const { pdfDoc, filename } = await MICOCHE_PDF.generarPDF(vehiculoActualId);
      pdfDoc.download(filename);
      MICOCHE_UI.cerrarModal("modal-exportar");
    } catch (err) {
      MICOCHE_UI.mostrarToast("No se pudo generar el PDF", "error");
    }
  }

  async function onCompartirPdf() {
    try {
      const { pdfDoc, filename } = await MICOCHE_PDF.generarPDF(vehiculoActualId);
      pdfDoc.getBlob(async function (blob) {
        const file = new File([blob], filename, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          MICOCHE_UI.cerrarModal("modal-exportar");
        } else {
          MICOCHE_UI.mostrarToast("Este dispositivo no admite compartir el PDF", "error");
        }
      });
    } catch (err) {
      MICOCHE_UI.mostrarToast("No se pudo compartir el PDF", "error");
    }
  }

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  document.addEventListener("DOMContentLoaded", function () {
    poblarSelectTiposIncidencia();

    $("btn-volver").addEventListener("click", function () {
      MICOCHE_UI.mostrarListaVehiculos();
    });
    $("btn-editar-vehiculo").addEventListener("click", function () {
      MICOCHE_UI.editarVehiculo(vehiculoActualId);
    });
    $("btn-borrar-vehiculo").addEventListener("click", onBorrarVehiculoDesdeDetalle);

    $("btn-nueva-incidencia").addEventListener("click", abrirModalNuevaIncidencia);
    $("form-incidencia").addEventListener("submit", onSubmitIncidencia);
    $("btn-borrar-incidencia-modal").addEventListener("click", onBorrarIncidencia);

    $("btn-exportar").addEventListener("click", abrirModalExportar);
    $("btn-descargar-pdf").addEventListener("click", onDescargarPdf);
    $("btn-compartir-pdf").addEventListener("click", onCompartirPdf);
  });

  window.MICOCHE_UI = window.MICOCHE_UI || {};
  window.MICOCHE_UI.mostrarDetalleVehiculo = mostrarDetalleVehiculo;
  window.MICOCHE_UI.refrescarDetalleVehiculo = refrescarDetalleVehiculo;
  window.MICOCHE_UI.getVehiculoActualId = () => vehiculoActualId;

})();
