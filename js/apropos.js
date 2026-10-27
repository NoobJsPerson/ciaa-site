// Logique de la page individuelle À propos du club CIAA
// Synchronisé dynamiquement avec les paramètres et les membres du bureau configurés dans le Dashboard

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;

  // 1. Charger et injecter dynamiquement les paramètres du club et réseaux sociaux
  const s = CIAA_STORE.getSettings();

  const descEl = document.getElementById("dyn-club-description");
  const missionEl = document.getElementById("dyn-club-mission");
  const addressEl = document.getElementById("dyn-club-address");
  const emailEl = document.getElementById("dyn-club-email");
  const facultyEl = document.getElementById("dyn-club-faculty");

  if (descEl && s.description) descEl.textContent = s.description;
  if (missionEl && s.mission) missionEl.textContent = s.mission;
  if (addressEl && s.address) addressEl.textContent = s.address;
  if (facultyEl && s.faculty) facultyEl.innerHTML = `${s.faculty} · <a href="http://fsan.ump.ma" target="_blank" rel="noopener noreferrer">fsan.ump.ma &rarr;</a>`;
  if (emailEl && s.email) {
    emailEl.textContent = s.email;
    emailEl.href = "mailto:" + s.email;
  }

  // Réseaux sociaux dynamiques (liens et handles)
  const setSocial = (cardId, url, handleText) => {
    const card = document.getElementById(cardId);
    if (!card) return;
    if (url) card.href = url;
    const handleEl = card.querySelector(".social-handle");
    if (handleEl && handleText) handleEl.textContent = handleText;
  };

  setSocial("social-link-linkedin", s.linkedinUrl, s.linkedinUrl ? s.linkedinUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/(company\/|in\/)?/, "@").replace(/\/$/, '') : "@ciaa-fsan");
  setSocial("social-link-youtube", s.youtubeUrl, s.youtubeUrl ? s.youtubeUrl.replace(/https?:\/\/(www\.)?youtube\.com\//, "") : "@CIAA-FSAN");
  setSocial("social-link-github", s.githubUrl, s.githubUrl ? s.githubUrl.replace(/https?:\/\/(www\.)?github\.com\//, "") : "ciaa-fsan");
  setSocial("social-link-discord", s.discordUrl, "Communauté Discord CIAA");
  setSocial("social-link-instagram", s.instagramUrl, s.instagramUrl ? s.instagramUrl.replace(/https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, '') : "@ciaa.fsan");
  setSocial("social-link-email", s.email ? `mailto:${s.email}` : "mailto:contact.ciaa.fsan@gmail.com", s.email || "contact.ciaa.fsan@gmail.com");

  // 2. Rendu dynamique du Bureau du Club et des Professeurs Encadrants
  renderDynBureau();
  renderDynFaculty();

  // 3. Gestion du formulaire de contact / envoyer un message au club
  const contactForm = document.getElementById("club-contact-form");
  const statusMsg = document.getElementById("contact-status-msg");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nom = document.getElementById("contact-nom")?.value.trim() || "";
      const email = document.getElementById("contact-email")?.value.trim() || "";
      const sujet = document.getElementById("contact-sujet")?.value.trim() || "";
      const message = document.getElementById("contact-message")?.value.trim() || "";

      const msgData = {
        senderName: nom,
        senderEmail: email,
        senderRole: "Message via Formulaire Contact",
        subject: sujet,
        message: message
      };

      await CIAA_STORE.addMessage(msgData);

      if (typeof ciaaAlert === "function") {
        ciaaAlert("Merci ! Votre message a bien été envoyé au bureau du CIAA et transmis au tableau de bord administrateur.", "Message envoyé", "success");
      } else if (statusMsg) {
        statusMsg.style.color = "#27ae60";
        statusMsg.textContent = "✓ Merci ! Votre message a bien été envoyé au bureau du CIAA.";
        setTimeout(() => { if (statusMsg) statusMsg.textContent = ""; }, 5000);
      }

      contactForm.reset();
    });
  }

  // 4. Synchronisation état session / auth
  CIAA_STORE.syncNavigation();
});

// Rendu dynamique des membres du bureau (Président, Vice-Président, Trésorier, etc.)
function renderDynBureau() {
  const container = document.getElementById("dyn-bureau-grid");
  if (!container) return;

  const members = CIAA_STORE.getBureauMembers().filter(m => m.category === "bureau");
  container.innerHTML = "";

  members.forEach(m => {
    const initials = (m.prenom ? m.prenom[0] : '') + (m.nom ? m.nom[0] : '');
    const rawLinkedin = (m.linkedin || '').trim();
    const linkedinHref = rawLinkedin ? (rawLinkedin.startsWith("http") ? rawLinkedin : `https://www.linkedin.com/in/${rawLinkedin.replace(/^\/+/, '')}`) : "";
    const cleanDesc = (m.cleanDescription || m.description || '').replace(/<!--avatar:.+?-->/g, '').trim();

    const avatarHtml = m.imageUrl
      ? `<div class="member-avatar has-image" aria-label="${m.prenom} ${m.nom}"><img src="${m.imageUrl}" alt="${m.prenom} ${m.nom}"></div>`
      : `<div class="member-avatar">${initials || 'CI'}</div>`;

    const card = document.createElement("article");
    card.className = "member-card";
    card.innerHTML = `
      ${avatarHtml}
      <h3>${m.prenom} ${m.nom}</h3>
      ${m.roleLabel ? `<div class="member-role">${m.roleLabel}</div>` : ''}
      ${m.affiliation ? `<div class="member-master">${m.affiliation}</div>` : ''}
      ${cleanDesc ? `<p class="member-desc">${cleanDesc}</p>` : ''}
      ${linkedinHref ? `
        <a class="btn-linkedin-profile" href="${linkedinHref}" target="_blank" rel="noopener noreferrer">
          <span>in</span> Profil LinkedIn
        </a>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

// Rendu dynamique des professeurs encadrants FSAN
function renderDynFaculty() {
  const container = document.getElementById("dyn-faculty-grid");
  if (!container) return;

  const encadrants = CIAA_STORE.getBureauMembers().filter(m => m.category === "encadrant");
  container.innerHTML = "";

  encadrants.forEach(e => {
    const initials = (e.prenom ? e.prenom[0] : '') + (e.nom ? e.nom[0] : 'Pr');
    const emailHref = e.email ? `mailto:${e.email}` : "";
    const rawLinkedin = (e.linkedin || '').trim();
    const linkedinHref = rawLinkedin ? (rawLinkedin.startsWith("http") ? rawLinkedin : `https://www.linkedin.com/in/${rawLinkedin.replace(/^\/+/, '')}`) : "";
    const cleanDesc = (e.cleanDescription || e.description || '').replace(/<!--avatar:.+?-->/g, '').trim();

    const avatarHtml = e.imageUrl
      ? `<div class="faculty-avatar has-image" aria-label="Pr. ${e.prenom} ${e.nom}"><img src="${e.imageUrl}" alt="Pr. ${e.prenom} ${e.nom}"></div>`
      : `<div class="faculty-avatar">${initials || 'Pr'}</div>`;

    const linksHtml = [];
    if (emailHref) linksHtml.push(`<a href="${emailHref}">✉️ ${e.email}</a>`);
    if (linkedinHref) linksHtml.push(`<a href="${linkedinHref}" target="_blank" rel="noopener">LinkedIn</a>`);

    const card = document.createElement("article");
    card.className = "faculty-card";
    card.innerHTML = `
      ${avatarHtml}
      <div class="faculty-info">
        <h3>Pr. ${e.prenom} ${e.nom}</h3>
        ${e.roleLabel ? `<div class="faculty-role">${e.roleLabel}</div>` : ''}
        ${cleanDesc ? `<p class="faculty-desc">${cleanDesc}</p>` : ''}
        ${linksHtml.length ? `<div class="faculty-links">${linksHtml.join('')}</div>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}
