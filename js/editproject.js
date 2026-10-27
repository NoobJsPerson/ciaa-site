// Script de gestion et modification de projets (editproject.html)

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  const $ = (id) => document.getElementById(id);
  const currentUser = CIAA_STORE.getCurrentUser();

  // Restrict the editor to users with dashboard privileges.
  if (!currentUser) {
    window.location.replace("login.html?next=editproject.html");
    return;
  }

  if (!CIAA_STORE.hasDashboardAccess(currentUser)) {
    if (typeof ciaaAlert === "function") {
      await ciaaAlert(
        "Accès refusé : la modification des projets est réservée aux personnes autorisées à accéder au dashboard.",
        "Accès Non Autorisé",
        "error"
      );
    }
    window.location.replace("profile.html");
    return;
  }

  $('admin-box').hidden = false;
  $('logout-btn').hidden = false;

  let selectedProject = null;
  let projects = [];
  let updatedBase64Image = null;

  function say(message, isErr = false) {
    $('msg').textContent = message;
    $('msg').className = isErr ? 'status error' : 'status success';
  }

  // Initialisation de l'uploader d'image depuis l'appareil
  const imageUploader = CIAA_IMAGE_UPLOAD.init({
    inputId: "image",
    dropzoneId: "edit-image-dropzone",
    previewBoxId: "edit-image-preview-box",
    previewImgId: "edit-image-preview-img",
    nameId: "edit-image-name",
    sizeId: "edit-image-size",
    removeBtnId: "btn-remove-edit-image",
    onImageLoaded: (base64) => {
      updatedBase64Image = base64;
    }
  });

  function renderProjects() {
    const list = $('project-list');
    list.replaceChildren();
    $('empty-message').hidden = projects.length > 0;

    for (const project of projects) {
      const item = document.createElement('li');
      item.className = 'project-row';
      const title = document.createElement('span');
      title.className = 'project-title';
      title.textContent = (project.featured ? '★ ' : '') + (project.title || 'Projet sans titre');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Modifier';
      button.addEventListener('click', () => selectProject(project));
      item.append(title, button);
      list.append(item);
    }
  }

  function loadProjects() {
    say('Chargement des projets…');
    // Récupération depuis le store central
    projects = CIAA_STORE.getProjects();
    renderProjects();
    say('');
  }

  function selectProject(project) {
    selectedProject = project;
    $('title').value = project.title || '';
    $('description').value = project.description || '';
    $('link').value = project.link || '';
    $('featured').checked = !!project.featured;
    updatedBase64Image = null;

    if (imageUploader) imageUploader.reset();

    if (project.image_url) {
      imageUploader.setBase64(project.image_url, "Image actuelle du projet");
      $('image-hint').textContent = 'Image actuelle chargée. Choisissez un nouveau fichier sur votre appareil pour la remplacer.';
    } else {
      $('image-hint').textContent = 'Aucune image définie actuellement.';
    }

    $('editor').hidden = false;
    $('title').focus();
  }

  $('logout-btn').addEventListener('click', async () => {
    const ok = typeof ciaaConfirm === "function"
      ? await ciaaConfirm("Êtes-vous sûr de vouloir vous déconnecter ?", "Déconnexion")
      : true;
    if (ok) {
      await CIAA_STORE.logoutUser();
      window.location.replace('index.html');
    }
  });

  $('edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedProject) {
      say('Veuillez sélectionner un projet avant d\'enregistrer.', true);
      return;
    }

    const title = $('title').value.trim();
    const description = $('description').value.trim();
    const link = $('link').value.trim() || null;
    const featured = $('featured').checked;

    if (!title) {
      say('Le titre est requis.', true);
      $('title').focus();
      return;
    }

    say('Enregistrement des modifications…');

    const changes = {
      title,
      description,
      link,
      featured
    };

    if (updatedBase64Image) {
      changes.image_url = updatedBase64Image;
    }

    await CIAA_STORE.updateProject(selectedProject.id, changes);

    say('✓ Projet mis à jour avec succès !');
    $('editor').hidden = true;
    selectedProject = null;
    loadProjects();
  });

  $('cancel-btn').addEventListener('click', () => {
    selectedProject = null;
    $('editor').hidden = true;
  });

  loadProjects();
});
