let currentQuoteMath = null;
let currentProductConfig = {};

window.init_sales = async function(stage, api_url) {
    document.getElementById('view-title').innerText = "Sales & Quotes";
    stage.innerHTML = `<div class="p-20 text-center animate-pulse text-slate-400 font-bold">Loading Sales Pipeline...</div>`;

    try {
        const orders = await fetch(`${api_url}/api/data/sal_orders`).then(r => r.json());
        
        stage.innerHTML = `
            <div class="space-y-8">
                <div class="grid grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-3xl border shadow-sm">
                        <label class="text-[10px] uppercase font-black text-slate-400">Total Pipeline</label>
                        <div class="text-3xl font-black text-slate-800">$${orders.reduce((sum, o) => sum + parseFloat(o.total_retail_price || 0), 0).toFixed(2)}</div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border shadow-sm">
                        <label class="text-[10px] uppercase font-black text-slate-400">Active Orders</label>
                        <div class="text-3xl font-black text-orange-500">${orders.filter(o => o.order_status !== 'COMPLETED').length}</div>
                    </div>
                    <div onclick="window.openQuoteModal()" class="bg-blue-600 p-6 rounded-3xl shadow-xl text-white cursor-pointer hover:bg-blue-700 transition-all flex justify-between items-center">
                        <div>
                            <label class="text-[10px] uppercase font-black opacity-60">Physics Engine</label>
                            <div class="text-xl font-bold">+ New Quote</div>
                        </div>
                        <i data-lucide="plus-circle" class="w-8 h-8"></i>
                    </div>
                </div>

                <div class="bg-white rounded-3xl border shadow-sm overflow-hidden">
                    <div class="p-6 border-b bg-slate-50 font-bold text-slate-500">Active Sales Pipeline</div>
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400">
                                <th class="p-5">Job Name</th><th class="p-5">Status</th><th class="p-5">Due Date</th><th class="p-5 text-right">Total Retail</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.length === 0 ? `<tr><td colspan="4" class="p-20 text-center text-slate-300 italic">No orders found. Click "New Quote" to begin.</td></tr>` : 
                              orders.map(o => `
                                <tr class="border-b hover:bg-slate-50 cursor-pointer">
                                    <td class="p-5 font-bold text-slate-800">${o.job_name}</td>
                                    <td class="p-5"><span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">${o.order_status}</span></td>
                                    <td class="p-5 text-slate-500">${o.due_date || 'TBD'}</td>
                                    <td class="p-5 text-right font-mono font-bold">$${parseFloat(o.total_retail_price).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        lucide.createIcons();
    } catch (e) { stage.innerHTML = `<div class="p-10 text-red-500">Error: ${e.message}</div>`; }
};

window.openQuoteModal = async function() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    content.innerHTML = `<div class="p-10 text-center animate-pulse">Accessing Config Vault...</div>`;
    
    const [customers, products] = await Promise.all([
        fetch(`${API}/api/data/crm_customers`).then(r => r.json()),
        fetch(`${API}/api/data/cat_products`).then(r => r.json())
    ]);
    
    content.innerHTML = `
        <h2 class="text-2xl font-black mb-1">New Quote</h2>
        <p class="text-slate-400 text-sm mb-6 font-medium">Headless Physics Execution</p>
        <div class="space-y-4">
            <select id="q-customer" class="w-full p-4 bg-slate-50 border rounded-2xl">
                ${customers.slice(0, 100).map(c => `<option value="${c.customer_id}">${c.company_name}</option>`).join('')}
            </select>
            <input id="q-jobname" type="text" placeholder="Job Name (e.g. Real Estate Riders)" class="w-full p-4 bg-slate-50 border rounded-2xl">
            
            <div class="grid grid-cols-2 gap-4">
                <select id="q-product" onchange="window.onProductChange()" class="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-blue-700">
                    ${products.map(p => `<option value="${p.product_code}">${p.product_name}</option>`).join('')}
                </select>
                <div class="relative">
                    <label class="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black text-slate-400 uppercase">Quantity</label>
                    <input id="q-qty" type="number" min="1" value="10" oninput="window.updateSalesCalculations()" class="w-full p-4 bg-slate-50 border rounded-2xl font-bold">
                </div>
            </div>
            
            <div id="dynamic-dims" class="grid grid-cols-2 gap-4"></div>
            <div id="dynamic-options" class="flex gap-4"></div>

            <div id="quote-result" class="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex justify-between items-center transition-all mt-4">
                <div>
                    <div class="text-[10px] uppercase font-black text-blue-400">Retail Total</div>
                    <div id="res-total" class="text-4xl font-black">$0.00</div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] uppercase font-black text-slate-400">Total Cost</div>
                    <div id="res-cost" class="text-sm font-bold text-slate-300">$0.00</div>
                </div>
            </div>

            <div class="flex gap-4 pt-4">
                <button onclick="document.getElementById('modal-container').classList.add('hidden')" class="flex-1 py-4 font-bold text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">Cancel</button>
                <button onclick="window.commitSalesOrder()" class="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30">Commit to Shop Floor</button>
            </div>
        </div>`;
    
    window.onProductChange(); 
};

window.onProductChange = async function() {
    const pCode = document.getElementById('q-product').value;
    const dimZone = document.getElementById('dynamic-dims');
    const optZone = document.getElementById('dynamic-options');
    
    try {
        const res = await fetch(`${API}/api/config/${pCode}`).then(r => r.json());
        if (res.status === 'success') currentProductConfig = res.config;
    } catch(e) { console.error("Data Vault Error"); }
    
    // UI CONSTRAINTS BASED ON PRODUCT
    if (pCode === 'PROD_Yard_Signs') {
        dimZone.innerHTML = `
            <div class="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center col-span-2">
                <span class="text-slate-500 font-bold text-sm"><i data-lucide="lock" class="inline w-4 h-4 mr-1 mb-0.5"></i> Dimensions Locked to 24" x 18" blanks</span>
                <input type="hidden" id="q-w" value="24">
                <input type="hidden" id="q-h" value="18">
            </div>
        `;
        optZone.innerHTML = `
            <label class="flex-1 flex items-center justify-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-blue-50 transition-all">
                <input type="checkbox" id="q-stakes" checked onchange="window.updateSalesCalculations()" class="w-5 h-5 accent-blue-600 rounded">
                <span class="font-bold text-slate-700 text-sm">Include H-Stakes</span>
            </label>
            <select id="q-sides" onchange="window.updateSalesCalculations()" class="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none">
                <option value="1">Single Sided</option>
                <option value="2">Double Sided</option>
            </select>
        `;
    } else {
        dimZone.innerHTML = `
            <input id="q-w" type="number" min="1" value="24" placeholder="Width (in)" oninput="window.updateSalesCalculations()" class="p-4 bg-slate-50 border rounded-2xl">
            <input id="q-h" type="number" min="1" value="48" placeholder="Height (in)" oninput="window.updateSalesCalculations()" class="p-4 bg-slate-50 border rounded-2xl">
        `;
        optZone.innerHTML = `
            <select id="q-sides" onchange="window.updateSalesCalculations()" class="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none">
                <option value="1">Single Sided</option>
                <option value="2">Double Sided</option>
            </select>
        `;
    }
    lucide.createIcons();

    // Load scripts dynamically
    let scriptsToLoad = [];
    if (pCode === 'PROD_Yard_Signs') scriptsToLoad = ['logic_yard.js', 'cost_yard.js'];
    if (pCode === 'PROD_ACM_Signs') scriptsToLoad = ['logic_acm.js', 'cost_acm.js']; 
    
    if (scriptsToLoad.length > 0) {
        let loadedCount = 0;
        scriptsToLoad.forEach(scriptFile => {
            if (document.querySelector(`script[src^="./modules/${scriptFile}"]`)) {
                loadedCount++;
                if (loadedCount === scriptsToLoad.length) window.updateSalesCalculations();
                return;
            }
            const script = document.createElement('script');
            script.src = `./modules/${scriptFile}?v=${Date.now()}`;
            script.onload = () => {
                loadedCount++;
                if (loadedCount === scriptsToLoad.length) window.updateSalesCalculations();
            };
            document.head.appendChild(script);
        });
    } else { window.updateSalesCalculations(); }
}

window.updateSalesCalculations = function() {
    // 1. DATA SANITIZATION (The Guardrails)
    let rawQty = parseFloat(document.getElementById('q-qty').value);
    let rawW = parseFloat(document.getElementById('q-w').value);
    let rawH = parseFloat(document.getElementById('q-h').value);
    
    if (isNaN(rawQty) || rawQty <= 0) rawQty = 1;
    if (isNaN(rawW) || rawW <= 0) rawW = 1;
    if (isNaN(rawH) || rawH <= 0) rawH = 1;

    const inputs = {
        qty: rawQty,
        w: rawW,
        h: rawH,
        sides: parseInt(document.getElementById('q-sides')?.value || 1),
        hasStakes: document.getElementById('q-stakes')?.checked || false
    };

    const pCode = document.getElementById('q-product').value;
    let retailResult = null;
    let costResult = null;

    try {
        if (pCode === 'PROD_Yard_Signs') {
            if (typeof window.calculateRetailYard === 'function') retailResult = window.calculateRetailYard(inputs, currentProductConfig);
            if (typeof window.calculateCostYard === 'function') costResult = window.calculateCostYard(inputs, currentProductConfig);
        }
        
        if (retailResult && costResult) {
            currentQuoteMath = { retail: retailResult, cost: costResult };
            document.getElementById('res-total').innerText = `$${(retailResult.grandTotal || 0).toFixed(2)}`;
            document.getElementById('res-cost').innerText = `Cost: $${(costResult.total || 0).toFixed(2)}`;
        }
    } catch(e) { console.error("Engine Error:", e); }
};

// UI CONSTRAINTS BASED ON PRODUCT
    if (pCode === 'PROD_Yard_Signs') {
        dimZone.innerHTML = `
            <div class="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center col-span-2">
                <span class="text-slate-500 font-bold text-sm"><i data-lucide="lock" class="inline w-4 h-4 mr-1 mb-0.5"></i> Locked to 24" x 18"</span>
                <input type="hidden" id="q-w" value="24"><input type="hidden" id="q-h" value="18">
            </div>
        `;
        optZone.innerHTML = `
            <label class="flex-1 flex items-center justify-center gap-3 cursor-pointer p-4 bg-slate-50 border rounded-2xl hover:bg-blue-50">
                <input type="checkbox" id="q-stakes" checked onchange="window.updateSalesCalculations()" class="w-5 h-5 accent-blue-600 rounded">
                <span class="font-bold text-slate-700 text-sm">Include H-Stakes</span>
            </label>
            <select id="q-sides" onchange="window.updateSalesCalculations()" class="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm">
                <option value="1">Single Sided</option><option value="2">Double Sided</option>
            </select>
        `;
    } else if (pCode === 'PROD_ACM_Signs') {
        dimZone.innerHTML = `
            <input id="q-w" type="number" min="1" value="48" placeholder="Width (in)" oninput="window.updateSalesCalculations()" class="p-4 bg-slate-50 border rounded-2xl">
            <input id="q-h" type="number" min="1" value="96" placeholder="Height (in)" oninput="window.updateSalesCalculations()" class="p-4 bg-slate-50 border rounded-2xl">
        `;
        optZone.innerHTML = `
            <select id="q-thick" onchange="window.updateSalesCalculations()" class="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm">
                <option value="3mm">3mm Standard</option><option value="6mm">6mm Heavy Duty</option>
            </select>
            <select id="q-shape" onchange="window.updateSalesCalculations()" class="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm">
                <option value="Rectangle">Square/Rectangle Cut</option><option value="CNC Simple">CNC Custom Shape</option>
            </select>
            <select id="q-sides" onchange="window.updateSalesCalculations()" class="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm">
                <option value="1">Single Sided</option><option value="2">Double Sided</option>
            </select>
        `;
    }

window.updateSalesCalculations = function() {
    const inputs = {
        qty: parseFloat(document.getElementById('q-qty').value) || 1,
        w: parseFloat(document.getElementById('q-w').value) || 24,
        h: parseFloat(document.getElementById('q-h').value) || 18,
        sides: 1, 
        hasStakes: true
    };

    const pCode = document.getElementById('q-product').value;
    let retailResult = null;
    let costResult = null;

    try {
        if (pCode === 'PROD_Yard_Signs') {
            if (typeof window.calculateRetailYard === 'function') retailResult = window.calculateRetailYard(inputs, currentProductConfig);
            if (typeof window.calculateCostYard === 'function') costResult = window.calculateCostYard(inputs, currentProductConfig);
        }
        
        if (retailResult && costResult) {
            currentQuoteMath = { retail: retailResult, cost: costResult };
            document.getElementById('res-cost').classList.remove('text-red-300');
            document.getElementById('res-total').innerText = `$${(retailResult.grandTotal || 0).toFixed(2)}`;
            document.getElementById('res-cost').innerText = `Cost: $${(costResult.total || 0).toFixed(2)}`;
        } else {
            document.getElementById('res-total').innerText = "$0.00";
            document.getElementById('res-cost').innerText = "Awaiting Twin-Engines";
        }
    } catch(e) {
        document.getElementById('res-cost').innerText = "Engine Execution Error";
        console.error("Twin-Engine Error:", e);
    }
};

window.commitSalesOrder = async function() {
    if (!currentQuoteMath) return alert("Cannot commit an empty quote.");
    
    const payload = {
        customer_id: document.getElementById('q-customer').value,
        job_name: document.getElementById('q-jobname').value || "Unnamed Job",
        product_code: document.getElementById('q-product').value,
        width: document.getElementById('q-w').value,
        height: document.getElementById('q-h').value,
        quantity: document.getElementById('q-qty').value,
        total_retail: currentQuoteMath.retail.grandTotal,
        total_cost: currentQuoteMath.cost.total,
        retail_ea: currentQuoteMath.retail.unitPrice,
        internal_ea: currentQuoteMath.cost.total / document.getElementById('q-qty').value
    };

    const res = await fetch(`${API}/api/orders/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    }).then(r => r.json());

    if(res.status === 'success') {
        document.getElementById('modal-container').classList.add('hidden');
        alert("Order Successfully Created!");
        loadModule('sales');
    }
};