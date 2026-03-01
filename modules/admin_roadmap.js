window.init_admin_roadmap = async function(stage, api_url) {
    document.getElementById('view-title').innerText = "System Roadmap & Changelog";
    stage.innerHTML = `<div class="p-20 text-center animate-pulse text-slate-400 font-bold">Loading System Data...</div>`;

    try {
        const [roadmap, changelogResponse] = await Promise.all([
            fetch(`${api_url}/api/data/sys_roadmap`).then(r => r.json()),
            fetch(`${api_url}/api/changelog`).then(r => r.json())
        ]);

        const changelog = changelogResponse.data || [];

        stage.innerHTML = `
            <div class="grid grid-cols-2 gap-8 h-full max-h-[800px]">
                
                <div class="bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                    <div class="p-6 border-b bg-slate-50 flex justify-between items-center">
                        <h3 class="font-bold text-slate-800">Strategic Roadmap</h3>
                        <button onclick="window.newTicket()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md">
                            + New Goal
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-4">
			${roadmap.length === 0 ? `<p class="text-slate-400 italic text-center mt-10">No active goals. Add your first milestone.</p>` : 
                          roadmap.map(t => {
                            // Extract values safely regardless of database casing
                            const cat = t.category || t.CATEGORY || 'Task';
                            const prio = t.priority || t.PRIORITY || 'Normal';
                            const stat = t.status || t.STATUS || 'Pending';
                            const title = t.title || t.TITLE || 'Untitled Goal';
                            const desc = t.description || t.DESCRIPTION || '';
                            
                            return `
                            <div class="p-5 border rounded-2xl ${stat === 'Completed' ? 'bg-slate-50 opacity-60' : 'bg-white shadow-sm border-l-4 border-l-blue-500'}">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="text-[10px] font-black uppercase text-slate-400 tracking-widest">${cat} • ${prio} Priority</div>
                                    <span class="text-xs font-bold px-2 py-1 rounded bg-slate-100">${stat}</span>
                                </div>
                                <h4 class="font-bold text-slate-800 text-lg leading-tight mb-2">${title}</h4>
                                <p class="text-sm text-slate-600">${desc}</p>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="bg-slate-900 rounded-3xl shadow-xl flex flex-col overflow-hidden text-slate-300">
                    <div class="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 class="font-bold text-white">Automated Code Logs</h3>
                        <div class="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Webhook Listening
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm">
                        ${changelog.length === 0 ? `<p class="text-slate-500 italic text-center mt-10">Waiting for first GitHub push...</p>` : 
                          changelog.map(log => `
                            <div class="border-l border-slate-700 pl-4 py-2">
                                <div class="flex items-center gap-3 mb-1">
                                    <span class="text-emerald-400 font-bold">${log.commit_hash}</span>
                                    <span class="text-[10px] text-slate-500">${new Date(log.timestamp).toLocaleString()}</span>
                                    <span class="text-[10px] bg-slate-800 text-slate-400 px-2 rounded">${log.author}</span>
                                </div>
                                <div class="text-white">${log.message}</div>
                                <a href="${log.github_url}" target="_blank" class="text-[10px] text-blue-400 hover:underline mt-1 inline-block">View on GitHub &rarr;</a>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>`;
    } catch (e) {
        stage.innerHTML = `<div class="p-10 text-red-500">Database Connection Error: ${e.message}</div>`;
    }
};

window.newTicket = function() {
    const title = prompt("Enter Goal Title:");
    if (!title) return;
    const desc = prompt("Enter Description/Notes:");
    
    // Fallback to globally defined API if needed
    const apiEndpoint = typeof API !== 'undefined' ? API : window.location.protocol + "//" + window.location.hostname + ":8000";

    fetch(`${apiEndpoint}/api/data/sys_roadmap`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: "insert",
            data: { title: title, description: desc, category: "Strategic", priority: "High", status: "Pending" }
        })
    }).then(() => loadModule('admin_roadmap')); // Reloads the view to show the new ticket
};
