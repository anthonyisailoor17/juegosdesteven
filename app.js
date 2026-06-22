// ==========================================================================
// CONFIGURACIÓN DE LA API Y VARIABLES GLOBALES
// ==========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbweO0HXSVL6SlqnCuSZVX6w4DI_VaHlAJd-wx_euYfMD2E89goTILyoVtKk_B6gCRi-/exec";

// Elementos de la Interfaz - Notificaciones
const msjContenedor = document.getElementById("msj-contenedor");
const msjTexto = document.getElementById("msj-texto");

// Elementos de la Interfaz - Pantallas / Vistas
const seccionLogin = document.getElementById("seccion-login");
const seccionPrincipal = document.getElementById("seccion-principal");

// Elementos de la Interfaz - Login
const formLogin = document.getElementById("form-login");
const loginCorreo = document.getElementById("login-correo");
const loginPin = document.getElementById("login-pin");

// Elementos de la Interfaz - Barra de Navegación
const sesionNombre = document.getElementById("sesion-nombre");
const sesionCorreo = document.getElementById("sesion-correo");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

// Elementos de la Interfaz - Formulario de Solicitud
const formSolicitud = document.getElementById("form-solicitud");
const solicitudTipo = document.getElementById("solicitud-tipoSolicitud");
const solicitudTitulo = document.getElementById("solicitud-titulo");
const solicitudDescripcion = document.getElementById("solicitud-descripcion");
const solicitudPrioridad = document.getElementById("solicitud-prioridad");

// Elementos de la Interfaz - Tabla y Acciones
const tablaCuerpo = document.getElementById("tabla-cuerpo-solicitudes");
const btnActualizar = document.getElementById("btn-actualizar");
const btnImprimir = document.getElementById("btn-imprimir");

// ==========================================================================
// INICIALIZACIÓN DEL SISTEMA
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    comprobarSesion();
    configurarEventos();
});

// Comprobar si existe un usuario autenticado en la sesión actual
function comprobarSesion() {
    const usuarioGuardado = sessionStorage.getItem("usuario_asiservy");
    if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);
        establecerInterfazUsuario(usuario);
        mostrarPantallaPrincipal();
        listarSolicitudes(usuario.idUsuario);
    } else {
        mostrarPantallaLogin();
    }
}

// Configurar los escuchadores de eventos del portal
function configurarEventos() {
    formLogin.addEventListener("submit", manejarLogin);
    formSolicitud.addEventListener("submit", manejarEnvioSolicitud);
    btnCerrarSesion.addEventListener("click", manejarCerrarSesion);
    btnActualizar.addEventListener("click", () => {
        const usuario = JSON.parse(sessionStorage.getItem("usuario_asiservy"));
        if (usuario) {
            listarSolicitudes(usuario.idUsuario);
        }
    });
    btnImprimir.addEventListener("click", () => {
        window.print();
    });
}

// ==========================================================================
// CONTROL DE FLUJO DE PANTALLAS Y MENSAJES
// ==========================================================================
function mostrarPantallaLogin() {
    seccionPrincipal.className = "vista-oculta";
    seccionLogin.className = "vista-activa";
}

function mostrarPantallaPrincipal() {
    seccionLogin.className = "vista-oculta";
    seccionPrincipal.className = "vista-activa";
}

function establecerInterfazUsuario(usuario) {
    sesionNombre.textContent = usuario.nombre;
    sesionCorreo.textContent = usuario.correo;
}

// Mostrar mensajes flotantes (Carga, Éxito, Error)
function mostrarMensaje(texto, tipo) {
    msjTexto.textContent = texto;
    msjContenedor.className = `mostrar msj-${tipo}`;
    
    // Si no es de carga, se oculta automáticamente a los 4 segundos
    if (tipo !== "carga") {
        setTimeout(ocultarMensaje, 4000);
    }
}

function ocultarMensaje() {
    msjContenedor.className = "msj-oculto";
}

// ==========================================================================
// FUNCIONES NATIVAS DE ACCESO A API (AUTENTICACIÓN)
// ==========================================================================
function manejarLogin(e) {
    e.preventDefault();
    ocultarMensaje();

    const correo = loginCorreo.value.trim();
    const pin = loginPin.value.trim();

    if (!correo || !pin) {
        mostrarMensaje("Por favor, complete todos los campos de acceso.", "error");
        return;
    }

    mostrarMensaje("Validando credenciales...", "carga");

    const parametros = new URLSearchParams();
    parametros.append("accion", "login");
    parametros.append("correo", correo);
    parametros.append("pin", pin);

    fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: parametros.toString()
    })
    .then(response => {
        if (!response.ok) throw new Error("Error en la respuesta del servidor.");
        return response.json();
    })
    .then(data => {
        if (data.status === "success" && data.usuario) {
            if (data.usuario.estado !== "Activo") {
                mostrarMensaje("El usuario se encuentra inactivo.", "error");
                return;
            }
            sessionStorage.setItem("usuario_asiservy", JSON.stringify(data.usuario));
            establecerInterfazUsuario(data.usuario);
            mostrarPantallaPrincipal();
            formLogin.reset();
            mostrarMensaje("Acceso correcto. Bienvenido a Asiservy.", "exito");
            listarSolicitudes(data.usuario.idUsuario);
        } else {
            mostrarMensaje(data.message || "Correo o PIN incorrectos.", "error");
        }
    })
    .catch(error => {
        console.error("Error Login:", error);
        mostrarMensaje("Error de conexión al validar el acceso.", "error");
    });
}

function manejarCerrarSesion() {
    sessionStorage.removeItem("usuario_asiservy");
    formSolicitud.reset();
    tablaCuerpo.innerHTML = "";
    mostrarPantallaLogin();
    mostrarMensaje("Sesión cerrada correctamente.", "exito");
}

// ==========================================================================
// FUNCIONES NATIVAS DE ACCESO A API (SOLICITUDES)
// ==========================================================================
function manejarEnvioSolicitud(e) {
    e.preventDefault();
    ocultarMensaje();

    const usuario = JSON.parse(sessionStorage.getItem("usuario_asiservy"));
    if (!usuario) {
        manejarCerrarSesion();
        return;
    }

    const tipoSolicitud = solicitudTipo.value;
    const titulo = solicitudTitulo.value.trim();
    const descripcion = solicitudDescripcion.value.trim();
    const prioridad = solicitudPrioridad.value;

    if (!tipoSolicitud || !titulo || !descripcion || !prioridad) {
        mostrarMensaje("Por favor, rellene todos los campos del formulario.", "error");
        return;
    }

    mostrarMensaje("Procesando y registrando solicitud...", "carga");

    const parametros = new URLSearchParams();
    parametros.append("accion", "crearSolicitud");
    parametros.append("idUsuario", usuario.idUsuario);
    parametros.append("solicitante", usuario.nombre);
    parametros.append("correo", usuario.correo);
    parametros.append("tipoSolicitud", tipoSolicitud);
    parametros.append("titulo", titulo);
    parametros.append("descripcion", descripcion);
    parametros.append("prioridad", prioridad);

    fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: parametros.toString()
    })
    .then(response => {
        if (!response.ok) throw new Error("Error en la respuesta del servidor.");
        return response.json();
    })
    .then(data => {
        if (data.status === "success") {
            formSolicitud.reset();
            mostrarMensaje("Solicitud creada y guardada con éxito.", "exito");
            listarSolicitudes(usuario.idUsuario);
        } else {
            mostrarMensaje(data.message || "No se pudo registrar la solicitud.", "error");
        }
    })
    .catch(error => {
        console.error("Error CrearSolicitud:", error);
        mostrarMensaje("Error de red al guardar la solicitud.", "error");
    });
}

function listarSolicitudes(idUsuario) {
    mostrarMensaje("Sincronizando historial de solicitudes...", "carga");

    const urlConsulta = `${API_URL}?accion=listarSolicitudes&idUsuario=${encodeURIComponent(idUsuario)}`;

    fetch(urlConsulta, {
        method: "GET",
        mode: "cors"
    })
    .then(response => {
        if (!response.ok) throw new Error("Error al obtener los datos.");
        return response.json();
    })
    .then(data => {
        ocultarMensaje();
        if (data.status === "success" && Array.isArray(data.solicitudes)) {
            renderizarTablaSolicitudes(data.solicitudes);
        } else {
            tablaCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center;">No se encontraron registros de solicitudes.</td></tr>`;
        }
    })
    .catch(error => {
        console.error("Error ListarSolicitudes:", error);
        mostrarMensaje("Error al conectar con el servidor para consultar registros.", "error");
        tablaCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error al cargar las solicitudes de forma remota.</td></tr>`;
    });
}

// Inyección de filas dinámica en la tabla HTML respetando el modelo de datos
function renderizarTablaSolicitudes(solicitudes) {
    tablaCuerpo.innerHTML = "";

    if (solicitudes.length === 0) {
        tablaCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center;">No posee solicitudes internas en su historial.</td></tr>`;
        return;
    }

    solicitudes.forEach(solicitud => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td><strong>${solicitud.idSolicitud || ""}</strong></td>
            <td>${solicitud.fechaRegistro || ""}</td>
            <td>${solicitud.tipoSolicitud || ""}</td>
            <td>${solicitud.titulo || ""}</td>
            <td>${solicitud.descripcion || ""}</td>
            <td><span class="badge-prioridad">${solicitud.prioridad || ""}</span></td>
            <td><strong>${solicitud.estado || "Pendiente"}</strong></td>
        `;

        tablaCuerpo.appendChild(fila);
    });
}
