const content = document.getElementById("content");

/* =====================================================
   CONFIGURACION DE ENLACES SHAREPOINT
   Reemplaza estas URL por los links reales de SharePoint.
   Recomendado: usar links tipo "Personas con acceso existente".
===================================================== */
const SHAREPOINT_REPORTE_OPERACIONAL = "https://xpertasesores.sharepoint.com/:x:/r/Herramientas%20Corporativas/Reporte%20Operacional.xlsm?d=w61ddb7475b644c44b7930d69c7bdd90f&csf=1&web=1&e=5Fq5UB";
const SHAREPOINT_ALTAS_PROSPECTOS = "https://xpertasesores.sharepoint.com/:x:/r/Herramientas%20Corporativas/Altas%20y%20prospectos.xlsm?d=wbdd2798331e544569b129dbbce9fd95a&csf=1&web=1&e=syZphZ";

/* =====================================================
   SESION
===================================================== */
function login() {
    const email = document.getElementById("email").value || "admin";

    localStorage.setItem("xp_user", email);

    document.getElementById("loginView").classList.add("d-none");
    document.getElementById("appView").classList.remove("d-none");

    dashboard();
}

function logout() {
    localStorage.removeItem("xp_user");
    location.reload();
}

window.addEventListener("load", function () {
    if (localStorage.getItem("xp_user")) {
        document.getElementById("loginView").classList.add("d-none");
        document.getElementById("appView").classList.remove("d-none");
        dashboard();
    }
});

/* =====================================================
   UTILIDADES LOCALSTORAGE
===================================================== */
function getData(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

/* =====================================================
   DASHBOARD
===================================================== */
function dashboard() {
    const prospectos = getData("prospectos");

    content.innerHTML = `
        <h1 class="mb-4">Dashboard</h1>

        <div class="row g-3">
            <div class="col-md-3">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Prospectos</h6>
                        <h1>${prospectos.length}</h1>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Políticas</h6>
                        <h1>3</h1>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Herramientas</h6>
                        <h1>2</h1>
                    </div>
                </div>
            </div>

            <div class="col-md-3">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Usuarios</h6>
                        <h1>3</h1>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* =====================================================
   PROSPECTOS
===================================================== */
function prospectos() {
    const lista = getData("prospectos");

    let rows = "";

    lista.forEach(function (p, index) {
        rows += `
            <tr>
                <td>${p.rfc || ""}</td>
                <td>${p.empresa || ""}</td>
                <td>${p.contacto || ""}</td>
                <td>${p.promotor || ""}</td>
                <td>${p.estatus || ""}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editarProspecto(${index})">
                        Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarProspecto(${index})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });

    content.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h1>Prospectos</h1>
            <button class="btn btn-primary" onclick="nuevoProspecto()">
                Nuevo Prospecto
            </button>
        </div>

        <input
            type="text"
            id="buscarProspecto"
            class="form-control mb-3"
            placeholder="Buscar por RFC, empresa, contacto o promotor"
            onkeyup="filtrarProspectos()">

        <div class="table-responsive">
            <table class="table table-striped table-bordered align-middle">
                <thead>
                    <tr>
                        <th>RFC</th>
                        <th>Empresa</th>
                        <th>Contacto</th>
                        <th>Promotor</th>
                        <th>Estatus</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tablaProspectos">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function nuevoProspecto() {
    const rfc = prompt("RFC");
    if (!rfc) return;

    const empresa = prompt("Empresa");
    if (!empresa) return;

    const contacto = prompt("Contacto") || "";
    const promotor = prompt("Promotor") || "";
    const estatus = prompt("Estatus", "Contacto") || "Contacto";

    const lista = getData("prospectos");

    lista.push({
        rfc: rfc,
        empresa: empresa,
        contacto: contacto,
        promotor: promotor,
        estatus: estatus,
        fechaRegistro: new Date().toISOString()
    });

    setData("prospectos", lista);
    prospectos();
}

function editarProspecto(index) {
    const lista = getData("prospectos");
    const p = lista[index];

    p.rfc = prompt("RFC", p.rfc) || p.rfc;
    p.empresa = prompt("Empresa", p.empresa) || p.empresa;
    p.contacto = prompt("Contacto", p.contacto) || p.contacto;
    p.promotor = prompt("Promotor", p.promotor) || p.promotor;
    p.estatus = prompt("Estatus", p.estatus) || p.estatus;

    setData("prospectos", lista);
    prospectos();
}

function eliminarProspecto(index) {
    if (!confirm("¿Deseas eliminar este prospecto?")) return;

    const lista = getData("prospectos");
    lista.splice(index, 1);

    setData("prospectos", lista);
    prospectos();
}

function filtrarProspectos() {
    const filtro = document.getElementById("buscarProspecto").value.toLowerCase();
    const filas = document.querySelectorAll("#tablaProspectos tr");

    filas.forEach(function (fila) {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(filtro) ? "" : "none";
    });
}

/* =====================================================
   POLITICAS
===================================================== */
function politicas() {
    content.innerHTML = `
        <h1 class="mb-4">Políticas Internas</h1>

        <div class="row g-3">
            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">Código de Ética</div>
                    <div class="card-body">Versión 1.0</div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-header bg-success text-white">Vacaciones</div>
                    <div class="card-body">Versión 1.2</div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-header bg-warning">Seguridad de Información</div>
                    <div class="card-body">Versión 2.0</div>
                </div>
            </div>
        </div>
    `;
}

/* =====================================================
   HERRAMIENTAS CORPORATIVAS
===================================================== */
function herramientas() {
    content.innerHTML = `
        <h1 class="mb-4">Herramientas Corporativas</h1>

        <p class="text-muted">
            Acceso restringido a archivos operativos autorizados.
        </p>

        <div class="row g-3">
            <div class="col-md-6">
                <div class="card shadow-sm h-100">
                    <div class="card-body">
                        <h4>
                            <i class="bi bi-file-earmark-excel text-success"></i>
                            Reporte Operacional
                        </h4>

                        <p class="text-muted">
                            Archivo Excel operativo con acceso restringido.
                        </p>

                        <a
                            href="${SHAREPOINT_REPORTE_OPERACIONAL}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-success">
                            Abrir Reporte Operacional
                        </a>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="card shadow-sm h-100">
                    <div class="card-body">
                        <h4>
                            <i class="bi bi-file-earmark-excel text-success"></i>
                            Altas y Prospectos
                        </h4>

                        <p class="text-muted">
                            Archivo Excel para control de altas y prospectos.
                        </p>

                        <a
                            href="${SHAREPOINT_ALTAS_PROSPECTOS}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-success">
                            Abrir Altas y Prospectos
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* =====================================================
   USUARIOS
===================================================== */
function usuarios() {
    content.innerHTML = `
        <h1 class="mb-4">Usuarios</h1>

        <table class="table table-striped table-bordered">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>iibarra</td>
                    <td>Herramientas</td>
                </tr>
                <tr>
                    <td>larchundia</td>
                    <td>Herramientas</td>
                </tr>
                <tr>
                    <td>fkury</td>
                    <td>Herramientas</td>
                </tr>
            </tbody>
        </table>
    `;
}

/* =====================================================
   ROUTER
===================================================== */
function loadModule(modulo) {
    switch (modulo) {
        case "dashboard":
            dashboard();
            break;

        case "prospectos":
            prospectos();
            break;

        case "politicas":
            politicas();
            break;

        case "herramientas":
            herramientas();
            break;

        case "usuarios":
            usuarios();
            break;

        default:
            dashboard();
            break;
    }
}
