// Presentación de la dieta en las tarjetas de comida de Nutrición -- solo
// cómo se enseña el texto del CSV, nunca qué dice: ni se reescribe ni se
// completa nada.
import banana from "../../assets/food/banana.png";
import coffee from "../../assets/food/coffee.png";
import rice from "../../assets/food/rice.png";
import chicken from "../../assets/food/chicken.png";
import fish from "../../assets/food/fish.png";
import egg from "../../assets/food/egg.png";
import omelette from "../../assets/food/omelette.png";
import bowl from "../../assets/food/bowl.png";
import shake from "../../assets/food/shake.png";
import salad from "../../assets/food/salad.png";
import potato from "../../assets/food/potato.png";
import sweetpotato from "../../assets/food/sweetpotato.png";
import bread from "../../assets/food/bread.png";
import tuna from "../../assets/food/tuna.png";
import jam from "../../assets/food/jam.png";
import fruit from "../../assets/food/fruit.png";
import plate from "../../assets/food/plate.png";

// Imagen decorativa de cada tarjeta (iconos 3D de Fluent Emoji, ver
// src/assets/CREDITS.md): se elige por palabras del texto de la comida, en
// el orden en que aparecen, como mucho dos. No dice nada que no diga el
// texto -- sin coincidencias, un plato genérico.
const FOOD_IMAGES = [
    { pattern: /\bplatano\b/, src: banana, alt: "plátano" },
    { pattern: /\bcafe\b/, src: coffee, alt: "café" },
    // El orden de la lista importa: lo que casa antes se tapa (ver
    // getMealImages). "Queso batido" es un bol antes que un batido, y
    // "crema de arroz" un batido antes que arroz.
    { pattern: /\b(avena|yogur|queso (fresco )?batido)\b/, src: bowl, alt: "bol" },
    // "Proteína" solo es batido en polvo o en dosis pequeña ("Proteína 30
    // g"); "proteína 180 g" es una proteína sin especificar -- sin icono
    // antes que inventarle uno.
    { pattern: /\b(proteina en polvo|proteina \d{1,2} g|batido|crema de arroz)\b/, src: shake, alt: "batido" },
    { pattern: /\b(arroz|pasta)\b/, src: rice, alt: "arroz" },
    { pattern: /\bpollo\b/, src: chicken, alt: "pollo" },
    { pattern: /\batun\b/, src: tuna, alt: "atún" },
    { pattern: /\b(merluza|pescado)\b/, src: fish, alt: "pescado" },
    { pattern: /\btortilla\b/, src: omelette, alt: "tortilla" },
    { pattern: /\b(huevos?|claras)\b/, src: egg, alt: "huevo" },
    { pattern: /\bboniato\b/, src: sweetpotato, alt: "boniato" },
    { pattern: /\bpatata\b/, src: potato, alt: "patata" },
    { pattern: /\bpan\b/, src: bread, alt: "pan" },
    { pattern: /\bmermelada\b/, src: jam, alt: "mermelada" },
    { pattern: /\bfruta\b/, src: fruit, alt: "fruta" },
    { pattern: /\b(verduras?|ensalada)\b/, src: salad, alt: "verdura" }
];

const GENERIC = { src: plate, alt: "plato" };

function normalize(text) {

    return String(text ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

}

export function getMealImages(text, max = 2) {

    // Cada coincidencia se tapa con espacios (misma longitud, mismas
    // posiciones) antes de probar las siguientes: así "queso fresco
    // batido" es un bol y no también un batido. Sin lookbehind en las
    // regex a propósito: Safari antiguo no lo entiende y rompería el módulo.
    let clean = normalize(text);
    const matches = [];

    for (const image of FOOD_IMAGES) {
        const pattern = new RegExp(image.pattern.source, "g");
        let match, first = -1;
        while ((match = pattern.exec(clean))) {
            if (first === -1) first = match.index;
            clean = clean.slice(0, match.index) + " ".repeat(match[0].length) + clean.slice(match.index + match[0].length);
        }
        if (first !== -1) matches.push({ image, index: first });
    }

    const found = matches
        .sort((a, b) => a.index - b.index)
        .map(match => ({ src: match.image.src, alt: match.image.alt }));

    // Mismo icono dos veces (p. ej. "yogur" y "queso batido"): una.
    const unique = found.filter((image, i) => found.findIndex(other => other.src === image.src) === i);

    return unique.length ? unique.slice(0, max) : [GENERIC];

}

// Texto de una opción -> { main, detail }: la primera frase como texto
// principal y el resto como secundario (jerarquía del mockup), solo si el
// texto trae varias frases. Cortar en ". " + mayúscula es puramente
// visual: juntando main y detail sale el texto original tal cual.
export function splitMealText(text) {

    const value = String(text ?? "");
    const match = value.match(/^(.+?\.)\s+(?=[A-ZÁÉÍÓÚÑ¿])(.+)$/s);

    if (!match) return { main: value, detail: null };

    return { main: match[1], detail: match[2] };

}
