
import OpenAI from "openai";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedDir = path.join(__dirname, "../../generated");

export async function generarImagen(datos) {
  const descripcion =
    typeof datos.prompt === "string" ? datos.prompt.trim() : "";

  if (!descripcion) {
    throw new Error("Falta la descripción de la imagen.");
  }

  const respuesta = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt: descripcion,
    size: "1024x1024",
  });

  const imagenBase64 = respuesta.data?.[0]?.b64_json;

  if (!imagenBase64) {
    throw new Error("La API no devolvió los datos de la imagen.");
  }

  await mkdir(generatedDir, { recursive: true });

  const nombreArchivo = `${randomUUID()}.png`;
  const rutaArchivo = path.join(generatedDir, nombreArchivo);

  await writeFile(rutaArchivo, Buffer.from(imagenBase64, "base64"));

  return {
    url: `/generated/${nombreArchivo}`,
    nombre: nombreArchivo,
  };
}