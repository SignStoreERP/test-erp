window.init_production = async function(stage, api_url) {
    document.getElementById('view-title').innerText = "Production Floor";
    stage.innerHTML = `<div class="p-20 text-center animate-pulse text-slate-400 font-bold">Scanning Production Queue...</div>`;

    const orders = await fetch(`${api_url}/api/data/sal_orders`).then(r => r.json());
    const queued = orders.filter(o => o.order_status === 'QUEUED');

    stage.innerHTML = `
        <div class="flex gap-8 h-full overflow-x-auto pb-10">
            <div class="w-80 flex-shrink-0 flex flex-col gap-4">
                <div class="flex justify-between items-center px-2">
                    <label class="text-[10px] uppercase font-black text-slate-400 tracking-widest">New Jobs (${queued.length})</label>
                </div>
                ${queued.map(o => `
                    <div class="bg-white p-6 rounded-3xl border-l-8 border-blue-500 shadow-sm hover:shadow-md transition-all">
                        <div class="text-xs font-black text-blue-500 mb-1 uppercase">Order #${o.order_id}</div>
                        <div class="font-bold text-slate-800 text-lg leading-tight mb-4">${o.job_name}</div>
                        <div class="flex items-center gap-2 text-slate-400 text-xs font-bold">
                            <i data-lucide="clock" class="w-3 h-3"></i> DUE: ${o.due_date || 'ASAP'}
                        </div>
                        <button class="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-blue-600 transition-all">
                            Start Printing
                        </button>
                    </div>
                `).join('')}
            </div>

            <div class="w-80 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 italic">
                In Progress
            </div>
            <div class="w-80 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 italic">
                Finished / Shipping
            </div>
        </div>
    `;
    lucide.createIcons();
};