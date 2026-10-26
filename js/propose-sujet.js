// Script pour la page individuelle de proposition de sujet de projet (propose-sujet.html)
// Accessible par tous les étudiants/membres ainsi que par l'administrateur

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  const currentUser = CIAA_STORE.getCurrentUser();
  const hasDash = CIAA_STORE.hasDashboardAccess(currentUser);
  const isAdmin = currentUser && (currentUser.role === "admin" || hasDash);

  const adminBanner = document.getElementById("admin-banner");
  const returnDashboardLink = document.getElementById("return-dash-link");
  const adminOptionsBox = document.getElementById("admin-options-box");
  const successDashLink = document.getElementById("sujet-link-dashboard");
  const authorInput = document.getElementById("sujet-author");
  const emailInput = document.getElementById("sujet-email");
  const form = document.getElementById("propose-sujet-form");
  const successBox = document.getElementById("sujet-success-box");
  const successDesc = document.getElementById("sujet-success-desc");

  // Remplissage automatique des informations membre
  if (currentUser) {
    if (authorInput && !authorInput.value) {
      authorInput.value = `${currentUser.prenom} ${currentUser.nom}`.trim();
    }
    if (emailInput && !emailInput.value) {
      emailInput.value = currentUser.email || "";
    }
  }

  // Si administrateur ou membre avec privilèges dashboard
  if (hasDash) {
    if (adminBanner) adminBanner.hidden = false;
    if (adminOptionsBox) adminOptionsBox.hidden = false;
    if (returnDashboardLink) returnDashboardLink.hidden = false;
    if (successDashLink) {
      successDashLink.hidden = false;
      successDashLink.style.display = "inline-flex";
    }
  } else {
    // Membre simple : masquer strictement l'option dashboard
    if (adminBanner) adminBanner.hidden = true;
    if (adminOptionsBox) adminOptionsBox.hidden = true;
    if (returnDashboardLink) returnDashboardLink.hidden = true;
    if (successDashLink) {
      successDashLink.hidden = true;
      successDashLink.style.display = "none";
    }
  }

  // Initialisation de l'uploader d'image explicative depuis l'appareil
  const imageUploader = CIAA_IMAGE_UPLOAD.init({
    inputId: "sujet-image-file",
    dropzoneId: "sujet-image-dropzone",
    previewBoxId: "sujet-image-preview-box",
    previewImgId: "sujet-image-preview-img",
    nameId: "sujet-image-name",
    sizeId: "sujet-image-size",
    removeBtnId: "btn-remove-sujet-image"
  });

  // Soumission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("sujet-title").value.trim();
    const category = document.getElementById("sujet-cat").value;
    const targetMaster = document.getElementById("sujet-master").value;
    const authorName = authorInput.value.trim() || (currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "");
    const authorEmail = emailInput.value.trim();
    const description = document.getElementById("sujet-desc").value.trim();
    const techsStr = document.getElementById("sujet-techs").value.trim();
    const teamSize = document.getElementById("sujet-teamsize").value.trim();

    const base64Image = imageUploader.getBase64();

    // Statut
    let status = "pending";
    if (isAdmin) {
      const directApprove = document.getElementById("admin-direct-approve")?.checked;
      status = directApprove ? "approved" : "pending";
    }

    const techs = techsStr ? techsStr.split(",").map(t => t.trim()).filter(Boolean) : [];

    await CIAA_STORE.addSujet({
      title,
      category,
      targetMaster,
      memberName: authorName,
      memberEmail: authorEmail,
      description,
      technologies: techs,
      teamSize,
      imageUrl: base64Image || null,
      status
    });

    // Affichage succès
    form.style.display = "none";
    if (adminBanner) adminBanner.style.display = "none";
    if (successBox) {
      successBox.style.display = "block";
      if (status === "approved") {
        successDesc.innerHTML = `Le sujet <strong>"${title}"</strong> a été <strong>validé et publié immédiatement</strong> sur la page Annonces &amp; Sujets de Projets !`;
      } else {
        successDesc.innerHTML = `Votre proposition de sujet <strong>"${title}"</strong> a été enregistrée. Elle est actuellement <strong>en cours d'examen par l'administrateur dans le dashboard</strong>.<br>Dès son approbation, les étudiants des Masters SDSI &amp; MIATE pourront y postuler.`;
      }
    }
  });
});
