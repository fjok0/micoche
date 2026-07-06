(function () {
  "use strict";

  const COLOR_ACENTO     = "#1c69d4";
  const COLOR_ACENTO_OSC = "#0a3d75";
  const COLOR_TEXTO      = "#1a1f24";
  const COLOR_SUAVE      = "#5b6773";
  const COLOR_FILA_PAR   = "#eef2f7";

  /* ══════════════════════════════════════════
     FUNCIÓN PRINCIPAL
  ══════════════════════════════════════════ */
  async function generarPDF(vehiculoId) {
    const vehiculo   = await MICOCHE.getVehiculo(vehiculoId);
    const incidencias = await MICOCHE.getIncidencias(vehiculoId);
    const porAnio     = await MICOCHE.getCostePorAnio(vehiculoId);
    const total       = await MICOCHE.getCosteTotal(vehiculoId);

    const titulo = `${vehiculo.marca} ${vehiculo.modelo}`;
    const filename = `micoche_${vehiculo.matricula.replace(/\s+/g, "")}.pdf`;

    const docDef = construirDocumento(vehiculo, titulo, incidencias, porAnio, total);

    return {
      pdfDoc: pdfMake.createPdf(docDef),
      filename
    };
  }

  /* ══════════════════════════════════════════
     CONSTRUCCIÓN DEL DOCUMENTO
  ══════════════════════════════════════════ */
  function construirDocumento(vehiculo, titulo, incidencias, porAnio, total) {
    const cabecera = [
      { text: "Fecha",      style: "th" },
      { text: "Tipo",       style: "th" },
      { text: "Incidencia", style: "th" },
      { text: "Coste",      style: "th", alignment: "right" }
    ];

    const body = [cabecera];
    incidencias
      .slice()
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .forEach((inc, i) => {
        const esPar = i % 2 === 0;
        const bg = esPar ? COLOR_FILA_PAR : "#ffffff";
        body.push([
          { text: MICOCHE_UI.formatearFechaLarga(inc.fecha), style: "td", fillColor: bg },
          { text: MICOCHE.getLabelTipoIncidencia(inc.tipo), style: "td", fillColor: bg },
          { text: inc.asunto, style: "td", fillColor: bg },
          { text: MICOCHE_UI.formatearMoneda(inc.coste), style: "tdCoste", fillColor: bg }
        ]);
      });

    const filasAnio = porAnio.map(item => ([
      { text: String(item.anio), style: "tdAnio" },
      { text: MICOCHE_UI.formatearMoneda(item.total), style: "tdAnioValor", alignment: "right" }
    ]));

    return {
      pageSize: "A4",
      pageMargins: [30, 50, 30, 50],
      content: [
        { text: "MICOCHE", style: "marca" },
        { text: titulo, style: "titulo" },
        { text: vehiculo.matricula, style: "subtitulo" },
        { text: " ", margin: [0, 6] },

        { text: "Coste acumulado por año", style: "seccion" },
        incidencias.length
          ? {
              table: { widths: [80, "*"], body: filasAnio },
              layout: "noBorders",
              margin: [0, 4, 0, 10]
            }
          : { text: "Sin incidencias registradas.", style: "td", margin: [0, 4, 0, 10] },

        {
          columns: [
            { text: "TOTAL ACUMULADO", style: "totalLabel" },
            { text: MICOCHE_UI.formatearMoneda(total), style: "totalValor", alignment: "right" }
          ],
          margin: [0, 0, 0, 16]
        },

        { text: "Historial de incidencias", style: "seccion" },
        incidencias.length
          ? {
              table: { headerRows: 1, widths: [95, 65, "*", 70], body },
              layout: {
                hLineWidth: (i) => (i === 0 || i === 1) ? 1.5 : 0.5,
                vLineWidth: () => 0,
                hLineColor: () => "#c9ccd1",
                paddingTop:    () => 5,
                paddingBottom: () => 5
              },
              margin: [0, 4, 0, 0]
            }
          : { text: "No hay incidencias que mostrar.", style: "td", margin: [0, 4, 0, 0] }
      ],
      styles: {
        marca:      { fontSize: 10, bold: true, color: COLOR_ACENTO, letterSpacing: 1, margin: [0, 0, 0, 2] },
        titulo:     { fontSize: 18, bold: true, color: COLOR_ACENTO_OSC, margin: [0, 0, 0, 2] },
        subtitulo:  { fontSize: 10, color: COLOR_SUAVE, margin: [0, 0, 0, 4] },
        seccion:    { fontSize: 11, bold: true, color: COLOR_ACENTO_OSC, margin: [0, 6, 0, 0] },
        totalLabel: { fontSize: 11, bold: true, color: COLOR_TEXTO },
        totalValor: { fontSize: 13, bold: true, color: COLOR_ACENTO_OSC },
        tdAnio:      { fontSize: 9, color: COLOR_TEXTO },
        tdAnioValor: { fontSize: 9, color: COLOR_ACENTO_OSC, bold: true },
        th:  { bold: true, fontSize: 9, color: "#ffffff", fillColor: COLOR_ACENTO },
        td:  { fontSize: 8.5, color: COLOR_TEXTO },
        tdCoste: { fontSize: 8.5, color: COLOR_ACENTO_OSC, bold: true, alignment: "right" }
      },
      footer: (page, totalPaginas) => ({
        text: `MICOCHE · Página ${page} de ${totalPaginas}`,
        alignment: "center",
        fontSize: 7,
        color: COLOR_SUAVE,
        margin: [0, 10]
      })
    };
  }

  window.MICOCHE_PDF = { generarPDF };

})();
