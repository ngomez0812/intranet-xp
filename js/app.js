const API_BASE_URL = "https://sand-imposed-graph-enhancements.trycloudflare.com";

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginAlert = document.getElementById("loginAlert");
const currentUserBox = document.getElementById("currentUser");
const usersNav = document.getElementById("usersNav");
const usersMenuToggle = document.getElementById("usersMenuToggle");
const usersSubmenu = document.getElementById("usersSubmenu");
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

usersMenuToggle?.addEventListener("click", function () {
    const expanded = usersMenuToggle.getAttribute("aria-expanded") === "true";
    usersMenuToggle.setAttribute("aria-expanded", String(!expanded));
    usersSubmenu.classList.toggle("d-none", expanded);
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
    usersNav.classList.toggle("d-none", !["administrador", "rh"].includes(currentUser.rol));
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
        if (name === "usuarios-registro") await renderUserRegistration();
        if (name === "usuarios-alta") await renderUserAlta();
        if (name === "usuarios-consulta") await renderUserConsultation();
        if (name === "usuarios-reporte") await renderUserReport();
        if (name === "direcciones") await renderDirections();
    } catch (error) { renderError(error.message); }
}

async function renderDashboard() {
    moduleName.textContent = "BIENVENIDO";
    const [policies, pending, generalNotice] = await Promise.all([apiFetch("/politicas"), apiFetch("/politicas/pendientes"), apiFetch("/aviso-general")]);
    const notice = pending.pendientes > 0 ? `
        <div class="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm">
            <div><i class="bi bi-bell-fill me-2"></i><strong>Tienes ${pending.pendientes} política${pending.pendientes === 1 ? "" : "s"} pendiente${pending.pendientes === 1 ? "" : "s"} de lectura.</strong></div>
            <button class="btn btn-warning btn-sm" onclick="openModule('politicas')">Revisar ahora</button>
        </div>` : `
        <div class="alert alert-success shadow-sm"><i class="bi bi-check-circle-fill me-2"></i>Estás al día con las políticas publicadas.</div>`;
    content.innerHTML = `
        <div class="dashboard-welcome mb-4"><div class="position-relative" style="z-index:1"><div class="small text-uppercase opacity-75 fw-semibold mb-1">Intranet corporativa</div><h1 class="h2 mb-1">Hola, ${escapeHtml(currentUser.nombre)}</h1><p class="mb-0 opacity-75">Consulta avisos, políticas, comunicados y documentos internos.</p>${["administrador","rh"].includes(currentUser.rol) ? '<button class="btn btn-light btn-sm mt-3" onclick="showNoticeAdmin()"><i class="bi bi-megaphone me-1"></i> Administrar aviso</button>' : ""}</div></div>
        ${notice}
        <div class="row g-3">
            <div class="col-md-4"><div class="metric-card p-4"><div class="text-muted">Publicaciones vigentes</div><div class="display-5 fw-bold">${policies.length}</div></div></div>
            <div class="col-md-4"><div class="metric-card p-4"><div class="text-muted">Pendientes de lectura</div><div class="display-5 fw-bold text-warning">${pending.pendientes}</div></div></div>
            <div class="col-md-4"><div class="metric-card p-4"><div class="text-muted">Rol actual</div><div class="h3 mt-2 text-capitalize">${escapeHtml(currentUser.rol)}</div></div></div>
        </div>`;
    if (generalNotice?.activo) showGeneralNotice(generalNotice);
}

function showGeneralNotice(aviso) {
    const old=document.getElementById("generalNoticeModal"); if(old) old.remove();
    document.body.insertAdjacentHTML("beforeend", `<div id="generalNoticeModal" class="notice-overlay"><div class="notice-dialog"><button class="btn-close notice-close" onclick="document.getElementById('generalNoticeModal').remove()"></button><div class="notice-hero"><div class="notice-icon"><i class="bi bi-megaphone-fill"></i></div><div class="small text-uppercase opacity-75 fw-semibold mb-1">Aviso importante</div><h2>${escapeHtml(aviso.titulo)}</h2></div><div class="notice-body"><div class="notice-copy">${escapeHtml(aviso.contenido).replaceAll("\n","<br>")}</div><div class="notice-actions"><button class="btn btn-primary px-4" onclick="document.getElementById('generalNoticeModal').remove()"><i class="bi bi-check2-circle me-2"></i>Entendido</button></div></div></div></div>`);
}

async function showNoticeAdmin() {
    const aviso=await apiFetch("/aviso-general");
    content.innerHTML=`<div class="card shadow-sm border-0"><div class="card-body p-4"><h1 class="h3">Aviso emergente</h1><p class="text-muted">Edita el mensaje y activa o desactiva su aparición en Bienvenida.</p><div id="noticeAdminAlert"></div><form id="noticeAdminForm"><label class="form-label">Título</label><input id="noticeTitle" class="form-control mb-3" value="${escapeAttribute(aviso?.titulo||"RECUERDA")}" required><label class="form-label">Contenido</label><textarea id="noticeContent" class="form-control mb-3" rows="10" required>${escapeHtml(aviso?.contenido||"")}</textarea><div class="form-check form-switch mb-3"><input id="noticeActive" class="form-check-input" type="checkbox" ${aviso?.activo?"checked":""}><label class="form-check-label">Aviso activo</label></div><button class="btn btn-primary">Guardar aviso</button></form></div></div>`;
    document.getElementById("noticeAdminForm").addEventListener("submit",async event=>{event.preventDefault();try{await apiFetch("/aviso-general",{method:"PUT",body:JSON.stringify({titulo:document.getElementById("noticeTitle").value,contenido:document.getElementById("noticeContent").value,activo:document.getElementById("noticeActive").checked})});document.getElementById("noticeAdminAlert").innerHTML='<div class="alert alert-success">Aviso actualizado.</div>';}catch(error){document.getElementById("noticeAdminAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;}});
}

function openModule(name) {
    const button = document.querySelector(`[data-module="${name}"]`);
    if (button) button.click(); else loadModule(name);
}

async function renderPolicies() {
    moduleName.textContent = "POLÍTICAS Y COMUNICADOS";
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
        </div></div>`).join("") : '<div class="col-12"><div class="alert alert-info">No hay políticas o comunicados vigentes disponibles.</div></div>';
    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div><h1 class="h2 mb-1">Políticas y Comunicados</h1><p class="text-muted mb-0">Documentos vigentes y confirmaciones de lectura.</p></div>
            ${canPublish ? '<button class="btn btn-primary" onclick="showPolicyForm()"><i class="bi bi-plus-lg"></i> Nueva política/comunicado</button>' : ""}
        </div>
        <div id="policyActionArea"></div><div class="row g-3">${cards}</div>`;
}

async function showPolicyForm() {
    const users = await apiFetch("/usuarios/catalogo");
    const options = users.map(user => `<option value="${escapeAttribute(user.usuario)}">${escapeHtml(user.nombre)} (${escapeHtml(user.usuario)} · ${escapeHtml(user.rol)})</option>`).join("");
    document.getElementById("policyActionArea").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body p-4">
            <div class="d-flex justify-content-between"><h2 class="h4">Publicar política/comunicado</h2><button class="btn-close" onclick="document.getElementById('policyActionArea').innerHTML=''" aria-label="Cerrar"></button></div>
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
                <div class="col-12"><button class="btn btn-primary" type="submit"><i class="bi bi-send"></i> Publicar</button></div>
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

async function getActiveDirections() {
    return await apiFetch("/direcciones");
}

async function getActiveDirectors() {
    return await apiFetch("/usuarios/directores");
}

function directorOptions(directors, selectedId = null) {
    const firstOption = directors.length
        ? '<option value="">Selecciona un director responsable</option>'
        : '<option value="">No hay usuarios activos con rol Director</option>';
    return firstOption + directors.map(item =>
        `<option value="${item.id}" ${Number(selectedId) === item.id ? "selected" : ""}>${escapeHtml(item.nombre)} (${escapeHtml(item.usuario)})</option>`
    ).join("");
}

function directionOptions(directions, selectedId = null) {
    return '<option value="">Selecciona una dirección</option>' + directions.map(item =>
        `<option value="${item.id}" ${Number(selectedId) === item.id ? "selected" : ""}>${escapeHtml(item.nombre)}${item.responsable ? ` · ${escapeHtml(item.responsable)}` : ""}</option>`
    ).join("");
}

function roleOptions(selectedRole = "promotor") {
    const roles = currentUser.rol === "administrador" ? ["promotor","consulta","director","rh","administrador"] : ["promotor","consulta","director","rh"];
    return roles.map(role => `<option value="${role}" ${selectedRole === role ? "selected" : ""}>${role.toUpperCase()}</option>`).join("");
}

async function renderUserRegistration() {
    moduleName.textContent = "USUARIOS / REGISTRO";
    content.innerHTML = `
        <div class="mb-4"><h1 class="h2 mb-1">Registro masivo</h1><p class="text-muted mb-0">La columna dirección es obligatoria y debe coincidir con el catálogo activo.</p></div>
        <div class="card shadow-sm border-0"><div class="card-body p-4">
            <h2 class="h5">Importar layout CSV</h2>
            <p class="text-muted">Obligatorias: nombre, usuario, correo, rol, activo, direccion y responsable_usuario. Opcionales: numero_empleado, sucursal, centro_costos, esquema_comisiones, esquema_contrato y observaciones.</p>
            <div id="importAlert"></div>
            <form id="importUsersForm" class="row g-3">
                <div class="col-md-6"><label class="form-label">Archivo CSV UTF-8</label><input id="csvFile" type="file" accept=".csv" class="form-control" required></div>
                <div class="col-md-6"><label class="form-label">Contraseña temporal común</label><input id="temporaryPassword" type="password" minlength="10" class="form-control" required></div>
                <div class="col-12"><button class="btn btn-primary"><i class="bi bi-upload"></i> Validar e importar</button></div>
            </form>
        </div></div>`;
    document.getElementById("importUsersForm").addEventListener("submit", importUsersCsv);
}

async function renderUserAlta() {
    moduleName.textContent = "USUARIOS / ALTA";
    const [directions, directors] = await Promise.all([getActiveDirections(), getActiveDirectors()]);
    content.innerHTML = `<div class="mb-4"><h1 class="h2 mb-1">Alta individual</h1><p class="text-muted mb-0">La dirección organizacional y el responsable directo se asignan de forma independiente.</p></div><div id="userActionArea"></div>`;
    showNewUserForm(directions, directors);
}

async function renderUserConsultation() {
    moduleName.textContent = "USUARIOS / CONSULTA";
    const users = await apiFetch("/usuarios");
    const rows = users.map(user => `<tr>
        <td>${escapeHtml(user.numero_empleado || "")}</td><td>${escapeHtml(user.usuario)}</td><td>${escapeHtml(user.nombre)}</td>
        <td>${escapeHtml(user.direccion_nombre || "SIN ASIGNAR")}</td><td>${escapeHtml(user.responsable_nombre || "PENDIENTE")}</td><td><span class="badge text-bg-secondary">${escapeHtml(user.rol)}</span></td>
        <td>${user.activo ? '<span class="badge text-bg-success">Activo</span>' : '<span class="badge text-bg-light">Inactivo</span>'}</td>
        <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary me-1" onclick="showUserEdit(${user.id})"><i class="bi bi-pencil"></i> Editar</button>${user.id !== currentUser.id ? `<button class="btn btn-sm btn-outline-warning" onclick="showPasswordReset(${user.id}, '${escapeJs(user.usuario)}', '${escapeJs(user.nombre)}')"><i class="bi bi-key"></i></button>` : ""}</td>
    </tr>`).join("");
    content.innerHTML = `<div class="d-flex justify-content-between mb-4"><div><h1 class="h2">Consulta de usuarios</h1><p class="text-muted">Modifica perfil, rol, dirección y datos laborales.</p></div><span class="badge text-bg-primary fs-6">${users.length} usuarios</span></div><div id="userActionArea"></div><div class="card shadow-sm border-0"><div class="table-responsive"><table class="table table-striped align-middle mb-0"><thead><tr><th>No. empleado</th><th>Usuario</th><th>Nombre</th><th>Dirección</th><th>Responsable</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

async function renderUserReport() {
    moduleName.textContent = "USUARIOS / REPORTE";
    const users = await apiFetch("/usuarios");
    const activeUsers = users.filter(user => user.activo);
    const rows = activeUsers.map(user => `<tr><td>${escapeHtml((user.numero_empleado || "").toUpperCase())}</td><td>${escapeHtml(user.nombre.toUpperCase())}</td><td>${escapeHtml((user.direccion_nombre || "SIN ASIGNAR").toUpperCase())}</td><td>${escapeHtml((user.responsable_nombre || "PENDIENTE").toUpperCase())}</td><td>${escapeHtml((user.sucursal || "").toUpperCase())}</td><td>${escapeHtml(user.rol.toUpperCase())}</td></tr>`).join("");
    content.innerHTML = `<div class="d-flex justify-content-between flex-wrap gap-3 mb-4"><div><h1 class="h2">Reporte de usuarios activos</h1><p class="text-muted">Extracción en mayúsculas y sin espacios duplicados.</p></div><button id="exportUsersButton" class="btn btn-success"><i class="bi bi-file-earmark-excel"></i> Exportar a Excel</button></div><div class="metric-card p-4 mb-4"><div class="text-muted">Usuarios activos</div><div class="display-5 fw-bold">${activeUsers.length}</div></div><div id="reportAlert"></div><div class="card shadow-sm border-0"><div class="table-responsive"><table class="table table-striped"><thead><tr><th>No. empleado</th><th>Nombre</th><th>Dirección</th><th>Responsable</th><th>Sucursal</th><th>Rol</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    document.getElementById("exportUsersButton").addEventListener("click", exportActiveUsersExcel);
}

async function exportActiveUsersExcel() {
    const button = document.getElementById("exportUsersButton"); button.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios/reporte.xlsx`, {headers:{Authorization:`Bearer ${getToken()}`}});
        if (!response.ok) throw new Error((await response.json().catch(()=>null))?.detail || `Error HTTP ${response.status}`);
        const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a");
        link.href=url; link.download="usuarios_activos.xlsx"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        document.getElementById("reportAlert").innerHTML='<div class="alert alert-success">Reporte generado.</div>';
    } catch(error) { document.getElementById("reportAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`; }
    finally { button.disabled=false; button.innerHTML='<i class="bi bi-file-earmark-excel"></i> Exportar a Excel'; }
}

function userFieldsHtml(directions, directors, user = null, includeAccess = false) {
    return `<div class="row g-3">
        <div class="col-md-6"><label class="form-label">Nombre completo</label><input id="userName" class="form-control" value="${escapeAttribute(user?.nombre || "")}" required></div>
        ${includeAccess ? `<div class="col-md-3"><label class="form-label">Usuario</label><input id="userLogin" class="form-control" pattern="[a-z0-9._-]{3,50}" required></div><div class="col-md-3"><label class="form-label">Contraseña temporal</label><input id="userPassword" type="password" minlength="10" class="form-control" required></div>` : `<div class="col-md-3"><label class="form-label">Usuario</label><input class="form-control" value="${escapeAttribute(user?.usuario || "")}" disabled></div>`}
        <div class="col-md-3"><label class="form-label">Rol</label><select id="userRole" class="form-select">${roleOptions(user?.rol || "promotor")}</select></div>
        <div class="col-md-6"><label class="form-label">Correo</label><input id="userEmail" type="email" class="form-control" value="${escapeAttribute(user?.correo || "")}" required></div>
        <div class="col-md-3"><label class="form-label">Número de empleado</label><input id="employeeNumber" class="form-control" value="${escapeAttribute(user?.numero_empleado || "")}"></div>
        <div class="col-md-3"><label class="form-label">Estado</label><select id="userActive" class="form-select"><option value="true" ${user?.activo !== false ? "selected" : ""}>Activo</option><option value="false" ${user?.activo === false ? "selected" : ""}>Inactivo</option></select></div>
        <div class="col-md-6"><label class="form-label">Dirección a cargo *</label><select id="userDirection" class="form-select" required>${directionOptions(directions,user?.direccion_id)}</select><div class="form-text">Grupo organizacional del usuario.</div></div>
        <div class="col-md-6"><label class="form-label fw-semibold">Responsable / Jefe (Director) *</label><select id="userResponsible" class="form-select" required>${directorOptions(directors,user?.responsable_id)}</select><div class="form-text"><i class="bi bi-info-circle me-1"></i>Este campo es independiente de la Dirección a cargo y guarda el ID del director seleccionado.</div></div>
        <div class="col-md-6"><label class="form-label">Sucursal</label><input id="userBranch" class="form-control" value="${escapeAttribute(user?.sucursal || "")}"></div>
        <div class="col-md-4"><label class="form-label">Centro de costos</label><input id="costCenter" class="form-control" value="${escapeAttribute(user?.centro_costos || "")}"></div>
        <div class="col-md-4"><label class="form-label">Esquema comisiones</label><input id="commissionScheme" class="form-control" value="${escapeAttribute(user?.esquema_comisiones || "")}"></div>
        <div class="col-md-4"><label class="form-label">Esquema contrato</label><input id="contractScheme" class="form-control" value="${escapeAttribute(user?.esquema_contrato || "")}"></div>
        <div class="col-md-4"><label class="form-label">Fecha de baja</label><input id="terminationDate" type="date" class="form-control" value="${escapeAttribute(user?.fecha_baja || "")}"></div>
        <div class="col-md-8"><label class="form-label">Observaciones</label><textarea id="userNotes" class="form-control" rows="2">${escapeHtml(user?.observaciones || "")}</textarea></div>
    </div>`;
}

function collectUserData(includeAccess = false) {
    const data={nombre:document.getElementById("userName").value,correo:document.getElementById("userEmail").value,rol:document.getElementById("userRole").value,activo:document.getElementById("userActive").value==="true",direccion_id:Number(document.getElementById("userDirection").value),responsable_id:Number(document.getElementById("userResponsible").value),sucursal:document.getElementById("userBranch").value||null,centro_costos:document.getElementById("costCenter").value||null,esquema_comisiones:document.getElementById("commissionScheme").value||null,esquema_contrato:document.getElementById("contractScheme").value||null,observaciones:document.getElementById("userNotes").value||null,fecha_baja:document.getElementById("terminationDate").value||null,numero_empleado:document.getElementById("employeeNumber").value||null};
    if(includeAccess){data.usuario=document.getElementById("userLogin").value.toLowerCase();data.password_temporal=document.getElementById("userPassword").value;}
    return data;
}

function showNewUserForm(directions, directors) {
    document.getElementById("userActionArea").innerHTML=`<div class="card shadow-sm border-0"><div class="card-body p-4"><div id="newUserAlert"></div><form id="newUserForm">${userFieldsHtml(directions,directors,null,true)}<button class="btn btn-primary mt-4"><i class="bi bi-person-check"></i> Crear usuario</button></form></div></div>`;
    document.getElementById("newUserForm").addEventListener("submit",createSingleUser);
}

async function createSingleUser(event) {
    event.preventDefault(); try { await apiFetch("/usuarios",{method:"POST",body:JSON.stringify(collectUserData(true))}); await renderUserConsultation(); document.getElementById("userActionArea").innerHTML='<div class="alert alert-success">Usuario creado.</div>'; } catch(error){document.getElementById("newUserAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;}
}

async function showUserEdit(id) {
    const [users,directions,directors]=await Promise.all([apiFetch("/usuarios"),getActiveDirections(),getActiveDirectors()]); const user=users.find(item=>item.id===id); if(!user)return;
    document.getElementById("userActionArea").innerHTML=`<div class="card shadow-sm border-0 mb-4"><div class="card-body p-4"><div class="d-flex justify-content-between"><h2 class="h4">Modificar usuario</h2><button class="btn-close" onclick="closeUserAction()"></button></div><div id="editUserAlert"></div><form id="editUserForm">${userFieldsHtml(directions,directors,user,false)}<button class="btn btn-primary mt-4"><i class="bi bi-save"></i> Guardar cambios</button></form></div></div>`;
    document.getElementById("editUserForm").addEventListener("submit",event=>updateUser(event,id)); document.getElementById("userActionArea").scrollIntoView({behavior:"smooth"});
}

async function updateUser(event,id){event.preventDefault();try{await apiFetch(`/usuarios/${id}`,{method:"PUT",body:JSON.stringify(collectUserData(false))});await renderUserConsultation();document.getElementById("userActionArea").innerHTML='<div class="alert alert-success">Usuario actualizado.</div>';}catch(error){document.getElementById("editUserAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;}}

function showPasswordReset(id,username,name){document.getElementById("userActionArea").innerHTML=`<div class="card shadow-sm border-0 mb-4"><div class="card-body p-4"><h2 class="h4">Restablecer contraseña</h2><p>${escapeHtml(name)} (${escapeHtml(username)})</p><div id="resetPasswordAlert"></div><form id="resetPasswordForm" class="row g-3"><div class="col-md-8"><input id="resetTemporaryPassword" type="password" minlength="10" class="form-control" required></div><div class="col-md-4"><button class="btn btn-warning w-100">Restablecer</button></div></form></div></div>`;document.getElementById("resetPasswordForm").addEventListener("submit",event=>resetUserPassword(event,id,username));}
async function resetUserPassword(event,id,username){event.preventDefault();if(!confirm(`¿Restablecer la contraseña de ${username}?`))return;try{await apiFetch(`/usuarios/${id}/restablecer-password`,{method:"POST",body:JSON.stringify({password_temporal:document.getElementById("resetTemporaryPassword").value})});document.getElementById("resetPasswordAlert").innerHTML='<div class="alert alert-success">Contraseña restablecida.</div>';}catch(error){document.getElementById("resetPasswordAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;}}
function closeUserAction(){document.getElementById("userActionArea").innerHTML="";}

async function renderDirections(){
    moduleName.textContent="CATÁLOGO / DIRECCIONES"; const directions=await apiFetch("/direcciones?incluir_inactivas=true");
    const rows=directions.map(item=>`<tr><td>${escapeHtml(item.nombre)}</td><td>${escapeHtml(item.responsable||"")}</td><td>${escapeHtml(item.descripcion||"")}</td><td>${item.activo?'<span class="badge text-bg-success">Activo</span>':'<span class="badge text-bg-secondary">Inactivo</span>'}</td><td><button class="btn btn-sm btn-outline-primary me-1" onclick="showDirectionForm(${item.id})"><i class="bi bi-pencil"></i></button>${item.activo?`<button class="btn btn-sm btn-outline-danger" onclick="disableDirection(${item.id})"><i class="bi bi-x-circle"></i></button>`:""}</td></tr>`).join("");
    content.innerHTML=`<div class="d-flex justify-content-between mb-4"><div><h1 class="h2">Direcciones a cargo</h1><p class="text-muted">Alta, modificación y baja lógica.</p></div><button class="btn btn-primary" onclick="showDirectionForm()"><i class="bi bi-plus-lg"></i> Nueva dirección</button></div><div id="directionActionArea"></div><div class="card shadow-sm border-0"><div class="table-responsive"><table class="table table-striped"><thead><tr><th>Dirección</th><th>Responsable</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
async function showDirectionForm(id=null){const directions=await apiFetch("/direcciones?incluir_inactivas=true");const item=id?directions.find(d=>d.id===id):null;document.getElementById("directionActionArea").innerHTML=`<div class="card shadow-sm border-0 mb-4"><div class="card-body p-4"><h2 class="h4">${item?"Modificar":"Nueva"} dirección</h2><div id="directionAlert"></div><form id="directionForm" class="row g-3"><div class="col-md-5"><label class="form-label">Nombre</label><input id="directionName" class="form-control" value="${escapeAttribute(item?.nombre||"")}" required></div><div class="col-md-5"><label class="form-label">Responsable</label><input id="directionOwner" class="form-control" value="${escapeAttribute(item?.responsable||"")}"></div><div class="col-md-2"><label class="form-label">Estado</label><select id="directionActive" class="form-select"><option value="true" ${item?.activo!==false?"selected":""}>Activo</option><option value="false" ${item?.activo===false?"selected":""}>Inactivo</option></select></div><div class="col-12"><label class="form-label">Descripción</label><textarea id="directionDescription" class="form-control">${escapeHtml(item?.descripcion||"")}</textarea></div><div class="col-12"><button class="btn btn-primary">Guardar</button></div></form></div></div>`;document.getElementById("directionForm").addEventListener("submit",event=>saveDirection(event,id));}
async function saveDirection(event,id){event.preventDefault();const data={nombre:document.getElementById("directionName").value,responsable:document.getElementById("directionOwner").value||null,descripcion:document.getElementById("directionDescription").value||null,activo:document.getElementById("directionActive").value==="true"};try{await apiFetch(id?`/direcciones/${id}`:"/direcciones",{method:id?"PUT":"POST",body:JSON.stringify(data)});await renderDirections();}catch(error){document.getElementById("directionAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;}}
async function disableDirection(id){if(!confirm("¿Dar de baja esta dirección? Los usuarios activos deben estar reasignados."))return;try{await apiFetch(`/direcciones/${id}/baja`,{method:"PATCH"});await renderDirections();}catch(error){alert(error.message);}}

async function importUsersCsv(event){event.preventDefault();const data=new FormData();data.append("archivo",document.getElementById("csvFile").files[0]);data.append("password_temporal",document.getElementById("temporaryPassword").value);try{const result=await apiFetch("/usuarios/importar",{method:"POST",body:data});await renderUserRegistration();document.getElementById("importAlert").innerHTML=`<div class="alert alert-${result.omitidos?"warning":"success"}">Total: ${result.total_filas}. Creados: ${result.creados}. Omitidos: ${result.omitidos}.</div>`;}catch(error){document.getElementById("importAlert").innerHTML=`<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;}}

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
