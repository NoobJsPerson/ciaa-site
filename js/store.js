// Supabase-backed site data and authentication state.

const CIAA_STORE = (() => {
  const tables = {
    users: [],
    projects: [],
    sujets: [],
    drives: [],
    videos: [],
    messages: [],
    projectMembers: [],
    bureau: [],
    settings: {}
  };
  let currentUser = null;
  let initialized = false;

  function client() {
    const supabaseClient = window.CIAA_BACKEND?.getClient();
    if (!supabaseClient) throw new Error("Le client Supabase n'est pas disponible.");
    return supabaseClient;
  }

  function reportError(error, context = "Supabase") {
    const message = error?.message || String(error);
    console.error(`[CIAA_STORE] ${context}:`, error);
    const showError = () => {
      let notice = document.getElementById("ciaa-supabase-error");
      if (!notice) {
        notice = document.createElement("p");
        notice.id = "ciaa-supabase-error";
        notice.setAttribute("role", "alert");
        notice.style.cssText = "margin:12px;padding:12px;border:1px solid #b42318;color:#b42318;background:#fff";
        document.body.prepend(notice);
      }
      notice.textContent = `${context} : ${message}`;
    };
    if (document.body) showError();
    else document.addEventListener("DOMContentLoaded", showError, { once: true });
  }

  async function result(query) {
    const { data, error } = await query;
    if (error) {
      reportError(error, "Échec d’une opération Supabase");
      throw error;
    }
    return data;
  }

  async function loadTable(name, query) {
    tables[name] = await result(query);
  }

  function mapProject(project, members = []) {
    return {
      ...project,
      team: members.filter(member => member.project_id === project.id)
        .map(({ name, linkedin }) => ({ name, linkedin })),
      tags: project.tags || []
    };
  }

  function mapUser(user) {
    return {
      ...user,
      imageUrl: user.image_url ?? user.imageUrl,
      driveAccess: user.drive_access ?? user.driveAccess,
      canAccessDashboard: user.can_access_dashboard ?? user.canAccessDashboard
    };
  }

  function mapSujet(sujet) {
    return {
      ...sujet,
      memberId: sujet.user_id,
      memberName: sujet.member_name,
      memberEmail: sujet.member_email,
      targetMaster: sujet.target_master,
      teamSize: sujet.team_size,
      technologies: sujet.technologies || [],
      imageUrl: sujet.image_url
    };
  }

  function mapDrive(drive) {
    return {
      ...drive,
      moduleName: drive.module_name,
      imageUrl: drive.image_url,
      driveCours: drive.drive_cours,
      driveTP: drive.drive_tp,
      driveTD: drive.drive_td,
      driveExamens: drive.drive_examens
    };
  }

  function mapVideo(video) {
    return {
      ...video,
      categoryName: video.category_name,
      youtubeId: video.youtube_id,
      youtubeUrl: video.youtube_url,
      imageUrl: video.image_url
    };
  }

  function mapMessage(message) {
    return {
      ...message,
      date: message.created_at,
      senderName: message.sender_name,
      senderEmail: message.sender_email,
      senderRole: message.sender_role,
      replyText: message.reply_content,
      replyDate: message.replied_at,
      replySender: message.replied_by
    };
  }

  function mapSettings(settings) {
    if (!settings) return {};
    return {
      clubName: settings.club_name,
      shortName: settings.short_name,
      faculty: settings.faculty,
      university: settings.university,
      email: settings.email,
      address: settings.address,
      description: settings.description,
      mission: settings.mission,
      linkedinUrl: settings.linkedin_url,
      youtubeUrl: settings.youtube_url,
      githubUrl: settings.github_url,
      discordUrl: settings.discord_url,
      instagramUrl: settings.instagram_url
    };
  }

  async function initialize() {
    if (initialized) return;
    const db = client();
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    const sessionUser = sessionData.session?.user;
    let profile = null;
    if (sessionUser) {
      const { data, error } = await db.from("users").select("*").eq("id", sessionUser.id).maybeSingle();
      if (error) throw error;
      profile = data;
      currentUser = profile ? mapUser(profile) : null;
    }

    const canManage = Boolean(profile && (
      ["admin", "president", "vice_president", "prof_encadrant"].includes(profile.role) ||
      profile.can_access_dashboard
    ));

    const queries = [
      loadTable("projects", db.from("projects").select("*").order("created_at", { ascending: false })),
      loadTable("projectMembers", db.from("project_members").select("*")),
      loadTable("sujets", db.from("sujets").select("*").order("created_at", { ascending: false })),
      loadTable("drives", db.from("drives").select("*").order("master").order("semestre")),
      loadTable("videos", db.from("videos").select("*").order("display_order").order("created_at")),
      loadTable("bureau", db.from("bureau_members").select("*").order("display_order")),
      loadTable("settings", db.from("site_settings").select("*").limit(1).maybeSingle())
    ];
    if (canManage) {
      queries.push(
        loadTable("users", db.from("users").select("*").order("created_at", { ascending: false })),
        loadTable("messages", db.from("messages").select("*").order("created_at", { ascending: false }))
      );
    } else {
      tables.users = profile ? [profile] : [];
      tables.messages = [];
    }
    await Promise.all(queries);

    initialized = true;
  }

  const ready = new Promise((resolve, reject) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initialize().then(resolve, reject), { once: true });
    } else {
      initialize().then(resolve, reject);
    }
  });
  ready.catch(error => {
    reportError(error, "Impossible d’initialiser les données Supabase");
  });

  async function insert(table, row) {
    const data = await result(client().from(table).insert(row).select().single());
    return data;
  }

  async function insertWithoutReturning(table, row) {
    const { error } = await client().from(table).insert(row);
    if (error) {
      reportError(error, "Échec d’une opération Supabase");
      throw error;
    }
  }

  async function update(table, id, changes) {
    return result(client().from(table).update(changes).eq("id", id).select().single());
  }

  async function remove(table, id) {
    await result(client().from(table).delete().eq("id", id));
  }

  function updateCachedUser(user) {
    const index = tables.users.findIndex(item => item.id === user.id);
    if (index < 0) tables.users.unshift(user);
    else tables.users[index] = user;
    if (currentUser?.id === user.id) currentUser = mapUser(user);
  }

  function extractYouTubeId(url) {
    const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : url;
  }

  return {
    ready,
    initialize,
    reportError,
    getCurrentUser: () => currentUser,
    setCurrentUser: user => { currentUser = user ? mapUser(user) : null; },
    logoutUser: async () => {
      const { error } = await client().auth.signOut();
      if (error) throw error;
      currentUser = null;
    },
    getSettings: () => mapSettings(tables.settings),
    saveSettings: async settings => {
      const fields = {
        club_name: settings.clubName,
        short_name: settings.shortName,
        faculty: settings.faculty,
        university: settings.university,
        email: settings.email,
        address: settings.address,
        description: settings.description,
        mission: settings.mission,
        linkedin_url: settings.linkedinUrl,
        youtube_url: settings.youtubeUrl,
        github_url: settings.githubUrl,
        discord_url: settings.discordUrl,
        instagram_url: settings.instagramUrl
      };
      const saved = tables.settings?.id
        ? await result(client().from("site_settings").update(fields).eq("id", tables.settings.id).select().single())
        : await result(client().from("site_settings").insert({ id: 1, ...fields }).select().single());
      tables.settings = saved;
      return mapSettings(saved);
    },
    getUsers: () => tables.users.map(mapUser),
    addUser: async user => {
      const saved = await insert("users", {
        id: user.id,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        master: user.master,
        role: user.role || "member",
        status: user.status || "pending",
        linkedin: user.linkedin || null,
        bio: user.bio || null,
        can_access_dashboard: Boolean(user.canAccessDashboard)
      });
      updateCachedUser(saved);
      return mapUser(saved);
    },
    updateUserStatus: async (id, status) => {
      const saved = await update("users", id, { status });
      updateCachedUser(saved);
      return tables.users;
    },
    updateUser: async (id, changes) => {
      const fields = {
        prenom: changes.prenom,
        nom: changes.nom,
        master: changes.master,
        linkedin: changes.linkedin,
        bio: changes.bio,
        image_url: changes.imageUrl,
        role: changes.role,
        status: changes.status,
        drive_access: changes.driveAccess,
        can_access_dashboard: changes.canAccessDashboard
      };
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);
      const saved = await update("users", id, fields);
      updateCachedUser(saved);
      return tables.users;
    },
    deleteUser: async id => {
      await remove("users", id);
      tables.users = tables.users.filter(user => user.id !== id);
      return tables.users;
    },
    getProjects: () => tables.projects.map(project => mapProject(project, tables.projectMembers)),
    addProject: async project => {
      const saved = await insert("projects", {
        title: project.title,
        category: project.category || "ml",
        description: project.description,
        link: project.link || null,
        image_url: project.image_url || null,
        tags: project.tags || [],
        state: project.state ?? 0,
        featured: Boolean(project.featured),
        submitted_by: project.submitted_by || currentUser?.id || null
      });
      const team = project.team || [];
      if (team.length) {
        const members = await result(client().from("project_members").insert(team.map(member => ({
          project_id: saved.id,
          name: member.name || member,
          linkedin: member.linkedin || null
        }))).select());
        tables.projectMembers.push(...members);
        saved.team = members;
      } else saved.team = [];
      tables.projects.unshift(saved);
      return mapProject(saved, tables.projectMembers);
    },
    updateProject: async (id, changes) => {
      const fields = {
        title: changes.title,
        description: changes.description,
        link: changes.link,
        image_url: changes.image_url,
        category: changes.category,
        tags: changes.tags,
        state: changes.state,
        featured: changes.featured
      };
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);
      const saved = await update("projects", id, fields);
      if (changes.team) {
        await result(client().from("project_members").delete().eq("project_id", id));
        const team = changes.team.filter(member => member.name);
        const members = team.length
          ? await result(client().from("project_members").insert(team.map(member => ({
              project_id: id,
              name: member.name,
              linkedin: member.linkedin || null
            }))).select())
          : [];
        tables.projectMembers = tables.projectMembers.filter(member => member.project_id !== id).concat(members);
      }
      tables.projects = tables.projects.map(project => project.id === id ? saved : project);
      return CIAA_STORE.getProjects();
    },
    toggleProjectFeatured: async id => {
      const project = tables.projects.find(item => item.id === id);
      if (!project) throw new Error("Projet introuvable.");
      return CIAA_STORE.updateProject(id, { featured: !project.featured });
    },
    setProjectState: async (id, state) => CIAA_STORE.updateProject(id, { state }),
    deleteProject: async id => {
      await remove("projects", id);
      tables.projects = tables.projects.filter(project => project.id !== id);
      tables.projectMembers = tables.projectMembers.filter(member => member.project_id !== id);
      return CIAA_STORE.getProjects();
    },
    getSujets: () => tables.sujets.map(mapSujet),
    addSujet: async sujet => {
		console.log(sujet)
      const row = {
        user_id: currentUser?.id || null,
        member_name: sujet.memberName || sujet.member_name,
        member_email: sujet.memberEmail || sujet.member_email || null,
        title: sujet.title,
        category: sujet.category || "cv",
        target_master: sujet.targetMaster || sujet.target_master || "SDSI & MIATE",
        team_size: sujet.teamSize || sujet.team_size || null,
        technologies: sujet.technologies || [],
        description: sujet.description,
        image_url: sujet.imageUrl || sujet.image_url || null,
        status: sujet.status || "pending"
      };
      if (!currentUser) {
        await insertWithoutReturning("sujets", row);
        return;
      }
      const saved = await insert("sujets", row);
      tables.sujets.unshift(saved);
      return mapSujet(saved);
    },
    setSujetStatus: async (id, status) => {
      const saved = await update("sujets", id, { status });
      tables.sujets = tables.sujets.map(sujet => sujet.id === id ? saved : sujet);
      return CIAA_STORE.getSujets();
    },
    updateSujet: async (id, changes) => {
      const fields = {
        title: changes.title,
        category: changes.category,
        description: changes.description,
        status: changes.status,
        target_master: changes.targetMaster,
        team_size: changes.teamSize,
        technologies: changes.technologies,
        image_url: changes.imageUrl
      };
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);
      const saved = await update("sujets", id, fields);
      tables.sujets = tables.sujets.map(sujet => sujet.id === id ? saved : sujet);
      return CIAA_STORE.getSujets();
    },
    deleteSujet: async id => {
      await remove("sujets", id);
      tables.sujets = tables.sujets.filter(sujet => sujet.id !== id);
      return CIAA_STORE.getSujets();
    },
    getDrives: () => tables.drives.map(mapDrive),
    addDrive: async drive => {
      const saved = await insert("drives", {
        master: drive.master,
        semestre: String(drive.semestre).toLowerCase(),
        module_name: drive.moduleName || drive.module_name,
        description: drive.description || null,
        image_url: drive.imageUrl || drive.image_url || null,
        drive_cours: drive.driveCours || drive.drive_cours,
        drive_tp: drive.driveTP || drive.drive_tp,
        drive_td: drive.driveTD || drive.drive_td,
        drive_examens: drive.driveExamens || drive.drive_examens
      });
      tables.drives.unshift(saved);
      return mapDrive(saved);
    },
    updateDrive: async (id, changes) => {
      const fields = {
        master: changes.master,
        semestre: changes.semestre,
        module_name: changes.moduleName,
        description: changes.description,
        image_url: changes.imageUrl,
        drive_cours: changes.driveCours,
        drive_tp: changes.driveTP,
        drive_td: changes.driveTD,
        drive_examens: changes.driveExamens
      };
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);
      const saved = await update("drives", id, fields);
      tables.drives = tables.drives.map(drive => drive.id === id ? saved : drive);
      return CIAA_STORE.getDrives();
    },
    deleteDrive: async id => {
      await remove("drives", id);
      tables.drives = tables.drives.filter(drive => drive.id !== id);
      return CIAA_STORE.getDrives();
    },
    getVideos: () => tables.videos.map(mapVideo),
    addVideo: async video => {
      const youtubeUrl = video.youtubeUrl || video.youtube_url || "";
      const saved = await insert("videos", {
        title: video.title,
        track: video.track || "ml",
        category_name: video.categoryName || video.category_name || "Machine Learning",
        youtube_id: extractYouTubeId(youtubeUrl || video.youtubeId),
        youtube_url: youtubeUrl || null,
        duration: video.duration || null,
        instructor: video.instructor || null,
        description: video.description || null,
        image_url: video.imageUrl || video.image_url || null
      });
      tables.videos.unshift(saved);
      return mapVideo(saved);
    },
    updateVideo: async (id, changes) => {
      const fields = {
        title: changes.title,
        track: changes.track,
        category_name: changes.categoryName,
        youtube_url: changes.youtubeUrl,
        youtube_id: changes.youtubeUrl ? extractYouTubeId(changes.youtubeUrl) : undefined,
        duration: changes.duration,
        instructor: changes.instructor,
        description: changes.description,
        image_url: changes.imageUrl
      };
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);
      const saved = await update("videos", id, fields);
      tables.videos = tables.videos.map(video => video.id === id ? saved : video);
      return CIAA_STORE.getVideos();
    },
    deleteVideo: async id => {
      await remove("videos", id);
      tables.videos = tables.videos.filter(video => video.id !== id);
      return CIAA_STORE.getVideos();
    },
    getMessages: () => tables.messages.map(mapMessage),
    addMessage: async message => {
      await insertWithoutReturning("messages", {
        sender_name: message.senderName,
        sender_email: message.senderEmail,
        sender_role: message.senderRole || null,
        subject: message.subject,
        message: message.message,
        status: "unread"
      });
    },
    markMessageRead: async id => {
      const saved = await update("messages", id, { status: "read" });
      tables.messages = tables.messages.map(message => message.id === id ? saved : message);
      return CIAA_STORE.getMessages();
    },
    replyMessage: async (id, replyText, senderName) => {
      const saved = await update("messages", id, {
        status: "replied",
        reply_content: replyText,
        replied_at: new Date().toISOString(),
        replied_by: currentUser?.id || null
      });
      tables.messages = tables.messages.map(message => message.id === id ? saved : message);
      return CIAA_STORE.getMessages();
    },
    deleteMessage: async id => {
      await remove("messages", id);
      tables.messages = tables.messages.filter(message => message.id !== id);
      return CIAA_STORE.getMessages();
    },
    getBureauMembers: () => tables.bureau.map(member => ({
      ...member,
      roleKey: member.role_key,
      roleLabel: member.role_label,
      canAccessDashboard: member.can_access_dashboard
    })),
    updateBureauMember: async (id, changes) => {
      const fields = {
        prenom: changes.prenom,
        nom: changes.nom,
        role_key: changes.roleKey,
        role_label: changes.roleLabel,
        category: changes.category,
        affiliation: changes.affiliation,
        email: changes.email,
        linkedin: changes.linkedin,
        description: changes.description,
        can_access_dashboard: changes.canAccessDashboard,
        display_order: changes.displayOrder
      };
      Object.keys(fields).forEach(key => fields[key] === undefined && delete fields[key]);
      const saved = await update("bureau_members", id, fields);
      tables.bureau = tables.bureau.map(member => member.id === id ? saved : member);
      return CIAA_STORE.getBureauMembers();
    },
    addBureauMember: async member => {
      const saved = await insert("bureau_members", {
        prenom: member.prenom,
        nom: member.nom,
        role_key: member.roleKey || `${member.category || "bureau"}_${Date.now()}`,
        role_label: member.roleLabel,
        category: member.category || "bureau",
        affiliation: member.affiliation,
        email: member.email,
        linkedin: member.linkedin || null,
        description: member.description || null,
        can_access_dashboard: Boolean(member.canAccessDashboard),
        display_order: tables.bureau.length + 1
      });
      tables.bureau.push(saved);
      return saved;
    },
    deleteBureauMember: async id => {
      await remove("bureau_members", id);
      tables.bureau = tables.bureau.filter(member => member.id !== id);
      return CIAA_STORE.getBureauMembers();
    },
    hasDashboardAccess: user => Boolean(user && (
      user.role === "admin" ||
      ["president", "vice_president", "prof_encadrant"].includes(user.role) ||
      user.can_access_dashboard === true ||
      user.canAccessDashboard === true ||
      CIAA_STORE.getBureauMembers().some(member =>
        member.canAccessDashboard &&
        ((member.email && member.email.toLowerCase() === user.email?.toLowerCase()) ||
          (member.prenom?.toLowerCase() === user.prenom?.toLowerCase() &&
            member.nom?.toLowerCase() === user.nom?.toLowerCase()))
      )
    )),
    syncNavigation: () => {
      const hasDash = CIAA_STORE.hasDashboardAccess(currentUser);
      const profilePage = window.location.pathname.endsWith("profile.html");
      const toggles = (selector, visible) => document.querySelectorAll(selector).forEach(element => {
        element.hidden = !visible;
        element.style.display = visible ? "inline-flex" : "none";
      });
      toggles("#login-link, .nav-login-link", !currentUser);
      toggles("#signup-link, .nav-signup-link", !currentUser);
      toggles("#profile-link, .nav-profile-link", Boolean(currentUser));
      document.querySelectorAll("#profile-link, .nav-profile-link").forEach(link => {
        const avatar = link.querySelector(".nav-profile-avatar");
        const initials = link.querySelector(".nav-profile-avatar-initials");
        if (avatar) {
          avatar.hidden = !currentUser?.imageUrl;
          if (currentUser?.imageUrl) avatar.src = currentUser.imageUrl;
          else avatar.removeAttribute("src");
        }
        if (initials) {
          initials.hidden = Boolean(currentUser?.imageUrl);
          initials.textContent = currentUser
            ? `${currentUser.prenom?.[0] || "U"}${currentUser.nom?.[0] || "S"}`
            : "";
        }
        if (avatar) {
          avatar.onerror = () => {
            avatar.hidden = true;
            if (initials) initials.hidden = false;
          };
        }
      });
      toggles("#dash-link, .nav-dash-link", Boolean(currentUser && hasDash));
      toggles("#logout-btn, .nav-logout-btn", Boolean(currentUser && !hasDash));
      if (profilePage) toggles("#profile-logout-btn, #btn-hero-logout", Boolean(currentUser));
      document.querySelectorAll("#logout-btn, .nav-logout-btn, #profile-logout-btn, #btn-hero-logout").forEach(button => {
        if (button.dataset.boundLogout) return;
        button.dataset.boundLogout = "true";
        button.addEventListener("click", async event => {
          event.preventDefault();
          const confirmed = typeof ciaaConfirm === "function"
            ? await ciaaConfirm("Êtes-vous sûr de vouloir vous déconnecter de votre compte ?", "Déconnexion")
            : confirm("Voulez-vous vous déconnecter ?");
          if (!confirmed) return;
          await CIAA_STORE.logoutUser();
          window.location.replace("index.html");
        });
      });
    },
    extractYouTubeId
  };
})();
