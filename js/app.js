const content = document.getElementById("content");

/* ==========================
   SESION
========================== */

function login() {

    const email =
        document.getElementById("email").value;

    localStorage.setItem(
        "xp_user",
        email || "admin"
    );

    document
        .getElementById("loginView")
        .classList.add("d-none");

    document
        .getElementById("appView")
        .classList.remove("d-none");

    loadModule("dashboard");

}

function logout() {

    localStorage.removeItem("xp_user");

    location.reload();

}

window.addEventListener("load", () => {

    if (localStorage.getItem("xp_user")) {

        document
            .getElementById("loginView")
            .classList.add("d-none");

        document
            .getElementById("appView")
            .classList.remove("d-none");

        loadModule("dashboard");

    }

});

/* ==========================
   LOCAL STORAGE
========================== */

function obtenerProspectos() {

    return JSON.parse(
        localStorage.getItem("prospectos") || "[]"
    );

}

function guardarProspectos(data) {

    localStorage.setItem(
        "prospectos",
        JSON.stringify(data)
    );

}

/* ==========================
   DASHBOARD
========================== */

function dashboard() {

    const prospectos =
        obtenerProspectos();

    content.innerHTML = `

        <h2 class="mb-4">
            Dashboard
        </h2>

        <div class="row">

            <div class="col-md-3">

                <div class="card shadow-sm">

                    <div class="card-body">

                        <h6 class="text-muted">
                            Prospectos
                        </h6>

                        <h1>
                            ${prospectos.length}
                        </h1>

                    </div>

                </div>

            </div>

            <div class="col-md-3">

                <div class="card shadow-sm">

                    <div class="card-body">

                        <h6 class="text-muted">
                            Cotizaciones
                        </h6>

                        <h1>0</h1>

                    </div>

                </div>

            </div>

            <div class="col-md-3">

                <div class="card shadow-sm">

                    <div class="card-body">

                        <h6 class="text-muted">
                            Inventario
                        </h6>

                        <h1>0</h1>

                    </div>

                </div>

            </div>

            <div class="col-md-3">

                <div class="card shadow-sm">

                    <div class="card-body">

                        <h6 class="text-muted">
                            Políticas
                        </h6>

                        <h1>3</h1>

                    </div>

                </div>

            </div>

        </div>

    `;

}

/* ==========================
   PROSPECTOS
========================== */

function prospectos() {

    const lista =
        obtenerProspectos();

    let filas = "";

    lista.forEach((p, index) => {

        filas += `

        <tr>

            <td>${p.rfc}</td>

            <td>${p.empresa}</td>

            <td>${p.contacto}</td>

            <td>${p.estatus}</td>

            <td>

                <button
                    class="btn btn-warning btn-sm"
                    onclick="editarProspecto(${index})">

                    ✏️

                </button>

                <button
                    class="btn btn-danger btn-sm"
                    onclick="eliminarProspecto(${index})">

                    🗑️

                </button>

            </td>

        </tr>

        `;

    });

    content.innerHTML = `

        <div class="d-flex justify-content-between mb-3">

            <h2>
                Prospectos
            </h2>

            <button
                class="btn btn-primary"
                onclick="nuevoProspecto()">

                + Nuevo Prospecto

            </button>

        </div>

        <input
            type="text"
            class="form-control mb-3"
            id="buscar"
            placeholder="Buscar RFC o Empresa"
            onkeyup="filtrarProspectos()">

        <table class="table table-striped">

            <thead>

                <tr>

                    <th>RFC</th>
                    <th>Empresa</th>
                    <th>Contacto</th>
                    <th>Estatus</th>
                    <th>Acciones</th>

                </tr>

            </thead>

            <tbody id="tablaProspectos">

                ${filas}

            </tbody>

        </table>

    `;

}

function nuevoProspecto() {

    const rfc =
        prompt("RFC");

    if (!rfc) return;

    const empresa =
        prompt("Empresa");

    if (!empresa) return;

    const contacto =
        prompt("Contacto");

    const estatus =
        prompt("Estatus", "Contacto");

    const lista =
        obtenerProspectos();

    lista.push({

        rfc,
        empresa,
        contacto,
        estatus

    });

    guardarProspectos(lista);

    prospectos();

}

function editarProspecto(index) {

    const lista =
        obtenerProspectos();

    const p =
        lista[index];

    p.rfc =
        prompt("RFC", p.rfc);

    p.empresa =
        prompt("Empresa", p.empresa);

    p.contacto =
        prompt("Contacto", p.contacto);

    p.estatus =
        prompt("Estatus", p.estatus);

    guardarProspectos(lista);

    prospectos();

}

function eliminarProspecto(index) {

    if (
        !confirm(
            "¿Eliminar prospecto?"
        )
    ) return;

    const lista =
        obtenerProspectos();

    lista.splice(index, 1);

    guardarProspectos(lista);

    prospectos();

}

function filtrarProspectos() {

    const texto =
        document
            .getElementById("buscar")
            .value
            .toLowerCase();

    const filas =
        document.querySelectorAll(
            "#tablaProspectos tr"
        );

    filas.forEach(fila => {

        if (
            fila.innerText
                .toLowerCase()
                .includes(texto)
        ) {

            fila.style.display = "";

        } else {

            fila.style.display = "none";

        }

    });

}

/* ==========================
   MODULOS
========================== */

function politicas() {

    content.innerHTML = `

        <h2>Políticas Internas</h2>

        <div class="card">

            <div class="card-body">

                Código de Ética

            </div>

        </div>

    `;

}

function inventario() {

    content.innerHTML = `

        <h2>Inventario</h2>

        <p>
            Módulo en construcción.
        </p>

    `;

}

function usuarios() {

    content.innerHTML = `

        <h2>Usuarios</h2>

        <p>
            Módulo en construcción.
        </p>

    `;

}

function loadModule(module) {

    switch (module) {

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

    }

}
