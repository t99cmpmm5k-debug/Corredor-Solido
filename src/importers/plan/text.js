// Compartido por json.js/csv.js/pdf.js: minusculas + sin tildes, para
// comparar cabeceras/etiquetas/tipos escritos a mano de formas distintas
// contra una lista fija -- nunca para adivinar significado, solo para
// tolerar variaciones de formato (mayusculas, acentos).
export function normalizeText(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}
