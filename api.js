async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) return false;
    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { headers: { 'Authorization': `token ${githubConfig.token}` } });
        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};
            
            renderAll();
            return true;
        }
    } catch (err) { console.error(err); }
    return false;
}

async function saveToGitHub() {
    const content = { employees, fields: fieldsConfig, users, charts: chartsConfig, visibility: visibilityConfig };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
    try {
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Update via Web Hub", content: b64, sha: githubConfig.sha, branch: githubConfig.branch })
        });
        if (response.ok) {
            const d = await response.json();
            githubConfig.sha = d.content.sha;
            return true;
        }
    } catch (err) { console.error(err); }
    return false;
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value;
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value;
    
    githubConfig.token = tokenVal;
    const success = await loadFromGitHub();
    
    if (success) {
        const user = users.find(u => u.username === userVal && u.password === passVal);
        if (user) {
            currentUserRole = user.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('displayRole').innerText = `${user.username} (${user.role})`;
            return;
        }
    }
    alert("Invalid credentials or GitHub Token");
}
