(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  let vehiculoEditandoId = null;

  /* ══════════════════════════════════════════
     NAVEGACIÓN: mostrar vista lista de vehículos
  ══════════════════════════════════════════ */
  async function mostrarListaVehiculos() {
    $("vista-detalle").classList.add("oculto");
    $("action-bar-detalle").classList.add("oculto");
    $("vista-vehiculos").classList.remove("oculto");
    $("action-bar-vehiculos").classList.remove("oculto");
    await refrescarVehiculos();
  }

  /* ══════════════════════════════════════════
     RENDER LISTA
  ══════════════════════════════════════════ */
  async function refrescarVehiculos() {
    const vehiculos = await MICOCHE.getVehiculos();
    const lista = $("lista-vehiculos");
    lista.innerHTML = "";

    if (vehiculos.length === 0) {
      lista.innerHTML = '<li class="lista-vacia">Todavía no has registrado ningún vehículo.<br>Pulsa "+ Vehículo" para añadir el primero.</li>';
      return;
    }

    for (const v of vehiculos) {
      const li = document.createElement("li");
      li.className = "vehiculo-item";
      li.tabIndex = 0;
      li.innerHTML = `
        <div class="vehiculo-info">
          <div class="vehiculo-marca-modelo">${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</div>
          <span class="vehiculo-matricula">${escapeHtml(v.matricula)}</span>
          <div class="vehiculo-coste">Coste acumulado: <strong>${MICOCHE_UI.formatearMoneda(v.costeTotal)}</strong></div>
        </div>
        <button class="vehiculo-editar" data-id="${v.id}" title="Editar vehículo" aria-label="Editar vehículo">&#9998;</button>
        <span class="vehiculo-arrow">&#8250;</span>
      `;

      li.addEventListener("click", function (e) {
        if (e.target.closest(".vehiculo-editar")) return;
        MICOCHE_UI.mostrarDetalleVehiculo(v.id);
      });

      lista.appendChild(li);
    }

    lista.querySelectorAll(".vehiculo-editar").forEach(btn => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        editarVehiculo(parseInt(btn.dataset.id));
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ══════════════════════════════════════════
     MODAL VEHÍCULO — alta / edición
  ══════════════════════════════════════════ */
  function abrirModalNuevoVehiculo() {
    vehiculoEditandoId = null;
    $("vehiculo-titulo-modal").textContent = "Nuevo vehículo";
    $("form-vehiculo").reset();
    $("btn-borrar-vehiculo-modal").classList.add("oculto");
    MICOCHE_UI.abrirModal("modal-vehiculo");
  }

  async function editarVehiculo(id) {
    const v = await MICOCHE.getVehiculo(id);
    if (!v) return;
    vehiculoEditandoId = id;
    $("vehiculo-titulo-modal").textContent = "Editar vehículo";
    $("vehiculo-marca").value = v.marca;
    $("vehiculo-modelo").value = v.modelo;
    $("vehiculo-matricula").value = v.matricula;
    $("btn-borrar-vehiculo-modal").classList.remove("oculto");
    MICOCHE_UI.abrirModal("modal-vehiculo");
  }

  async function onSubmitVehiculo(e) {
    e.preventDefault();
    const datos = {
      marca: $("vehiculo-marca").value,
      modelo: $("vehiculo-modelo").value,
      matricula: $("vehiculo-matricula").value
    };

    try {
      if (vehiculoEditandoId) {
        await MICOCHE.actualizarVehiculo(vehiculoEditandoId, datos);
      } else {
        await MICOCHE.crearVehiculo(datos);
      }
    } catch (err) {
      MICOCHE_UI.mostrarToast(err.message, "error");
      return;
    }

    MICOCHE_UI.cerrarModal("modal-vehiculo");
    MICOCHE_UI.mostrarToast("Guardado", "ok");

    // Si estábamos editando desde el detalle, refrescar esa vista también
    if (vehiculoEditandoId && !$("vista-detalle").classList.contains("oculto")) {
      await MICOCHE_UI.refrescarDetalleVehiculo();
    }
    if (!$("vista-vehiculos").classList.contains("oculto")) {
      await refrescarVehiculos();
    }
  }

  function onBorrarVehiculo() {
    if (!vehiculoEditandoId) return;
    const id = vehiculoEditandoId;
    MICOCHE_UI.confirmar(
      "Borrar vehículo",
      "Se borrará el vehículo y todas sus incidencias registradas. Esta acción no se puede deshacer.",
      async function () {
        await MICOCHE.borrarVehiculo(id);
        MICOCHE_UI.cerrarModal("modal-vehiculo");
        MICOCHE_UI.mostrarToast("Vehículo borrado", "ok");
        await mostrarListaVehiculos();
      }
    );
  }

  /* ══════════════════════════════════════════
     INIT
  ══════════════════════════════════════════ */
  document.addEventListener("DOMContentLoaded", function () {
    $("btn-nuevo-vehiculo").addEventListener("click", abrirModalNuevoVehiculo);
    $("form-vehiculo").addEventListener("submit", onSubmitVehiculo);
    $("btn-borrar-vehiculo-modal").addEventListener("click", onBorrarVehiculo);
  });

  window.MICOCHE_UI = window.MICOCHE_UI || {};
  window.MICOCHE_UI.mostrarListaVehiculos = mostrarListaVehiculos;
  window.MICOCHE_UI.refrescarVehiculos = refrescarVehiculos;
  window.MICOCHE_UI.editarVehiculo = editarVehiculo;

})();
