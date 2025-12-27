// --- Data Management & API Logic ---

async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { 
        if (manual) alert("Please enter GitHub Token!"); 
        return false; 
    }

    const loadingEl = document.getElementById('loadingStatus');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { 
            headers: { 'Authorization': `token ${githubConfig.token}` },
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            // Decode content from Base64
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};

            if (manual) alert("Data Sync Successful!");
            return true;
        }
    } catch (e) {
        console.error("Load error:", e);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
    return false;
}

async function saveToGitHub() {
    if (currentUserRole !== 'admin') return alert("Access Denied: Admins Only");
    if (!githubConfig.token || !githubConfig.sha) return alert("Connection Error");

    const newContent = {
        employees,
        fields: fieldsConfig,
        users,
        charts: chartsConfig,
        visibility: visibilityConfig
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(newContent, null, 2))));

    try {
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Update by ${document.getElementById('displayRole').innerText}`,
                content: encoded,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const resData = await response.json();
            githubConfig.sha = resData.content.sha;
            alert("Saved Successfully to Cloud!");
        } else {
            alert("Save Failed! Check permissions.");
        }
    } catch (e) {
        alert("Error saving data.");
    }
}
