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
            const rawL = member.linkedinUsername.trim();
            link.href = rawL.startsWith("http") ? rawL : `https://www.linkedin.com/in/${encodeURIComponent(rawL)}`;
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

  // 3. Rendu dynamique et contrôleur du carrousel de slides des annonces du club
  renderIndexAnnoncesSlider();

  function renderIndexAnnoncesSlider() {
    const track = document.getElementById("slides-track");
    const prevBtn = document.getElementById("slider-prev-btn");
    const nextBtn = document.getElementById("slider-next-btn");
    const dotsContainer = document.getElementById("slider-dots-container");
    if (!track) return;

    track.innerHTML = "";
    if (dotsContainer) dotsContainer.innerHTML = "";

    const categoryNames = {
      cv: "Computer Vision",
      dl: "Deep Learning",
      ml: "Machine Learning",
      nlp: "NLP & LLMs",
      data: "Data Science"
    };

    const allSujets = typeof CIAA_STORE !== "undefined" ? CIAA_STORE.getSujets() : [];
    const annonces = allSujets.filter(s => s.status === "approved" || s.status === "in_progress");

    if (annonces.length === 0) {
      const emptySlide = document.createElement("div");
      emptySlide.className = "slide-item";
      emptySlide.style.cssText = "text-align:center;padding:48px 24px;display:flex;flex-direction:column;align-items:center;";
      emptySlide.innerHTML = `
        <div style="font-size:2.2rem;margin-bottom:10px">📢</div>
        <h3 class="slide-title" style="margin-bottom:8px">Aucune annonce actuellement publiée</h3>
        <p class="slide-desc" style="margin:0 auto 20px;max-width:60ch">Les prochains appels à projets et actualités officiels du club apparaîtront ici dès leur validation.</p>
        <div class="slide-actions">
          <a class="btn ghost" href="annonces.html">Consulter l'espace Annonces &amp; Sujets</a>
        </div>
      `;
      track.appendChild(emptySlide);
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      return;
    }

    annonces.forEach((s, idx) => {
      const slide = document.createElement("div");
      slide.className = "slide-item";

      const catLabel = categoryNames[s.category] || s.category || "Appel à projet";
      const statusLabel = s.status === "approved" ? "Candidatures ouvertes" : "En cours";
      const statusClass = s.status === "approved" ? "green" : "urgent";
      const targetLabel = s.targetMaster || "Masters FSAN";

      const techTags = Array.isArray(s.technologies) && s.technologies.length > 0
        ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">${s.technologies.slice(0, 4).map(t => `<span style="background:#eaf2fa;color:var(--navy);font-size:0.75rem;padding:3px 10px;border-radius:999px;font-weight:600">${t}</span>`).join('')}</div>`
        : "";

      slide.innerHTML = `
        <div class="slide-badge-row">
          <span class="slide-tag ${statusClass}">${statusLabel}</span>
          <span class="slide-tag" style="background:#1b6b82">${catLabel}</span>
          <span class="slide-date">🎓 ${targetLabel}</span>
        </div>
        <h3 class="slide-title">${s.title || 'Annonce du Club CIAA'}</h3>
        <p class="slide-desc">${s.description || ''}</p>
        ${techTags}
        <div class="slide-actions">
          <a class="btn primary" href="annonces.html" style="font-size:0.92rem;padding:10px 22px">
            🚀 Découvrir &amp; Postuler &rarr;
          </a>
          <a class="btn ghost" href="annonces.html#sujets-section" style="font-size:0.92rem;padding:10px 18px">
            Voir tous les sujets
          </a>
        </div>
      `;
      track.appendChild(slide);

      if (dotsContainer && annonces.length > 1) {
        const dot = document.createElement("button");
        dot.className = `slider-dot ${idx === 0 ? "active" : ""}`;
        dot.type = "button";
        dot.dataset.index = String(idx);
        dot.setAttribute("aria-label", `Slide ${idx + 1}`);
        dotsContainer.appendChild(dot);
      }
    });

    const totalSlides = annonces.length;
    if (totalSlides <= 1) {
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      return;
    }

    if (prevBtn) prevBtn.style.display = "flex";
    if (nextBtn) nextBtn.style.display = "flex";

    let currentSlide = 0;
    let autoSlideInterval = null;
    const dots = dotsContainer ? dotsContainer.querySelectorAll(".slider-dot") : [];

    function goToSlide(index) {
      currentSlide = (index + totalSlides) % totalSlides;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === currentSlide));
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        goToSlide(currentSlide - 1);
        resetAutoSlide();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        goToSlide(currentSlide + 1);
        resetAutoSlide();
      };
    }

    dots.forEach(dot => {
      dot.onclick = () => {
        const idx = parseInt(dot.dataset.index, 10);
        goToSlide(idx);
        resetAutoSlide();
      };
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
      sliderWrapper.onmouseenter = () => {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
      };
      sliderWrapper.onmouseleave = () => {
        startAutoSlide();
      };
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
      const rawLinkedin = (m.linkedin || '').trim();
      const linkedinHref = rawLinkedin ? (rawLinkedin.startsWith("http") ? rawLinkedin : `https://www.linkedin.com/in/${rawLinkedin.replace(/^\/+/, '')}`) : "";
      const cleanDesc = (m.cleanDescription || m.description || m.affiliation || '').replace(/<!--avatar:.+?-->/g, '').trim();

      const card = document.createElement("article");
      card.className = "person";

      const avatarHtml = m.imageUrl
        ? `<div class="avatar has-image" aria-label="${m.prenom} ${m.nom}"><img src="${m.imageUrl}" alt="${m.prenom} ${m.nom}"></div>`
        : `<div class="avatar" aria-hidden="true">${initials || 'CI'}</div>`;

      card.innerHTML = `
        ${avatarHtml}
        <div class="body">
          <h3>${m.prenom} ${m.nom}</h3>
          ${m.roleLabel ? `<div class="role">${m.roleLabel}</div>` : ''}
          ${cleanDesc ? `<p>${cleanDesc}</p>` : ''}
          ${linkedinHref ? `<a href="${linkedinHref}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
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
      const emailHref = e.email ? `mailto:${e.email}` : "";
      const rawLinkedin = (e.linkedin || '').trim();
      const linkedinHref = rawLinkedin ? (rawLinkedin.startsWith("http") ? rawLinkedin : `https://www.linkedin.com/in/${rawLinkedin.replace(/^\/+/, '')}`) : "";
      const cleanDesc = (e.cleanDescription || e.description || e.affiliation || '').replace(/<!--avatar:.+?-->/g, '').trim();

      const card = document.createElement("article");
      card.className = "person";

      const avatarHtml = e.imageUrl
        ? `<div class="avatar has-image" aria-label="Pr. ${e.prenom} ${e.nom}"><img src="${e.imageUrl}" alt="Pr. ${e.prenom} ${e.nom}"></div>`
        : `<div class="avatar" aria-hidden="true">${initials || 'Pr'}</div>`;

      const linksHtml = [];
      if (emailHref) linksHtml.push(`<a href="${emailHref}">✉️ ${e.email}</a>`);
      if (linkedinHref) linksHtml.push(`<a href="${linkedinHref}" target="_blank" rel="noopener">LinkedIn</a>`);

      card.innerHTML = `
        ${avatarHtml}
        <div class="body">
          <h3>Pr. ${e.prenom} ${e.nom}</h3>
          ${e.roleLabel ? `<div class="role">${e.roleLabel}</div>` : ''}
          ${cleanDesc ? `<p>${cleanDesc}</p>` : ''}
          ${linksHtml.length ? `<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:8px;">${linksHtml.join('')}</div>` : ''}
        </div>
      `;
      container.appendChild(card);
    });
  }
})();
