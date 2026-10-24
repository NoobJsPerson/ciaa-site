(async () => {
	const projectTemplate = document.querySelector(".project")
	const projectContainer = document.querySelector(".projects")
	const SUPABASE_URL = 'https://dwtizibjpkdtcceiggxf.supabase.co';
	const SUPABASE_ANON_KEY = 'sb_publishable_MeOXYq_SwsXx-IkyPhGqqQ_jGlxMeS5';
	const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	db.auth.onAuthStateChange((_event, session) => {
		const showAuthLinks = !session
		document.querySelector("#login-link").hidden = !showAuthLinks
		document.querySelector("#signup-link").hidden = !showAuthLinks
		document.querySelector("#logout-btn").hidden = showAuthLinks
	})
	document.querySelector("#logout-btn").addEventListener("click", async (event) => {
		const button = event.currentTarget
		button.disabled = true
		const { error } = await db.auth.signOut()
		button.disabled = false
		if (error) alert("Could not log out: " + error.message)
	})
	const { data, error } = await db
        .from('projects')
        .select('*, users(nom, prenom, linkedin_username)')   // embeds the team via users.project
        .eq('state', 1)  // accepted projects only
		.eq('featured', true) // featured projects only
        .order('created_at', { ascending: false });


	if (error) {
        alert('Could not load projects: ' + error.message);
        return;
    }
	for (const projectData of data) {
		const project = projectTemplate.cloneNode(true)
		project.querySelector("#titre").innerText = projectData.title
		project.querySelector("#description").innerText = projectData.description
		project.querySelector("#image").src = projectData.image_url
		project.querySelector("#source_code").href = projectData.link

		const teamElement = project.querySelector(".team")
		const users = Array.isArray(projectData.users)
			? projectData.users
			: projectData.users
				? [projectData.users]
				: []
		const teamMembers = users
			.filter(Boolean)
			.map(user => ({
				name: [user.prenom, user.nom].filter(Boolean).join(" ").trim(),
				linkedinUsername: user.linkedin_username?.trim()
			}))
			.filter(user => user.name)

		teamElement.replaceChildren()
		teamElement.hidden = teamMembers.length === 0
		if (teamMembers.length) {
			teamElement.append("Équipe : ")
			teamMembers.forEach((member, index) => {
				if (index > 0) teamElement.append(", ")
				if (member.linkedinUsername) {
					const link = document.createElement("a")
					link.href = `https://www.linkedin.com/in/${encodeURIComponent(member.linkedinUsername)}`
					link.target = "_blank"
					link.rel = "noopener noreferrer"
					link.textContent = member.name
					teamElement.append(link)
				} else {
					teamElement.append(member.name)
				}
			})
		}

		project.style.display = "block"
		projectContainer.append(project)
	}
})()