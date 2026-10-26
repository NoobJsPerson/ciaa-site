// Logique de la page Profil Utilisateur CIAA FSAN

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  const user = CIAA_STORE.getCurrentUser();

  if (!user) {
    if (typeof ciaaAlert === "function") {
      ciaaAlert("Veuillez vous connecter pour accéder à votre profil.", "Accès restreint", "info").then(() => {
        window.location.replace("login.html?next=profile.html");
      });
    } else {
      window.location.replace("login.html?next=profile.html");
    }
    return;
  }

  // 1. Remplissage des données d'en-tête
  const nameEl = document.getElementById("profile-display-name");
  const emailEl = document.getElementById("profile-display-email");
  const masterEl = document.getElementById("profile-display-master");
  const avatarEl = document.getElementById("profile-avatar-large");
  const roleEl = document.getElementById("profile-display-role");
  const statusBanner = document.getElementById("profile-status-banner");
  const adminCard = document.getElementById("profile-admin-card");
  const badgeProfileStatus = document.getElementById("badge-profile-status");

  if (nameEl) nameEl.textContent = `${user.prenom} ${user.nom}`;
  if (emailEl) emailEl.textContent = user.email;
  if (masterEl) masterEl.textContent = user.master || "Étudiant FSAN";
  if (avatarEl) avatarEl.textContent = (user.prenom[0] || "U") + (user.nom[0] || "S");
  if (roleEl) roleEl.textContent = user.role === "admin" ? "Administrateur" : (user.roleLabel || "Membre du Club");

  if (badgeProfileStatus) {
    badgeProfileStatus.textContent = user.status === "approved" ? "Compte Actif" : (user.status === "pending" ? "En attente" : "Inactif");
    badgeProfileStatus.className = `status-pill ${user.status === 'approved' ? 'approved' : (user.status === 'pending' ? 'pending' : 'rejected')}`;
  }

  // Bannière de statut d'approbation
  if (statusBanner) {
    if (user.status === "approved") {
      statusBanner.className = "status-account-banner approved";
      statusBanner.innerHTML = `✓ <strong>Compte Validé par l'Administration :</strong> Vous bénéficiez d'un accès complet pour soumettre vos projets et postuler aux sujets de travail.`;
    } else if (user.status === "pending") {
      statusBanner.className = "status-account-banner pending";
      statusBanner.innerHTML = `⏳ <strong>Candidature en cours de traitement :</strong> Votre compte a bien été enregistré. Il est actuellement en attente de validation par l'administrateur dans le dashboard.`;
    } else {
      statusBanner.className = "status-account-banner rejected";
      statusBanner.innerHTML = `✗ <strong>Candidature non retenue :</strong> Veuillez contacter le bureau du club (contact.ciaa.fsan@gmail.com) pour plus d'informations.`;
    }
  }

  // Privilège d'accès au dashboard (Admin, Président, Vice-Président, Prof Encadrant)
  const hasDashAccess = CIAA_STORE.hasDashboardAccess(user);
  if (adminCard) {
    adminCard.hidden = !hasDashAccess;
  }

  const dashLink = document.getElementById("dash-link");
  if (dashLink) {
    dashLink.hidden = !hasDashAccess;
  }

  // 2. Affichage propre en lecture seule des informations
  const dispPrenomNom = document.getElementById("disp-prenom-nom");
  const dispEmail = document.getElementById("disp-email");
  const dispMaster = document.getElementById("disp-master");
  const dispLinkedin = document.getElementById("disp-linkedin");
  const dispBio = document.getElementById("disp-bio");

  function refreshDisplayCard(u) {
    if (dispPrenomNom) dispPrenomNom.textContent = `${u.prenom || ''} ${u.nom || ''}`.trim() || "—";
    if (dispEmail) dispEmail.textContent = u.email || "—";
    if (dispMaster) dispMaster.textContent = u.master || "Non renseigné";
    if (dispLinkedin) {
      if (u.linkedin) {
        dispLinkedin.innerHTML = `<a href="https://www.linkedin.com/in/${u.linkedin.replace(/https?:\/\/.*linkedin\.com\/in\//, '').replace(/\/$/, '')}" target="_blank" rel="noopener" style="color:var(--blue);font-weight:600">in/${u.linkedin}</a>`;
      } else {
        dispLinkedin.textContent = "Non renseigné";
      }
    }
    if (dispBio) dispBio.textContent = u.bio || "Aucune bio ou compétence technique renseignée pour l'instant.";
  }

  refreshDisplayCard(user);

  // 3. Basculement entre Affichage et Formulaire de modification
  const displayWrap = document.getElementById("profile-info-display-wrap");
  const formWrap = document.getElementById("profile-edit-form-wrap");
  const btnToggleEdit = document.getElementById("btn-toggle-edit-profile");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-profile");

  const inputPrenom = document.getElementById("edit-prenom");
  const inputNom = document.getElementById("edit-nom");
  const inputEmail = document.getElementById("edit-email");
  const inputMaster = document.getElementById("edit-master");
  const inputLinkedin = document.getElementById("edit-linkedin");
  const inputBio = document.getElementById("edit-bio");

  function populateEditForm(u) {
    if (inputPrenom) inputPrenom.value = u.prenom || "";
    if (inputNom) inputNom.value = u.nom || "";
    if (inputEmail) inputEmail.value = u.email || "";
    if (inputMaster) inputMaster.value = u.master || "";
    if (inputLinkedin) inputLinkedin.value = u.linkedin || "";
    if (inputBio) inputBio.value = u.bio || "";
  }

  if (btnToggleEdit) {
    btnToggleEdit.addEventListener("click", () => {
      populateEditForm(CIAA_STORE.getCurrentUser() || user);
      if (displayWrap) displayWrap.classList.add("is-editing");
      if (formWrap) formWrap.classList.add("is-editing");
    });
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener("click", () => {
      if (displayWrap) displayWrap.classList.remove("is-editing");
      if (formWrap) formWrap.classList.remove("is-editing");
    });
  }

  // 4. Soumission du formulaire de mise à jour du profil
  const editForm = document.getElementById("profile-edit-form");
  const editFeedback = document.getElementById("profile-edit-feedback");

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const updatedData = {
        prenom: inputPrenom.value.trim(),
        nom: inputNom.value.trim(),
        master: inputMaster.value.trim(),
        linkedin: inputLinkedin.value.trim(),
        bio: inputBio.value.trim()
      };

      await CIAA_STORE.updateUser(user.id, updatedData);
      const updatedUser = { ...user, ...updatedData };
      CIAA_STORE.setCurrentUser(updatedUser);

      // Mettre à jour l'en-tête et la carte d'affichage
      if (nameEl) nameEl.textContent = `${updatedData.prenom} ${updatedData.nom}`;
      if (masterEl) masterEl.textContent = updatedData.master;
      if (avatarEl) avatarEl.textContent = (updatedData.prenom[0] || "U") + (updatedData.nom[0] || "S");
      refreshDisplayCard(updatedUser);

      // Rebasculer en mode affichage
      if (displayWrap) displayWrap.classList.remove("is-editing");
      if (formWrap) formWrap.classList.remove("is-editing");

      if (typeof ciaaAlert === "function") {
        await ciaaAlert("Vos informations personnelles ont été enregistrées avec succès !", "Profil Actualisé", "success");
      } else if (editFeedback) {
        editFeedback.className = "profile-feedback-text success";
        editFeedback.textContent = "✓ Informations mises à jour avec succès !";
        setTimeout(() => { editFeedback.textContent = ""; }, 3500);
      }
    });
  }

  // 5. Projets soumis par cet utilisateur
  renderMyProjects(user);

  // 6. Sujets de projets proposés
  renderMySujets(user);

  // Déconnexion accessible à tous les rôles sur la page profil
  const doLogout = async (e) => {
    if (e) e.preventDefault();
    const ok = typeof ciaaConfirm === "function" 
      ? await ciaaConfirm("Êtes-vous sûr de vouloir vous déconnecter de votre compte ?", "Déconnexion")
      : true;
    if (ok) {
      await CIAA_STORE.logoutUser();
      window.location.replace("index.html");
    }
  };

  const btnHeroLogout = document.getElementById("btn-hero-logout");
  if (btnHeroLogout) {
    btnHeroLogout.dataset.boundLogout = "true";
    btnHeroLogout.addEventListener("click", doLogout);
  }

  const logoutBtn = document.getElementById("profile-logout-btn");
  if (logoutBtn) {
    logoutBtn.dataset.boundLogout = "true";
    logoutBtn.addEventListener("click", doLogout);
  }
});

function renderMyProjects(user) {
  const container = document.getElementById("my-projects-list");
  if (!container) return;

  const allProjects = CIAA_STORE.getProjects();
  const myProjects = allProjects.filter(p => {
    const isOwner = p.submitted_by && p.submitted_by.includes(user.id);
    const inTeam = (p.team || []).some(m => m.name.toLowerCase().includes(user.nom.toLowerCase()));
    return isOwner || inTeam;
  });

  container.innerHTML = "";

  if (myProjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <p>Vous n'avez pas encore soumis de projet.</p>
        <a class="btn primary" href="addproject.html">+ Proposer un projet</a>
      </div>
    `;
    return;
  }

  myProjects.forEach(p => {
    const item = document.createElement("div");
    item.className = "profile-project-item";

    let stateBadge = p.state === 1 
      ? `<span class="status-pill approved">✓ En Ligne</span>`
      : `<span class="status-pill pending">⏳ En Attente Review</span>`;

    if (p.featured) {
      stateBadge += ` <span class="status-pill featured">★ Top 3</span>`;
    }

    item.innerHTML = `
      <div>
        <strong>${p.title}</strong>
        <p>${p.description.substring(0, 80)}…</p>
      </div>
      <div>
        ${stateBadge}
      </div>
    `;
    container.appendChild(item);
  });
}

function renderMySujets(user) {
  const container = document.getElementById("my-sujets-list");
  if (!container) return;

  const allSujets = CIAA_STORE.getSujets();
  const mySujets = allSujets.filter(s => s.memberId === user.id);

  container.innerHTML = "";

  if (mySujets.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <p>Aucun sujet proposé pour l'instant.</p>
        <a class="btn ghost" href="annonces.html#sujets-section">Proposer une idée &rarr;</a>
      </div>
    `;
    return;
  }

  mySujets.forEach(s => {
    const item = document.createElement("div");
    item.className = "profile-project-item";

    const statusBadge = s.status === "approved"
      ? `<span class="status-pill approved">✓ Validé</span>`
      : `<span class="status-pill pending">⏳ En Attente</span>`;

    item.innerHTML = `
      <div>
        <strong>${s.title}</strong>
        <p>${s.description.substring(0, 75)}…</p>
      </div>
      <div>
        ${statusBadge}
      </div>
    `;
    container.appendChild(item);
  });
}
