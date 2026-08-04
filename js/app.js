import { Hero } from "../components/Hero.js";

document.addEventListener("DOMContentLoaded", () => {

    const app = document.getElementById("app");

    app.innerHTML = `
        <main class="home">

            ${Hero()}

        </main>
    `;

});