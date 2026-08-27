// Al abrir/cerrar una vista nueva (paso de wizard, detalle de una
// carrera, constructor de Gym...) el scroll de la pantalla anterior no
// se reseteaba solo -- bug real: si venías desplazado hacia abajo, la
// vista nueva podía aparecer ya desplazada, con su propio contenido de
// arriba (título, cabecera) asomando bajo la barra de estado/notch en
// vez de arrancar arriba del todo. `window` no existe en el entorno de
// tests (vitest corre en Node, sin jsdom) -- los stores que llaman a
// esto se testean ahí, así que la comprobación es necesaria, no
// defensiva de sobra.
export function resetScrollToTop() {

    if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
    }

}
