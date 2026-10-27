// Logique interactive complète du Dashboard Administrateur CIAA FSAN
// Gestion complète : Membres, Bureau, Sujets, Projets, Drives, Vidéos, Emails et Paramètres

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  // 1. Vérification d'authentification et statut privilégié
  const currentUser = CIAA_STORE.getCurrentUser();
  if (!currentUser) {
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Accès restreint. Veuillez vous connecter avec un compte administrateur ou membre du bureau.", "Accès Restreint", "info");
    }
    window.location.replace("login.html?next=dashboard.html");
    return;
  }

  // Vérification des privilèges (Admin, Président, Vice-Président, Professeurs Encadrants)
  if (!CIAA_STORE.hasDashboardAccess(currentUser)) {
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Accès refusé : Le tableau de bord est réservé exclusivement aux administrateurs et membres privilégiés du bureau du club CIAA.", "Accès Non Autorisé", "error");
    }
    window.location.replace("profile.html");
    return;
  }

  // Affichage infos de l'utilisateur connecté dans la sidebar
  const adminNameEl = document.getElementById("dash-admin-name");
  const adminRoleEl = document.getElementById("dash-admin-role");
  const adminAvatarEl = document.getElementById("dash-admin-avatar");
  if (adminNameEl) adminNameEl.textContent = `${currentUser.prenom} ${currentUser.nom}`;
  if (adminRoleEl) adminRoleEl.textContent = currentUser.role === "admin" ? "Administrateur Principal" : (currentUser.roleLabel || "Membre du Bureau");
  if (adminAvatarEl) adminAvatarEl.textContent = (currentUser.prenom[0] || "A") + (currentUser.nom[0] || "D");

  // 2. Gestion des onglets de navigation
  const navButtons = document.querySelectorAll(".dash-nav-btn");
  const tabSections = document.querySelectorAll(".dash-tab-section");
  const topbarTitle = document.getElementById("dash-current-title");

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      navButtons.forEach(b => b.classList.remove("active"));
      tabSections.forEach(s => s.classList.remove("active"));

      btn.classList.add("active");
      const targetSection = document.getElementById(tabId);
      if (targetSection) targetSection.classList.add("active");
      if (topbarTitle) topbarTitle.textContent = btn.dataset.title || "Dashboard Administrateur";
    });
  });

  // 3. Rafraîchissement global de toutes les sections
  refreshAllDashboard();

  // Déconnexion avec confirmation personnalisée
  const logoutBtn = document.getElementById("dash-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const ok = typeof ciaaConfirm === "function"
        ? await ciaaConfirm("Êtes-vous sûr de vouloir vous déconnecter du tableau de bord ?", "Déconnexion")
        : confirm("Se déconnecter ?");
      if (ok) {
        await CIAA_STORE.logoutUser();
        window.location.replace("index.html");
      }
    });
  }

  // Initialisation des formulaires d'ajout et de modales d'édition
  initDashboardForms();
  initEditModalsHandlers();
  initBackendTab();
});

// Rafraîchir les compteurs et données du tableau de bord
function refreshAllDashboard() {
  updateKPIs();
  renderUsersTable();
  renderBureauTable();
  renderSujetsTable();
  renderProjectsTable();
  renderDrivesTable();
  renderDriveMembersTable();
  renderVideosTable();
  renderMessagesTable();
  populateSettingsForm();
}

// Mise à jour des cartes KPI et badges de notification
function updateKPIs() {
  const users = CIAA_STORE.getUsers();
  const projects = CIAA_STORE.getProjects();
  const sujets = CIAA_STORE.getSujets();
  const drives = CIAA_STORE.getDrives();
  const videos = CIAA_STORE.getVideos();
  const messages = CIAA_STORE.getMessages();

  const pendingUsers = users.filter(u => u.status === "pending").length;
  const pendingProjects = projects.filter(p => p.state === 0).length;
  const pendingSujets = sujets.filter(s => s.status === "pending").length;
  const unreadMessages = messages.filter(m => m.status === "unread").length;

  const kpiUsers = document.getElementById("kpi-total-users");
  const kpiUsersPending = document.getElementById("kpi-pending-users-badge");
  const kpiProjects = document.getElementById("kpi-total-projects");
  const kpiProjectsPending = document.getElementById("kpi-pending-projects-badge");
  const kpiSujets = document.getElementById("kpi-total-sujets");
  const kpiDrives = document.getElementById("kpi-total-drives");
  const kpiMessages = document.getElementById("kpi-total-messages");
  const kpiMessagesUnread = document.getElementById("kpi-unread-messages-badge");

  if (kpiUsers) kpiUsers.textContent = users.length;
  if (kpiUsersPending) kpiUsersPending.textContent = `${pendingUsers} en attente`;
  if (kpiProjects) kpiProjects.textContent = projects.length;
  if (kpiProjectsPending) kpiProjectsPending.textContent = `${pendingProjects} à valider`;
  if (kpiSujets) kpiSujets.textContent = sujets.length;
  if (kpiDrives) kpiDrives.textContent = drives.length;
  if (kpiMessages) kpiMessages.textContent = messages.length;
  if (kpiMessagesUnread) kpiMessagesUnread.textContent = `${unreadMessages} non lus`;

  // Badges latéraux
  const bUsers = document.getElementById("badge-nav-users");
  const bSujets = document.getElementById("badge-nav-sujets");
  const bProjects = document.getElementById("badge-nav-projects");
  const bMessages = document.getElementById("badge-nav-messages");

  if (bUsers) {
    bUsers.textContent = pendingUsers;
    bUsers.style.display = pendingUsers > 0 ? "inline-block" : "none";
  }
  if (bSujets) {
    bSujets.textContent = pendingSujets;
    bSujets.style.display = pendingSujets > 0 ? "inline-block" : "none";
  }
  if (bProjects) {
    bProjects.textContent = pendingProjects;
    bProjects.style.display = pendingProjects > 0 ? "inline-block" : "none";
  }
  if (bMessages) {
    bMessages.textContent = unreadMessages;
    bMessages.style.display = unreadMessages > 0 ? "inline-block" : "none";
  }
}

// -------------------------------------------------------------
// SECTION 1 : GESTION DES UTILISATEURS & APPROBATION DES COMPTES
// -------------------------------------------------------------
let userFilter = "all";

function renderUsersTable() {
  const tbody = document.getElementById("dash-users-tbody");
  if (!tbody) return;

  const users = CIAA_STORE.getUsers();
  const filtered = users.filter(u => {
    if (userFilter === "all") return true;
    return u.status === userFilter;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d">Aucun utilisateur trouvé pour ce filtre.</td></tr>`;
    return;
  }

  filtered.forEach(u => {
    const tr = document.createElement("tr");

    let statusPill = "";
    if (u.status === "approved") {
      statusPill = `<span class="status-pill approved">✓ Validé</span>`;
    } else if (u.status === "pending") {
      statusPill = `<span class="status-pill pending">⏳ En attente</span>`;
    } else {
      statusPill = `<span class="status-pill rejected">✗ Rejeté</span>`;
    }

    let roleBadge = `<span class="status-pill" style="background:#eaf2fc;color:var(--navy)">${u.role || "member"}</span>`;
    if (u.role === "admin") {
      roleBadge = `<span class="status-pill" style="background:#0b2447;color:#fff">👑 Admin</span>`;
    } else if (["president", "vice_president", "prof_encadrant"].includes(u.role)) {
      roleBadge = `<span class="status-pill" style="background:#eafaf1;color:#1e824c;font-weight:700">👔 ${u.role}</span>`;
    }

    tr.innerHTML = `
      <td><code>${u.id}</code></td>
      <td>
        <div class="dash-user-table-identity">
          <div class="dash-user-table-avatar${u.imageUrl ? " has-image" : ""}">
            <img class="dash-user-photo" alt="" aria-hidden="true">
            <span class="dash-user-initials"></span>
          </div>
          <div>
            <strong>${u.prenom} ${u.nom}</strong><br>
            <small style="color:#7f8c8d">${roleBadge}</small>
          </div>
        </div>
      </td>
      <td><a href="mailto:${u.email}" style="color:var(--blue)">${u.email}</a></td>
      <td>${u.master || "Non renseigné"}</td>
      <td>${statusPill}</td>
      <td>${u.created_at || "—"}</td>
      <td>
        <div class="table-actions">
          <input id="dash-user-photo-input-${u.id}" class="dash-user-photo-input" type="file" accept="image/*" aria-label="Choisir ou remplacer la photo de profil">
          <label class="btn-tbl edit dash-user-photo-label" for="dash-user-photo-input-${u.id}" title="Modifier la photo de profil">📷 Photo</label>
          ${u.imageUrl ? `<button class="btn-tbl delete" onclick="handleRemoveUserPhoto('${u.id}')" title="Supprimer la photo de profil" aria-label="Supprimer la photo de profil">📷🗑️</button>` : ""}
          ${u.status === "pending" ? `
            <button class="btn-tbl accept" onclick="handleApproveUser('${u.id}')" title="Valider l'étudiant">✓ Accepter</button>
            <button class="btn-tbl reject" onclick="handleRejectUser('${u.id}')" title="Rejeter la candidature">✗ Rejeter</button>
          ` : (u.status === "rejected" ? `
            <button class="btn-tbl accept" onclick="handleApproveUser('${u.id}')" title="Réactiver le compte">✓ Réactiver</button>
          ` : '')}
          <button class="btn-tbl edit" onclick="handleEditUserModal('${u.id}')" title="Modifier le compte et privilèges">✏️</button>
          <button class="btn-tbl delete" onclick="handleDeleteUser('${u.id}')" title="Supprimer définitivement">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    const avatar = tr.querySelector(".dash-user-table-avatar");
    const avatarImage = tr.querySelector(".dash-user-photo");
    const avatarInitials = tr.querySelector(".dash-user-initials");
    if (avatarInitials) {
      avatarInitials.textContent = `${u.prenom?.[0] || "U"}${u.nom?.[0] || "S"}`;
    }
    if (u.imageUrl && avatarImage) {
      avatarImage.src = u.imageUrl;
      avatarImage.onerror = () => avatar?.classList.remove("has-image");
    }

    if (avatar) {
      avatar.id = `dash-user-photo-avatar-${u.id}`;
      if (avatarImage) avatarImage.id = `dash-user-photo-image-${u.id}`;
    }
    CIAA_IMAGE_UPLOAD.init({
      inputId: `dash-user-photo-input-${u.id}`,
      previewBoxId: `dash-user-photo-avatar-${u.id}`,
      previewImgId: `dash-user-photo-image-${u.id}`,
      onImageLoaded: imageUrl => saveDashboardUserPhoto(u.id, imageUrl)
    });
  });
}

async function saveDashboardUserPhoto(id, imageUrl) {
  try {
    await CIAA_STORE.updateUser(id, { imageUrl });
    renderUsersTable();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert(
        imageUrl ? "La photo de profil a été mise à jour." : "La photo de profil a été supprimée.",
        "Photo de profil actualisée",
        "success"
      );
    }
  } catch (error) {
    console.error("[dashboard] Impossible de mettre à jour la photo de profil :", error);
    renderUsersTable();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert(`Échec de la mise à jour de la photo : ${error.message}`, "Erreur", "error");
    }
  }
}

window.handleRemoveUserPhoto = async id => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Supprimer la photo de profil de cet utilisateur ?", "Supprimer la photo")
    : confirm("Supprimer la photo de profil de cet utilisateur ?");
  if (confirmed) await saveDashboardUserPhoto(id, null);
};

window.handleApproveUser = async (id) => {
  await CIAA_STORE.updateUserStatus(id, "approved");
  refreshAllDashboard();
  if (typeof ciaaAlert === "function") {
    await ciaaAlert("Compte étudiant validé avec succès ! L'étudiant peut désormais se connecter et soumettre des projets.", "Compte Validé", "success");
  }
};

window.handleRejectUser = async (id) => {
  await CIAA_STORE.updateUserStatus(id, "rejected");
  refreshAllDashboard();
  if (typeof ciaaAlert === "function") {
    await ciaaAlert("La candidature de cet étudiant a été rejetée.", "Statut Mis à Jour", "info");
  }
};

window.handleDeleteUser = async (id) => {
  const confirmed = typeof ciaaConfirm === "function" 
    ? await ciaaConfirm("Supprimer définitivement cet utilisateur et toutes ses données associées ?")
    : confirm("Supprimer définitivement cet utilisateur ?");

  if (confirmed) {
    await CIAA_STORE.deleteUser(id);
    refreshAllDashboard();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Utilisateur supprimé avec succès.", "Suppression effectuée", "success");
    }
  }
};

window.filterUsersByStatus = (status) => {
  userFilter = status;
  document.querySelectorAll(".btn-user-filter").forEach(b => {
    b.classList.toggle("active", b.dataset.status === status);
  });
  renderUsersTable();
};

// -------------------------------------------------------------
// SECTION 2 : GESTION DU BUREAU DU CLUB & PROFESSEURS ENCADRANTS
// -------------------------------------------------------------
function normalizeLinkedInUrl(input) {
  if (!input) return "";
  const trimmed = String(input).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://www.linkedin.com/in/${trimmed.replace(/^\/+/, "")}`;
}

function renderBureauTable() {
  const tbody = document.getElementById("dash-bureau-tbody");
  if (!tbody) return;

  const members = CIAA_STORE.getBureauMembers();
  tbody.innerHTML = "";

  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#7f8c8d">Aucun membre du bureau configuré.</td></tr>`;
    return;
  }

  members.forEach(m => {
    const tr = document.createElement("tr");

    const accessBadge = m.canAccessDashboard
      ? `<span class="status-pill dash-access-yes">✓ Autorisé</span>`
      : `<span class="status-pill dash-access-no">Non</span>`;

    const catBadge = m.category === "encadrant"
      ? `<span class="status-pill" style="background:#e0f2fe;color:#0369a1">Prof. Encadrant</span>`
      : `<span class="status-pill" style="background:#f1f5f9;color:#334155">Bureau Étudiant</span>`;

    const initials = (m.prenom ? m.prenom[0] : '') + (m.nom ? m.nom[0] : '');
    const avatarEl = m.imageUrl
      ? `<div class="dash-user-table-avatar has-image"><img src="${m.imageUrl}" alt="${m.prenom} ${m.nom}"></div>`
      : `<div class="dash-user-table-avatar"><span class="dash-user-initials">${initials || 'U'}</span></div>`;

    const linkedBadge = m.userId
      ? `<span style="font-size:0.75rem;color:#0284c7;font-weight:600;display:block;">✓ Compte lié</span>`
      : `<span style="font-size:0.75rem;color:#94a3b8;display:block;">Saisie manuelle</span>`;

    const linkedinUrl = normalizeLinkedInUrl(m.linkedin);
    const cleanDesc = (m.cleanDescription || m.description || "").replace(/<!--avatar:.+?-->/g, "").trim();

    tr.innerHTML = `
      <td>
        <strong>${m.roleLabel || "Membre"}</strong><br>
        <small>${catBadge}</small>
      </td>
      <td>
        <div class="dash-user-table-identity">
          ${avatarEl}
          <div class="dash-user-info">
            <strong>${m.prenom} ${m.nom}</strong>
            ${linkedBadge}
          </div>
        </div>
      </td>
      <td><a href="mailto:${m.email}" style="color:var(--blue)">${m.email || "—"}</a></td>
      <td>${m.affiliation || "—"}</td>
      <td>
        ${linkedinUrl ? `<a href="${linkedinUrl}" target="_blank" rel="noopener" style="color:var(--blue);font-weight:600">🔗 Profil LinkedIn</a>` : '—'}
      </td>
      <td style="max-width:240px;font-size:0.83rem;color:#4b6178">${cleanDesc.substring(0, 85)}${cleanDesc.length > 85 ? '…' : ''}</td>
      <td>${accessBadge}</td>
      <td>
        <div class="table-actions">
          <button class="btn-tbl edit" onclick="handleEditBureauModal('${m.id}')" title="Modifier le rôle / membre">✏️ Modifier</button>
          <button class="btn-tbl delete" onclick="handleDeleteBureauMember('${m.id}')" title="Retirer du bureau">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.handleDeleteBureauMember = async (id) => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Retirer ce membre du bureau officiel ? Cette modification sera immédiatement visible sur la page d'accueil et la page À propos.")
    : confirm("Retirer ce membre du bureau ?");

  if (confirmed) {
    await CIAA_STORE.deleteBureauMember(id);
    refreshAllDashboard();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Membre retiré du bureau avec succès !", "Bureau Actualisé", "success");
    }
  }
};

// -------------------------------------------------------------
// SECTION 3 : VALIDATION DES SUJETS DE PROJETS PROPOSÉS
// -------------------------------------------------------------
function renderSujetsTable() {
  const tbody = document.getElementById("dash-sujets-tbody");
  if (!tbody) return;

  const sujets = CIAA_STORE.getSujets();
  tbody.innerHTML = "";

  if (sujets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d">Aucun sujet de projet proposé pour l'instant.</td></tr>`;
    return;
  }

  sujets.forEach(s => {
    const tr = document.createElement("tr");

    let statusPill = "";
    if (s.status === "approved") {
      statusPill = `<span class="status-pill approved">✓ Validé &amp; En ligne</span>`;
    } else if (s.status === "pending") {
      statusPill = `<span class="status-pill pending">⏳ En attente review</span>`;
    } else {
      statusPill = `<span class="status-pill rejected">✗ Rejeté</span>`;
    }

    tr.innerHTML = `
      <td>
        <strong>${s.memberName || "—"}</strong><br>
        <small style="color:#7f8c8d"><code>${s.memberId || s.id}</code></small>
      </td>
      <td><strong>${s.title}</strong></td>
      <td style="max-width:280px;font-size:0.84rem;color:#4b6178">${(s.description || '').substring(0, 95)}…</td>
      <td><span class="status-pill" style="background:#e8f4f8;color:var(--teal)">${s.category || "—"}</span></td>
      <td>${s.targetMaster || "—"}</td>
      <td>${statusPill}</td>
      <td>
        <div class="table-actions">
          ${s.status !== "approved" ? `<button class="btn-tbl accept" onclick="handleApproveSujet('${s.id}')" title="Valider et publier sur la page Annonces">✓ Valider</button>` : ''}
          <button class="btn-tbl edit" onclick="handleEditSujetModal('${s.id}')" title="Modifier le sujet">✏️</button>
          <button class="btn-tbl delete" onclick="handleDeleteSujet('${s.id}')" title="Supprimer">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.handleApproveSujet = async (id) => {
  await CIAA_STORE.setSujetStatus(id, "approved");
  refreshAllDashboard();
  if (typeof ciaaAlert === "function") {
    await ciaaAlert("Sujet de projet validé ! Il apparaît désormais en ligne sur la page 'Annonces & Sujets'.", "Validation Réussie", "success");
  }
};

window.handleDeleteSujet = async (id) => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Supprimer définitivement ce sujet de projet ?")
    : confirm("Supprimer ce sujet ?");

  if (confirmed) {
    await CIAA_STORE.deleteSujet(id);
    refreshAllDashboard();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Sujet de projet supprimé.", "Suppression", "info");
    }
  }
};

// -------------------------------------------------------------
// SECTION 4 : REVIEW & GESTION DES PROJETS SOUMIS
// -------------------------------------------------------------
function renderProjectsTable() {
  const tbody = document.getElementById("dash-projects-tbody");
  if (!tbody) return;

  const projects = CIAA_STORE.getProjects();
  tbody.innerHTML = "";

  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#7f8c8d">Aucun projet répertorié.</td></tr>`;
    return;
  }

  projects.forEach(p => {
    const tr = document.createElement("tr");

    let statePill = p.state === 1
      ? `<span class="status-pill approved">✓ En Ligne</span>`
      : `<span class="status-pill pending">⏳ En Attente Review</span>`;

    const featuredBtn = p.featured
      ? `<button class="btn-tbl featured-toggle active" onclick="handleToggleFeatured('${p.id}')" title="Retirer du Top 3">★ Top 3 (Actif)</button>`
      : `<button class="btn-tbl featured-toggle" onclick="handleToggleFeatured('${p.id}')" title="Promouvoir dans le Top 3 Accueil">☆ Mettre en Top 3</button>`;

    const teamNames = (p.team || []).map(m => m.name).join(", ") || p.submitted_by || "—";

    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${p.image_url ? `<img src="${p.image_url}" style="width:48px;height:34px;border-radius:6px;object-fit:cover" alt="">` : ''}
          <div>
            <strong>${p.title}</strong><br>
            <small style="color:#7f8c8d"><span class="status-pill" style="font-size:0.75rem">${p.category || '—'}</span></small>
          </div>
        </div>
      </td>
      <td>${teamNames}</td>
      <td>
        ${p.link ? `<a href="${p.link}" target="_blank" style="color:var(--blue);font-weight:600">GitHub ↗</a>` : '—'}
      </td>
      <td>${statePill}</td>
      <td>${featuredBtn}</td>
      <td>
        <div class="table-actions">
          ${p.state === 0 ? `<button class="btn-tbl accept" onclick="handleApproveProject('${p.id}')" title="Valider et publier le projet">✓ Valider</button>` : ''}
          <button class="btn-tbl edit" onclick="handleEditProjectModal('${p.id}')" title="Modifier le formulaire complet">✏️</button>
          <button class="btn-tbl delete" onclick="handleDeleteProject('${p.id}')" title="Supprimer">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.handleApproveProject = async (id) => {
  await CIAA_STORE.setProjectState(id, 1);
  refreshAllDashboard();
  if (typeof ciaaAlert === "function") {
    await ciaaAlert("Projet approuvé et mis en ligne avec succès !", "Validation Réussie", "success");
  }
};

window.handleToggleFeatured = async (id) => {
  await CIAA_STORE.toggleProjectFeatured(id);
  refreshAllDashboard();
  if (typeof ciaaAlert === "function") {
    await ciaaAlert("Sélection Top 3 mise à jour pour la page d'accueil !", "Top 3 Mis à Jour", "success");
  }
};

window.handleDeleteProject = async (id) => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Supprimer définitivement ce projet ?")
    : confirm("Supprimer ce projet ?");

  if (confirmed) {
    await CIAA_STORE.deleteProject(id);
    refreshAllDashboard();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Projet supprimé.", "Suppression", "info");
    }
  }
};

// -------------------------------------------------------------
// SECTION 5 : GESTION DES DRIVES & ACCÈS ÉTUDIANTS (@ump.ac.ma)
// -------------------------------------------------------------
function renderDrivesTable() {
  const tbody = document.getElementById("dash-drives-tbody");
  if (!tbody) return;

  const drives = CIAA_STORE.getDrives();
  tbody.innerHTML = "";

  if (drives.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d">Aucun module Google Drive configuré.</td></tr>`;
    return;
  }

  drives.forEach(d => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${d.master}</strong> - Semestre ${d.semestre.toUpperCase()}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${d.imageUrl ? `<img src="${d.imageUrl}" style="width:36px;height:36px;border-radius:6px;object-fit:cover" alt="">` : ''}
          <strong>${d.moduleName}</strong>
        </div>
      </td>
      <td><a href="${d.driveCours || '#'}" target="_blank" style="color:var(--blue)">Ouvrir Cours</a></td>
      <td><a href="${d.driveTP || '#'}" target="_blank" style="color:var(--teal)">Ouvrir TP</a></td>
      <td><a href="${d.driveTD || '#'}" target="_blank" style="color:var(--navy)">Ouvrir TD</a></td>
      <td><a href="${d.driveExamens || '#'}" target="_blank" style="color:#d97706">Ouvrir Examens</a></td>
      <td>
        <div class="table-actions">
          <button class="btn-tbl edit" onclick="handleEditDriveModal('${d.id}')" title="Modifier le formulaire complet">✏️ Modifier</button>
          <button class="btn-tbl delete" onclick="handleDeleteDrive('${d.id}')" title="Supprimer">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDriveMembersTable() {
  const tbody = document.getElementById("dash-drive-members-tbody");
  if (!tbody) return;

  const users = CIAA_STORE.getUsers();
  tbody.innerHTML = "";

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#7f8c8d">Aucun étudiant inscrit.</td></tr>`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement("tr");

    // Statut d'accès au Drive : accordé par défaut pour les utilisateurs validés ou ayant driveAccess === true
    const isGranted = u.driveAccess !== false && (u.status === "approved" || u.driveAccess === true);
    const accessPill = isGranted
      ? `<span class="status-pill drive-granted">✓ Accès Drive Autorisé</span>`
      : `<span class="status-pill drive-pending">⏳ Accès Drive en Attente</span>`;

    const actionBtn = isGranted
      ? `<button class="btn-tbl delete" onclick="handleToggleDriveAccess('${u.id}', false)" title="Suspendre l'accès Drive">Suspendre</button>`
      : `<button class="btn-tbl accept" onclick="handleToggleDriveAccess('${u.id}', true)" title="Autoriser l'accès Drive">✓ Autoriser l'accès</button>`;

    tr.innerHTML = `
      <td><strong>${u.prenom} ${u.nom}</strong></td>
      <td><a href="mailto:${u.email}" style="color:var(--blue)">${u.email}</a></td>
      <td>${u.master || "—"}</td>
      <td>${accessPill}</td>
      <td>
        <div class="table-actions">
          ${actionBtn}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.handleToggleDriveAccess = async (userId, grant) => {
  await CIAA_STORE.updateUser(userId, { driveAccess: grant });
  renderDriveMembersTable();
  if (typeof ciaaAlert === "function") {
    await ciaaAlert(
      grant ? "Accès aux dossiers Google Drive accordé à cet étudiant !" : "Accès aux dossiers Google Drive suspendu.",
      "Accès Drive Mis à Jour",
      grant ? "success" : "info"
    );
  }
};

window.handleDeleteDrive = async (id) => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Supprimer ce module et ses liens Google Drive associés ?")
    : confirm("Supprimer ce module Drive ?");

  if (confirmed) {
    await CIAA_STORE.deleteDrive(id);
    refreshAllDashboard();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Module Drive supprimé.", "Suppression", "info");
    }
  }
};

// -------------------------------------------------------------
// SECTION 6 : GESTION DES VIDÉOS YOUTUBE DU COURS EN LIGNE
// -------------------------------------------------------------
function renderVideosTable() {
  const tbody = document.getElementById("dash-videos-tbody");
  if (!tbody) return;

  const videos = CIAA_STORE.getVideos();
  tbody.innerHTML = "";

  if (videos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d">Aucune vidéo YouTube configurée.</td></tr>`;
    return;
  }

  videos.forEach(v => {
    const tr = document.createElement("tr");
    const thumbUrl = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;

    tr.innerHTML = `
      <td>
        <img src="${v.imageUrl || thumbUrl}" style="width:68px;height:44px;border-radius:6px;object-fit:cover" alt="">
      </td>
      <td><span class="status-pill" style="background:#eaf2fc;color:var(--navy)">${v.categoryName || (v.track ? v.track.toUpperCase() : "IA")}</span></td>
      <td><strong>${v.title}</strong></td>
      <td style="max-width:240px;font-size:0.83rem;color:#4b6178">${(v.description || '').substring(0, 80)}…</td>
      <td>${v.duration || "—"}</td>
      <td>
        <a href="https://www.youtube.com/watch?v=${v.youtubeId}" target="_blank" style="color:var(--blue);font-weight:600">
          ▶ ID: ${v.youtubeId}
        </a>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-tbl edit" onclick="handleEditVideoModal('${v.id}')" title="Modifier le formulaire complet">✏️</button>
          <button class="btn-tbl delete" onclick="handleDeleteVideo('${v.id}')" title="Supprimer">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.handleDeleteVideo = async (id) => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Supprimer cette vidéo du catalogue de cours ?")
    : confirm("Supprimer cette vidéo ?");

  if (confirmed) {
    await CIAA_STORE.deleteVideo(id);
    refreshAllDashboard();
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Vidéo de cours supprimée du catalogue.", "Suppression", "info");
    }
  }
};

// -------------------------------------------------------------
// SECTION 7 : BOÎTE DE RÉCEPTION & EMAILS DES MEMBRES
// -------------------------------------------------------------
let messageFilter = "all";
let currentOpenMessage = null;

function renderMessagesTable() {
  const tbody = document.getElementById("dash-messages-tbody");
  if (!tbody) return;

  const messages = CIAA_STORE.getMessages();
  const filtered = messages.filter(m => {
    if (messageFilter === "all") return true;
    return m.status === messageFilter;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#7f8c8d">Aucun message trouvé pour ce filtre.</td></tr>`;
    return;
  }

  filtered.forEach(m => {
    const tr = document.createElement("tr");

    let statusPill = "";
    if (m.status === "unread") {
      statusPill = `<span class="status-pill unread">📬 Nouveau</span>`;
    } else if (m.status === "replied") {
      statusPill = `<span class="status-pill" style="background:#eafaf1;color:#1e824c;font-weight:700">✓ Répondu</span>`;
    } else {
      statusPill = `<span class="status-pill read">✓ Lu</span>`;
    }

    tr.innerHTML = `
      <td>${statusPill}</td>
      <td style="font-size:0.84rem;color:#64748b">${m.date || "Récemment"}</td>
      <td>
        <strong>${m.senderName || "—"}</strong><br>
        <small style="color:#7f8c8d">${m.senderRole || ""}</small>
      </td>
      <td>
        <a href="mailto:${m.senderEmail}" style="color:var(--teal);font-weight:600">${m.senderEmail || "—"}</a>
      </td>
      <td><strong>${m.subject || "Sans objet"}</strong></td>
      <td style="max-width:240px;font-size:0.83rem;color:#4b6178">${(m.message || "").substring(0, 75)}…</td>
      <td>
        <div class="table-actions">
          <button class="btn-tbl accept" onclick="openMessageModal('${m.id}')" title="Lire et répondre">👁️ Lire &amp; Répondre</button>
          ${m.status === 'unread' ? `<button class="btn-tbl edit" onclick="handleMarkMessageRead('${m.id}')" title="Marquer comme lu">✓ Lu</button>` : ''}
          <button class="btn-tbl delete" onclick="handleDeleteMessage('${m.id}')" title="Supprimer">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterMessagesByStatus = (status) => {
  messageFilter = status;
  document.querySelectorAll(".btn-msg-filter").forEach(b => {
    b.classList.toggle("active", b.dataset.status === status);
  });
  renderMessagesTable();
};

window.openMessageModal = async (id) => {
  const messages = CIAA_STORE.getMessages();
  const m = messages.find(x => x.id === id);
  if (!m) return;

  currentOpenMessage = m;

  if (m.status === "unread") {
    await CIAA_STORE.markMessageRead(id);
    refreshAllDashboard();
  }

  const modal = document.getElementById("dash-message-modal");
  const subjEl = document.getElementById("modal-msg-subject");
  const badgeEl = document.getElementById("modal-msg-badge");
  const senderEl = document.getElementById("modal-msg-sender");
  const emailEl = document.getElementById("modal-msg-email");
  const roleEl = document.getElementById("modal-msg-role");
  const dateEl = document.getElementById("modal-msg-date");
  const bodyEl = document.getElementById("modal-msg-body");
  const markReadBtn = document.getElementById("modal-btn-mark-read");
  const replyBox = document.getElementById("msg-reply-section");
  const replyTextarea = document.getElementById("msg-reply-textarea");

  if (subjEl) subjEl.textContent = m.subject;
  if (badgeEl) {
    if (m.status === "replied") {
      badgeEl.className = "status-pill approved";
      badgeEl.textContent = "✓ Répondu";
    } else {
      badgeEl.className = "status-pill read";
      badgeEl.textContent = "✓ Lu";
    }
  }
  if (senderEl) senderEl.textContent = m.senderName;
  if (emailEl) {
    emailEl.textContent = m.senderEmail;
    emailEl.href = "mailto:" + m.senderEmail;
  }
  if (roleEl) roleEl.textContent = m.senderRole || "Membre";
  if (dateEl) dateEl.textContent = m.date || "—";
  if (bodyEl) bodyEl.textContent = m.message;
  if (markReadBtn) markReadBtn.style.display = "none";

  // Réinitialiser la boîte de réponse intégrée
  if (replyBox) replyBox.classList.remove("active");
  if (replyTextarea) {
    replyTextarea.value = `Bonjour ${m.senderName || ''},\n\nNous avons bien reçu votre message concernant "${m.subject || 'votre demande'}".\n\n[Votre réponse ici]\n\nBien cordialement,\nLe Bureau du Club CIAA - FSAN Nador`;
  }

  if (modal) modal.style.display = "flex";
};

window.closeMessageModal = () => {
  const modal = document.getElementById("dash-message-modal");
  if (modal) modal.style.display = "none";
  currentOpenMessage = null;
};

window.toggleMessageReply = (show) => {
  const box = document.getElementById("msg-reply-section");
  if (!box) return;
  if (show) {
    box.classList.add("active");
    const textarea = document.getElementById("msg-reply-textarea");
    if (textarea) textarea.focus();
  } else {
    box.classList.remove("active");
  }
};

window.handleSendInlineReply = async () => {
  if (!currentOpenMessage) return;
  const replyTextarea = document.getElementById("msg-reply-textarea");
  const replyText = replyTextarea ? replyTextarea.value.trim() : "";

  if (!replyText) {
    if (typeof ciaaAlert === "function") {
      await ciaaAlert("Veuillez saisir un texte de réponse.", "Champ requis", "error");
    }
    return;
  }

  const currentUser = CIAA_STORE.getCurrentUser();
  const senderSignature = currentUser ? `${currentUser.prenom} ${currentUser.nom} (Bureau CIAA)` : "Le Bureau CIAA FSAN";

  await CIAA_STORE.replyMessage(currentOpenMessage.id, replyText, senderSignature);
  refreshAllDashboard();

  toggleMessageReply(false);
  closeMessageModal();

  if (typeof ciaaAlert === "function") {
    await ciaaAlert(
      `Votre réponse a été envoyée avec succès à ${currentOpenMessage.senderEmail} !\nLe statut du message est désormais "Répondu".`,
      "Réponse Envoyée",
      "success"
    );
  }
};

window.handleMarkMessageRead = async (id) => {
  await CIAA_STORE.markMessageRead(id);
  refreshAllDashboard();
};

window.handleDeleteMessage = async (id) => {
  const confirmed = typeof ciaaConfirm === "function"
    ? await ciaaConfirm("Supprimer définitivement cet email de la boîte de réception ?")
    : confirm("Supprimer ce message ?");

  if (confirmed) {
    await CIAA_STORE.deleteMessage(id);
    refreshAllDashboard();
  }
};

// -------------------------------------------------------------
// SECTION 8 : PARAMÈTRES DU SITE & RÉSEAUX SOCIAUX
// -------------------------------------------------------------
function populateSettingsForm() {
  const s = CIAA_STORE.getSettings();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("set-club-name", s.clubName);
  setVal("set-email", s.email);
  setVal("set-faculty", s.faculty);
  setVal("set-address", s.address);
  setVal("set-description", s.description);
  setVal("set-mission", s.mission);
  setVal("set-linkedin", s.linkedinUrl);
  setVal("set-youtube", s.youtubeUrl);
  setVal("set-github", s.githubUrl);
  setVal("set-discord", s.discordUrl);
  setVal("set-instagram", s.instagramUrl);
}

// -------------------------------------------------------------
// GESTION DES MODALES D'ÉDITION COMPLÈTE
// -------------------------------------------------------------
function populateBureauUserSelect(selectedUserId, currentMember) {
  const select = document.getElementById("modal-bur-user-select");
  if (!select) return;

  const users = CIAA_STORE.getUsers();
  select.innerHTML = '<option value="">-- Aucun compte personnel lié (Saisie manuelle) --</option>';

  let matchingUserId = selectedUserId || currentMember?.userId;

  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    const roleBadge = u.role === "admin" ? " [Admin]" : (u.role === "prof_encadrant" ? " [Prof]" : "");
    opt.textContent = `${u.prenom} ${u.nom} (${u.email}) - ${u.master || 'Membre'}${roleBadge}`;
    select.appendChild(opt);

    if (!matchingUserId && currentMember) {
      if (currentMember.email && u.email && currentMember.email.toLowerCase() === u.email.toLowerCase()) {
        matchingUserId = u.id;
      } else if (
        currentMember.prenom && currentMember.nom &&
        u.prenom?.toLowerCase() === currentMember.prenom.toLowerCase() &&
        u.nom?.toLowerCase() === currentMember.nom.toLowerCase()
      ) {
        matchingUserId = u.id;
      }
    }
  });

  if (matchingUserId) {
    select.value = matchingUserId;
  } else {
    select.value = "";
  }

  updateBureauUserPreview(select.value);
}

function updateBureauUserPreview(userId) {
  const preview = document.getElementById("modal-bur-user-preview");
  const avatarImg = document.getElementById("modal-bur-user-avatar-img");
  const avatarInitials = document.getElementById("modal-bur-user-avatar-initials");
  const nameEl = document.getElementById("modal-bur-user-name");
  const emailEl = document.getElementById("modal-bur-user-email");
  const masterEl = document.getElementById("modal-bur-user-master");
  const bioEl = document.getElementById("modal-bur-user-bio");
  const hiddenAvatarUrl = document.getElementById("modal-bur-avatar-url");

  if (!userId) {
    if (preview) preview.style.display = "none";
    if (hiddenAvatarUrl) hiddenAvatarUrl.value = "";
    return;
  }

  const users = CIAA_STORE.getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) {
    if (preview) preview.style.display = "none";
    if (hiddenAvatarUrl) hiddenAvatarUrl.value = "";
    return;
  }

  if (preview) preview.style.display = "flex";
  if (nameEl) nameEl.textContent = `${u.prenom} ${u.nom}`;
  if (emailEl) emailEl.textContent = u.email || "";
  if (masterEl) masterEl.textContent = u.master || "Filière non renseignée";
  if (bioEl) bioEl.textContent = u.bio ? `« ${u.bio} »` : "Aucune bio renseignée";
  if (hiddenAvatarUrl) hiddenAvatarUrl.value = u.imageUrl || "";

  const initials = (u.prenom ? u.prenom[0] : "") + (u.nom ? u.nom[0] : "");
  if (avatarInitials) avatarInitials.textContent = initials || "U";

  if (avatarImg) {
    if (u.imageUrl) {
      avatarImg.src = u.imageUrl;
      avatarImg.style.display = "block";
      if (avatarInitials) avatarInitials.style.display = "none";
    } else {
      avatarImg.removeAttribute("src");
      avatarImg.style.display = "none";
      if (avatarInitials) avatarInitials.style.display = "block";
    }
  }
}

function syncBureauFieldsFromUser(userId) {
  if (!userId) {
    updateBureauUserPreview("");
    return;
  }
  const users = CIAA_STORE.getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return;

  const category = document.getElementById("modal-bur-category") ? document.getElementById("modal-bur-category").value : "bureau";
  const prenomInput = document.getElementById("modal-bur-prenom");
  const nomInput = document.getElementById("modal-bur-nom");
  const emailInput = document.getElementById("modal-bur-email");
  const affiliationInput = document.getElementById("modal-bur-affiliation");
  const linkedinInput = document.getElementById("modal-bur-linkedin");
  const descInput = document.getElementById("modal-bur-desc");
  const hiddenAvatarUrl = document.getElementById("modal-bur-avatar-url");

  if (prenomInput) prenomInput.value = u.prenom || "";
  if (nomInput) nomInput.value = u.nom || "";
  if (emailInput) emailInput.value = u.email || "";
  if (affiliationInput) {
    if (category === "encadrant") {
      affiliationInput.value = u.master || "FSAN · Faculté des Sciences Appliquées";
    } else {
      affiliationInput.value = u.master || "Étudiant FSAN";
    }
  }
  if (linkedinInput) {
    linkedinInput.value = normalizeLinkedInUrl(u.linkedin || "");
  }
  if (descInput) {
    descInput.value = u.bio || "";
  }
  if (hiddenAvatarUrl) {
    hiddenAvatarUrl.value = u.imageUrl || "";
  }

  updateBureauUserPreview(userId);
}

function initEditModalsHandlers() {
  // 1. Modale Bureau
  const userSelect = document.getElementById("modal-bur-user-select");
  if (userSelect) {
    userSelect.addEventListener("change", () => {
      syncBureauFieldsFromUser(userSelect.value);
    });
  }

  const btnSyncUser = document.getElementById("btn-sync-bur-user");
  if (btnSyncUser) {
    btnSyncUser.addEventListener("click", () => {
      const curUid = document.getElementById("modal-bur-user-select")?.value;
      if (!curUid) {
        if (typeof ciaaAlert === "function") ciaaAlert("Veuillez d'abord sélectionner un compte personnel dans la liste déroulante.", "Aucun compte", "info");
        return;
      }
      syncBureauFieldsFromUser(curUid);
      if (typeof ciaaAlert === "function") ciaaAlert("Informations personnelles synchronisées avec succès depuis le compte !", "Synchronisation réussie", "success");
    });
  }

  const formBur = document.getElementById("form-modal-edit-bureau");
  if (formBur) {
    formBur.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("modal-bur-id").value;
      const userId = document.getElementById("modal-bur-user-select") ? (document.getElementById("modal-bur-user-select").value || null) : null;
      const prenom = document.getElementById("modal-bur-prenom").value.trim();
      const nom = document.getElementById("modal-bur-nom").value.trim();
      const roleLabel = document.getElementById("modal-bur-role-label").value.trim();
      const category = document.getElementById("modal-bur-category").value;
      const affiliation = document.getElementById("modal-bur-affiliation").value.trim();
      const email = document.getElementById("modal-bur-email").value.trim();
      const linkedin = normalizeLinkedInUrl(document.getElementById("modal-bur-linkedin").value.trim());
      const canAccessDashboard = document.getElementById("modal-bur-access").value === "true";
      const description = document.getElementById("modal-bur-desc").value.trim();
      const avatarUrl = document.getElementById("modal-bur-avatar-url") ? document.getElementById("modal-bur-avatar-url").value.trim() : null;

      const memberData = {
        userId: userId || null,
        prenom,
        nom,
        roleLabel,
        category,
        affiliation,
        email,
        linkedin,
        canAccessDashboard,
        description,
        imageUrl: avatarUrl || null
      };

      if (id) {
        await CIAA_STORE.updateBureauMember(id, memberData);
      } else {
        await CIAA_STORE.addBureauMember(memberData);
      }

      if (userId && canAccessDashboard) {
        try {
          await CIAA_STORE.updateUser(userId, { canAccessDashboard: true });
        } catch (e) {
          console.warn("[dashboard] user access sync:", e);
        }
      }

      closeEditBureauModal();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Modifications du bureau enregistrées avec succès ! Elles sont immédiatement appliquées sur la page d'accueil et la page À propos.", "Bureau Actualisé", "success");
      }
    });
  }

  // Bouton Ajouter Membre du bureau
  const btnAddBur = document.getElementById("btn-add-bureau-member");
  if (btnAddBur) {
    btnAddBur.addEventListener("click", () => {
      document.getElementById("modal-bur-id").value = "";
      document.getElementById("modal-bur-prenom").value = "";
      document.getElementById("modal-bur-nom").value = "";
      document.getElementById("modal-bur-role-label").value = "";
      document.getElementById("modal-bur-category").value = "bureau";
      document.getElementById("modal-bur-affiliation").value = "";
      document.getElementById("modal-bur-email").value = "";
      document.getElementById("modal-bur-linkedin").value = "";
      document.getElementById("modal-bur-access").value = "false";
      document.getElementById("modal-bur-desc").value = "";
      if (document.getElementById("modal-bur-avatar-url")) {
        document.getElementById("modal-bur-avatar-url").value = "";
      }
      populateBureauUserSelect("", null);
      document.getElementById("title-edit-bureau").textContent = "+ Ajouter / Assigner un Membre du Bureau";

      const modal = document.getElementById("modal-edit-bureau");
      if (modal) modal.style.display = "flex";
    });
  }

  // 2. Modale Projet
  const formProj = document.getElementById("form-modal-edit-project");
  if (formProj) {
    formProj.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("modal-proj-id").value;
      const title = document.getElementById("modal-proj-title").value.trim();
      const category = document.getElementById("modal-proj-category").value;
      const link = document.getElementById("modal-proj-link").value.trim();
      const image_url = document.getElementById("modal-proj-image").value.trim();
      const teamText = document.getElementById("modal-proj-team").value.trim();
      const tagsText = document.getElementById("modal-proj-tags").value.trim();
      const description = document.getElementById("modal-proj-desc").value.trim();
      const state = parseInt(document.getElementById("modal-proj-state").value, 10);
      const featured = document.getElementById("modal-proj-featured").checked;

      const team = teamText.split(",").map(t => ({ name: t.trim(), linkedin: "" })).filter(t => t.name);
      const tags = tagsText ? tagsText.split(",").map(t => t.trim()).filter(Boolean) : [];

      await CIAA_STORE.updateProject(id, {
        title,
        category,
        link,
        image_url,
        team,
        tags,
        description,
        state,
        featured
      });

      closeEditProjectModal();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Projet mis à jour avec succès !", "Succès", "success");
      }
    });
  }

  // 3. Modale Sujet
  const formSuj = document.getElementById("form-modal-edit-sujet");
  if (formSuj) {
    formSuj.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("modal-sujet-id").value;
      const title = document.getElementById("modal-sujet-title").value.trim();
      const category = document.getElementById("modal-sujet-category").value;
      const targetMaster = document.getElementById("modal-sujet-master").value;
      const teamSize = document.getElementById("modal-sujet-teamsize").value.trim();
      const memberName = document.getElementById("modal-sujet-author").value.trim();
      const status = document.getElementById("modal-sujet-status").value;
      const techText = document.getElementById("modal-sujet-tech").value.trim();
      const description = document.getElementById("modal-sujet-desc").value.trim();

      const technologies = techText ? techText.split(",").map(t => t.trim()).filter(Boolean) : [];

      await CIAA_STORE.updateSujet(id, {
        title,
        category,
        targetMaster,
        teamSize,
        memberName,
        status,
        technologies,
        description
      });

      closeEditSujetModal();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Sujet de projet modifié avec succès !", "Succès", "success");
      }
    });
  }

  // 4. Modale Vidéo
  const formVid = document.getElementById("form-modal-edit-video");
  if (formVid) {
    formVid.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("modal-video-id").value;
      const title = document.getElementById("modal-video-title").value.trim();
      const track = document.getElementById("modal-video-track").value;
      const categoryName = document.getElementById("modal-video-track").selectedOptions[0].text;
      const youtubeUrl = document.getElementById("modal-video-url").value.trim();
      const duration = document.getElementById("modal-video-duration").value.trim();
      const instructor = document.getElementById("modal-video-instructor").value.trim();
      const imageUrl = document.getElementById("modal-video-image").value.trim();
      const description = document.getElementById("modal-video-desc").value.trim();

      await CIAA_STORE.updateVideo(id, {
        title,
        track,
        categoryName,
        youtubeUrl,
        duration,
        instructor,
        imageUrl: imageUrl || null,
        description
      });

      closeEditVideoModal();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Vidéo de cours mise à jour avec succès !", "Succès", "success");
      }
    });
  }

  // 5. Modale Drive
  const formDrv = document.getElementById("form-modal-edit-drive");
  if (formDrv) {
    formDrv.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("modal-drive-id").value;
      const master = document.getElementById("modal-drive-master").value;
      const semestre = document.getElementById("modal-drive-semestre").value;
      const moduleName = document.getElementById("modal-drive-name").value.trim();
      const driveCours = document.getElementById("modal-drive-cours").value.trim();
      const driveTP = document.getElementById("modal-drive-tp").value.trim();
      const driveTD = document.getElementById("modal-drive-td").value.trim();
      const driveExamens = document.getElementById("modal-drive-exams").value.trim();
      const imageUrl = document.getElementById("modal-drive-image").value.trim();
      const description = document.getElementById("modal-drive-desc").value.trim();

      await CIAA_STORE.updateDrive(id, {
        master,
        semestre,
        moduleName,
        driveCours,
        driveTP,
        driveTD,
        driveExamens,
        imageUrl: imageUrl || null,
        description
      });

      closeEditDriveModal();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Module Google Drive mis à jour avec succès !", "Succès", "success");
      }
    });
  }

  // 6. Modale Utilisateur
  const formUsr = document.getElementById("form-modal-edit-user");
  if (formUsr) {
    formUsr.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("modal-user-id").value;
      const prenom = document.getElementById("modal-user-prenom").value.trim();
      const nom = document.getElementById("modal-user-nom").value.trim();
      const master = document.getElementById("modal-user-master").value.trim();
      const role = document.getElementById("modal-user-role").value;
      const status = document.getElementById("modal-user-status").value;
      const linkedin = normalizeLinkedInUrl(document.getElementById("modal-user-linkedin").value.trim());
      const bio = document.getElementById("modal-user-bio").value.trim();

      const canAccessDashboard = ["admin", "president", "vice_president", "prof_encadrant"].includes(role);

      if (!id) throw new Error("Le compte doit être créé via Supabase Auth avant de modifier son profil.");
      await CIAA_STORE.updateUser(id, {
        prenom,
        nom,
        master,
        role,
        status,
        linkedin,
        bio,
        canAccessDashboard
      });

      closeEditUserModal();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert(
          "Informations et privilèges de l'utilisateur enregistrés avec succès !",
          "Succès", 
          "success"
        );
      }
    });
  }
}

// Handlers d'ouverture et de fermeture des modales complètes

window.handleEditBureauModal = (id) => {
  const members = CIAA_STORE.getBureauMembers();
  const m = members.find(x => x.id === id);
  if (!m) return;

  document.getElementById("modal-bur-id").value = m.id;
  document.getElementById("modal-bur-prenom").value = m.prenom || "";
  document.getElementById("modal-bur-nom").value = m.nom || "";
  document.getElementById("modal-bur-role-label").value = m.roleLabel || "";
  document.getElementById("modal-bur-category").value = m.category || "bureau";
  document.getElementById("modal-bur-affiliation").value = m.affiliation || "";
  document.getElementById("modal-bur-email").value = m.email || "";
  document.getElementById("modal-bur-linkedin").value = normalizeLinkedInUrl(m.linkedin || "");
  document.getElementById("modal-bur-access").value = m.canAccessDashboard ? "true" : "false";
  const cleanDesc = (m.cleanDescription || m.description || "").replace(/<!--avatar:.+?-->/g, "").trim();
  document.getElementById("modal-bur-desc").value = cleanDesc;
  if (document.getElementById("modal-bur-avatar-url")) {
    document.getElementById("modal-bur-avatar-url").value = m.imageUrl || "";
  }
  populateBureauUserSelect(m.userId, m);

  document.getElementById("title-edit-bureau").textContent = `Modifier : ${m.roleLabel || 'Membre'}`;

  const modal = document.getElementById("modal-edit-bureau");
  if (modal) modal.style.display = "flex";
};

window.closeEditBureauModal = () => {
  const modal = document.getElementById("modal-edit-bureau");
  if (modal) modal.style.display = "none";
};

window.handleEditProjectModal = (id) => {
  const projects = CIAA_STORE.getProjects();
  const p = projects.find(x => x.id === id);
  if (!p) return;

  document.getElementById("modal-proj-id").value = p.id;
  document.getElementById("modal-proj-title").value = p.title || "";
  document.getElementById("modal-proj-category").value = p.category || "ml";
  document.getElementById("modal-proj-link").value = p.link || "";
  document.getElementById("modal-proj-image").value = p.image_url || "";
  document.getElementById("modal-proj-team").value = (p.team || []).map(m => m.name).join(", ");
  document.getElementById("modal-proj-tags").value = (p.tags || []).join(", ");
  document.getElementById("modal-proj-desc").value = p.description || "";
  document.getElementById("modal-proj-state").value = p.state !== undefined ? p.state : 1;
  document.getElementById("modal-proj-featured").checked = Boolean(p.featured);

  const modal = document.getElementById("modal-edit-project");
  if (modal) modal.style.display = "flex";
};

window.closeEditProjectModal = () => {
  const modal = document.getElementById("modal-edit-project");
  if (modal) modal.style.display = "none";
};

window.handleEditSujetModal = (id) => {
  const sujets = CIAA_STORE.getSujets();
  const s = sujets.find(x => x.id === id);
  if (!s) return;

  document.getElementById("modal-sujet-id").value = s.id;
  document.getElementById("modal-sujet-title").value = s.title || "";
  document.getElementById("modal-sujet-category").value = s.category || "cv";
  document.getElementById("modal-sujet-master").value = s.targetMaster || "SDSI & MIATE";
  document.getElementById("modal-sujet-teamsize").value = s.teamSize || "";
  document.getElementById("modal-sujet-author").value = s.memberName || "";
  document.getElementById("modal-sujet-status").value = s.status || "pending";
  document.getElementById("modal-sujet-tech").value = (s.technologies || []).join(", ");
  document.getElementById("modal-sujet-desc").value = s.description || "";

  const modal = document.getElementById("modal-edit-sujet");
  if (modal) modal.style.display = "flex";
};

window.closeEditSujetModal = () => {
  const modal = document.getElementById("modal-edit-sujet");
  if (modal) modal.style.display = "none";
};

window.handleEditVideoModal = (id) => {
  const videos = CIAA_STORE.getVideos();
  const v = videos.find(x => x.id === id);
  if (!v) return;

  document.getElementById("modal-video-id").value = v.id;
  document.getElementById("modal-video-title").value = v.title || "";
  document.getElementById("modal-video-track").value = v.track || "ml";
  document.getElementById("modal-video-url").value = v.youtubeUrl || v.youtubeId || "";
  document.getElementById("modal-video-duration").value = v.duration || "20 min";
  document.getElementById("modal-video-instructor").value = v.instructor || "";
  document.getElementById("modal-video-image").value = v.imageUrl || "";
  document.getElementById("modal-video-desc").value = v.description || "";

  const modal = document.getElementById("modal-edit-video");
  if (modal) modal.style.display = "flex";
};

window.closeEditVideoModal = () => {
  const modal = document.getElementById("modal-edit-video");
  if (modal) modal.style.display = "none";
};

window.handleEditDriveModal = (id) => {
  const drives = CIAA_STORE.getDrives();
  const d = drives.find(x => x.id === id);
  if (!d) return;

  document.getElementById("modal-drive-id").value = d.id;
  document.getElementById("modal-drive-master").value = d.master || "SDSI";
  document.getElementById("modal-drive-semestre").value = d.semestre || "s1";
  document.getElementById("modal-drive-name").value = d.moduleName || "";
  document.getElementById("modal-drive-cours").value = d.driveCours || "";
  document.getElementById("modal-drive-tp").value = d.driveTP || "";
  document.getElementById("modal-drive-td").value = d.driveTD || "";
  document.getElementById("modal-drive-exams").value = d.driveExamens || "";
  document.getElementById("modal-drive-image").value = d.imageUrl || "";
  document.getElementById("modal-drive-desc").value = d.description || "";

  const modal = document.getElementById("modal-edit-drive");
  if (modal) modal.style.display = "flex";
};

window.closeEditDriveModal = () => {
  const modal = document.getElementById("modal-edit-drive");
  if (modal) modal.style.display = "none";
};

window.handleEditUserModal = (id) => {
  const users = CIAA_STORE.getUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;

  document.getElementById("modal-user-id").value = u.id;
  document.getElementById("modal-user-prenom").value = u.prenom || "";
  document.getElementById("modal-user-nom").value = u.nom || "";
  document.getElementById("modal-user-email").value = u.email || "";
  document.getElementById("modal-user-master").value = u.master || "Master SDSI";
  document.getElementById("modal-user-role").value = u.role || "member";
  document.getElementById("modal-user-status").value = u.status || "pending";
  document.getElementById("modal-user-linkedin").value = normalizeLinkedInUrl(u.linkedin || "");
  document.getElementById("modal-user-bio").value = u.bio || "";

  const titleEl = document.getElementById("title-edit-user");
  if (titleEl) titleEl.textContent = `Modifier l'Utilisateur : ${u.prenom} ${u.nom}`;

  const modal = document.getElementById("modal-edit-user");
  if (modal) modal.style.display = "flex";
};

window.closeEditUserModal = () => {
  const modal = document.getElementById("modal-edit-user");
  if (modal) modal.style.display = "none";
};

// -------------------------------------------------------------
// INITIALISATION DES FORMULAIRES DE CRÉATION RAPIDE
// -------------------------------------------------------------
function initDashboardForms() {
  const projectImageUploader = typeof CIAA_IMAGE_UPLOAD !== "undefined" ? CIAA_IMAGE_UPLOAD.init({
    inputId: "dash-proj-image-file",
    dropzoneId: "dash-proj-image-dropzone",
    previewBoxId: "dash-proj-image-preview-box",
    previewImgId: "dash-proj-image-preview-thumb",
    nameId: "dash-proj-image-name",
    sizeId: "dash-proj-image-size",
    removeBtnId: "btn-remove-dash-proj-image"
  }) : null;

  // Formulaire d'ajout direct de projet en mode admin
  const formProj = document.getElementById("form-add-project-dash");
  if (formProj) {
    formProj.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("dash-proj-title").value.trim();
      const link = document.getElementById("dash-proj-link").value.trim();
      const description = document.getElementById("dash-proj-desc").value.trim();
      const membersStr = document.getElementById("dash-proj-members").value.trim();
      const team = membersStr.split(",").map(n => ({ name: n.trim() })).filter(m => m.name.length > 0);
      const featured = document.getElementById("dash-proj-featured").checked;
      const base64Image = projectImageUploader ? projectImageUploader.getBase64() : null;

      await CIAA_STORE.addProject({
        title,
        link,
        description,
        team,
        image_url: base64Image || null,
        state: 1, // Validé directement en mode admin
        featured
      });

      formProj.reset();
      if (projectImageUploader) projectImageUploader.reset();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert(`Le projet "${title}" a été publié et validé avec succès !`, "Projet Publié", "success");
      }
    });
  }

  const driveImageUploader = typeof CIAA_IMAGE_UPLOAD !== "undefined" ? CIAA_IMAGE_UPLOAD.init({
    inputId: "drive-mod-image-file",
    dropzoneId: "drive-mod-image-dropzone",
    previewBoxId: "drive-mod-image-preview-box",
    previewImgId: "drive-mod-image-preview-thumb",
    nameId: "drive-mod-image-name",
    sizeId: "drive-mod-image-size",
    removeBtnId: "btn-remove-drive-mod-image"
  }) : null;

  // Formulaire d'ajout de Drive par module
  const formDrive = document.getElementById("form-add-drive");
  if (formDrive) {
    formDrive.addEventListener("submit", async (e) => {
      e.preventDefault();
      const master = document.getElementById("drive-master").value;
      const semestre = document.getElementById("drive-semestre").value;
      const moduleName = document.getElementById("drive-mod-name").value.trim();
      const base64Image = driveImageUploader ? driveImageUploader.getBase64() : null;
      const driveCours = document.getElementById("drive-url-cours").value.trim();
      const driveTP = document.getElementById("drive-url-tp").value.trim();
      const driveTD = document.getElementById("drive-url-td").value.trim();
      const driveExamens = document.getElementById("drive-url-exams").value.trim();

      await CIAA_STORE.addDrive({
        master,
        semestre,
        moduleName,
        imageUrl: base64Image || null,
        driveCours,
        driveTP,
        driveTD,
        driveExamens
      });

      formDrive.reset();
      if (driveImageUploader) driveImageUploader.reset();
      refreshAllDashboard();

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Nouveau module Drive ajouté avec succès !", "Module Enregistré", "success");
      }
    });
  }

  // Formulaire de sauvegarde des Paramètres du Site & Réseaux Sociaux
  const formSettings = document.getElementById("form-site-settings");
  if (formSettings) {
    formSettings.addEventListener("submit", async (e) => {
      e.preventDefault();

      await CIAA_STORE.saveSettings({
        clubName: document.getElementById("set-club-name").value.trim(),
        email: document.getElementById("set-email").value.trim(),
        faculty: document.getElementById("set-faculty").value.trim(),
        address: document.getElementById("set-address").value.trim(),
        description: document.getElementById("set-description").value.trim(),
        mission: document.getElementById("set-mission").value.trim(),
        linkedinUrl: document.getElementById("set-linkedin").value.trim(),
        youtubeUrl: document.getElementById("set-youtube").value.trim(),
        githubUrl: document.getElementById("set-github").value.trim(),
        discordUrl: document.getElementById("set-discord").value.trim(),
        instagramUrl: document.getElementById("set-instagram").value.trim()
      });

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Paramètres du club et liens des réseaux sociaux enregistrés ! Ils sont immédiatement appliqués sur la page À propos et sur l'ensemble du site.", "Paramètres Enregistrés", "success");
      }
    });
  }
}

// -------------------------------------------------------------
// GESTION DU BACKEND SUPABASE & SENSIBILITÉ FRONTEND
// -------------------------------------------------------------
function initBackendTab() {
  if (typeof CIAA_BACKEND === "undefined") return;

  const cfg = CIAA_BACKEND.getConfig();
  const urlInput = document.getElementById("cfg-supabase-url");
  const keyInput = document.getElementById("cfg-supabase-key");
  const formCfg = document.getElementById("form-supabase-config");
  const btnPing = document.getElementById("btn-ping-backend");
  const btnCopySql = document.getElementById("btn-copy-sql");
  const latencyVal = document.getElementById("backend-latency-val");
  const liveBadge = document.getElementById("backend-live-badge");
  const consoleLog = document.getElementById("backend-console-log");

  if (urlInput) urlInput.value = cfg.url || "";
  if (keyInput) keyInput.value = cfg.anonKey || "";

  function logConsole(msg) {
    if (!consoleLog) return;
    const time = new Date().toLocaleTimeString();
    consoleLog.textContent += `\n[${time}] ${msg}`;
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  // Écouteur réactif d'état Supabase (Sensibilité frontend)
  CIAA_BACKEND.onStateChange((state) => {
    if (latencyVal) latencyVal.textContent = state.connected ? `${state.latencyMs} ms` : "Déconnecté";
    if (liveBadge) {
      liveBadge.className = `backend-status-pill ${state.connected ? 'online' : 'offline'}`;
      liveBadge.innerHTML = state.connected 
        ? `<span class="dot"></span> Connecté à Supabase Cloud (${state.latencyMs} ms)`
        : `<span class="dot"></span> Supabase indisponible`;
    }

    const setCnt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val !== undefined ? val : 0;
    };
    setCnt("cnt-sb-users", state.tableCounts.users);
    setCnt("cnt-sb-projects", state.tableCounts.projects);
    setCnt("cnt-sb-sujets", state.tableCounts.sujets);
    setCnt("cnt-sb-drives", state.tableCounts.drives);
    setCnt("cnt-sb-videos", state.tableCounts.videos);
    setCnt("cnt-sb-messages", state.tableCounts.messages);

    const badgeNav = document.getElementById("badge-nav-backend");
    if (badgeNav) {
      badgeNav.textContent = state.connected ? "Supabase" : "Déconnecté";
      badgeNav.className = `status-pill ${state.connected ? 'drive-granted' : 'drive-pending'}`;
    }
  });

  // Tester la latence réseau vers Supabase
  if (btnPing) {
    btnPing.addEventListener("click", async () => {
      logConsole("Ping vers Supabase en cours...");
      btnPing.disabled = true;
      btnPing.textContent = "⏳ Test...";
      const res = await CIAA_BACKEND.testConnection();
      btnPing.disabled = false;
      btnPing.textContent = "⚡ Tester Latence";

      if (res.connected) {
        logConsole(`✓ Connexion établie avec succès ! Latence : ${res.latencyMs} ms. Tables prêtes.`);
        if (typeof ciaaAlert === "function") {
          await ciaaAlert(`Connexion à Supabase réussie !\nLatence réseau : ${res.latencyMs} ms\nBase de données PostgreSQL active et prête.`, "Backend En Ligne", "success");
        }
      } else {
        logConsole(`ℹ️ Résultat du test : ${res.statusText}`);
        if (typeof ciaaAlert === "function") {
          await ciaaAlert(`Impossible de contacter l'instance Supabase (${res.statusText}). Le site ne peut pas charger ni enregistrer les données.`, "Supabase indisponible", "error");
        }
      }
    });
  }

  // Sauvegarder la configuration
  if (formCfg) {
    formCfg.addEventListener("submit", async (e) => {
      e.preventDefault();
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();
      logConsole(`Sauvegarde des identifiants Supabase : ${url}`);
      
      const res = await CIAA_BACKEND.saveConfig(url, key);
      if (res.connected) {
        logConsole("✓ Nouvelle configuration connectée au Cloud Supabase !");
        if (typeof ciaaAlert === "function") {
          await ciaaAlert("Identifiants Supabase validés et connectés avec succès !", "Configuration Sauvegardée", "success");
        }
      } else {
        logConsole(`Configuration enregistrée. Statut : ${res.statusText}`);
        if (typeof ciaaAlert === "function") {
          await ciaaAlert(`Supabase n'est pas joignable : ${res.statusText}`, "Échec de connexion", "error");
        }
      }
    });
  }

  // Copier le script SQL
  if (btnCopySql) {
    btnCopySql.addEventListener("click", async () => {
      try {
        const response = await fetch("database_schema.sql");
        const sqlText = await response.text();
        await navigator.clipboard.writeText(sqlText);
        logConsole("✓ Script database_schema.sql copié dans le presse-papier.");
        if (typeof ciaaAlert === "function") {
          await ciaaAlert("Le script database_schema.sql a été copié dans votre presse-papier !\nVous pouvez maintenant le coller dans l'onglet 'SQL Editor' de Supabase et cliquer sur 'Run'.", "Script Copié", "success");
        }
      } catch (err) {
        logConsole("ℹ️ Téléchargez le fichier database_schema.sql directement via le bouton ci-dessus.");
      }
    });
  }
}
