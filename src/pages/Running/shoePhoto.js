// Miniatura para la foto de zapatilla — al contrario que el OCR de
// Garmin (recognize.js), aquí no hace falta resolución, solo un icono
// reconocible en una tarjeta pequeña de lista. Redimensionar ANTES de
// guardar es lo único que evita que una foto de móvil sin comprimir
// (varios MB) hinche IndexedDB y, con ella, el backup JSON — el string
// que sale de aquí es el único que se persiste en ambos sitios.
const MAX_SIDE = 320;
const JPEG_QUALITY = 0.75;

export function readShoePhotoAsDataUrl(file) {

    return new Promise((resolve, reject) => {

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {

            const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));

            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));

        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`No se pudo leer la imagen ${file.name}`));
        };

        img.src = url;

    });

}
