-- ==============================================================================
-- BASE DE DONNÉES OFFICIELLE : CLUB IA & APPLICATIONS (CIAA - FSAN NADOR)
-- Faculté des Sciences Appliquées de Nador · Université Mohammed Premier (UMP)
-- Plateforme Web Masters SDSI (Science des Données & SI) & MIATE (IA & Tech Émergentes)
-- Compatibilité : PostgreSQL 15+ / Supabase (Version Gratuite / Free Tier)
-- ==============================================================================

-- 1. EXTENSIONS POSTGRESQL NÉCESSAIRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. SUPPRESSION PRÉALABLE DES TABLES SI EXISTANTES (ORDRE DE DÉPENDANCE)
DROP VIEW IF EXISTS v_dashboard_kpis CASCADE;
DROP VIEW IF EXISTS v_top3_projects CASCADE;
DROP VIEW IF EXISTS v_approved_projects CASCADE;
DROP VIEW IF EXISTS v_bureau_official CASCADE;
DROP VIEW IF EXISTS v_semester_drives CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS drive_authorizations CASCADE;
DROP TABLE IF EXISTS drives CASCADE;
DROP TABLE IF EXISTS sujets CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS bureau_members CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------------------------
-- 3. CRÉATION DES TABLES ET CONTRAINTES D'INTÉGRITÉ
-- ------------------------------------------------------------------------------

-- 3.1 TABLE : USERS (Comptes Étudiants, Bureau et Administrateurs)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    master VARCHAR(100) NOT NULL DEFAULT 'Master SDSI (S1)',
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    linkedin VARCHAR(255),
    bio TEXT,
    image_url TEXT,
    drive_access BOOLEAN NOT NULL DEFAULT FALSE,
    can_access_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contraintes de validation
    CONSTRAINT chk_user_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_user_role CHECK (role IN ('member', 'president', 'vice_president', 'prof_encadrant', 'admin')),
    CONSTRAINT chk_user_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

COMMENT ON TABLE users IS 'Stocke tous les comptes utilisateurs avec leur statut d approbations et leurs privilèges';

-- 3.2 TABLE : BUREAU_MEMBERS (Les 8 Rôles Officiels du Club et Encadrants FSAN)
CREATE TABLE bureau_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    role_key VARCHAR(50) NOT NULL UNIQUE,
    role_label VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'bureau',
    affiliation VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    linkedin VARCHAR(255),
    description TEXT,
    can_access_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_bureau_category CHECK (category IN ('bureau', 'encadrant'))
);

COMMENT ON TABLE bureau_members IS 'Membres du bureau exécutif étudiant et professeurs encadrants FSAN répercutés sur l accueil et à propos';

-- 3.3 TABLE : PROJECTS (Projets IA, Code Source, Modération & Top 3 Accueil)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'ml',
    description TEXT NOT NULL,
    link VARCHAR(500),
    image_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    state INT NOT NULL DEFAULT 0, -- 0: En attente, 1: Validé & Publié, -1: Rejeté
    featured BOOLEAN NOT NULL DEFAULT FALSE, -- Sélection Top 3 Accueil
    views_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	image_url character varying null,

    CONSTRAINT chk_project_state CHECK (state IN (-1, 0, 1)),
    CONSTRAINT chk_project_category CHECK (category IN ('ml', 'dl', 'cv', 'nlp', 'robotics', 'edge_ai', 'data'))
);

COMMENT ON TABLE projects IS 'Projets IA réalisés par les étudiants. Les projets validés (state=1) et featured (Top 3) s affichent en page d accueil';

-- 3.4 TABLE : PROJECT_MEMBERS (Membres de l'Équipe pour chaque Projet - Relation 1:N / N:M)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    linkedin VARCHAR(255),
    role_in_team VARCHAR(100) DEFAULT 'Développeur / Chercheur IA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_members IS 'Noms et profils LinkedIn des étudiants ayant contribué au projet';

-- 3.5 TABLE : SUJETS (Propositions de Sujets de Projets par les Étudiants / Bureau)
CREATE TABLE sujets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_name VARCHAR(150) NOT NULL,
    member_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'cv',
    target_master VARCHAR(100) NOT NULL DEFAULT 'Master SDSI',
    team_size VARCHAR(50) DEFAULT '2 à 3 étudiants',
    technologies TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT NOT NULL,
    image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, in_progress, completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_sujet_status CHECK (status IN ('pending', 'approved', 'in_progress', 'completed')),
    CONSTRAINT chk_sujet_master CHECK (target_master IN ('SDSI', 'MIATE', 'SDSI & MIATE'))
);

COMMENT ON TABLE sujets IS 'Sujets de recherche et projets proposés par les membres nécessitant validation admin avant affichage';

-- 3.6 TABLE : DRIVES (Ressources Pédagogiques Google Drive par Module & Semestre)
CREATE TABLE drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master VARCHAR(50) NOT NULL, -- SDSI ou MIATE
    semestre VARCHAR(10) NOT NULL, -- s1, s2, s3
    module_name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    drive_cours VARCHAR(500) NOT NULL,
    drive_tp VARCHAR(500) NOT NULL,
    drive_td VARCHAR(500) NOT NULL,
    drive_examens VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_drive_master CHECK (master IN ('SDSI', 'MIATE')),
    CONSTRAINT chk_drive_semestre CHECK (semestre IN ('s1', 's2', 's3'))
);

COMMENT ON TABLE drives IS 'Liens Google Drive classés en 4 sous-dossiers (Cours, TP, TD, Examens) par module et semestre';

-- 3.7 TABLE : DRIVE_AUTHORIZATIONS (Autorisation d'accès Drive par Email Académique @ump.ac.ma)
CREATE TABLE drive_authorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_email VARCHAR(255) NOT NULL,
    access_status VARCHAR(50) NOT NULL DEFAULT 'granted', -- granted, pending, revoked
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_academic_email CHECK (academic_email ~* '^[A-Za-z0-9._%+-]+@ump\.ac\.ma$'),
    CONSTRAINT chk_auth_status CHECK (access_status IN ('granted', 'pending', 'revoked'))
);

COMMENT ON TABLE drive_authorizations IS 'Contrôle direct de l accès sécurisé des étudiants inscrits aux ressources Drive via leur email institutionnel';

-- 3.8 TABLE : VIDEOS (Catalogue E-Learning de Vidéos YouTube)
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    track VARCHAR(50) NOT NULL DEFAULT 'ml',
    category_name VARCHAR(150) NOT NULL,
    youtube_id VARCHAR(50) NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    duration VARCHAR(50),
    instructor VARCHAR(150),
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_video_track CHECK (track IN ('ml', 'dl', 'nlp', 'python', 'robotics'))
);

COMMENT ON TABLE videos IS 'Catalogue Supabase des vidéos de cours en ligne, classées par parcours';

-- 3.9 TABLE : MESSAGES (Boîte de Réception et Réponses Email Intégrées)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_name VARCHAR(150) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_role VARCHAR(150) DEFAULT 'Étudiant FSAN',
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unread', -- unread, read, replied
    reply_content TEXT,
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_message_status CHECK (status IN ('unread', 'read', 'replied'))
);

COMMENT ON TABLE messages IS 'Demandes, candidatures et emails envoyés par les membres ou partenaires avec réponse directe';

-- 3.10 TABLE : SITE_SETTINGS (Paramètres Généraux, Description & Réseaux Sociaux)
CREATE TABLE site_settings (
    id INT PRIMARY KEY DEFAULT 1,
    club_name VARCHAR(255) NOT NULL DEFAULT 'Club d''Intelligence Artificielle et ses Applications',
    short_name VARCHAR(50) NOT NULL DEFAULT 'CIAA',
    faculty VARCHAR(255) NOT NULL DEFAULT 'Faculté des Sciences Appliquées de Nador (FSAN)',
    university VARCHAR(255) NOT NULL DEFAULT 'Université Mohammed Premier (UMP)',
    email VARCHAR(255) NOT NULL DEFAULT 'contact.ciaa.fsan@gmail.com',
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    mission TEXT NOT NULL,
    linkedin_url VARCHAR(500),
    youtube_url VARCHAR(500),
    github_url VARCHAR(500),
    discord_url VARCHAR(500),
    instagram_url VARCHAR(500),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT single_row_config CHECK (id = 1)
);

COMMENT ON TABLE site_settings IS 'Configuration singleton des métadonnées du club et des canaux officiels modifiables via le dashboard';

-- 3.11 TABLE : AUDIT_LOGS (Historique des Actions Administrateur)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Journalisation de sécurité pour chaque validation de compte, modération de projet ou modification critique';

-- ------------------------------------------------------------------------------
-- 4. CRÉATION DES INDEX ESSENTIELS POUR HAUTE PERFORMANCE
-- ------------------------------------------------------------------------------

-- 4.1 Index B-Tree standards sur les clés étrangères et colonnes de filtres
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_projects_state ON projects(state);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_submitted_by ON projects(submitted_by);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);

CREATE INDEX idx_sujets_status ON sujets(status);
CREATE INDEX idx_sujets_target_master ON sujets(target_master);

CREATE INDEX idx_drives_master_semestre ON drives(master, semestre);
CREATE INDEX idx_drive_auth_email ON drive_authorizations(academic_email);
CREATE INDEX idx_videos_track ON videos(track);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- 4.2 Index Composites pour optimiser les requêtes fréquentes
CREATE INDEX idx_projects_state_created ON projects(state, created_at DESC);
CREATE INDEX idx_sujets_status_created ON sujets(status, created_at DESC);
CREATE INDEX idx_bureau_order ON bureau_members(display_order ASC, category);

-- 4.3 Index Partiel Optimisé : Spécifique au Top 3 des Meilleurs Projets
-- Permet une sélection instantanée des projets en vedette sur la page d'accueil sans scanner la table
CREATE INDEX idx_projects_top3 ON projects(featured, created_at DESC) WHERE state = 1 AND featured = TRUE;

-- 4.4 Index GIN et Trigrammes pour Recherche Textuelle Floue Rapide
CREATE INDEX idx_projects_title_trgm ON projects USING gin (title gin_trgm_ops);
CREATE INDEX idx_sujets_title_trgm ON sujets USING gin (title gin_trgm_ops);
CREATE INDEX idx_drives_module_trgm ON drives USING gin (module_name gin_trgm_ops);
CREATE INDEX idx_users_names_trgm ON users USING gin ((prenom || ' ' || nom) gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 5. CRÉATION DES VUES SQL (VIEWS) POUR LE FRONT-END ET LE DASHBOARD
-- ------------------------------------------------------------------------------

-- 5.1 VUE : TOP 3 MEILLEURS PROJETS DE LA PAGE D'ACCUEIL
CREATE OR REPLACE VIEW v_top3_projects AS
SELECT 
    p.id,
    p.title,
    p.category,
    p.description,
    p.link,
    p.image_url,
    p.tags,
    p.featured,
    p.created_at,
    COALESCE(
        json_agg(
            json_build_object('name', pm.name, 'linkedin', pm.linkedin)
        ) FILTER (WHERE pm.name IS NOT NULL),
        '[]'::json
    ) AS team_members
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
WHERE p.state = 1
GROUP BY p.id
ORDER BY p.featured DESC, p.created_at DESC
LIMIT 3;

COMMENT ON VIEW v_top3_projects IS 'Renvoie exactement les 3 meilleurs projets validés pour la page d accueil (index.html)';

-- 5.2 VUE : TOUS LES PROJETS VALIDÉS AVEC LEURS ÉQUIPES (GALERIE PUBLIQUE)
CREATE OR REPLACE VIEW v_approved_projects AS
SELECT 
    p.id,
    p.title,
    p.category,
    p.description,
    p.link,
    p.image_url,
    p.tags,
    p.featured,
    p.views_count,
    p.created_at,
    COALESCE(
        json_agg(
            json_build_object('id', pm.id, 'name', pm.name, 'linkedin', pm.linkedin, 'role', pm.role_in_team)
        ) FILTER (WHERE pm.id IS NOT NULL),
        '[]'::json
    ) AS team
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
WHERE p.state = 1
GROUP BY p.id
ORDER BY p.featured DESC, p.created_at DESC;

COMMENT ON VIEW v_approved_projects IS 'Vue publique pour la page projects.html affichant tous les projets validés avec leurs équipes';

-- 5.3 VUE : MEMBRES DU BUREAU ET ENCADRANTS OFFICIELS
CREATE OR REPLACE VIEW v_bureau_official AS
SELECT 
    bm.id,
    bm.prenom,
    bm.nom,
    bm.role_key,
    bm.role_label,
    bm.category,
    bm.affiliation,
    bm.email,
    bm.linkedin,
    bm.description,
    bm.can_access_dashboard,
    bm.display_order
FROM bureau_members bm
ORDER BY bm.display_order ASC;

COMMENT ON VIEW v_bureau_official IS 'Vue structurée des 8 membres du bureau et encadrants triés selon l ordre officiel';

-- 5.4 VUE : RESSOURCES DRIVE ORGANISÉES PAR SEMESTRE
CREATE OR REPLACE VIEW v_semester_drives AS
SELECT 
    d.id,
    d.master,
    d.semestre,
    UPPER(d.semestre) AS semestre_label,
    d.module_name,
    d.description,
    d.image_url,
    d.drive_cours,
    d.drive_tp,
    d.drive_td,
    d.drive_examens,
    d.created_at
FROM drives d
ORDER BY d.master, d.semestre, d.module_name;

COMMENT ON VIEW v_semester_drives IS 'Synthèse ordonnée des modules Drive pour la page apprendre.html';

-- 5.5 VUE : COMPTEURS & KPIS GLOBAUX DU DASHBOARD (Une seule requête ultra-rapide)
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'pending') AS pending_users,
    (SELECT COUNT(*) FROM projects) AS total_projects,
    (SELECT COUNT(*) FROM projects WHERE state = 0) AS pending_projects,
    (SELECT COUNT(*) FROM sujets) AS total_sujets,
    (SELECT COUNT(*) FROM sujets WHERE status = 'pending') AS pending_sujets,
    (SELECT COUNT(*) FROM drives) AS total_drives,
    (SELECT COUNT(*) FROM videos) AS total_videos,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM messages WHERE status = 'unread') AS unread_messages;

COMMENT ON VIEW v_dashboard_kpis IS 'Agrégation en temps réel de tous les indicateurs clés pour l en-tête du Dashboard';

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS & FONCTIONS DÉCLENCHEURS (AUTOMATISATION & INTÉGRITÉ)
-- ------------------------------------------------------------------------------

-- 6.1 Trigger Universel pour actualiser updated_at
CREATE OR REPLACE FUNCTION fn_trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_timestamp();

CREATE TRIGGER trg_bureau_updated
BEFORE UPDATE ON bureau_members
FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_timestamp();

CREATE TRIGGER trg_projects_updated
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_timestamp();

CREATE TRIGGER trg_sujets_updated
BEFORE UPDATE ON sujets
FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_timestamp();

CREATE TRIGGER trg_drives_updated
BEFORE UPDATE ON drives
FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_timestamp();

CREATE TRIGGER trg_videos_updated
BEFORE UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION fn_trigger_set_timestamp();

-- 6.2 Trigger d'Intégrité Métier : Limiter le Top 3 d'accueil à 3 projets maximum
CREATE OR REPLACE FUNCTION fn_check_top3_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_featured_count INT;
BEGIN
    IF NEW.featured = TRUE AND NEW.state = 1 THEN
        SELECT COUNT(*) INTO v_featured_count
        FROM projects
        WHERE state = 1 AND featured = TRUE AND id <> NEW.id;

        IF v_featured_count >= 3 THEN
            -- Retire automatiquement le plus ancien du Top 3 pour garder exactement 3 éléments
            UPDATE projects
            SET featured = FALSE
            WHERE id = (
                SELECT id FROM projects 
                WHERE state = 1 AND featured = TRUE AND id <> NEW.id 
                ORDER BY updated_at ASC LIMIT 1
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_top3_limit
BEFORE INSERT OR UPDATE OF featured, state ON projects
FOR EACH ROW EXECUTE FUNCTION fn_check_top3_limit();

-- 6.3 Trigger d'Audit Automatique : Journalisation des validations de projets
CREATE OR REPLACE FUNCTION fn_audit_project_state_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.state <> NEW.state THEN
        INSERT INTO audit_logs (admin_id, action_type, target_table, target_id, details)
        VALUES (
            NULL,
            CASE 
                WHEN NEW.state = 1 THEN 'APPROVE_PROJECT'
                WHEN NEW.state = -1 THEN 'REJECT_PROJECT'
                ELSE 'RESET_PROJECT_STATUS'
            END,
            'projects',
            NEW.id::text,
            json_build_object('title', NEW.title, 'old_state', OLD.state, 'new_state', NEW.state)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_project_state
AFTER UPDATE OF state ON projects
FOR EACH ROW EXECUTE FUNCTION fn_audit_project_state_change();

-- 6.4 Trigger Automatique : Synchronisation de l'accès Drive à l'approbation d'un étudiant
CREATE OR REPLACE FUNCTION fn_auto_grant_drive_on_user_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
        NEW.drive_access = TRUE;
        
        -- Si l'email est académique, inscrire dans drive_authorizations
        IF NEW.email ~* '^[A-Za-z0-9._%+-]+@ump\.ac\.ma$' THEN
            INSERT INTO drive_authorizations (user_id, academic_email, access_status)
            VALUES (NEW.id, NEW.email, 'granted')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_approval_drive
BEFORE UPDATE OF status ON users
FOR EACH ROW EXECUTE FUNCTION fn_auto_grant_drive_on_user_approval();

-- ------------------------------------------------------------------------------
-- 7. PROCÉDURES STOCKÉES & FONCTIONS AVEC CURSEURS EXPLICITES (CURSORS)
-- ------------------------------------------------------------------------------

-- 7.1 FONCTION AVEC CURSEUR : Traitement par lots des inscriptions d'étudiants en attente
-- Démontre l'utilisation complète d'un curseur explicite (DECLARE, OPEN, FETCH, CLOSE)
CREATE OR REPLACE FUNCTION fn_process_pending_users_cursor(
    p_auto_approve_ump BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    processed_count INT,
    approved_count INT,
    summary_message TEXT
) AS $$
DECLARE
    -- Déclaration explicite du Curseur
    cur_pending_users CURSOR FOR 
        SELECT id, prenom, nom, email, master 
        FROM users 
        WHERE status = 'pending' 
        ORDER BY created_at ASC;

    -- Variables de lecture de ligne
    v_user_record RECORD;
    v_total_processed INT := 0;
    v_total_approved INT := 0;
BEGIN
    -- 1. Ouverture du curseur
    OPEN cur_pending_users;

    -- 2. Boucle de parcours
    LOOP
        FETCH cur_pending_users INTO v_user_record;
        EXIT WHEN NOT FOUND;

        v_total_processed := v_total_processed + 1;

        -- Règle métier : validation automatique si email institutionnel de l'UMP
        IF p_auto_approve_ump AND v_user_record.email ~* '@ump\.ac\.ma$' THEN
            UPDATE users 
            SET status = 'approved',
                drive_access = TRUE,
                updated_at = NOW()
            WHERE id = v_user_record.id;

            -- Journalisation dans l'audit
            INSERT INTO audit_logs (admin_id, action_type, target_table, target_id, details)
            VALUES (
                NULL, 
                'BATCH_APPROVE_USER_CURSOR', 
                'users', 
                v_user_record.id::text, 
                json_build_object('email', v_user_record.email, 'master', v_user_record.master)
            );

            v_total_approved := v_total_approved + 1;
        END IF;
    END LOOP;

    -- 3. Fermeture obligatoire du curseur
    CLOSE cur_pending_users;

    -- Retour des résultats
    processed_count := v_total_processed;
    approved_count := v_total_approved;
    summary_message := format('Curseur exécuté avec succès : %s inscriptions analysées, %s validées automatiquement.', v_total_processed, v_total_approved);
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_process_pending_users_cursor IS 'Procédure utilisant un curseur explicite pour parcourir et valider par lots les candidatures des étudiants @ump.ac.ma';

-- 7.2 FONCTION AVEC CURSEUR : Génération d'un rapport semestriel complet (Drives & Projets)
CREATE OR REPLACE FUNCTION fn_generate_semester_summary_report()
RETURNS TABLE (
    semester_code VARCHAR,
    modules_count INT,
    total_drives_links INT,
    report_details TEXT
) AS $$
DECLARE
    -- Curseur sur les semestres existants
    cur_semesters CURSOR FOR 
        SELECT DISTINCT semestre FROM drives ORDER BY semestre;
    
    v_sem_rec RECORD;
    v_mod_count INT;
    v_links_count INT;
BEGIN
    OPEN cur_semesters;
    LOOP
        FETCH cur_semesters INTO v_sem_rec;
        EXIT WHEN NOT FOUND;

        SELECT COUNT(*), COUNT(*) * 4 
        INTO v_mod_count, v_links_count
        FROM drives 
        WHERE semestre = v_sem_rec.semestre;

        semester_code := v_sem_rec.semestre;
        modules_count := v_mod_count;
        total_drives_links := v_links_count;
        report_details := format('Semestre %s : %s modules actifs avec %s liens de dossiers Drive (Cours, TP, TD, Examens).', 
                                UPPER(v_sem_rec.semestre), v_mod_count, v_links_count);
        RETURN NEXT;
    END LOOP;
    CLOSE cur_semesters;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generate_semester_summary_report IS 'Génère un rapport consolidé à l aide d un curseur sur chaque semestre académique';

-- ------------------------------------------------------------------------------
-- 8. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS) POUR SUPABASE
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ciaa_can_manage()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND (role IN ('admin', 'president', 'vice_president', 'prof_encadrant') OR can_access_dashboard = TRUE)
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.users (id, email, prenom, nom, master, linkedin, bio, status, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'prenom', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'nom', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'master', 'Master SDSI (S1)'),
        NEW.raw_user_meta_data ->> 'linkedin',
        NEW.raw_user_meta_data ->> 'bio',
        'pending',
        'member'
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() = OLD.id AND NOT public.ciaa_can_manage() THEN
        NEW.role := OLD.role;
        NEW.status := OLD.status;
        NEW.drive_access := OLD.drive_access;
        NEW.can_access_dashboard := OLD.can_access_dashboard;
        NEW.email := OLD.email;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
DROP TRIGGER IF EXISTS protect_user_privileges ON users;
CREATE TRIGGER protect_user_privileges
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- Activation de RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureau_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sujets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8.1 Lecture Publique (Anonyme & Connecté) pour les éléments visibles
CREATE POLICY "Public Read Approved Projects" ON projects FOR SELECT USING (
    state = 1
    OR submitted_by = auth.uid()
    OR (submitted_by IS NULL AND state = 0 AND created_at > NOW() - INTERVAL '5 minutes')
);
CREATE POLICY "Public Read Project Members" ON project_members FOR SELECT USING (TRUE);
CREATE POLICY "Public Read Bureau Members" ON bureau_members FOR SELECT USING (TRUE);
CREATE POLICY "Public Read Drives" ON drives FOR SELECT USING (TRUE);
CREATE POLICY "Public Read Videos" ON videos FOR SELECT USING (TRUE);
CREATE POLICY "Public Read Approved Sujets" ON sujets FOR SELECT USING (status IN ('approved', 'in_progress', 'completed') OR user_id = auth.uid());
CREATE POLICY "Public Read Site Settings" ON site_settings FOR SELECT USING (TRUE);

-- 8.2 Inscription Publique / Candidature
CREATE POLICY "Public Can Submit Message" ON messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public Can Propose Sujet" ON sujets FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public Can Submit Project" ON projects FOR INSERT
    WITH CHECK (submitted_by IS NULL OR submitted_by = auth.uid());
CREATE POLICY "Submit Project Team Members" ON project_members FOR INSERT TO anon, authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_id
          AND (p.submitted_by = auth.uid() OR (p.submitted_by IS NULL AND auth.uid() IS NULL))
    ));

-- 8.3 User profiles are readable by their owner; privileged access is checked in
-- ciaa_can_manage(). New profiles are created by the auth.users trigger above.
CREATE POLICY "Read Own User Profile" ON users FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.ciaa_can_manage());
CREATE POLICY "Update Own User Profile" ON users FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.ciaa_can_manage())
    WITH CHECK (id = auth.uid() OR public.ciaa_can_manage());

-- The first admin must be promoted by a trusted operator after signing up:
-- UPDATE public.users SET role = 'admin', status = 'approved', can_access_dashboard = TRUE WHERE email = '...';
CREATE POLICY "Admin Full Control Users" ON users FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Projects" ON projects FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Project Members" ON project_members FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Sujets" ON sujets FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Drives" ON drives FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Drive Auth" ON drive_authorizations FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Videos" ON videos FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Messages" ON messages FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Bureau" ON bureau_members FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Settings" ON site_settings FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());
CREATE POLICY "Admin Full Control Audit" ON audit_logs FOR ALL TO authenticated
    USING (public.ciaa_can_manage()) WITH CHECK (public.ciaa_can_manage());

-- The schema intentionally creates empty tables. Add real content through the
-- dashboard after promoting the initial administrator using the SQL above.
