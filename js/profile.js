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
  const avatarImageEl = document.getElementById("profile-avatar-image");
  const avatarInitialsEl = document.getElementById("profile-avatar-initials");
  const roleEl = document.getElementById("profile-display-role");
  const statusBanner = document.getElementById("profile-status-banner");
  const adminCard = document.getElementById("profile-admin-card");
  const badgeProfileStatus = document.getElementById("badge-profile-status");

  if (nameEl) nameEl.textContent = `${user.prenom} ${user.nom}`;
  if (emailEl) emailEl.textContent = user.email;
  if (masterEl) masterEl.textContent = user.master || "—";
  const setAvatar = (profile) => {
    if (avatarInitialsEl) {
      avatarInitialsEl.textContent = (profile.prenom?.[0] || "U") + (profile.nom?.[0] || "S");
    }
    if (avatarEl) avatarEl.classList.toggle("has-image", Boolean(profile.imageUrl));
    if (avatarImageEl) {
      if (profile.imageUrl) avatarImageEl.src = profile.imageUrl;
      else avatarImageEl.removeAttribute("src");
      avatarImageEl.onerror = () => {
        avatarEl?.classList.remove("has-image");
      };
    }
  };
  setAvatar(user);
  if (roleEl) roleEl.textContent = user.role === "admin" ? "Administrateur" : (user.roleLabel || "Membre");

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

  function normalizeLinkedInUrl(val) {
    if (!val) return "";
    const trimmed = String(val).trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://www.linkedin.com/in/${trimmed.replace(/^\/+/, "")}`;
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
        const fullUrl = normalizeLinkedInUrl(u.linkedin);
        dispLinkedin.innerHTML = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-weight:600">🔗 ${fullUrl}</a>`;
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
  const avatarActions = document.getElementById("profile-avatar-actions");
  const btnDeleteAvatar = document.getElementById("btn-delete-profile-avatar");
  const btnCloseAvatarActions = document.getElementById("btn-close-profile-avatar-actions");

  // Nouveaux éléments du formulaire pour la photo de profil
  const editAvatarPreviewImg = document.getElementById("edit-avatar-preview-img");
  const editAvatarPreviewInitials = document.getElementById("edit-avatar-preview-initials");
  const editAvatarFile = document.getElementById("edit-avatar-file");
  const editAvatarUrl = document.getElementById("edit-avatar-url");
  const btnRemoveEditAvatar = document.getElementById("btn-remove-edit-avatar");
  let pendingAvatarData = undefined;

  function updateEditFormAvatar(imgUrl) {
    const curU = CIAA_STORE.getCurrentUser() || user;
    if (editAvatarPreviewInitials) {
      editAvatarPreviewInitials.textContent = (curU.prenom?.[0] || "U") + (curU.nom?.[0] || "S");
    }
    if (imgUrl) {
      if (editAvatarPreviewImg) {
        editAvatarPreviewImg.src = imgUrl;
        editAvatarPreviewImg.style.display = "block";
      }
      if (editAvatarPreviewInitials) editAvatarPreviewInitials.style.display = "none";
      if (btnRemoveEditAvatar) btnRemoveEditAvatar.style.display = "inline-flex";
      if (editAvatarUrl && !imgUrl.startsWith("data:")) editAvatarUrl.value = imgUrl;
    } else {
      if (editAvatarPreviewImg) {
        editAvatarPreviewImg.removeAttribute("src");
        editAvatarPreviewImg.style.display = "none";
      }
      if (editAvatarPreviewInitials) editAvatarPreviewInitials.style.display = "block";
      if (btnRemoveEditAvatar) btnRemoveEditAvatar.style.display = "none";
      if (editAvatarUrl) editAvatarUrl.value = "";
    }
  }

  if (editAvatarFile) {
    editAvatarFile.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        if (typeof ciaaAlert === "function") ciaaAlert("Veuillez sélectionner un fichier image valide.", "Format Invalide", "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (typeof ciaaAlert === "function") ciaaAlert("L'image dépasse 5 Mo.", "Fichier trop lourd", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        pendingAvatarData = evt.target.result;
        updateEditFormAvatar(pendingAvatarData);
      };
      reader.readAsDataURL(file);
    });
  }

  if (editAvatarUrl) {
    editAvatarUrl.addEventListener("input", () => {
      const val = editAvatarUrl.value.trim();
      if (val) {
        pendingAvatarData = val;
        updateEditFormAvatar(val);
      }
    });
  }

  if (btnRemoveEditAvatar) {
    btnRemoveEditAvatar.addEventListener("click", () => {
      pendingAvatarData = null;
      if (editAvatarFile) editAvatarFile.value = "";
      updateEditFormAvatar(null);
    });
  }

  const avatarUploader = CIAA_IMAGE_UPLOAD.init({
    inputId: "profile-avatar-file",
    previewBoxId: "profile-avatar-large",
    previewImgId: "profile-avatar-image",
    onImageLoaded: imageUrl => saveProfileImage(imageUrl)
  });

  function closeAvatarActions() {
    if (avatarActions) avatarActions.hidden = true;
    if (avatarEl) avatarEl.setAttribute("aria-expanded", "false");
  }

  async function saveProfileImage(imageUrl) {
    try {
      await CIAA_STORE.updateUser(user.id, { imageUrl });
      const updatedUser = CIAA_STORE.getCurrentUser();
      const avatarInput = document.getElementById("profile-avatar-file");
      if (avatarInput) avatarInput.value = "";
      if (updatedUser?.imageUrl) avatarUploader.setBase64(updatedUser.imageUrl);
      else avatarUploader.reset();
      setAvatar(updatedUser);
      updateEditFormAvatar(updatedUser?.imageUrl);
      if (btnDeleteAvatar) btnDeleteAvatar.hidden = !updatedUser?.imageUrl;
      CIAA_STORE.syncNavigation();
      closeAvatarActions();
      if (typeof ciaaAlert === "function") {
        await ciaaAlert(
          imageUrl ? "Votre photo de profil a été mise à jour avec succès." : "Votre photo de profil a été supprimée.",
          "Photo de profil actualisée",
          "success"
        );
      }
    } catch (error) {
      const currentProfile = CIAA_STORE.getCurrentUser() || user;
      setAvatar(currentProfile);
      if (typeof ciaaAlert === "function") {
        await ciaaAlert(`Échec de la mise à jour de la photo : ${error.message}`, "Erreur", "error");
      } else {
        console.error("[profile] Impossible de mettre à jour la photo :", error);
      }
    }
  }

  if (btnDeleteAvatar) {
    btnDeleteAvatar.hidden = !user.imageUrl;
    btnDeleteAvatar.addEventListener("click", async () => {
      const confirmed = typeof ciaaConfirm === "function"
        ? await ciaaConfirm("Supprimer votre photo de profil ?", "Supprimer la photo")
        : confirm("Supprimer votre photo de profil ?");
      if (confirmed) await saveProfileImage(null);
    });
  }

  if (avatarEl) {
    avatarEl.addEventListener("click", () => {
      if (!avatarActions) return;
      avatarActions.hidden = !avatarActions.hidden;
      avatarEl.setAttribute("aria-expanded", String(!avatarActions.hidden));
    });
  }

  if (btnCloseAvatarActions) {
    btnCloseAvatarActions.addEventListener("click", closeAvatarActions);
  }

  document.addEventListener("click", event => {
    if (avatarActions && !avatarActions.hidden && !event.target.closest(".profile-avatar-control")) {
      closeAvatarActions();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && avatarActions && !avatarActions.hidden) {
      closeAvatarActions();
      avatarEl?.focus();
    }
  });

  function populateEditForm(u) {
    if (inputPrenom) inputPrenom.value = u.prenom || "";
    if (inputNom) inputNom.value = u.nom || "";
    if (inputEmail) inputEmail.value = u.email || "";
    if (inputMaster) inputMaster.value = u.master || "";
    if (inputLinkedin) inputLinkedin.value = u.linkedin ? normalizeLinkedInUrl(u.linkedin) : "";
    if (inputBio) inputBio.value = u.bio || "";
    pendingAvatarData = undefined;
    updateEditFormAvatar(u.imageUrl);
  }

  if (btnToggleEdit) {
    btnToggleEdit.addEventListener("click", () => {
      const currentProfile = CIAA_STORE.getCurrentUser() || user;
      populateEditForm(currentProfile);
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
        linkedin: normalizeLinkedInUrl(inputLinkedin.value.trim()),
        bio: inputBio.value.trim()
      };

      if (pendingAvatarData !== undefined) {
        updatedData.imageUrl = pendingAvatarData || null;
      } else if (editAvatarUrl && editAvatarUrl.value.trim()) {
        updatedData.imageUrl = editAvatarUrl.value.trim();
      }

      try {
        await CIAA_STORE.updateUser(user.id, updatedData);
        const updatedUser = { ...CIAA_STORE.getCurrentUser(), ...updatedData };
        CIAA_STORE.setCurrentUser(updatedUser);

        // Mettre à jour l'en-tête et la carte d'affichage
        if (nameEl) nameEl.textContent = `${updatedData.prenom} ${updatedData.nom}`;
        if (masterEl) masterEl.textContent = updatedData.master;
        setAvatar(updatedUser);
        refreshDisplayCard(updatedUser);
        CIAA_STORE.syncNavigation();

        // Rebasculer en mode affichage
        if (displayWrap) displayWrap.classList.remove("is-editing");
        if (formWrap) formWrap.classList.remove("is-editing");

        if (typeof ciaaAlert === "function") {
          await ciaaAlert("Vos informations personnelles et photo de profil ont été enregistrées avec succès !", "Profil Actualisé", "success");
        } else if (editFeedback) {
          editFeedback.className = "profile-feedback-text success";
          editFeedback.textContent = "✓ Informations mises à jour avec succès !";
          setTimeout(() => { editFeedback.textContent = ""; }, 3500);
        }
      } catch (error) {
        if (editFeedback) {
          editFeedback.className = "profile-feedback-text error";
          editFeedback.textContent = `Échec de l'enregistrement : ${error.message}`;
        }
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
