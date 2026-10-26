// Logique de la page d'accueil (index.html)
// Affiche STRICTEMENT les 3 meilleurs projets (Top 3) configurés dans le Dashboard
// Synchronisé avec le store centralisé CIAA_STORE

(async () => {
  await CIAA_STORE.ready;
  const projectTemplate = document.querySelector(".project");
  const projectContainer = document.querySelector(".projects");

  function renderProjectCard(projectData) {
    if (!projectTemplate || !projectContainer) return;
    const project = projectTemplate.cloneNode(true);
    const titreEl = project.querySelector("#titre");
    const descEl = project.querySelector("#description");
    const imgEl = project.querySelector("#image");
    const linkEl = project.querySelector("#source_code");
    const tagsContainer = project.querySelector(".tags");

    if (titreEl) titreEl.innerText = projectData.title || '';
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

    if (tagsContainer && projectData.tags) {
      tagsContainer.innerHTML = projectData.tags.map(t => `<span>${t}</span>`).join('');
    }

    const teamElement = project.querySelector(".team");
    if (teamElement) {
      const teamList = projectData.team || (Array.isArray(projectData.users) ? projectData.users : []);
      const teamMembers = teamList.map(u => ({
        name: u.name || [u.prenom, u.nom].filter(Boolean).join(" ").trim(),
        linkedinUsername: (u.linkedin || u.linkedin_username || '').trim()
      })).filter(u => u.name);

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

  // 1. Charger les 3 meilleurs projets depuis Supabase
  let top3 = [];
  if (typeof CIAA_BACKEND !== "undefined") {
    try {
      top3 = await CIAA_BACKEND.getTop3Projects();
    } catch (e) {
      console.error("[index.js] Impossible de charger les projets Supabase :", e);
      if (projectContainer) {
        const message = document.createElement("p");
        message.setAttribute("role", "alert");
        message.textContent = `Impossible de charger les projets depuis Supabase : ${e.message}`;
        projectContainer.appendChild(message);
      }
    }
  }

  if (top3 && top3.length > 0) {
    top3.slice(0, 3).forEach(p => renderProjectCard(p));
  } else if (projectContainer && !projectContainer.querySelector('[role="alert"]')) {
    const empty = document.createElement("p");
    empty.className = "empty-projects";
    empty.textContent = "Aucun projet n’est actuellement sélectionné.";
    projectContainer.appendChild(empty);
  }

  CIAA_STORE.syncNavigation();

  // 3. Contrôleur du carrousel de slides des annonces du club
  const track = document.getElementById("slides-track");
  const prevBtn = document.getElementById("slider-prev-btn");
  const nextBtn = document.getElementById("slider-next-btn");
  const dots = document.querySelectorAll(".slider-dot");
  const totalSlides = document.querySelectorAll(".slide-item").length;

  if (track && totalSlides > 0) {
    let currentSlide = 0;
    let autoSlideInterval = null;

    function goToSlide(index) {
      currentSlide = (index + totalSlides) % totalSlides;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === currentSlide));
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        goToSlide(currentSlide - 1);
        resetAutoSlide();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        goToSlide(currentSlide + 1);
        resetAutoSlide();
      });
    }

    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.dataset.index, 10);
        goToSlide(idx);
        resetAutoSlide();
      });
    });

    function startAutoSlide() {
      autoSlideInterval = setInterval(() => {
        goToSlide(currentSlide + 1);
      }, 5000);
    }

    function resetAutoSlide() {
      if (autoSlideInterval) clearInterval(autoSlideInterval);
      startAutoSlide();
    }

    const sliderWrapper = document.querySelector(".slider-wrapper");
    if (sliderWrapper) {
      sliderWrapper.addEventListener("mouseenter", () => {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
      });
      sliderWrapper.addEventListener("mouseleave", () => {
        startAutoSlide();
      });
    }

    startAutoSlide();
  }

  // 4. Rendu dynamique du Bureau du Club et des Encadrants depuis Supabase
  if (typeof CIAA_STORE !== "undefined") {
    renderIndexBureau();
    renderIndexEncadrants();
    CIAA_STORE.syncNavigation();
  }

  function renderIndexBureau() {
    const container = document.getElementById("index-bureau-grid");
    if (!container) return;

    const bureau = CIAA_STORE.getBureauMembers().filter(m => m.category === "bureau");
    container.innerHTML = "";

    bureau.forEach(m => {
      const initials = (m.prenom ? m.prenom[0] : '') + (m.nom ? m.nom[0] : '');
      const linkedinHref = m.linkedin ? (m.linkedin.startsWith("http") ? m.linkedin : `https://www.linkedin.com/in/${m.linkedin}`) : "https://www.linkedin.com";

      const card = document.createElement("article");
      card.className = "person";
      card.innerHTML = `
        <div class="avatar" aria-hidden="true">${initials || 'CI'}</div>
        <div class="body">
          <h3>${m.prenom} ${m.nom}</h3>
          <div class="role">${m.roleLabel || 'Membre du Bureau'}</div>
          <p>${m.description || m.affiliation || 'Membre actif du bureau CIAA.'}</p>
          <a href="${linkedinHref}" target="_blank" rel="noopener">LinkedIn</a>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderIndexEncadrants() {
    const container = document.getElementById("index-encadrants-grid");
    if (!container) return;

    const encadrants = CIAA_STORE.getBureauMembers().filter(m => m.category === "encadrant");
    container.innerHTML = "";

    encadrants.forEach(e => {
      const initials = (e.prenom ? e.prenom[0] : '') + (e.nom ? e.nom[0] : 'Pr');
      const emailHref = e.email ? `mailto:${e.email}` : "mailto:contact.ciaa.fsan@gmail.com";

      const card = document.createElement("article");
      card.className = "person";
      card.innerHTML = `
        <div class="avatar" aria-hidden="true">${initials || 'Pr'}</div>
        <div class="body">
          <h3>Pr. ${e.prenom} ${e.nom}</h3>
          <div class="role">${e.roleLabel || 'Professeur encadrant · FSAN'}</div>
          <p>${e.description || e.affiliation || 'Superviseur scientifique des activités et projets du club.'}</p>
          <a href="${emailHref}">✉️ ${e.email || 'Email Universitaire'}</a>
        </div>
      `;
      container.appendChild(card);
    });
  }
})();
