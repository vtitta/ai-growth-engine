
const form = document.querySelector("#campaign-form");
const result = document.querySelector("#result");
const button = form?.querySelector('button[type="submit"]');
const status = document.querySelector("#system-status");

if (!form || !result || !button) {
  console.error(
    "No se encontraron los elementos necesarios del Creative Studio."
  );
} else {
  const buttonLabel = button.querySelector(".button-label");
  const originalLabel = buttonLabel?.textContent ||
    "Generar estrategia creativa";

  function mostrarEstado(titulo, mensaje, tipo = "info") {
    const contenedor = document.createElement("div");
    contenedor.className = `result-message result-${tipo}`;

    const encabezado = document.createElement("h3");
    encabezado.textContent = titulo;

    const descripcion = document.createElement("p");
    descripcion.textContent = mensaje;

    contenedor.append(encabezado, descripcion);
    result.replaceChildren(contenedor);
  }

  function mostrarPropuesta(contenido) {
    const contenedor = document.createElement("article");
    contenedor.className = "generated-result";

    const cabecera = document.createElement("div");
    cabecera.className = "result-header";

    const etiqueta = document.createElement("p");
    etiqueta.className = "eyebrow";
    etiqueta.textContent = "GENERATED STRATEGY";

    const titulo = document.createElement("h3");
    titulo.textContent = "Tu propuesta creativa";

    cabecera.append(etiqueta, titulo);

    const texto = document.createElement("div");
    texto.className = "result-content";
    texto.textContent = contenido;
    texto.style.whiteSpace = "pre-wrap";

    const pie = document.createElement("div");
    pie.className = "result-footer";

    const estadoRevision = document.createElement("span");
    estadoRevision.className = "review-status";
    estadoRevision.textContent = "Pendiente de revisión";

    const copiar = document.createElement("button");
    copiar.className = "secondary-button";
    copiar.type = "button";
    copiar.textContent = "Copiar propuesta";

    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(contenido);
        copiar.textContent = "Copiado";

        window.setTimeout(() => {
          copiar.textContent = "Copiar propuesta";
        }, 1800);
      } catch {
        mostrarAvisoCopia(contenido);
      }
    });

    pie.append(estadoRevision, copiar);
    contenedor.append(cabecera, texto, pie);

    result.replaceChildren(contenedor);
  }

  function mostrarAvisoCopia(contenido) {
    const area = document.createElement("textarea");
    area.value = contenido;
    area.setAttribute("aria-label", "Texto de la propuesta para copiar");
    area.style.width = "100%";
    area.style.minHeight = "180px";

    result.append(area);
    area.focus();
    area.select();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const datos = Object.fromEntries(
      new FormData(form).entries()
    );

    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    if (buttonLabel) {
      buttonLabel.textContent = "Creando tu estrategia...";
    } else {
      button.textContent = "Creando tu estrategia...";
    }

    result.setAttribute("aria-busy", "true");

    mostrarEstado(
      "Analizando tu negocio",
      "Estamos preparando una propuesta basada en la información que ingresaste."
    );

    try {
      const response = await fetch("/api/creative/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "El servidor devolvió una respuesta inesperada. Revisá la terminal de VS Code."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          `No se pudo generar la propuesta (error ${response.status}).`
        );
      }

      if (typeof data.contenido !== "string" ||
          !data.contenido.trim()) {
        throw new Error(
          "La respuesta llegó, pero no contiene una propuesta. Revisá el servidor."
        );
      }

      mostrarPropuesta(data.contenido);

      if (status) {
        status.innerHTML =
          '<span aria-hidden="true">●</span> Sistema conectado';
      }
    } catch (error) {
      console.error("Error al generar la estrategia:", error);

      mostrarEstado(
        "No pudimos generar la propuesta",
        error.message ||
          "Ocurrió un problema inesperado. Intentá nuevamente.",
        "error"
      );
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      result.setAttribute("aria-busy", "false");

      if (buttonLabel) {
        buttonLabel.textContent = originalLabel;
      } else {
        button.textContent = originalLabel;
      }
    }
  });
}