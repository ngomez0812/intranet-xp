const content = document.getElementById("content");

function login() {

    document
        .getElementById("loginView")
        .classList.add("d-none");

    document
        .getElementById("appView")
        .classList.remove("d-none");

    dashboard();

}

function logout() {

    location.reload();

}

function dashboard() {

    content.innerHTML = `
        <h2>Dashboard</h2>

        <div class="card">
            <div class="card-body">
                Dashboard funcionando ✅
            </div>
        </div>
    `;

}

function prospectos() {

    content.innerHTML = `
        <h2>Prospectos</h2>

        <button class="btn btn-primary mb-3">
            Nuevo Prospecto
        </button>

        <table class="table table-striped">

            <thead>

                <tr>
                    <th>RFC</th>
                    <th>Empresa</th>
                </tr>

            </thead>

            <tbody>

                <tr>
                    <td>XAXX010101000</td>
                    <td>XP ASESORES</td>
                </tr>

            </tbody>

        </table>
    `;

}

function politicas() {

    content.innerHTML = `
        <h2>Políticas</h2>
        <p>Módulo en construcción.</p>
    `;

}

function inventario() {

    content.innerHTML = `
        <h2>Inventario</h2>
        <p>Módulo en construcción.</p>
    `;

}

function usuarios() {

    content.innerHTML = `
        <h2>Usuarios</h2>
        <p>Módulo en construcción.</p>
    `;

}
function herramientas() {

    content.innerHTML = `
        <h2 class="mb-4">
            Herramientas Corporativas
        </h2>

        <p class="text-muted">
            Acceso restringido a archivos operativos autorizados.
        </p>

        <div class="row">

            <div class="col-md-6 mb-3">

                <div class="card shadow-sm">

                    <div class="card-body">

                        <h5>
                            <i class="bi bi-file-earmark-excel text-success"></i>
                            Reporte Operacional
                        </h5>

                        <p class="text-muted">
                            Archivo Excel operativo con acceso restringido.
                        </p>

                        Reporte Operacional.xlsm

                            Abrir Reporte Operacional

                        </a>

                    </div>

                </div>

            </div>

            <div class="col-md-6 mb-3">

                <div class="card shadow-sm">

                    <div class="card-body">

                        <h5>
                            <i class="bi bi-file-earmark-excel text-success"></i>
                            Altas y Prospectos
                        </h5>

                        <p class="text-muted">
                            Archivo Excel para control de altas y prospectos.
                        </p>

                        Altas y Prospectos.xlsm

                            Abrir Altas y Prospectos

                        </a>

                    </div>

                </div>

            </div>

        </div>
    `;

}

function loadModule(modulo) {

    switch(modulo){

        case "dashboard":
            dashboard();
            break;

        case "prospectos":
            prospectos();
            break;

        case "politicas":
            politicas();
            break;

        case "inventario":
            inventario();
            break;

        case "usuarios":
            usuarios();
            break;
            
        case "herramientas":
            herramientas();
            break;

    }

}
