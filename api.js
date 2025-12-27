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
            
            renderAll(); 
            if(manual) alert("Sync Success!");
            return true;
        } else { return false; }
    } catch (err) { 
        console.error("Sync Error:", err);
        return false;
    } finally { document.getElementById('loadingStatus').classList.add('hidden'); }
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim().toLowerCase();
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value.trim();
    
    if (!userVal || !passVal) { alert("Please enter credentials"); return; }
    
    githubConfig.token = tokenVal;
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        const foundUser = users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);
        if (foundUser) {
            currentUserRole = foundUser.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role})`;
            renderAll();
        } else {
            document.getElementById('loginError').innerText = "Invalid Username or Password!";
            document.getElementById('loginError').classList.remove('hidden');
        }
    } else {
        document.getElementById('loginError').innerText = "GitHub Sync Failed! Check your Token or Internet connection.";
        document.getElementById('loginError').classList.remove('hidden');
    }
}
