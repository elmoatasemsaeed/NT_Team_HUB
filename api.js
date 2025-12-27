// --- Data Management & API Logic ---

async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) return false;
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
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};
            
            renderAll();
            if (manual) alert("Synced!");
            if (loadingEl) loadingEl.classList.add('hidden');
            return true;
        }
    } catch (err) { console.error(err); }
    if (loadingEl) loadingEl.classList.add('hidden');
    return false;
}

async function saveToGitHub() {
    if (!githubConfig.token) return false;
    const fullData = { employees, fields: fieldsConfig, users, charts: chartsConfig, visibility: visibilityConfig };
    const jsonStr = JSON.stringify(fullData, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(jsonStr)));

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Update [${new Date().toLocaleString()}]`,
                content: encodedContent,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const resData = await response.json();
            githubConfig.sha = resData.content.sha;
            return true;
        }
    } catch (err) { alert("Save failed!"); }
    return false;
}

function checkLogin() {
    const userVal = document.getElementById('userInput').value;
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value;

    githubConfig.token = tokenVal;
    loadFromGitHub().then(success => {
        if (success) {
            const foundUser = users.find(u => u.username === userVal && u.password === passVal);
            if (foundUser) {
                document.body.setAttribute('data-user-role', foundUser.role);
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('mainContent').classList.remove('hidden');
                renderAll();
            } else { alert("Wrong username/password"); }
        } else { alert("Cloud connection failed (Check Token)"); }
    });
}
