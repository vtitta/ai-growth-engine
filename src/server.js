
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generarBrief } from "./briefGenerator.js";
import { generarImagen } from "./imageGenerator.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "2mb" }));

app.use("/generated", express.static(path.join(__dirname, "../generated")));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "AI Growth Engine está funcionando" });
});

app.post("/api/creative/brief", async (req, res) => {
  try {
    const contenido = await generarBrief(req.body);
    res.json({ ok: true, contenido });
  } catch (error) {
    console.error("Error al generar el brief:", error);
    res.status(500).json({
      error: "No se pudo generar la propuesta. Revisá la configuración de la API."
    });
  }
});

app.post("/api/creative/image", async (req, res) => {
  try {
    const imagen = await generarImagen(req.body);
    res.json({ ok: true, ...imagen });
  } catch (error) {
    console.error("Error al generar la imagen:", error);
    res.status(500).json({
      error: "No se pudo generar la imagen. Revisá la configuración de la API."
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI Growth Engine disponible en http://localhost:${PORT}`);
});