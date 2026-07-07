(function () {
  "use strict";

  /* ══════════════════════════════════════════
     BASE DE DATOS LOCAL — Dexie (IndexedDB)
     Sin sincronización: todo vive en el dispositivo
  ══════════════════════════════════════════ */
  const db = new Dexie("micoche");

  db.version(1).stores({
    vehiculos:   "++id, matricula",
    incidencias: "++id, vehiculoId, fecha"
  });

  /* ══════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════ */
  function normalizarMatricula(m) {
    return (m || "").trim().toUpperCase();
  }

  function fechaHoyISO() {
    return new Date().toISOString();
  }

  const TIPOS_INCIDENCIA = [
    { valor: "CUOTA",     label: "Cuota" },
    { valor: "AVERIA",    label: "Avería" },
    { valor: "REVISION",  label: "Revisión" },
    { valor: "SEGURO",    label: "Seguro" },
    { valor: "IMPUESTOS", label: "Impuestos" },
    { valor: "OTROS",     label: "Otros" }
  ];

  function getLabelTipoIncidencia(valor) {
    const t = TIPOS_INCIDENCIA.find(x => x.valor === valor);
    return t ? t.label : valor;
  }

  /* ══════════════════════════════════════════
     CRUD VEHÍCULOS
  ══════════════════════════════════════════ */
  async function getVehiculos() {
    const vehiculos = await db.vehiculos.orderBy("id").reverse().toArray();
    for (const v of vehiculos) {
      v.costeTotal = await getCosteTotal(v.id);
    }
    return vehiculos;
  }

  async function getVehiculo(id) {
    return (await db.vehiculos.get(id)) || null;
  }

  async function validarVehiculo(datos, idExcluir) {
    const marca     = (datos.marca || "").trim();
    const modelo    = (datos.modelo || "").trim();
    const matricula = normalizarMatricula(datos.matricula);

    if (!marca)     throw new Error("La marca es obligatoria");
    if (!modelo)    throw new Error("El modelo es obligatorio");
    if (!matricula) throw new Error("La matrícula es obligatoria");

    const existente = await db.vehiculos.where("matricula").equals(matricula).first();
    if (existente && existente.id !== idExcluir) {
      throw new Error("Ya existe un vehículo con esa matrícula");
    }

    return { marca, modelo, matricula };
  }

  async function crearVehiculo(datos) {
    const limpio = await validarVehiculo(datos, null);
    const id = await db.vehiculos.add({ ...limpio, creadoEn: fechaHoyISO() });
    return id;
  }

  async function actualizarVehiculo(id, datos) {
    const limpio = await validarVehiculo(datos, id);
    await db.vehiculos.update(id, limpio);
  }

  async function borrarVehiculo(id) {
    await db.incidencias.where("vehiculoId").equals(id).delete();
    await db.vehiculos.delete(id);
  }

  /* ══════════════════════════════════════════
     CRUD INCIDENCIAS
  ══════════════════════════════════════════ */
  async function getIncidencias(vehiculoId) {
    const lista = await db.incidencias.where("vehiculoId").equals(vehiculoId).toArray();
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  async function getIncidencia(id) {
    return (await db.incidencias.get(id)) || null;
  }

  function validarIncidencia(datos) {
    const fechaDate = new Date(datos.fecha);
    if (!datos.fecha || isNaN(fechaDate.getTime())) {
      throw new Error("La fecha y hora no son válidas");
    }
    const fecha = fechaDate.toISOString();

    const tipo = (datos.tipo || "").trim().toUpperCase();
    if (!TIPOS_INCIDENCIA.some(t => t.valor === tipo)) {
      throw new Error("Selecciona un tipo de incidencia");
    }

    const asunto = (datos.asunto || "").trim();
    if (!asunto) throw new Error("La incidencia es obligatoria");

    if (datos.coste === "" || datos.coste === null || datos.coste === undefined) {
      throw new Error("El coste es obligatorio (puede ser 0)");
    }
    const coste = parseFloat(datos.coste);
    if (isNaN(coste) || coste < 0) {
      throw new Error("El coste debe ser un número igual o mayor que 0");
    }

    return { fecha, tipo, asunto, coste };
  }

  async function crearIncidencia(vehiculoId, datos) {
    const limpio = validarIncidencia(datos);
    const id = await db.incidencias.add({
      vehiculoId,
      ...limpio
    });
    return id;
  }

  async function actualizarIncidencia(id, datos) {
    const limpio = validarIncidencia(datos);
    await db.incidencias.update(id, limpio);
  }

  async function borrarIncidencia(id) {
    await db.incidencias.delete(id);
  }

  /* ══════════════════════════════════════════
     COSTES
  ══════════════════════════════════════════ */
  async function getCostePorAnio(vehiculoId) {
    const lista = await db.incidencias.where("vehiculoId").equals(vehiculoId).toArray();
    const mapa = {};
    for (const inc of lista) {
      const anio = new Date(inc.fecha).getFullYear();
      mapa[anio] = (mapa[anio] || 0) + inc.coste;
    }
    return Object.keys(mapa)
      .map(anio => ({ anio: parseInt(anio), total: mapa[anio] }))
      .sort((a, b) => b.anio - a.anio);
  }

  async function getCosteTotal(vehiculoId) {
    const lista = await db.incidencias.where("vehiculoId").equals(vehiculoId).toArray();
    return lista.reduce((suma, inc) => suma + inc.coste, 0);
  }

  /* ══════════════════════════════════════════
     COPIA DE SEGURIDAD (exportar / importar)
  ══════════════════════════════════════════ */
  async function exportarBackup() {
    const vehiculos = await db.vehiculos.toArray();
    const incidencias = await db.incidencias.toArray();
    return {
      app: "MICOCHE",
      version: 1,
      generadoEn: fechaHoyISO(),
      vehiculos,
      incidencias
    };
  }

  async function importarBackup(backup) {
    if (!backup || backup.app !== "MICOCHE" ||
        !Array.isArray(backup.vehiculos) || !Array.isArray(backup.incidencias)) {
      throw new Error("El archivo no es una copia de seguridad válida de MICOCHE");
    }

    await db.transaction("rw", db.vehiculos, db.incidencias, async () => {
      await db.vehiculos.clear();
      await db.incidencias.clear();
      if (backup.vehiculos.length)   await db.vehiculos.bulkAdd(backup.vehiculos);
      if (backup.incidencias.length) await db.incidencias.bulkAdd(backup.incidencias);
    });
  }

  /* ══════════════════════════════════════════
     NAMESPACE PÚBLICO
  ══════════════════════════════════════════ */
  window.MICOCHE = {
    // Vehículos
    getVehiculos,
    getVehiculo,
    crearVehiculo,
    actualizarVehiculo,
    borrarVehiculo,
    // Incidencias
    getIncidencias,
    getIncidencia,
    crearIncidencia,
    actualizarIncidencia,
    borrarIncidencia,
    // Costes
    getCostePorAnio,
    getCosteTotal,
    // Tipos de incidencia
    TIPOS_INCIDENCIA,
    getLabelTipoIncidencia,
    // Copia de seguridad
    exportarBackup,
    importarBackup
  };

})();
