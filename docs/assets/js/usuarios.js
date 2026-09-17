let currentUser = null;
let usersCache = [];
let editingUser = null;
let passwordTarget = null;

function closeUserForm() {
  userModal.hidden = true;
}

function closePasswordModal() {
  passwordModal.hidden = true;
}

function closeCredentialModal() {
  credentialModal.hidden = true;
}

function openUserForm(user = null) {
  editingUser = user;
  user_id.value = user?.id || "";
  user_nombre.value = user?.nombre || "";
  user_username.value = user?.username || "";
  user_rol.value = user?.rol || "usuario";
  user_password.value = "";
  createPasswordField.hidden = !!user;
  user_password.required = !user;
  userFormTitle.textContent = user ? "Editar usuario" : "Nuevo usuario";
  userModal.hidden = false;
}

function openPasswordForm(userId) {
  passwordTarget = usersCache.find((x) => x.id === userId);
  if (!passwordTarget) return;
  password_username.textContent = passwordTarget.username;
  new_password.value = "";
  passwordModal.hidden = false;
  setTimeout(() => new_password.focus(), 50);
}

function showAssignedCredential(user, password) {
  credential_user.textContent = user.username;
  credential_password.textContent = password;
  credentialModal.hidden = false;
}

async function copyCredential() {
  const text = `Usuario: ${credential_user.textContent}\nContraseña: ${credential_password.textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    showMsg("Credenciales copiadas");
  } catch (_) {
    showMsg("No se pudo copiar automáticamente", "error");
  }
}

function updateStats() {
  usersTotal.textContent = usersCache.length;
  usersAdmins.textContent = usersCache.filter((x) => x.rol === "administrador").length;
  usersLectura.textContent = usersCache.filter((x) => x.rol !== "administrador").length;
  usersInactive.textContent = usersCache.filter((x) => !x.activo).length;
}

async function loadUsers() {
  setLoading("userRows", 6, "Cargando usuarios...");
  try {
    const data = await apiGet(`/api/usuarios?q=${encodeURIComponent(userSearch.value)}`);
    usersCache = data.usuarios;
    updateStats();
    userRows.innerHTML = usersCache.length
      ? usersCache.map((user) => `
        <tr>
          <td>
            <div class="cell-title">
              <strong>${esc(user.nombre)}</strong>
              <span class="cell-sub">Perfil gestionado desde el portal</span>
            </div>
          </td>
          <td><span class="badge">${esc(user.username)}</span></td>
          <td><span class="badge">${user.rol === "administrador" ? "Administrador" : "Usuario"}</span></td>
          <td>${user.activo ? '<span class="status-active">Activo</span>' : '<span class="status-inactive">Inactivo</span>'}</td>
          <td><span class="password-protected">•••••••• <small>protegida</small></span></td>
          <td class="user-actions">
            <button class="btn btn-secondary btn-sm" onclick="openUserForm(usersCache.find(x=>x.id===${user.id}))">Editar</button>
            <button class="btn btn-secondary btn-sm" onclick="openPasswordForm(${user.id})">🔑 Contraseña</button>
            <button class="btn ${user.activo ? "btn-danger" : "btn-primary"} btn-sm" onclick="toggleUser(${user.id}, ${!user.activo})">${user.activo ? "Desactivar" : "Activar"}</button>
          </td>
        </tr>`).join("")
      : '<tr><td colspan="6" class="empty">No hay usuarios para mostrar.</td></tr>';
  } catch (error) {
    userRows.innerHTML = '<tr><td colspan="6" class="empty">No se pudo cargar la información.</td></tr>';
    showMsg(error.message, "error");
  }
}

async function toggleUser(userId, active) {
  try {
    await apiPatch(`/api/usuarios/${userId}/estado`, { activo: active });
    showMsg(active ? "Usuario activado" : "Usuario desactivado");
    await loadUsers();
  } catch (error) {
    showMsg(error.message, "error");
  }
}

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    nombre: user_nombre.value.trim(),
    username: user_username.value.trim(),
    rol: user_rol.value,
  };
  try {
    if (editingUser) {
      await apiPut(`/api/usuarios/${editingUser.id}`, body);
      closeUserForm();
      showMsg("Usuario actualizado");
    } else {
      body.password = user_password.value;
      body.activo = true;
      const result = await apiPost("/api/usuarios", body);
      closeUserForm();
      showAssignedCredential(result.usuario, result.password_asignada);
    }
    await loadUsers();
  } catch (error) {
    showMsg(error.message, "error");
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!passwordTarget) return;
  try {
    const result = await apiPatch(`/api/usuarios/${passwordTarget.id}/password`, { password: new_password.value });
    closePasswordModal();
    showAssignedCredential(result.usuario, result.password_asignada);
    showMsg("Contraseña actualizada");
  } catch (error) {
    showMsg(error.message, "error");
  }
});

(async () => {
  currentUser = await initLayout("usuarios");
  if (!currentUser || currentUser.rol !== "administrador") return;
  await loadUsers();
})();
