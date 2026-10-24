(async () => {
  const projectTemplate = document.querySelector(".project");
  const projectContainer = document.querySelector(".projects");
  const SUPABASE_URL = 'https://dwtizibjpkdtcceiggxf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_MeOXYq_SwsXx-IkyPhGqqQ_jGlxMeS5';

  if (typeof supabase === 'undefined') {
    console.warn('Supabase SDK not loaded.');
    return;
  }

  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authentication state handler
  db.auth.onAuthStateChange((_event, session) => {
    const showAuthLinks = !session;
    const loginLink = document.querySelector("#login-link");
    const signupLink = document.querySelector("#signup-link");
    const logoutBtn = document.querySelector("#logout-btn");

    if (loginLink) loginLink.hidden = !showAuthLinks;
    if (signupLink) signupLink.hidden = !showAuthLinks;
    if (logoutBtn) logoutBtn.hidden = showAuthLinks;
  });

  const logoutBtn = document.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const { error } = await db.auth.signOut();
      button.disabled = false;
      if (error) alert("Erreur lors de la déconnexion : " + error.message);
    });
  }

  // Fetch featured projects
  try {
    const { data, error } = await db
      .from('projects')
      .select('*, users(nom, prenom, linkedin_username)')
      .eq('state', 1) // accepted projects only
      .eq('featured', true) // featured projects only
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not load featured projects from Supabase:', error.message);
      return;
    }

    if (!projectTemplate || !projectContainer) return;

    if (data && data.length > 0) {
      // Remove any existing dynamic items (keep template hidden)
      for (const projectData of data) {
        const project = projectTemplate.cloneNode(true);
        const titreEl = project.querySelector("#titre");
        const descEl = project.querySelector("#description");
        const imgEl = project.querySelector("#image");
        const linkEl = project.querySelector("#source_code");

        if (titreEl) titreEl.innerText = projectData.title || 'Projet sans titre';
        if (descEl) descEl.innerText = projectData.description || '';
        if (imgEl) {
          if (projectData.image_url) {
            imgEl.src = projectData.image_url;
            imgEl.alt = projectData.title || 'Illustration du projet';
          } else {
            imgEl.style.display = 'none';
          }
        }
        if (linkEl) {
          if (projectData.link) {
            linkEl.href = projectData.link;
            linkEl.style.display = 'inline-block';
          } else {
            linkEl.style.display = 'none';
          }
        }

        const teamElement = project.querySelector(".team");
        if (teamElement) {
          const users = Array.isArray(projectData.users)
            ? projectData.users
            : projectData.users
              ? [projectData.users]
              : [];
          const teamMembers = users
            .filter(Boolean)
            .map(user => ({
              name: [user.prenom, user.nom].filter(Boolean).join(" ").trim(),
              linkedinUsername: user.linkedin_username?.trim()
            }))
            .filter(user => user.name);

          teamElement.replaceChildren();
          teamElement.hidden = teamMembers.length === 0;
          if (teamMembers.length) {
            teamElement.append("Équipe : ");
            teamMembers.forEach((member, index) => {
              if (index > 0) teamElement.append(", ");
              if (member.linkedinUsername) {
                const link = document.createElement("a");
                link.href = `https://www.linkedin.com/in/${encodeURIComponent(member.linkedinUsername)}`;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = member.name;
                teamElement.append(link);
              } else {
                teamElement.append(member.name);
              }
            });
          }
        }

        project.style.display = "flex";
        projectContainer.append(project);
      }
    } else {
      // Show placeholder demo featured project if database is empty
      const fallback = projectTemplate.cloneNode(true);
      const titreEl = fallback.querySelector("#titre");
      const descEl = fallback.querySelector("#description");
      const imgEl = fallback.querySelector("#image");
      const linkEl = fallback.querySelector("#source_code");

      if (titreEl) titreEl.innerText = "Détection d'anomalies par Vision Artificielle";
      if (descEl) descEl.innerText = "Modèle basé sur YOLOv8 et PyTorch pour la détection et classification d'anomalies en temps réel.";
      if (imgEl) imgEl.style.display = 'none';
      if (linkEl) {
        linkEl.href = "https://github.com";
        linkEl.innerText = "Voir sur GitHub";
      }
      fallback.style.display = "flex";
      projectContainer.append(fallback);
    }
  } catch (err) {
    console.error('Erreur chargement projets:', err);
  }
})();
