
const $ = (selector) => document.querySelector(selector);

const status = $("#system-status");
const result = $("#result");
const projectForm = $("#project-form");
const projectSelect = $("#project-select");
const projectSummary = $("#project-summary");
const deleteButton = $("#delete-project");

let projects = [];
let activeProjectId = "";

function setStatus(message, connected = true) {
  if (!status) return;
  status.textContent = `${connected ? "●" : "○"} ${message}`;
}

function showMessage(title, message, error = false) {
  const box = document.createElement("div");
  box.className = `result-message ${error ? "result-error" : "result-info"}`;

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = message;

  box.append(heading, paragraph);
  result.replaceChildren(box);
}

function showResult(title, content, imageUrl = "") {
  const article = document.createElement("article");
  article.className = "generated-result";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const text = document.createElement("div");
  text.className = "result-content";
  text.textContent = content;
  text.style.whiteSpace = "pre-wrap";

  article.append(heading);

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "Imagen generada para la publicación";
    image.style.width = "100%";
    image.style.maxWidth = "640px";
    image.style.borderRadius = "12px";
    image.style.display = "block";
    image.style.margin = "18px 0";
    article.append(image);
  }

  article.append(text);

  const actions = document.createElement("div");
  actions.className = "result-footer";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "secondary-button";
  copyButton.textContent = "Copiar texto";
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      copyButton.textContent = "Copiado";
    } catch {
      const area = document.createElement("textarea");
      area.value = content;
      article.append(area);
      area.focus();
      area.select();
    }
  });

  actions.append(copyButton);

  if (imageUrl) {
    const imageLink = document.createElement("a");
    imageLink.href = imageUrl;
    imageLink.target = "_blank";
    imageLink.rel = "noopener";
    imageLink.textContent = "Abrir imagen";
    actions.append(imageLink);
  }

  if (activeProjectId) {
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "secondary-button";
    saveButton.textContent = "Guardar en biblioteca";
    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      try {
        await saveContent({
          tipo: imageUrl ? "publicacion" : currentContentType,
          titulo: title,
          texto: content,
          imagen: imageUrl
        });
        saveButton.textContent = "Guardado";
        await loadProjects(activeProjectId);
      } catch (error) {
        saveButton.disabled = false;
        alert(error.message);
      }
    });
    actions.append(saveButton);
  }

  article.append(actions);
  result.replaceChildren(article);
  result.setAttribute("aria-busy", "false");
}

let currentContentType = "reels";

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Respuesta inesperada del servidor.");
  }

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }

  return data;
}

function activeProject() {
  return projects.find((project) => project.id === activeProjectId);
}

function updateProjectSummary() {
  const project = activeProject();

  deleteButton.disabled = !project;

  if (!project) {
    projectSummary.textContent =
      "Seleccioná o creá un proyecto para comenzar.";
    return;
  }

  projectSummary.textContent =
    `${project.sector || "Sin sector definido"} · ` +
    `${project.contenidos?.length || 0} contenidos guardados`;

  // Completa el formulario de estrategia con el perfil del proyecto.
  $("#empresa").value = project.nombre || "";
  $("#sector").value = project.sector || "";
  $("#producto").value = project.oferta || "";
  $("#publico").value = project.publico || "";
  $("#tono").value = project.tono || "Moderno y profesional";
  $("#objetivo").value = project.objetivo || "Conseguir nuevos clientes";
}

async function loadProjects(preferredId = activeProjectId) {
  const data = await api("/api/projects");
  projects = data.proyectos || [];

  projectSelect.replaceChildren();

  if (projects.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Todavía no hay proyectos";
    projectSelect.append(option);
    activeProjectId = "";
  } else {
    for (const project of projects) {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.nombre;
      projectSelect.append(option);
    }

    activeProjectId = projects.some((p) => p.id === preferredId)
      ? preferredId
      : projects[0].id;

    projectSelect.value = activeProjectId;
  }

  updateProjectSummary();
}

projectSelect.addEventListener("change", async () => {
  activeProjectId = projectSelect.value;
  updateProjectSummary();

  if ($("#library-panel") && !$("#library-panel").hidden) {
    await renderLibrary();
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = projectForm.querySelector('button[type="submit"]');
  const label = button.querySelector(".button-label");
  const original = label.textContent;

  button.disabled = true;
  label.textContent = "Creando proyecto...";

  try {
    const values = Object.fromEntries(new FormData(projectForm).entries());
    const data = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify(values)
    });

    projectForm.reset();
    $("#project-tone").value = "Moderno y profesional";

    await loadProjects(data.proyecto.id);
    showMessage("Proyecto creado", "Ya podés generar contenido personalizado para este negocio.");
    setStatus("Sistema conectado");
  } catch (error) {
    showMessage("No se pudo crear el proyecto", error.message, true);
  } finally {
    button.disabled = false;
    label.textContent = original;
  }
});

deleteButton.addEventListener("click", async () => {
  const project = activeProject();
  if (!project) return;

  if (!confirm(`¿Querés eliminar el proyecto "${project.nombre}" y su biblioteca?`)) {
    return;
  }

  try {
    await api(`/api/projects/${project.id}`, { method: "DELETE" });
    await loadProjects();
    showMessage("Proyecto eliminado", "El proyecto se eliminó del almacenamiento local.");
  } catch (error) {
    showMessage("No se pudo eliminar", error.message, true);
  }
});

async function saveContent(content) {
  if (!activeProjectId) {
    throw new Error("Primero creá o seleccioná un proyecto.");
  }

  return api(`/api/projects/${activeProjectId}/content`, {
    method: "POST",
    body: JSON.stringify(content)
  });
}

function projectContext() {
  const project = activeProject();
  if (!project) throw new Error("Primero creá o seleccioná un proyecto.");

  return {
    empresa: project.nombre,
    sector: project.sector,
    producto: project.oferta,
    publico: project.publico,
    diferenciadores: project.diferenciadores,
    tono: project.tono,
    objetivo: project.objetivo
  };
}

function connectGenerator(formSelector, endpoint, type, title) {
  const form = $(formSelector);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    const label = button.querySelector(".button-label");
    const original = label.textContent;

    try {
      const context = projectContext();
      const formData = Object.fromEntries(new FormData(form).entries());

      button.disabled = true;
      label.textContent = "La IA está creando...";
      result.setAttribute("aria-busy", "true");

      showMessage(
        "Creando contenido",
        "Estamos trabajando con la información del proyecto. Puede tardar un poco."
      );

      currentContentType = type;

      const data = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ ...context, ...formData })
      });

      if (!data.contenido?.trim()) {
        throw new Error("La IA no devolvió contenido. Intentá nuevamente.");
      }

      showResult(title, data.contenido, data.url || "");
      setStatus("Contenido generado");

      // Guardado automático en la biblioteca.
      await saveContent({
        tipo: type,
        titulo: title,
        texto: data.contenido,
        imagen: data.url || ""
      });

      await loadProjects(activeProjectId);
    } catch (error) {
      console.error(error);
      showMessage("No se pudo completar la generación", error.message, true);
      result.setAttribute("aria-busy", "false");
      setStatus("Revisar configuración", false);
    } finally {
      button.disabled = false;
      label.textContent = original;
    }
  });
}

connectGenerator(
  "#reels-form",
  "/api/creative/reels",
  "reels",
  "Tres guiones para Reels"
);

connectGenerator(
  "#post-form",
  "/api/creative/post",
  "publicacion",
  "Publicación para Instagram"
);

connectGenerator(
  "#campaign-form",
  "/api/creative/brief",
  "estrategia",
  "Estrategia de marketing"
);

// Navegación entre herramientas.
document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", async () => {
    const tool = button.dataset.tool;

    document.querySelectorAll("[data-tool]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll(".tool-form").forEach((form) => {
      form.hidden = true;
    });

    $("#library-panel").hidden = true;

    if (tool === "library") {
      $("#library-panel").hidden = false;
      await renderLibrary();
    } else {
      const formId = {
        reels: "#reels-form",
        post: "#post-form",
        strategy: "#campaign-form"
      }[tool];

      $(formId).hidden = false;
    }
  });
});

async function renderLibrary() {
  const container = $("#library-list");
  container.replaceChildren();

  const project = activeProject();

  if (!project) {
    container.textContent = "Creá o seleccioná un proyecto para ver su biblioteca.";
    return;
  }

  const contents = project.contenidos || [];

  if (!contents.length) {
    container.textContent = "Todavía no guardaste contenido en este proyecto.";
    return;
  }

  for (const item of contents) {
    const card = document.createElement("article");
    card.className = "generated-result";

    const heading = document.createElement("h3");
    heading.textContent = item.titulo;

    const metadata = document.createElement("p");
    metadata.className = "field-description";
    metadata.textContent =
      `${item.tipo} · ${new Date(item.creado).toLocaleString("es-AR")}`;

    const content = document.createElement("p");
    content.textContent = item.texto;
    content.style.whiteSpace = "pre-wrap";

    card.append(heading, metadata);

    if (item.imagen) {
      const image = document.createElement("img");
      image.src = item.imagen;
      image.alt = "Imagen guardada";
      image.style.width = "100%";
      image.style.maxWidth = "480px";
      image.style.borderRadius = "12px";
      card.append(image);
    }

    card.append(content);
    container.append(card);
  }
}

async function initialize() {
  try {
    await api("/api/health");
    await loadProjects();
    setStatus("Sistema conectado");
  } catch (error) {
    console.error(error);
    setStatus("Servidor no disponible", false);
    showMessage("No se pudo conectar", "Comprobá que npm run dev siga activo.", true);
  }
}

initialize();
