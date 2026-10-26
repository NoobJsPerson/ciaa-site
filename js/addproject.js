// Script pour la page individuelle d'ajout de projet (addproject.html)
// Utilisable aussi bien par l'administrateur que par tous les étudiants/membres du club

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  const currentUser = CIAA_STORE.getCurrentUser();
  const hasDash = CIAA_STORE.hasDashboardAccess(currentUser);
  const isAdmin = currentUser && (currentUser.role === "admin" || hasDash);

  const adminOptionsBox = document.getElementById("admin-options-box");
  const adminBanner = document.getElementById("admin-banner");
  const returnDashboardLink = document.getElementById("return-dash-link");
  const successDashLink = document.getElementById("success-link-dashboard");
  const membersInput = document.getElementById("members");
  const form = document.getElementById("project-submission-form");
  const successBox = document.getElementById("submission-success-box");
  const successDesc = document.getElementById("success-box-desc");
  const statusMsg = document.getElementById("msg");

  // Affichage conditionnel des privilèges admin
  if (hasDash) {
    if (adminBanner) adminBanner.hidden = false;
    if (adminOptionsBox) adminOptionsBox.hidden = false;
    if (returnDashboardLink) returnDashboardLink.hidden = false;
    if (successDashLink) {
      successDashLink.hidden = false;
      successDashLink.style.display = "inline-flex";
    }
    const featuredCheckbox = document.getElementById("admin-featured");
    const validateDirectCheckbox = document.getElementById("admin-direct-validate");
    if (validateDirectCheckbox) validateDirectCheckbox.checked = true;
  } else {
    // Membre simple : masquer strictement toute mention du dashboard
    if (adminBanner) adminBanner.hidden = true;
    if (adminOptionsBox) adminOptionsBox.hidden = true;
    if (returnDashboardLink) returnDashboardLink.hidden = true;
    if (successDashLink) {
      successDashLink.hidden = true;
      successDashLink.style.display = "none";
    }
  }

  // Pré-remplir les membres avec le nom de l'utilisateur connecté si disponible
  if (currentUser && membersInput && !membersInput.value) {
    const defaultName = `${currentUser.prenom} ${currentUser.nom}`.trim();
    const linkedinPart = currentUser.linkedin ? ` (${currentUser.linkedin})` : "";
    membersInput.value = defaultName + linkedinPart;
  }

  // Initialisation de l'upload d'image depuis l'appareil local
  const imageUploader = CIAA_IMAGE_UPLOAD.init({
    inputId: "project-image-file",
    dropzoneId: "project-image-dropzone",
    previewBoxId: "project-image-preview-box",
    previewImgId: "project-image-preview-img",
    nameId: "project-image-name",
    sizeId: "project-image-size",
    removeBtnId: "btn-remove-project-image"
  });

  // Soumission du formulaire
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const link = document.getElementById("link").value.trim();
    const category = document.getElementById("category").value;
    const membersStr = membersInput.value.trim();

    // Récupérer l'image uploadée depuis l'appareil en Base64
    const base64Image = imageUploader.getBase64();
    const finalImageUrl = base64Image || null;

    // Déterminer le statut selon le rôle et les options
    let state = 0; // 0 = En attente par défaut
    let featured = false;

    if (isAdmin) {
      const validateDirect = document.getElementById("admin-direct-validate")?.checked;
      const setFeatured = document.getElementById("admin-featured")?.checked;
      state = validateDirect ? 1 : 0;
      featured = Boolean(setFeatured);
    }

    // Traitement de l'équipe
    const team = membersStr.split(",").map(m => {
      const match = m.match(/(.+?)(?:\s*\((.*?)\))?$/);
      return {
        name: (match ? match[1] : m).trim(),
        linkedin: match && match[2] ? match[2].trim() : ""
      };
    }).filter(m => m.name);

    await CIAA_STORE.addProject({
      title,
      description,
      link,
      category,
      image_url: finalImageUrl,
      state,
      featured,
      submitted_by: currentUser?.id || null,
      team
    });

    // 3. Affichage du retour utilisateur
    form.style.display = "none";
    if (adminBanner) adminBanner.style.display = "none";
    if (successBox) {
      successBox.style.display = "block";
      if (state === 1) {
        successDesc.innerHTML = `Le projet <strong>"${title}"</strong> a été <strong>validé et publié immédiatement</strong> sur le site en tant qu'administrateur.${featured ? ' Il est également configuré dans le <strong>Top 3</strong> d\'accueil !' : ''}`;
      } else {
        successDesc.innerHTML = `Votre projet <strong>"${title}"</strong> est actuellement <strong>en cours de traitement et validation par l'administrateur dans le dashboard</strong>.<br>Dès son approbation, il sera visible dans la galerie publique.`;
      }
    }
  });
});
