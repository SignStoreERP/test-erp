// This function is called by the Dashboard Shell
window.init_crm = async function(stage, api_url) {
    document.getElementById('view-title').innerText = "Customer CRM";
    
    stage.innerHTML = `<div class="p-20 text-center animate-pulse text-slate-400 font-bold">Accessing 6,000+ Records...</div>`;

    try {
        const customers = await fetch(`${api_url}/api/data/crm_customers`).then(r => r.json());
        
        stage.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
                    <div class="relative w-96">
                        <i data-lucide="search" class="absolute left-4 top-3.5 w-5 h-5 text-slate-400"></i>
                        <input type="text" id="crm-search-input" onkeyup="window.filterCRMTable()" placeholder="Search by Company, Contact, or Email..." 
                               class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>
                    <button onclick="window.showNewCustomerModal()" class="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                        + New Customer
                    </button>
                </div>

                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <table class="w-full text-left" id="crm-data-table">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-400">
                                <th class="p-5">Company Name</th>
                                <th class="p-5">Primary Contact</th>
                                <th class="p-5">Email Address</th>
                                <th class="p-5">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customers.map(c => `
                                <tr class="border-b border-slate-100 hover:bg-emerald-50 transition-colors cursor-pointer">
                                    <td class="p-5 font-bold text-slate-800">${c.company_name}</td>
                                    <td class="p-5 text-slate-600">${c.contact_name || '--'}</td>
                                    <td class="p-5 text-blue-500 underline text-sm">${c.email || '--'}</td>
                                    <td class="p-5 text-slate-500 text-sm">${c.phone || '--'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        
        lucide.createIcons();

    } catch (e) {
        stage.innerHTML = `<div class="p-10 bg-red-50 text-red-600 rounded-2xl">Error connecting to CRM database: ${e.message}</div>`;
    }
};

// Isolated helper functions for the CRM module
window.filterCRMTable = function() {
    const input = document.getElementById("crm-search-input").value.toUpperCase();
    const rows = document.getElementById("crm-data-table").getElementsByTagName("tr");
    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].textContent || rows[i].innerText;
        rows[i].style.display = text.toUpperCase().indexOf(input) > -1 ? "" : "none";
    }
};

window.showNewCustomerModal = function() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    
    content.innerHTML = `
        <h2 class="text-2xl font-black mb-6">New Customer Intake</h2>
        <div class="grid grid-cols-2 gap-4">
            <input id="new-c-company" type="text" placeholder="Company Name" class="p-4 bg-slate-50 border rounded-xl">
            <input id="new-c-contact" type="text" placeholder="Contact Name" class="p-4 bg-slate-50 border rounded-xl">
            <input id="new-c-email" type="email" placeholder="Email" class="p-4 bg-slate-50 border rounded-xl">
            <input id="new-c-phone" type="text" placeholder="Phone Number" class="p-4 bg-slate-50 border rounded-xl">
        </div>
        <div class="flex gap-4 mt-8">
            <button onclick="document.getElementById('modal-container').classList.add('hidden')" class="flex-1 py-4 font-bold text-slate-400">Cancel</button>
            <button onclick="window.saveNewCustomer()" class="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-bold">Save to CRM</button>
        </div>
    `;
};