// Script pour la page individuelle d'ajout de Drive par module & semestre (adddrive.html)

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  const currentUser = CIAA_STORE.getCurrentUser();
  const isAdmin = currentUser && currentUser.role === "admin";

  const adminBanner = document.getElementById("admin-banner");
  const form = document.getElementById("add-drive-form");
  const successBox = document.getElementById("drive-success-box");
  const successDesc = document.getElementById("drive-success-desc");

  if (isAdmin && adminBanner) {
    adminBanner.hidden = false;
  }

  // Initialisation de l'uploader d'image descriptive depuis l'appareil
  const imageUploader = CIAA_IMAGE_UPLOAD.init({
    inputId: "drive-image-file",
    dropzoneId: "drive-image-dropzone",
    previewBoxId: "drive-image-preview-box",
    previewImgId: "drive-image-preview-img",
    nameId: "drive-image-name",
    sizeId: "drive-image-size",
    removeBtnId: "btn-remove-drive-image"
  });

  // Soumission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const master = document.getElementById("drive-master").value;
    const semestre = document.getElementById("drive-semestre").value;
    const moduleName = document.getElementById("drive-mod-name").value.trim();
    const description = document.getElementById("drive-mod-desc").value.trim();
    const driveCours = document.getElementById("drive-url-cours").value.trim();
    const driveTP = document.getElementById("drive-url-tp").value.trim();
    const driveTD = document.getElementById("drive-url-td").value.trim();
    const driveExamens = document.getElementById("drive-url-exams").value.trim();

    const base64Image = imageUploader.getBase64();
    await CIAA_STORE.addDrive({
      master,
      semestre,
      moduleName,
      description,
      imageUrl: base64Image,
      driveCours,
      driveTP,
      driveTD,
      driveExamens
    });

    // Affichage succès
    form.style.display = "none";
    if (adminBanner) adminBanner.style.display = "none";
    if (successBox) {
      successBox.style.display = "block";
      successDesc.innerHTML = `Le module <strong>"${moduleName}"</strong> (${master} - Semestre ${semestre.toUpperCase()}) avec ses 4 dossiers Drive (Cours, TP, TD, Examens) a été enregistré et mis à disposition sur la page <strong>Apprendre l'IA</strong>.`;
    }
  });
});
