(function () {
  "use strict";

  async function init() {
    // Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () =>
        navigator.serviceWorker.register("./service-worker.js")
      );
    }

    // Pedir storage persistente
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist();
    }

    // Vista inicial
    await MICOCHE_UI.mostrarListaVehiculos();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.MICOCHE_APP = { init };

})();
