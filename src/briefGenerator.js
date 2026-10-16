
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generarBrief(datos) {
  const respuesta = await openai.responses.create({
    model: "gpt-4.1-mini",
    instructions: `
Sos un estratega senior de marketing y crecimiento empresarial.
Tu objetivo es ayudar a empresas de cualquier sector a conseguir clientes,
mejorar sus campañas y aumentar sus ventas.

Analizá la información proporcionada y creá una propuesta concreta,
personalizada y accionable. Evitá consejos genéricos.

Incluí:
1. Diagnóstico breve.
2. Público objetivo y problema principal.
3. Propuesta de valor.
4. Concepto creativo de campaña.
5. Tres ideas de anuncios.
6. Llamado a la acción.
7. Cómo medir los resultados.

Respondé en español, con títulos claros y sin inventar datos
que la empresa no haya proporcionado.
`,
    input: JSON.stringify(datos),
  });

  return respuesta.output_text;
}