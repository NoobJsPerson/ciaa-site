// ==============================================================================
// Supabase client, connection status and public data operations.
// Club d'Intelligence Artificielle et ses Applications (CIAA - FSAN NADOR)
// ==============================================================================

const CIAA_BACKEND = (() => {
  // Clés de stockage pour la configuration personnalisée
  const STORAGE_KEYS = {
    URL: 'ciaa_supabase_url',
    KEY: 'ciaa_supabase_anon_key'
  };

  // Valeurs par défaut (modifiables directement depuis le Dashboard ou via l'UI)
  const DEFAULT_CONFIG = {
    url: 'https://zfzsupjgbqawmyfspzix.supabase.co',
    anonKey: 'sb_publishable_scfiWizhW3RlglwiLSlb1A_Xu_YqxAR'
  };

  let clientInstance = null;
  let connectionState = {
    connected: false,
    latencyMs: 0,
    lastChecked: null,
    mode: 'disconnected',
    statusText: 'Initialisation…',
    tableCounts: {
      users: 0,
      projects: 0,
      sujets: 0,
      drives: 0,
      videos: 0,
      messages: 0
    }
  };

  const listeners = [];

  // Récupérer la configuration courante
  function getConfig() {
    return {
      url: localStorage.getItem(STORAGE_KEYS.URL) || DEFAULT_CONFIG.url,
      anonKey: localStorage.getItem(STORAGE_KEYS.KEY) || DEFAULT_CONFIG.anonKey
    };
  }

  // Sauvegarder une nouvelle configuration
  function saveConfig(url, anonKey) {
    if (url) localStorage.setItem(STORAGE_KEYS.URL, url.trim().replace(/\/$/, ''));
    if (anonKey) localStorage.setItem(STORAGE_KEYS.KEY, anonKey.trim());
    clientInstance = null; // Réinitialiser le client
    return testConnection();
  }

  // Obtenir le client Supabase JS
  function getClient() {
    if (clientInstance) return clientInstance;
    const config = getConfig();

    if (typeof window.supabase !== 'undefined' && config.url && config.anonKey) {
      try {
        clientInstance = window.supabase.createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        return clientInstance;
      } catch (err) {
        console.warn("[CIAA_BACKEND] Erreur d'initialisation du client Supabase :", err);
      }
    }
    return null;
  }

  // Tester la connexion et calculer la latence vers Supabase
  async function testConnection() {
    const config = getConfig();
    const startTime = performance.now();
    const client = getClient();

    if (!client) {
      connectionState.connected = false;
      connectionState.mode = 'disconnected';
      connectionState.latencyMs = 0;
      connectionState.statusText = 'Client Supabase JS indisponible';
      notifyListeners();
      return connectionState;
    }

    try {
      // Test de requête légère sur la table projects ou site_settings
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      const { error } = await client
        .from('site_settings')
        .select('*', { count: 'exact', head: true })
        .abortSignal(controller.signal);
      window.clearTimeout(timeout);

      const endTime = performance.now();
      connectionState.latencyMs = Math.round(endTime - startTime);
      connectionState.lastChecked = new Date().toISOString();

      if (error && error.code !== 'PGRST116') {
        // La requête a échoué (ex: mauvaise clé, table non créée ou hors-ligne)
        connectionState.connected = false;
        connectionState.mode = 'disconnected';
        connectionState.statusText = `Erreur Supabase : ${error.message || 'Table non trouvée'}`;
      } else {
        connectionState.connected = true;
        connectionState.mode = 'cloud';
        connectionState.statusText = `Connecté au Cloud Supabase (${connectionState.latencyMs} ms)`;
        
        // Charger les comptages des tables
        await refreshTableCounts();
      }
    } catch (e) {
      connectionState.connected = false;
      connectionState.mode = 'disconnected';
      connectionState.latencyMs = 0;
      connectionState.statusText = 'Supabase est inaccessible';
    }

    notifyListeners();
    return connectionState;
  }

  // Récupérer le nombre de lignes dans chaque table Supabase
  async function refreshTableCounts() {
    const client = getClient();
    if (!client || !connectionState.connected) return;

    try {
      const [u, p, s, d, v, m] = await Promise.allSettled([
        client.from('users').select('*', { count: 'exact', head: true }),
        client.from('projects').select('*', { count: 'exact', head: true }),
        client.from('sujets').select('*', { count: 'exact', head: true }),
        client.from('drives').select('*', { count: 'exact', head: true }),
        client.from('videos').select('*', { count: 'exact', head: true }),
        client.from('messages').select('*', { count: 'exact', head: true })
      ]);

      connectionState.tableCounts = {
        users: u.status === 'fulfilled' && !u.value.error ? (u.value.count || 0) : 0,
        projects: p.status === 'fulfilled' && !p.value.error ? (p.value.count || 0) : 0,
        sujets: s.status === 'fulfilled' && !s.value.error ? (s.value.count || 0) : 0,
        drives: d.status === 'fulfilled' && !d.value.error ? (d.value.count || 0) : 0,
        videos: v.status === 'fulfilled' && !v.value.error ? (v.value.count || 0) : 0,
        messages: m.status === 'fulfilled' && !m.value.error ? (m.value.count || 0) : 0
      };
    } catch (err) {
      console.warn("[CIAA_BACKEND] Erreur lors du comptage des tables :", err);
    }
  }

  // Notifier les éléments front-end sensibles à l'état du backend
  function notifyListeners() {
    listeners.forEach(fn => {
      try { fn(connectionState); } catch (e) { console.error(e); }
    });
    updatePillElements();
  }

  function onStateChange(fn) {
    if (typeof fn === 'function') {
      listeners.push(fn);
      fn(connectionState);
    }
  }

  // Mettre à jour les badges de statut backend présents sur le site
  function updatePillElements() {
    const pills = document.querySelectorAll('.backend-status-pill');
    pills.forEach(pill => {
      if (connectionState.connected) {
        pill.className = 'backend-status-pill online';
        pill.innerHTML = `<span class="dot"></span> <strong>Supabase Cloud</strong> (${connectionState.latencyMs} ms)`;
        pill.title = `Connecté à PostgreSQL Supabase · Latence : ${connectionState.latencyMs} ms`;
      } else {
        pill.className = 'backend-status-pill offline';
        pill.innerHTML = `<span class="dot"></span> <strong>Supabase indisponible</strong>`;
        pill.title = connectionState.statusText;
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Public data operations. Database errors are returned to the caller.
  // ----------------------------------------------------------------------------

  // 1. Projets
  async function getProjects(filterState = 1) {
    const client = getClient();
    if (client) {
        let query = client.from('projects').select('*, project_members(name, linkedin)');
        if (filterState !== null && filterState !== undefined) {
          query = query.eq('state', filterState);
        }
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(p => ({
            id: p.id,
            title: p.title,
            category: p.category,
            description: p.description,
            link: p.link,
            image_url: p.image_url,
            tags: p.tags || [],
            state: p.state,
            featured: Boolean(p.featured),
            team: (p.project_members || []).map(m => ({ name: m.name, linkedin: m.linkedin })),
            created_at: p.created_at
          }));
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  async function getTop3Projects() {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('v_top3_projects')
          .select('*')
          .limit(3);

        if (error) throw error;
        return (data || []).map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            link: p.link,
            image_url: p.image_url,
            tags: p.tags || [],
            featured: p.featured,
            team: p.team_members || []
          }));
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  async function createProject(projectData) {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('projects')
          .insert({
            title: projectData.title,
            description: projectData.description,
            link: projectData.link,
            image_url: projectData.image_url,
            category: projectData.category || 'ml',
            state: projectData.state !== undefined ? projectData.state : 0,
            featured: Boolean(projectData.featured)
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          // Insérer les membres
          const team = projectData.team || [];
          if (team.length > 0) {
            const memberRows = team.map(m => ({
              project_id: data.id,
              name: m.name || m,
              linkedin: m.linkedin || null
            }));
            const { error: memberError } = await client.from('project_members').insert(memberRows);
            if (memberError) throw memberError;
          }
          return { ...data, team };
        }
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  // 2. Utilisateurs
  async function getUsers() {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  async function registerUser(userData) {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('users')
          .insert({
            email: userData.email,
            prenom: userData.prenom,
            nom: userData.nom,
            master: userData.master || 'Master SDSI (S1)',
            role: userData.role || 'member',
            status: userData.status || 'pending',
            linkedin: userData.linkedin || null,
            bio: userData.bio || null,
            can_access_dashboard: Boolean(userData.canAccessDashboard)
          })
          .select()
          .single();

        if (error) throw error;
        return data;
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  // 3. Sujets de Projets
  async function getSujets() {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('sujets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  async function createSujet(sujetData) {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('sujets')
          .insert({
            title: sujetData.title,
            member_name: sujetData.memberName,
            member_email: sujetData.memberEmail,
            category: sujetData.category || 'cv',
            target_master: sujetData.targetMaster || 'Master SDSI',
            team_size: sujetData.teamSize || '2 à 3 étudiants',
            technologies: sujetData.technologies || [],
            description: sujetData.description,
            image_url: sujetData.imageUrl || null,
            status: sujetData.status || 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  // 4. Dossiers Drive
  async function getDrives() {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('drives')
          .select('*')
          .order('master')
          .order('semestre');

        if (error) throw error;
        return data || [];
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  // 5. Messages & Contact
  async function sendMessage(msgData) {
    const client = getClient();
    if (client) {
        const { data, error } = await client
          .from('messages')
          .insert({
            sender_name: msgData.senderName,
            sender_email: msgData.senderEmail,
            sender_role: msgData.senderRole || 'Visiteur FSAN',
            subject: msgData.subject,
            message: msgData.message,
            status: 'unread'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
    }
    throw new Error("Le client Supabase n'est pas disponible.");
  }

  // Initialisation automatique au chargement du DOM
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      // Tester immédiatement la connexion
      testConnection();
    });
  }

  return {
    getConfig,
    saveConfig,
    getClient,
    testConnection,
    getState: () => ({ ...connectionState }),
    onStateChange,
    // Services de données
    getProjects,
    getTop3Projects,
    createProject,
    getUsers,
    registerUser,
    getSujets,
    createSujet,
    getDrives,
    sendMessage
  };
})();
window.CIAA_BACKEND = CIAA_BACKEND