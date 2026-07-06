(function () {
  "use strict";

  /* ── Modales ───────────────────────────── */
  function abrirModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("oculto");
  }

  function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("oculto");
  }

  // Cierre por backdrop o botón ×
  document.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-cierra-modal")) {
      const m = e.target.closest(".modal");
      if (m) cerrarModal(m.id);
    }
  });

  // Cierre por Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const m = document.querySelector(".modal:not(.oculto)");
      if (m) cerrarModal(m.id);
    }
  });

  /* ── Toast ─────────────────────────────── */
  let toastTimer = null;

  function mostrarToast(mensaje, tipo) {
    const t = document.getElementById("toast");
    t.textContent = mensaje;
    t.className = "toast toast-" + (tipo || "ok");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("oculto"), 3000);
  }

  /* ── Modal de confirmación genérico ───── */
  function confirmar(titulo, texto, onAceptar) {
    document.getElementById("confirmar-titulo").textContent = titulo;
    document.getElementById("confirmar-texto").textContent = texto;

    const btn = document.getElementById("btn-confirmar-aceptar");
    const nuevoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevoBtn, btn);

    nuevoBtn.addEventListener("click", function () {
      cerrarModal("modal-confirmar");
      onAceptar();
    });

    abrirModal("modal-confirmar");
  }

  /* ── Helpers de fecha y moneda ─────────── */
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  function formatearFechaLarga(fechaISO) {
    const d = new Date(fechaISO);
    const dia = d.getDate();
    const mes = MESES[d.getMonth()];
    const anio = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${dia} de ${mes} de ${anio} · ${hh}:${mm}`;
  }

  function formatearMoneda(valor) {
    return (valor || 0).toLocaleString("es-ES", {
      style: "currency",
      currency: "EUR"
    });
  }

  /* ── Namespace público ─────────────────── */
  window.MICOCHE_UI = {
    abrirModal,
    cerrarModal,
    mostrarToast,
    confirmar,
    formatearFechaLarga,
    formatearMoneda,
    MESES
  };

})();
