import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { syncRouter } from "./routes/sync.js";

const REQUIRED_ENV_VARS = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];

// Falla al arrancar, no a mitad de la primera petición real -- un JWT_SECRET
// vacío, por ejemplo, firmaría tokens con una cadena vacía sin avisar.
const missing = REQUIRED_ENV_VARS.filter(name => !process.env[name]);
if (missing.length) {
    console.error(`Faltan variables de entorno obligatorias en .env: ${missing.join(", ")}`);
    process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? [] }));
app.use(express.json({ limit: "10mb" })); // límite generoso -- un sync completo incluye histórico entero

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/sync", syncRouter);

// Handler de errores al final -- cualquier throw sin capturar en una ruta
// (fallo de conexión a la BBDD, etc.) cae aquí en vez de tumbar el proceso
// entero o devolver un HTML de error de Express por defecto.
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor." });
});

const port = process.env.PORT || 3001;
app.listen(port, "127.0.0.1", () => console.log(`Corredor Sólido backend escuchando en 127.0.0.1:${port}`));
