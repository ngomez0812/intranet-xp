const API_BASE_URL = "https://thumbnails-contest-ran-through.trycloudflare.com";

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginAlert = document.getElementById("loginAlert");
const currentUserBox = document.getElementById("currentUser");
const usersNav = document.getElementById("usersNav");
const logoutButton = document.getElementById("logoutButton");
const content = document.getElementById("content");

let currentUser = null;

function getToken() {
    return sessionStorage.getItem("xp_access_token");
}

function setToken(token) {
    sessionStorage.setItem("xp_access_token", token);
}

function clearSession() {
    sessionStorage.removeItem("xp_access_token");
    currentUser = null;
}

function showLogin(message = "", type = "danger") {
    appView.classList.add("d-none");
    loginView.classList.remove("d-none");

    loginAlert.innerHTML = message
        ? `<div class="alert alert-${type}" role="alert">${escapeHtml(message)}</div>`
        : "";
}

function showApp() {
    loginView.classList.add("d-none");
    appView.classList.remove("d-none");
}

async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearSession();
        showLogin("La sesión venció. Inicia sesión nuevamente.", "warning");
        throw new Error("Sesión vencida");
    }

    let body = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        body = await response.json();
    }

    if (!response.ok) {
        throw new Error(body?.detail || `Error HTTP ${response.status}`);
    }

    return body;
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando';
    loginAlert.innerHTML = "";

    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value;

    try {
        const result = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ usuario, password })
        });

        setToken(result.access_token);
        await loadAuthenticatedUser();
        showApp();
        if (result.debe_cambiar_password || currentUser.debe_cambiar_password) {
            renderPasswordChange();
        } else {
            await loadModule("dashboard");
        }
    } catch (error) {
        showLogin(error.message || "No fue posible iniciar sesión");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Iniciar sesión";
    }
});

logoutButton.addEventListener("click", function () {
    clearSession();
    document.getElementById("loginForm").reset();
    showLogin("Sesión cerrada correctamente.", "success");
});

document.querySelectorAll("[data-module]").forEach(function (button) {
    button.addEventListener("click", async function () {
        document.querySelectorAll("[data-module]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        await loadModule(button.dataset.module);
    });
});

async function loadAuthenticatedUser() {
    currentUser = await apiFetch("/auth/me");

    currentUserBox.innerHTML = `
        <div class="fw-semibold">${escapeHtml(currentUser.nombre)}</div>
        <div class="text-white-50">${escapeHtml(currentUser.usuario)}</div>
        <span class="badge text-bg-primary mt-2">${escapeHtml(currentUser.rol)}</span>
    `;

    usersNav.classList.toggle("d-none", currentUser.rol !== "administrador");
    document.querySelectorAll("[data-module]").forEach(button => {
        button.disabled = Boolean(currentUser.debe_cambiar_password);
    });
}


function renderPasswordChange() {
    content.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-lg-6">
                <div class="card shadow-sm border-0">
                    <div class="card-body p-4">
                        <h1 class="h3">Cambio obligatorio de contraseña</h1>
                        <p class="text-muted">Antes de continuar, establece una contraseña personal.</p>
                        <div id="passwordAlert"></div>
                        <form id="passwordChangeForm">
                            <div class="mb-3">
                                <label class="form-label">Contraseña temporal actual</label>
                                <input id="currentPassword" type="password" minlength="10" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nueva contraseña</label>
                                <input id="newPassword" type="password" minlength="12" class="form-control" required>
                                <div class="form-text">Mínimo 12 caracteres, con mayúscula, minúscula y número.</div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Confirmar nueva contraseña</label>
                                <input id="confirmPassword" type="password" minlength="12" class="form-control" required>
                            </div>
                            <button id="passwordChangeButton" class="btn btn-primary" type="submit">Guardar contraseña</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById("passwordChangeForm").addEventListener("submit", submitPasswordChange);
}

async function submitPasswordChange(event) {
    event.preventDefault();
    const alertBox = document.getElementById("passwordAlert");
    const button = document.getElementById("passwordChangeButton");
    const data = {
        password_actual: document.getElementById("currentPassword").value,
        password_nuevo: document.getElementById("newPassword").value,
        confirmacion: document.getElementById("confirmPassword").value
    };
    button.disabled = true;
    try {
        await apiFetch("/auth/cambiar-password", {method: "POST", body: JSON.stringify(data)});
        await loadAuthenticatedUser();
        document.querySelectorAll("[data-module]").forEach(button => button.disabled = false);
        await loadModule("dashboard");
    } catch (error) {
        alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally {
        button.disabled = false;
    }
}

async function loadModule(moduleName) {
    renderLoading();

    try {
        if (moduleName === "dashboard") {
            await renderDashboard();
        } else if (moduleName === "politicas") {
            await renderPolicies();
        } else if (moduleName === "usuarios") {
            await renderUsers();
        }
    } catch (error) {
        renderError(error.message);
    }
}

async function renderDashboard() {
    const policies = await apiFetch("/politicas");

    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="h2 mb-1">Dashboard</h1>
                <p class="text-muted mb-0">Prueba local con autenticación y PostgreSQL.</p>
            </div>
        </div>

        <div class="row g-3">
            <div class="col-md-4">
                <div class="card metric-card shadow-sm">
                    <div class="card-body">
                        <div class="text-muted">Políticas autorizadas</div>
                        <div class="display-5 fw-semibold">${policies.length}</div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card metric-card shadow-sm">
                    <div class="card-body">
                        <div class="text-muted">Rol actual</div>
                        <div class="h3 mt-2 text-capitalize">${escapeHtml(currentUser.rol)}</div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card metric-card shadow-sm">
                    <div class="card-body">
                        <div class="text-muted">Estado API</div>
                        <div class="h3 mt-2 text-success">Conectada</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function renderPolicies() {
    const policies = await apiFetch("/politicas");

    const cards = policies.length
        ? policies.map(policy => `
            <div class="col-md-6 col-xl-4">
                <div class="card policy-card shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <h2 class="h5">${escapeHtml(policy.titulo)}</h2>
                            <span class="badge text-bg-success">${escapeHtml(policy.estado)}</span>
                        </div>

                        <p class="text-muted flex-grow-1">
                            ${escapeHtml(policy.descripcion || "Sin descripción")}
                        </p>

                        <dl class="row small mb-3">
                            <dt class="col-5">Categoría</dt>
                            <dd class="col-7">${escapeHtml(policy.categoria)}</dd>
                            <dt class="col-5">Versión</dt>
                            <dd class="col-7">${escapeHtml(policy.version)}</dd>
                            <dt class="col-5">Publicación</dt>
                            <dd class="col-7">${escapeHtml(policy.fecha_publicacion)}</dd>
                        </dl>

                        <a
                            href="${escapeAttribute(policy.archivo_url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-outline-primary">
                            <i class="bi bi-box-arrow-up-right"></i> Abrir documento
                        </a>
                    </div>
                </div>
            </div>
        `).join("")
        : '<div class="col-12"><div class="alert alert-info">No tienes políticas autorizadas.</div></div>';

    content.innerHTML = `
        <div class="mb-4">
            <h1 class="h2 mb-1">Políticas</h1>
            <p class="text-muted mb-0">La API muestra solamente los documentos autorizados para tu usuario.</p>
        </div>

        <div class="row g-3">
            ${cards}
        </div>
    `;
}

async function renderUsers() {
    const users = await apiFetch("/usuarios");

    const rows = users.map(user => `
        <tr>
            <td>${escapeHtml(user.usuario)}</td>
            <td>${escapeHtml(user.nombre)}</td>
            <td>${escapeHtml(user.correo)}</td>
            <td><span class="badge text-bg-secondary">${escapeHtml(user.rol)}</span></td>
            <td>${user.activo ? "Activo" : "Inactivo"}</td>
        </tr>
    `).join("");

    content.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div>
                <h1 class="h2 mb-1">Usuarios</h1>
                <p class="text-muted mb-0">Alta masiva controlada mediante CSV.</p>
            </div>
            <span class="badge text-bg-primary fs-6">${users.length} usuarios</span>
        </div>

        <div class="card shadow-sm border-0 mb-4">
            <div class="card-body">
                <h2 class="h5">Importar layout CSV</h2>
                <p class="text-muted">
                    Columnas obligatorias: nombre, usuario, correo, rol y activo.
                    La contraseña temporal se asignará a todos los registros válidos.
                </p>

                <div id="importAlert"></div>

                <form id="importUsersForm" class="row g-3">
                    <div class="col-md-6">
                        <label for="csvFile" class="form-label">Archivo CSV UTF-8</label>
                        <input id="csvFile" name="archivo" type="file" accept=".csv,text/csv" class="form-control" required>
                    </div>

                    <div class="col-md-6">
                        <label for="temporaryPassword" class="form-label">Contraseña temporal común</label>
                        <input id="temporaryPassword" name="password_temporal" type="password" minlength="10" class="form-control" required>
                    </div>

                    <div class="col-12">
                        <button id="importButton" type="submit" class="btn btn-primary">
                            <i class="bi bi-upload"></i> Validar e importar
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div class="card shadow-sm border-0">
            <div class="table-responsive">
                <table class="table table-striped align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("importUsersForm").addEventListener("submit", importUsersCsv);
}

async function importUsersCsv(event) {
    event.preventDefault();

    const fileInput = document.getElementById("csvFile");
    const passwordInput = document.getElementById("temporaryPassword");
    const button = document.getElementById("importButton");
    const alertBox = document.getElementById("importAlert");

    if (!fileInput.files.length) {
        alertBox.innerHTML = '<div class="alert alert-warning">Selecciona un archivo CSV.</div>';
        return;
    }

    const formData = new FormData();
    formData.append("archivo", fileInput.files[0]);
    formData.append("password_temporal", passwordInput.value);

    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Importando';
    alertBox.innerHTML = "";

    try {
        const result = await apiFetch("/usuarios/importar", {
            method: "POST",
            body: formData
        });

        const errorRows = result.errores.length
            ? `
                <div class="mt-3">
                    <strong>Filas omitidas:</strong>
                    <ul class="mb-0">
                        ${result.errores.map(item => `
                            <li>Fila ${item.fila}${item.usuario ? ` (${escapeHtml(item.usuario)})` : ""}: ${escapeHtml(item.error)}</li>
                        `).join("")}
                    </ul>
                </div>
            `
            : "";

        sessionStorage.setItem("xp_import_result", JSON.stringify(result));
        await renderUsers();

        const refreshedAlert = document.getElementById("importAlert");
        refreshedAlert.innerHTML = `
            <div class="alert alert-${result.omitidos ? "warning" : "success"}">
                <strong>Importación finalizada.</strong><br>
                Total: ${result.total_filas}. Creados: ${result.creados}. Omitidos: ${result.omitidos}.
                ${errorRows}
            </div>
        `;
    } catch (error) {
        alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-upload"></i> Validar e importar';
    }
}

function renderLoading() {
    content.innerHTML = `
        <div class="d-flex align-items-center gap-2 text-muted">
            <div class="spinner-border spinner-border-sm"></div>
            Cargando información...
        </div>
    `;
}

function renderError(message) {
    content.innerHTML = `
        <div class="alert alert-danger">
            <strong>No fue posible cargar el módulo.</strong><br>
            ${escapeHtml(message)}
        </div>
    `;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

async function initialize() {
    if (!getToken()) {
        showLogin();
        return;
    }

    try {
        await loadAuthenticatedUser();
        showApp();
        if (currentUser.debe_cambiar_password) {
            renderPasswordChange();
        } else {
            await loadModule("dashboard");
        }
    } catch (error) {
        clearSession();
        showLogin("La sesión guardada ya no es válida.", "warning");
    }
}

initialize();
