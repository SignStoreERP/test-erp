window.init_admin = async function(stage, api_url) {
    document.getElementById('view-title').innerText = "Global Cost Management";
    stage.innerHTML = `<div class="p-20 text-center animate-pulse text-slate-400 font-bold">Fetching Master Data...</div>`;

    try {
        // Fetch the Global Costs table we ingested
        const data = await fetch(`${api_url}/api/data/sys_global_costs`).then(r => r.json());
        
        stage.innerHTML = `
            <div class="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-full max-h-[800px]">
                <div class="p-6 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-800">Master Level 1 Configuration</h3>
                        <p class="text-xs text-slate-500">Warning: Changes here instantly affect all product pricing engines.</p>
                    </div>
                </div>
                
                <div class="flex-1 overflow-y-auto">
                    <table class="w-full text-left">
                        <thead class="bg-white sticky top-0 border-b shadow-sm z-10">
                            <tr class="text-[10px] uppercase font-black text-slate-400">
                                <th class="p-4 pl-6 w-1/4">Variable Key</th>
                                <th class="p-4 w-1/4">Display Name</th>
                                <th class="p-4 w-1/6">Unit</th>
                                <th class="p-4 w-1/4">Current Value</th>
                                <th class="p-4 pr-6 w-32 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr class="border-b hover:bg-slate-50 group">
                                    <td class="p-4 pl-6 font-mono text-xs text-blue-600 font-bold">${row.cost_id}</td>
                                    <td class="p-4 text-sm font-medium text-slate-700">${row.display_name}</td>
                                    <td class="p-4 text-xs text-slate-500">${row.unit}</td>
                                    <td class="p-4">
                                        <input type="text" id="val-${row.cost_id}" value="${row.default_source_ref}" 
                                               class="w-full p-2 bg-transparent border border-transparent group-hover:border-slate-200 group-hover:bg-white rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm">
                                    </td>
                                    <td class="p-4 pr-6 text-right">
                                        <button onclick="window.saveGlobalCost('${row.cost_id}')" 
                                                class="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                                            SAVE
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    } catch (e) {
        stage.innerHTML = `<div class="p-10 text-red-500">Database Connection Error: ${e.message}</div>`;
    }
};

window.saveGlobalCost = async function(costId) {
    const newVal = document.getElementById(`val-${costId}`).value;
    
    // We use the universal update endpoint we built in main.py
    const payload = {
        action: "update",
        id_column: "cost_id",
        id_value: costId,
        data: { default_source_ref: newVal }
    };

    try {
        const res = await fetch(`${API}/api/data/sys_global_costs`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if(res.status === 'success') {
            const btn = document.querySelector(`button[onclick="window.saveGlobalCost('${costId}')"]`);
            const oldText = btn.innerText;
            const oldBg = btn.className;
            
            btn.innerText = "SAVED ✓";
            btn.className = "opacity-100 bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all";
            
            setTimeout(() => {
                btn.innerText = oldText;
                btn.className = oldBg;
            }, 2000);
        } else {
            alert("Save Failed: " + res.message);
        }
    } catch(e) { alert("Network Error"); }
};