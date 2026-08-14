const API_BASE_URL = "https://benefits-affects-rugby-vertex.trycloudflare.com";

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginAlert = document.getElementById("loginAlert");
const currentUserBox = document.getElementById("currentUser");
const usersNav = document.getElementById("usersNav");
const logoutButton = document.getElementById("logoutButton");
const content = document.getElementById("content");
const moduleName = document.getElementById("currentModuleName");
let currentUser = null;

function getToken() { return sessionStorage.getItem("xp_access_token"); }
function setToken(token) { sessionStorage.setItem("xp_access_token", token); }
function clearSession() { sessionStorage.removeItem("xp_access_token"); currentUser = null; }

function showLogin(message = "", type = "danger") {
    appView.classList.add("d-none");
    loginView.classList.remove("d-none");
    loginAlert.innerHTML = message ? `<div class="alert alert-${type}">${escapeHtml(message)}</div>` : "";
}
function showApp() { loginView.classList.add("d-none"); appView.classList.remove("d-none"); }

async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    if (response.status === 401) {
        clearSession(); showLogin("La sesión venció. Inicia sesión nuevamente.", "warning");
        throw new Error("Sesión vencida");
    }
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) throw new Error(body?.detail || `Error HTTP ${response.status}`);
    return body;
}

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando';
    try {
        const result = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                usuario: document.getElementById("usuario").value.trim(),
                password: document.getElementById("password").value
            })
        });
        setToken(result.access_token);
        await loadAuthenticatedUser();
        showApp();
        if (result.debe_cambiar_password || currentUser.debe_cambiar_password) renderPasswordChange();
        else await loadModule("dashboard");
    } catch (error) { showLogin(error.message); }
    finally { loginButton.disabled = false; loginButton.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Iniciar sesión'; }
});

logoutButton.addEventListener("click", () => {
    clearSession(); loginForm.reset(); showLogin("Sesión cerrada correctamente.", "success");
});

document.querySelectorAll("[data-module]").forEach(button => {
    button.addEventListener("click", async () => {
        document.querySelectorAll("[data-module]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        await loadModule(button.dataset.module);
    });
});

async function loadAuthenticatedUser() {
    currentUser = await apiFetch("/auth/me");
    currentUserBox.innerHTML = `
        <i class="bi bi-person-circle fs-4 text-primary"></i>
        <div class="overflow-hidden">
            <div class="fw-semibold text-truncate">${escapeHtml(currentUser.nombre)}</div>
            <div class="small text-white-50 text-truncate">${escapeHtml(currentUser.usuario)} · ${escapeHtml(currentUser.rol)}</div>
        </div>`;
    usersNav.classList.toggle("d-none", currentUser.rol !== "administrador");
    document.querySelectorAll("[data-module]").forEach(button => button.disabled = Boolean(currentUser.debe_cambiar_password));
}

function renderPasswordChange() {
    moduleName.textContent = "CAMBIO DE CONTRASEÑA";
    content.innerHTML = `
        <div class="row justify-content-center"><div class="col-lg-6">
        <div class="card shadow-sm border-0"><div class="card-body p-4">
        <h1 class="h3">Cambio obligatorio de contraseña</h1>
        <p class="text-muted">Antes de continuar, establece una contraseña personal.</p>
        <div id="passwordAlert"></div>
        <form id="passwordChangeForm">
            <div class="mb-3"><label class="form-label">Contraseña temporal actual</label><input id="currentPassword" type="password" minlength="10" class="form-control" required></div>
            <div class="mb-3"><label class="form-label">Nueva contraseña</label><input id="newPassword" type="password" minlength="12" class="form-control" required><div class="form-text">Mínimo 12 caracteres, con mayúscula, minúscula y número.</div></div>
            <div class="mb-3"><label class="form-label">Confirmar nueva contraseña</label><input id="confirmPassword" type="password" minlength="12" class="form-control" required></div>
            <button id="passwordChangeButton" class="btn btn-primary">Guardar contraseña</button>
        </form></div></div></div></div>`;
    document.getElementById("passwordChangeForm").addEventListener("submit", submitPasswordChange);
}

async function submitPasswordChange(event) {
    event.preventDefault();
    const box = document.getElementById("passwordAlert");
    try {
        await apiFetch("/auth/cambiar-password", { method: "POST", body: JSON.stringify({
            password_actual: document.getElementById("currentPassword").value,
            password_nuevo: document.getElementById("newPassword").value,
            confirmacion: document.getElementById("confirmPassword").value
        }) });
        await loadAuthenticatedUser();
        document.querySelectorAll("[data-module]").forEach(button => button.disabled = false);
        await loadModule("dashboard");
    } catch (error) { box.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`; }
}

async function loadModule(name) {
    renderLoading();
    try {
        if (name === "dashboard") await renderDashboard();
        if (name === "politicas") await renderPolicies();
        if (name === "usuarios") await renderUsers();
    } catch (error) { renderError(error.message); }
}

async function renderDashboard() {
    moduleName.textContent = "BIENVENIDO";
    const [policies, pending] = await Promise.all([apiFetch("/politicas"), apiFetch("/politicas/pendientes")]);
    const notice = pending.pendientes > 0 ? `
        <div class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm">
            <div><i class="bi bi-bell-fill me-2"></i><strong>Tienes ${pending.pendientes} política${pending.pendientes === 1 ? "" : "s"} pendiente${pending.pendientes === 1 ? "" : "s"} de lectura.</strong></div>
            <button class="btn btn-warning btn-sm" onclick="openModule('politicas')">Revisar ahora</button>
        </div>` : `
        <div class="alert alert-success shadow-sm"><i class="bi bi-check-circle-fill me-2"></i>Estás al día con las políticas publicadas.</div>`;
    content.innerHTML = `
        <div class="mb-4"><h1 class="h2 mb-1">Hola, ${escapeHtml(currentUser.nombre)}</h1><p class="text-muted">Consulta avisos y documentos internos.</p></div>
        ${notice}
        <div class="row g-3">
            <div class="col-md-4"><div class="metric-card p-4"><div class="text-muted">Políticas vigentes</div><div class="display-5 fw-bold">${policies.length}</div></div></div>
            <div class="col-md-4"><div class="metric-card p-4"><div class="text-muted">Pendientes de lectura</div><div class="display-5 fw-bold text-warning">${pending.pendientes}</div></div></div>
            <div class="col-md-4"><div class="metric-card p-4"><div class="text-muted">Rol actual</div><div class="h3 mt-2 text-capitalize">${escapeHtml(currentUser.rol)}</div></div></div>
        </div>`;
}

function openModule(name) {
    const button = document.querySelector(`[data-module="${name}"]`);
    if (button) button.click(); else loadModule(name);
}

async function renderPolicies() {
    moduleName.textContent = "POLÍTICAS";
    const policies = await apiFetch("/politicas");
    const canPublish = ["administrador", "rh"].includes(currentUser.rol);
    const cards = policies.length ? policies.map(policy => `
        <div class="col-md-6 col-xl-4"><div class="policy-card p-4 d-flex flex-column">
            <div class="d-flex justify-content-between gap-2 mb-2">
                <h2 class="h5 mb-0">${escapeHtml(policy.titulo)}</h2>
                ${policy.pendiente_lectura ? '<span class="badge text-bg-warning">Pendiente</span>' : '<span class="badge text-bg-success">Leída</span>'}
            </div>
            <p class="text-muted flex-grow-1">${escapeHtml(policy.descripcion || "Sin descripción")}</p>
            <div class="small mb-3"><strong>Categoría:</strong> ${escapeHtml(policy.categoria)}<br><strong>Versión:</strong> ${escapeHtml(policy.version)}<br><strong>Publicación:</strong> ${escapeHtml(policy.fecha_publicacion)}</div>
            <div class="d-grid gap-2">
                <a href="${escapeAttribute(policy.archivo_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary"><i class="bi bi-box-arrow-up-right"></i> Abrir en SharePoint</a>
                ${policy.requiere_confirmacion && !policy.lectura_confirmada ? `<button class="btn btn-success" onclick="confirmPolicyRead(${policy.id})"><i class="bi bi-check2-square"></i> Confirmar lectura</button>` : ""}
                ${canPublish ? `<button class="btn btn-outline-secondary" onclick="showReadReport(${policy.id}, '${escapeJs(policy.titulo)}')"><i class="bi bi-people"></i> Ver lecturas</button>` : ""}
            </div>
        </div></div>`).join("") : '<div class="col-12"><div class="alert alert-info">No hay políticas vigentes disponibles.</div></div>';
    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div><h1 class="h2 mb-1">Políticas internas</h1><p class="text-muted mb-0">Documentos vigentes y confirmaciones de lectura.</p></div>
            ${canPublish ? '<button class="btn btn-primary" onclick="showPolicyForm()"><i class="bi bi-plus-lg"></i> Nueva política</button>' : ""}
        </div>
        <div id="policyActionArea"></div><div class="row g-3">${cards}</div>`;
}

async function showPolicyForm() {
    const users = await apiFetch("/usuarios/catalogo");
    const options = users.map(user => `<option value="${escapeAttribute(user.usuario)}">${escapeHtml(user.nombre)} (${escapeHtml(user.usuario)} · ${escapeHtml(user.rol)})</option>`).join("");
    document.getElementById("policyActionArea").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <div class="d-flex justify-content-between"><h2 class="h4">Publicar nueva política</h2><button class="btn-close" onclick="document.getElementById('policyActionArea').innerHTML=''" aria-label="Cerrar"></button></div>
            <div id="policyFormAlert"></div>
            <form id="policyForm" class="row g-3">
                <div class="col-md-8"><label class="form-label">Título</label><input id="policyTitle" class="form-control" minlength="3" required></div>
                <div class="col-md-4"><label class="form-label">Versión</label><input id="policyVersion" class="form-control" value="1.0" required></div>
                <div class="col-md-6"><label class="form-label">Categoría</label><input id="policyCategory" class="form-control" value="General" required></div>
                <div class="col-md-6"><label class="form-label">Fecha de publicación</label><input id="policyDate" type="date" class="form-control" value="${new Date().toISOString().slice(0,10)}" required></div>
                <div class="col-12"><label class="form-label">Descripción</label><textarea id="policyDescription" class="form-control" rows="2"></textarea></div>
                <div class="col-12"><label class="form-label">Vínculo de SharePoint</label><input id="policyUrl" type="url" class="form-control" placeholder="https://..." required></div>
                <div class="col-md-6"><div class="form-check mt-2"><input id="policyConfirmation" class="form-check-input" type="checkbox" checked><label class="form-check-label" for="policyConfirmation">Requiere confirmación de lectura</label></div></div>
                <div class="col-md-6"><div class="form-check mt-2"><input id="policyEveryone" class="form-check-input" type="checkbox" checked><label class="form-check-label" for="policyEveryone">Publicar para todos los usuarios</label></div></div>
                <div id="policyUsersBox" class="col-12 d-none"><label class="form-label">Usuarios autorizados</label><select id="policyUsers" class="form-select" multiple size="6">${options}</select><div class="form-text">Usa Ctrl para elegir varios usuarios.</div></div>
                <div class="col-12"><button class="btn btn-primary" type="submit"><i class="bi bi-send"></i> Publicar política</button></div>
            </form>
        </div></div>`;
    document.getElementById("policyEveryone").addEventListener("change", event => document.getElementById("policyUsersBox").classList.toggle("d-none", event.target.checked));
    document.getElementById("policyForm").addEventListener("submit", publishPolicy);
}

async function publishPolicy(event) {
    event.preventDefault();
    const everyone = document.getElementById("policyEveryone").checked;
    const users = [...document.getElementById("policyUsers").selectedOptions].map(option => option.value);
    try {
        await apiFetch("/politicas", { method: "POST", body: JSON.stringify({
            titulo: document.getElementById("policyTitle").value,
            descripcion: document.getElementById("policyDescription").value || null,
            categoria: document.getElementById("policyCategory").value,
            version: document.getElementById("policyVersion").value,
            archivo_url: document.getElementById("policyUrl").value,
            estado: "vigente",
            fecha_publicacion: document.getElementById("policyDate").value,
            requiere_confirmacion: document.getElementById("policyConfirmation").checked,
            publicar_para_todos: everyone,
            usuarios_autorizados: everyone ? [] : users
        }) });
        await renderPolicies();
    } catch (error) { document.getElementById("policyFormAlert").innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`; }
}

async function confirmPolicyRead(id) {
    if (!confirm("¿Confirmas que abriste y leíste esta política?")) return;
    try { await apiFetch(`/politicas/${id}/confirmar-lectura`, { method: "POST" }); await renderPolicies(); }
    catch (error) { alert(error.message); }
}

async function showReadReport(id, title) {
    try {
        const readings = await apiFetch(`/politicas/${id}/lecturas`);
        const rows = readings.length ? readings.map(item => `<tr><td>${escapeHtml(item.nombre)}</td><td>${escapeHtml(item.usuario)}</td><td>${escapeHtml(item.version_leida)}</td><td>${new Date(item.leida_en).toLocaleString("es-MX")}</td></tr>`).join("") : '<tr><td colspan="4" class="text-center text-muted">Aún no hay confirmaciones.</td></tr>';
        document.getElementById("policyActionArea").innerHTML = `<div class="card shadow-sm border-0 mb-4"><div class="card-body"><div class="d-flex justify-content-between"><h2 class="h5">Lecturas: ${escapeHtml(title)}</h2><button class="btn-close" onclick="document.getElementById('policyActionArea').innerHTML=''"></button></div><div class="table-responsive"><table class="table table-striped"><thead><tr><th>Nombre</th><th>Usuario</th><th>Versión</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
        document.getElementById("policyActionArea").scrollIntoView({ behavior: "smooth" });
    } catch (error) { alert(error.message); }
}

async function renderUsers() {
    moduleName.textContent = "USUARIOS";
    const users = await apiFetch("/usuarios");
    const rows = users.map(user => `<tr><td>${escapeHtml(user.usuario)}</td><td>${escapeHtml(user.nombre)}</td><td>${escapeHtml(user.correo)}</td><td><span class="badge text-bg-secondary">${escapeHtml(user.rol)}</span></td><td>${user.activo ? "Activo" : "Inactivo"}</td></tr>`).join("");
    content.innerHTML = `
        <div class="d-flex justify-content-between mb-4"><div><h1 class="h2">Usuarios</h1><p class="text-muted">Alta masiva por CSV.</p></div><span class="badge text-bg-primary fs-6">${users.length} usuarios</span></div>
        <div class="card shadow-sm border-0 mb-4"><div class="card-body"><h2 class="h5">Importar layout CSV</h2><div id="importAlert"></div><form id="importUsersForm" class="row g-3"><div class="col-md-6"><label class="form-label">Archivo CSV UTF-8</label><input id="csvFile" type="file" accept=".csv" class="form-control" required></div><div class="col-md-6"><label class="form-label">Contraseña temporal común</label><input id="temporaryPassword" type="password" minlength="10" class="form-control" required></div><div class="col-12"><button id="importButton" class="btn btn-primary"><i class="bi bi-upload"></i> Validar e importar</button></div></form></div></div>
        <div class="card shadow-sm border-0"><div class="table-responsive"><table class="table table-striped mb-0"><thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    document.getElementById("importUsersForm").addEventListener("submit", importUsersCsv);
}

async function importUsersCsv(event) {
    event.preventDefault();
    const input = document.getElementById("csvFile");
    const data = new FormData(); data.append("archivo", input.files[0]); data.append("password_temporal", document.getElementById("temporaryPassword").value);
    try {
        const result = await apiFetch("/usuarios/importar", { method: "POST", body: data });
        await renderUsers();
        document.getElementById("importAlert").innerHTML = `<div class="alert alert-${result.omitidos ? "warning" : "success"}">Total: ${result.total_filas}. Creados: ${result.creados}. Omitidos: ${result.omitidos}.</div>`;
    } catch (error) { document.getElementById("importAlert").innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`; }
}

function renderLoading() { content.innerHTML = '<div class="d-flex gap-2 text-muted"><span class="spinner-border spinner-border-sm"></span>Cargando información...</div>'; }
function renderError(message) { content.innerHTML = `<div class="alert alert-danger"><strong>No fue posible cargar el módulo.</strong><br>${escapeHtml(message)}</div>`; }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
function escapeJs(value) { return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", " "); }

async function initialize() {
    if (!getToken()) { showLogin(); return; }
    try {
        await loadAuthenticatedUser(); showApp();
        if (currentUser.debe_cambiar_password) renderPasswordChange(); else await loadModule("dashboard");
    } catch (error) { clearSession(); showLogin("La sesión guardada ya no es válida.", "warning"); }
}
initialize();
