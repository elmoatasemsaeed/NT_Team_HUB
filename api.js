// --- Data Management & API Logic ---

async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { if (manual) alert("No Token provided!"); return false; }
    document.getElementById('loadingStatus').classList.remove('hidden');
    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { headers: { 'Authorization': `token ${githubConfig.token}` } });
        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            if (content.employees) employees = content.employees;
            if (content.fields) fieldsConfig = content.fields;
            if (content.users) { users = content.users; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
            if (content.visibility) visibilityConfig = content.visibility;
            if (content.charts) chartsConfig = content.charts;
            
            renderAll(); 
            if(manual) alert("Sync Success!");
            return true;
        } else { throw new Error("Failed to fetch data"); }
    } catch (err) { 
        console.error(err); 
        return false;
    } finally { document.getElementById('loadingStatus').classList.add('hidden'); }
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim().toLowerCase();
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!userVal || !passVal) { alert("Please enter username and password"); return; }
    
    githubConfig.token = tokenVal;
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        const foundUser = users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);
        if (foundUser) {
            if (rememberMe) localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userVal, pass: passVal, token: tokenVal }));
            currentUserRole = foundUser.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role})`;
            renderAll();
        } else {
            document.getElementById('loginError').innerText = "Access Denied: User not found!";
            document.getElementById('loginError').classList.remove('hidden');
        }
    } else {
        document.getElementById('loginError').innerText = "GitHub Sync Failed! Check Token or Repo Path.";
        document.getElementById('loginError').classList.remove('hidden');
    }
}
