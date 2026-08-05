// TEMPORAL - PANTALLA DE PRUEBA, QUITAR
// Prueba manual del motor OCR de Garmin contra capturas reales.
// Abrir con `npm run dev` y visitar /test-garmin.html
// No guarda nada — solo muestra el JSON crudo del motor y del adaptador.

import { parseGarminScreenshots } from "../importers/garmin-engine/recognize.js";
import { importWorkout } from "../importers/index.js";

const input = document.querySelector("#files");
const status = document.querySelector("#status");
const output = document.querySelector("#output");

input.addEventListener("change", async () => {

    const files = [...(input.files || [])];
    if (!files.length) return;

    output.textContent = "";
    status.textContent = `Procesando ${files.length} captura(s)...`;

    try {

        const { merged, captures } = await parseGarminScreenshots(files, (fileIndex, total, fraction, message) => {
            status.textContent = `Captura ${fileIndex + 1}/${total}: ${message || "OCR"} (${Math.round(fraction * 100)}%)`;
        });

        let workout = null;
        let workoutError = null;

        try {
            workout = importWorkout("garmin", merged);
        } catch (err) {
            workoutError = `${err.name}: ${err.message}`;
        }

        status.textContent = `Listo. ${merged.found} campos fusionados de ${files.length} captura(s).`;

        output.textContent = JSON.stringify({ merged, captures, workout, workoutError }, null, 2);

    } catch (err) {

        status.textContent = "Error durante el OCR.";
        output.textContent = `${err.name}: ${err.message}\n\n${err.stack || ""}`;

    }

});
