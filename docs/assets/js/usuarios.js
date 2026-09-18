let currentUser = null;
let usersCache = [];
let editingUser = null;
let passwordTarget = null;


/* =========================================================
   MODALES
========================================================= */

function closeUserForm() {
  userModal.hidden = true;
}

function closePasswordModal() {
  passwordModal.hidden = true;
}

function closeCredentialModal() {
  credentialModal.hidden = true;
}


/* =========================================================
   FORMULARIO DE USUARIO
========================================================= */

function openUserForm(user = null) {
  editingUser = user;

  user_id.value = user?.id || "";
  user_nombre.value = user?.nombre || "";
  user_username.value = user?.username || "";
  user_rol.value = user?.rol || "usuario";
  user_password.value = "";

  createPasswordField.hidden = !!user;
  user_password.required = !user;

  userFormTitle.textContent =
    user
      ? "Editar usuario"
      : "Nuevo usuario";

  userModal.hidden = false;
}


/* =========================================================
   CONTRASEÑA
========================================================= */

function openPasswordForm(userId) {
  passwordTarget =
    usersCache.find(
      (x) => x.id === userId
    );

  if (!passwordTarget) {
    return;
  }

  password_username.textContent =
    passwordTarget.username;

  new_password.value = "";

  passwordModal.hidden = false;

  setTimeout(
    () => new_password.focus(),
    50
  );
}


function showAssignedCredential(
  user,
  password
) {
  credential_user.textContent =
    user.username;

  credential_password.textContent =
    password;

  credentialModal.hidden = false;
}


async function copyCredential() {
  const text =
    `Usuario: ${credential_user.textContent}\n` +
    `Contraseña: ${credential_password.textContent}`;

  try {
    await navigator.clipboard.writeText(
      text
    );

    showMsg(
      "Credenciales copiadas"
    );
  }
  catch (_) {
    showMsg(
      "No se pudo copiar automáticamente",
      "error"
    );
  }
}


/* =========================================================
   ESTADÍSTICAS
========================================================= */

function updateStats() {
  usersTotal.textContent =
    usersCache.length;

  usersAdmins.textContent =
    usersCache.filter(
      (x) =>
        x.rol === "administrador"
    ).length;

  usersLectura.textContent =
    usersCache.filter(
      (x) =>
        x.rol !== "administrador"
    ).length;

  usersInactive.textContent =
    usersCache.filter(
      (x) =>
        !x.activo
    ).length;
}


/* =========================================================
   CARGAR USUARIOS
========================================================= */

async function loadUsers() {
  setLoading(
    "userRows",
    6,
    "Cargando usuarios..."
  );

  try {
    const data =
      await apiGet(
        `/api/usuarios?q=${encodeURIComponent(
          userSearch.value
        )}`
      );

    usersCache =
      data.usuarios || [];

    updateStats();


    userRows.innerHTML =
      usersCache.length
        ? usersCache
            .map(
              (user) => {

                const isCurrentUser =
                  currentUser &&
                  user.id === currentUser.id;

                return `
                  <tr>

                    <td>
                      <div class="cell-title">

                        <strong>
                          ${esc(user.nombre)}
                        </strong>

                        <span class="cell-sub">
                          Perfil gestionado desde el portal
                        </span>

                      </div>
                    </td>


                    <td>
                      <span class="badge">
                        ${esc(user.username)}
                      </span>
                    </td>


                    <td>
                      <span class="badge">

                        ${
                          user.rol ===
                          "administrador"
                            ? "Administrador"
                            : "Usuario"
                        }

                      </span>
                    </td>


                    <td>

                      ${
                        user.activo
                          ? `
                            <span class="status-active">
                              Activo
                            </span>
                          `
                          : `
                            <span class="status-inactive">
                              Inactivo
                            </span>
                          `
                      }

                    </td>


                    <td>

                      <span class="password-protected">
                        ••••••••
                        <small>
                          protegida
                        </small>
                      </span>

                    </td>


                    <td class="user-actions">

                      <button
                        class="btn btn-secondary btn-sm"
                        type="button"
                        onclick="
                          openUserForm(
                            usersCache.find(
                              x =>
                                x.id === ${user.id}
                            )
                          )
                        "
                      >
                        Editar
                      </button>


                      <button
                        class="btn btn-secondary btn-sm"
                        type="button"
                        onclick="
                          openPasswordForm(
                            ${user.id}
                          )
                        "
                      >
                        🔑 Contraseña
                      </button>


                      <button
                        class="
                          btn
                          ${
                            user.activo
                              ? "btn-danger"
                              : "btn-primary"
                          }
                          btn-sm
                        "
                        type="button"
                        onclick="
                          toggleUser(
                            ${user.id},
                            ${!user.activo}
                          )
                        "
                        ${
                          isCurrentUser &&
                          user.activo
                            ? 'title="No puedes desactivar tu propia cuenta"'
                            : ""
                        }
                      >

                        ${
                          user.activo
                            ? "Desactivar"
                            : "Activar"
                        }

                      </button>


                      ${
                        !isCurrentUser
                          ? `
                            <button
                              class="btn btn-danger btn-sm"
                              type="button"
                              onclick="
                                deleteUser(
                                  ${user.id}
                                )
                              "
                            >
                              🗑 Eliminar
                            </button>
                          `
                          : ""
                      }

                    </td>

                  </tr>
                `;
              }
            )
            .join("")
        : `
          <tr>
            <td
              colspan="6"
              class="empty"
            >
              No hay usuarios para mostrar.
            </td>
          </tr>
        `;
  }
  catch (error) {
    userRows.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty"
        >
          No se pudo cargar la información.
        </td>
      </tr>
    `;

    showMsg(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   ACTIVAR / DESACTIVAR
========================================================= */

async function toggleUser(
  userId,
  active
) {
  try {
    await apiPatch(
      `/api/usuarios/${userId}/estado`,
      {
        activo: active
      }
    );

    showMsg(
      active
        ? "Usuario activado"
        : "Usuario desactivado"
    );

    await loadUsers();
  }
  catch (error) {
    showMsg(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   ELIMINAR USUARIO
========================================================= */

async function deleteUser(userId) {
  const user =
    usersCache.find(
      (x) => x.id === userId
    );

  if (!user) {
    return;
  }


  const confirmed =
    confirm(
      `¿Eliminar permanentemente al usuario "${user.nombre}" (${user.username})?\n\nEsta acción no se puede deshacer.`
    );


  if (!confirmed) {
    return;
  }


  try {
    await apiDelete(
      `/api/usuarios/${userId}`
    );

    showMsg(
      "Usuario eliminado correctamente"
    );

    await loadUsers();
  }
  catch (error) {
    showMsg(
      error.message,
      "error"
    );
  }
}


/* =========================================================
   CREAR / EDITAR
========================================================= */

userForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const body = {
      nombre:
        user_nombre.value.trim(),

      username:
        user_username.value.trim(),

      rol:
        user_rol.value
    };


    try {

      if (editingUser) {

        await apiPut(
          `/api/usuarios/${editingUser.id}`,
          body
        );

        closeUserForm();

        showMsg(
          "Usuario actualizado"
        );

      }
      else {

        body.password =
          user_password.value;

        body.activo =
          true;


        const result =
          await apiPost(
            "/api/usuarios",
            body
          );


        closeUserForm();


        showAssignedCredential(
          result.usuario,
          result.password_asignada
        );

      }


      await loadUsers();

    }
    catch (error) {

      showMsg(
        error.message,
        "error"
      );

    }

  }
);


/* =========================================================
   RESTABLECER CONTRASEÑA
========================================================= */

passwordForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    if (!passwordTarget) {
      return;
    }


    try {

      const result =
        await apiPatch(
          `/api/usuarios/${passwordTarget.id}/password`,
          {
            password:
              new_password.value
          }
        );


      closePasswordModal();


      showAssignedCredential(
        result.usuario,
        result.password_asignada
      );


      showMsg(
        "Contraseña actualizada"
      );

    }
    catch (error) {

      showMsg(
        error.message,
        "error"
      );

    }

  }
);


/* =========================================================
   INICIO
========================================================= */

(async () => {

  currentUser =
    await initLayout(
      "usuarios"
    );


  if (
    !currentUser ||
    currentUser.rol !==
    "administrador"
  ) {
    return;
  }


  await loadUsers();

})();