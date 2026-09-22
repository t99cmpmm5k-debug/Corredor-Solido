import { describe, it, expect } from "vitest";
import { ComunidadCommentsPanel } from "./ComunidadCommentsPanel.js";

const comment = (overrides = {}) => ({
    id: 1, alias: "Ana", text: "Menudo ritmo!", createdAt: "2026-09-22T10:00:00.000Z", isMine: false, ...overrides
});

describe("ComunidadCommentsPanel -- colapsado por defecto, expandible", () => {

    it("colapsado muestra solo la franja con el número, sin lista ni campo de texto", () => {

        const html = ComunidadCommentsPanel({ status: "ready", items: [comment(), comment({ id: 2 })] }, false);

        expect(html).toContain("Comentarios (2)");
        expect(html).not.toContain("comunidad-comments-input");
        expect(html).not.toContain('data-action="submit-comunidad-comment"');

    });

    it("expandido muestra la lista y el campo de texto", () => {

        const html = ComunidadCommentsPanel({ status: "ready", items: [comment()] }, true);

        expect(html).toContain("is-expanded");
        expect(html).toContain('id="comunidad-comment-input"');
        expect(html).toContain('data-action="submit-comunidad-comment"');
        expect(html).toContain("Ana");
        expect(html).toContain("Menudo ritmo!");

    });

    it("loading/unavailable muestran su propio aviso dentro de la lista, expandido", () => {

        expect(ComunidadCommentsPanel({ status: "loading", items: [] }, true)).toContain("Cargando comentarios");
        expect(ComunidadCommentsPanel({ status: "unavailable", items: [] }, true)).toContain("No se pudieron cargar");

    });

    it("sin ningún comentario, invita a ser el primero", () => {

        const html = ComunidadCommentsPanel({ status: "ready", items: [] }, true);
        expect(html).toContain("Sé el primero en comentar");

    });

    it("un comentario propio (isMine, no pending) lleva botón de borrar; uno ajeno no", () => {

        const html = ComunidadCommentsPanel({ status: "ready", items: [comment({ id: 1, isMine: true }), comment({ id: 2, isMine: false })] }, true);

        expect(html).toContain('data-comment-id="1"');
        expect(html).not.toContain('data-comment-id="2"');

    });

    it("un comentario pending (optimista, sin confirmar) NO lleva botón de borrar aunque sea isMine", () => {

        const html = ComunidadCommentsPanel({ status: "ready", items: [comment({ isMine: true, pending: true })] }, true);

        expect(html).not.toContain('data-action="delete-comunidad-comment"');
        expect(html).toContain("is-pending");

    });

    it("escapa alias y texto -- ambos son contenido libre de otro usuario", () => {

        const html = ComunidadCommentsPanel({
            status: "ready",
            items: [comment({ alias: '<img src=x onerror=alert(1)>', text: '<script>alert(2)</script>' })]
        }, true);

        expect(html).not.toContain("<img src=x");
        expect(html).not.toContain("<script>alert(2)</script>");
        expect(html).toContain("&lt;img");
        expect(html).toContain("&lt;script&gt;");

    });

});
