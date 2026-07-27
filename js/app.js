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

    }

}
