// Script pour la page individuelle d'ajout de Vidéo YouTube (addvideo.html)

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  const currentUser = CIAA_STORE.getCurrentUser();
  const isAdmin = currentUser && currentUser.role === "admin";

  const adminBanner = document.getElementById("admin-banner");
  const form = document.getElementById("add-video-form");
  const successBox = document.getElementById("video-success-box");
  const successDesc = document.getElementById("video-success-desc");

  if (isAdmin && adminBanner) {
    adminBanner.hidden = false;
  }

  // Initialisation de l'uploader de miniature / image depuis l'appareil
  const imageUploader = CIAA_IMAGE_UPLOAD.init({
    inputId: "video-image-file",
    dropzoneId: "video-image-dropzone",
    previewBoxId: "video-image-preview-box",
    previewImgId: "video-image-preview-img",
    nameId: "video-image-name",
    sizeId: "video-image-size",
    removeBtnId: "btn-remove-video-image"
  });

  // Soumission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("video-title").value.trim();
    const trackSelect = document.getElementById("video-track");
    const track = trackSelect.value;
    const categoryName = trackSelect.selectedOptions[0].text;
    const youtubeUrl = document.getElementById("video-url").value.trim();
    const duration = document.getElementById("video-duration").value.trim();
    const instructor = document.getElementById("video-instructor").value.trim();
    const description = document.getElementById("video-desc").value.trim();

    const base64Image = imageUploader.getBase64();
    await CIAA_STORE.addVideo({
      title,
      track,
      categoryName,
      youtubeUrl,
      duration,
      instructor,
      description,
      imageUrl: base64Image
    });

    // Affichage succès
    form.style.display = "none";
    if (adminBanner) adminBanner.style.display = "none";
    if (successBox) {
      successBox.style.display = "block";
      successDesc.innerHTML = `La vidéo <strong>"${title}"</strong> (${categoryName}) a été ajoutée au catalogue Supabase de la page <strong>Apprendre l'IA</strong>.`;
    }
  });
});
