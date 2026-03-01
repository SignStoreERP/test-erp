window.init_admin_dev = async function(stage, api_url) {
    document.getElementById('view-title').innerText = "Developer Console";
    stage.innerHTML = `<div class="p-20 text-center animate-pulse text-slate-400 font-bold">Scanning System State...</div>`;

    // Fetch GitHub status on load
    let gitStatus = { state: "UNKNOWN", color: "text-gray-500", local_changes: [], remote_diff: [] };
    try {
        const res = await fetch(`${api_url}/api/system/git-status`).then(r => r.json());
        if (res.status === 'success') gitStatus = res;
    } catch (e) {
        console.warn("Could not fetch Git status");
    }

    // Build diagnostic file lists (if changes exist)
    let diagnosticsHTML = '';
    if (gitStatus.local_changes && gitStatus.local_changes.length > 0) {
        diagnosticsHTML += `
            <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono">
                <strong class="text-yellow-700 block mb-1">Unsaved Local Files:</strong>
                ${gitStatus.local_changes.map(f => `<div class="text-slate-600">${f}</div>`).join('')}
            </div>`;
    }
    if (gitStatus.remote_diff && gitStatus.remote_diff.length > 0) {
        diagnosticsHTML += `
            <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono">
                <strong class="text-blue-700 block mb-1">File Conflicts (NAS vs GitHub):</strong>
                ${gitStatus.remote_diff.map(f => `<div class="text-slate-600">${f}</div>`).join('')}
            </div>`;
    }

    // Build Nuclear Force Sync button if state is Diverged or Dirty
    let forceSyncHTML = '';
    if (gitStatus.state === "DIVERGED" || gitStatus.state.includes("UNCOMMITTED")) {
        forceSyncHTML = `
            <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 class="text-sm font-bold text-red-800 mb-1">⚠️ Synchronization Blocked</h4>
                <p class="text-xs text-red-600 mb-3">A standard pull will fail because the local and remote histories conflict.</p>
                <button onclick="window.devForceSync()" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all shadow">
                    NUCLEAR OVERRIDE: FORCE LOCAL TO MATCH GITHUB
                </button>
            </div>`;
    }

    stage.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-6 pb-20">
            
            <!-- 1. VERSION CONTROL CARD -->
            <div class="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div class="p-6 border-b bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2"><i data-lucide="github" class="w-5 h-5"></i> GitHub Synchronization</h3>
                    <div class="px-3 py-1 rounded-full bg-slate-100 text-xs font-black ${gitStatus.color}">${gitStatus.state}</div>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="window.devGitPull()" class="p-6 bg-slate-50 hover:bg-slate-100 border rounded-2xl flex flex-col items-center justify-center transition-all text-slate-700 group">
                            <i data-lucide="cloud-download" class="w-8 h-8 mb-2 text-emerald-500 group-hover:scale-110 transition-transform"></i>
                            <span class="font-bold">Standard Pull</span>
                            <span class="text-xs text-slate-400 text-center mt-1">Safely fetch GitHub updates</span>
                        </button>
                        <button onclick="window.devGitPush()" class="p-6 bg-slate-50 hover:bg-slate-100 border rounded-2xl flex flex-col items-center justify-center transition-all text-slate-700 group">
                            <i data-lucide="cloud-upload" class="w-8 h-8 mb-2 text-blue-500 group-hover:scale-110 transition-transform"></i>
                            <span class="font-bold">Standard Push</span>
                            <span class="text-xs text-slate-400 text-center mt-1">Save NAS edits to GitHub</span>
                        </button>
                    </div>
                    ${diagnosticsHTML}
                    ${forceSyncHTML}
                </div>
            </div>

            <!-- 2. DATA MIGRATION CARD -->
            <div class="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div class="p-6 border-b bg-slate-50">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2"><i data-lucide="database" class="w-5 h-5"></i> Data Migration Bridge</h3>
                </div>
                <div class="p-6 flex items-center justify-between gap-4">
                    <div>
                        <p class="text-sm font-bold text-slate-700">Database Snapshot</p>
                        <p class="text-xs text-slate-500">Move data between environments (QNAP ➔ VPS) via SQL files.</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.devExportDB()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md">
                            Export SQL
                        </button>
                        <button onclick="window.devImportDB()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md">
                            Import SQL
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. NOTEBOOK LM CARD -->
            <div class="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div class="p-6 border-b bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2"><i data-lucide="bot" class="w-5 h-5"></i> AI Context Export</h3>
                </div>
                <div class="p-6 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-bold text-slate-700">Generate Master Context Files</p>
                        <p class="text-xs text-slate-500">Writes timestamped versions to the <code>/notebook_context/</code> folder.</p>
                    </div>
                    <button onclick="window.devExportContext()" class="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                        Execute Export
                    </button>
                </div>
            </div>

            <!-- 4. DANGER ZONE CARD -->
            <div class="bg-red-50 rounded-3xl border border-red-200 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-red-200 flex justify-between items-center">
                    <h3 class="font-bold text-red-800 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-5 h-5"></i> Danger Zone</h3>
                </div>
                <div class="p-6 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-bold text-red-900">Force API Reboot</p>
                        <p class="text-xs text-red-700">Kills the Python thread. Docker will automatically revive it in ~3 seconds.</p>
                    </div>
                    <button onclick="window.devRebootAPI()" class="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-red-700 transition-all flex items-center gap-2">
                        Restart Container
                    </button>
                </div>
            </div>

        </div>`;
    
    lucide.createIcons();
};

// --- VERSION CONTROL LOGIC ---

window.devGitPull = async function() {
    try {
        const res = await fetch(`${API}/api/system/git-pull`, { method: 'POST' }).then(r => r.json());
        if (res.status === 'success') {
            if (res.requires_reboot) {
                if (confirm("⚠️ SYSTEM UPDATE DETECTED\n\nBackend Python files were modified. The API container must be restarted to apply these changes.\n\nRestart now?")) {
                    window.devRebootAPI();
                    return;
                }
            } else {
                alert("Standard Pull Complete:\n\n" + res.message);
            }
        } else {
            alert("Error during pull:\n\n" + res.message);
        }
        loadModule('admin_dev'); 
    } catch(e) { alert("Error during pull request."); }
};

window.devForceSync = async function() {
    if(!confirm("NUCLEAR OVERRIDE: This will permanently delete any unsaved local edits and overwrite them with GitHub's exact files. Proceed?")) return;
    try {
        const res = await fetch(`${API}/api/system/git-force-pull`, { method: 'POST' }).then(r => r.json());
        if (res.status === 'success') {
            if (res.requires_reboot) {
                if (confirm("⚠️ SYSTEM UPDATE DETECTED\n\nBackend Python files were modified during force-sync. Restart API now?")) {
                    window.devRebootAPI();
                    return;
                }
            } else {
                alert(res.message);
            }
        } else {
            alert("Error during force sync:\n\n" + res.message);
        }
        loadModule('admin_dev'); 
    } catch(e) { alert("Error during force sync request."); }
};

window.devGitPush = async function() {
    const msg = prompt("Enter a brief commit message:");
    if (!msg) return;
    try {
        const res = await fetch(`${API}/api/system/git-push`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message: msg })
        }).then(r => r.json());
        alert(res.message);
        loadModule('admin_dev');
    } catch(e) { alert("Error during push."); }
};

// --- DATA MIGRATION LOGIC ---

window.devExportDB = function() {
    window.location.href = `${API}/api/system/db-export`;
};

window.devImportDB = async function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm(`Warning: This will overwrite the current database with data from ${file.name}. Proceed?`)) return;
        
        const stage = document.getElementById('module-stage');
        stage.innerHTML = `<div class="p-20 text-center animate-pulse text-blue-500 font-bold">Injecting Database Snapshot...</div>`;
        
        try {
            const content = await file.text();
            const res = await fetch(`${API}/api/system/db-import`, {
                method: 'POST',
                body: content
            }).then(r => r.json());
            alert(res.message);
            loadModule('admin_dev');
        } catch(e) { alert("Failed to import database."); loadModule('admin_dev'); }
    };
    input.click();
};

// --- SYSTEM LOGIC ---

window.devExportContext = async function() {
    try {
        const res = await fetch(`${API}/api/system/export-context`, { method: 'POST' }).then(r => r.json());
        alert(res.message);
    } catch(e) { alert("Failed to export context."); }
};

window.devRebootAPI = async function() {
    try {
        fetch(`${API}/api/system/restart`, { method: 'POST' });
        const stage = document.getElementById('module-stage');
        stage.innerHTML = `<div class="p-20 flex flex-col items-center justify-center text-red-500 font-bold">
            <i data-lucide="loader" class="w-10 h-10 animate-spin mb-4"></i>
            Rebooting Container...<br>
            <span class="text-xs text-slate-500 mt-2 font-normal">Reconnecting in 5 seconds</span>
        </div>`;
        lucide.createIcons();
        setTimeout(() => { loadModule('admin_dev'); }, 5000);
    } catch(e) { console.warn("Reboot trigger timed out or server died as expected."); }
};
