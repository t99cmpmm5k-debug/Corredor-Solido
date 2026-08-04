// TEMPORAL - QUITAR ANTES DE PRODUCCIÓN

import { themeManager } from "../theme/themeManager.js";
import { THEMES } from "../theme/themes.js";
import { rerender } from "../core/router.js";

export function mountThemeSwitcher() {

    const panel = document.createElement("div");

    panel.id = "dev-theme-switcher";

    panel.style.cssText = `
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 999999;
        display: flex;
        gap: 6px;
        padding: 6px;
        border-radius: 12px;
        background: rgba(0, 0, 0, .6);
        backdrop-filter: blur(8px);
        font-family: sans-serif;
    `;

    const buttons = Object.values(THEMES).map(theme => {

        const button = document.createElement("button");

        button.textContent = theme.name;

        button.style.cssText = `
            border: 2px solid transparent;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            background: ${theme.colors.primary};
            color: #fff;
        `;

        button.addEventListener("click", () => {

            themeManager.setTheme(theme.id);

            rerender();

            buttons.forEach(b => b.style.borderColor = "transparent");
            button.style.borderColor = "#fff";

        });

        panel.appendChild(button);

        return button;

    });

    document.body.appendChild(panel);

}
