
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { generarBrief } from "./briefGenerator.js";
import { generarImagen } from "./imageGenerator.js";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "projects.json");

app.use(express.json({ limit: "2mb" }));
app.use("/generated", express.static(path.join(rootDir, "generated")));
app.use(express.static(path.join(rootDir, "public")));

async function leerProyectos() {
  await mkdir(dataDir, { recursive: true });
  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeFile(dataFile, "[]", "utf8");
    return [];
  }
}

async function guardarProyectos(proyectos) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(proyectos, null, 2), "utf8");
}

function texto(valor, max = 2000) {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "AI Growth Engine está funcionando" });
});

// Listar proyectos
app.get("/api/projects", async (req, res) => {
  try {
    res.json({ ok: true, proyectos: await leerProyectos() });
  } catch {
    res.status(500).json({ error: "No se pudieron cargar los proyectos." });
  }
});

// Crear proyecto
app.post("/api/projects", async (req, res) => {
  try {
    const nombre = texto(req.body.nombre, 120);
    if (!nombre) {
      return res.status(400).json({ error: "El proyecto necesita un nombre." });
    }

    const proyectos = await leerProyectos();
    const proyecto = {
      id: randomUUID(),
      nombre,
      sector: texto(req.body.sector, 120),
      oferta: texto(req.body.oferta),
      publico: texto(req.body.publico, 500),
      diferenciadores: texto(req.body.diferenciadores, 1000),
      tono: texto(req.body.tono, 200),
      objetivo: texto(req.body.objetivo, 300),
      contenidos: [],
      creado: new Date().toISOString()
    };

    proyectos.unshift(proyecto);
    await guardarProyectos(proyectos);
    res.status(201).json({ ok: true, proyecto });
  } catch {
    res.status(500).json({ error: "No se pudo guardar el proyecto." });
  }
});

// Actualizar perfil de un proyecto
app.put("/api/projects/:id", async (req, res) => {
  try {
    const proyectos = await leerProyectos();
    const indice = proyectos.findIndex(p => p.id === req.params.id);
    if (indice < 0) {
      return res.status(404).json({ error: "Proyecto no encontrado." });
    }

    for (const campo of [
      "nombre", "sector", "oferta", "publico",
      "diferenciadores", "tono", "objetivo"
    ]) {
      if (req.body[campo] !== undefined) {
        proyectos[indice][campo] = texto(
          req.body[campo],
          campo === "oferta" ? 2000 : 1000
        );
      }
    }

    await guardarProyectos(proyectos);
    res.json({ ok: true, proyecto: proyectos[indice] });
  } catch {
    res.status(500).json({ error: "No se pudo actualizar el proyecto." });
  }
});

// Eliminar proyecto
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const proyectos = await leerProyectos();
    const restantes = proyectos.filter(p => p.id !== req.params.id);
    if (restantes.length === proyectos.length) {
      return res.status(404).json({ error: "Proyecto no encontrado." });
    }
    await guardarProyectos(restantes);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "No se pudo eliminar el proyecto." });
  }
});

// Guardar contenido en la biblioteca del proyecto
app.post("/api/projects/:id/content", async (req, res) => {
  try {
    const proyectos = await leerProyectos();
    const proyecto = proyectos.find(p => p.id === req.params.id);
    if (!proyecto) {
      return res.status(404).json({ error: "Proyecto no encontrado." });
    }

    const contenido = {
      id: randomUUID(),
      tipo: texto(req.body.tipo, 30),
      titulo: texto(req.body.titulo, 200) || "Contenido sin título",
      texto: texto(req.body.texto, 20000),
      imagen: texto(req.body.imagen, 1000),
      creado: new Date().toISOString()
    };

    proyecto.contenidos.unshift(contenido);
    await guardarProyectos(proyectos);
    res.status(201).json({ ok: true, contenido });
  } catch {
    res.status(500).json({ error: "No se pudo guardar el contenido." });
  }
});

// Estrategia general existente
app.post("/api/creative/brief", async (req, res) => {
  try {
    const contenido = await generarBrief(req.body);
    res.json({ ok: true, contenido });
  } catch (error) {
    console.error("Error al generar estrategia:", error.message);
    res.status(500).json({
      error: "No se pudo generar la estrategia. Revisá la configuración de la API."
    });
  }
});

// Tres guiones completos para Reels
app.post("/api/creative/reels", async (req, res) => {
  try {
    const datos = req.body;
    const respuesta = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `Sos director creativo y estratega de contenido para redes.
Creá exactamente TRES guiones diferentes para Reels, personalizados
con los datos del negocio. Cada guion debe incluir:
título, concepto, hook para los primeros 3 segundos, duración estimada,
escenas con tiempos, acciones, diálogo o voz en off, texto en pantalla,
ideas de edición, CTA y explicación breve de por qué puede funcionar.
Diferenciá los tres enfoques. No inventes datos del negocio.
Escribí en español rioplatense natural, sin prometer resultados garantizados.`,
      input: JSON.stringify(datos)
    });
    res.json({ ok: true, contenido: respuesta.output_text });
  } catch (error) {
    console.error("Error al generar Reels:", error.message);
    res.status(500).json({ error: "No se pudieron generar los Reels." });
  }
});

// Publicación: caption + imagen
app.post("/api/creative/post", async (req, res) => {
  try {
    const datos = req.body;
    const respuesta = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `Sos especialista en contenido de Instagram.
Creá una publicación para el negocio indicado. Devolvé:
TÍTULO, IDEA VISUAL, TEXTO BREVE QUE PODRÍA APARECER EN LA IMAGEN,
CAPTION COMPLETO, CTA y HASHTAGS relevantes.
No inventes datos ni resultados. Escribí en español natural.
La idea visual debe describir una imagen profesional, clara y atractiva.
No pidas que la IA escriba mucho texto dentro de la imagen.`,
      input: JSON.stringify(datos)
    });

    const contenido = respuesta.output_text;
    const imagen = await generarImagen({
      prompt: `Creá una imagen publicitaria profesional para una publicación
de Instagram. Negocio y contexto: ${JSON.stringify(datos)}.
Concepto creativo generado: ${contenido}.
Diseño de alta calidad, composición intencional, iluminación profesional,
estética moderna, sin marcas de agua y sin texto extenso ilegible.
Generá únicamente la imagen, no una maqueta de teléfono.`
    });

    res.json({ ok: true, contenido, ...imagen });
  } catch (error) {
    console.error("Error al crear publicación:", error.message);
    res.status(500).json({ error: "No se pudo crear la publicación." });
  }
});

app.listen(PORT, () => {
  console.log(`AI Growth Engine disponible en http://localhost:${PORT}`);
});
