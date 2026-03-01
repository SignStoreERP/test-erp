window.calculateRetailACM = function(inputs, data) {
    const sqft = (inputs.w * inputs.h) / 144;
    const thk = inputs.thickness === '6mm' ? '6' : '3';
    let baseRate = 0;

    // 1. User-Controlled Area Curves
    if (thk === '6') {
         if(sqft <= parseFloat(data.ACM6_T1_Max||2.99)) baseRate = parseFloat(data.ACM6_T1_Rate||25);
         else if(sqft <= parseFloat(data.ACM6_T2_Max||5.99)) baseRate = parseFloat(data.ACM6_T2_Rate||20);
         else baseRate = parseFloat(data.ACM6_T3_Rate||16.5);
    } else {
         if(sqft <= parseFloat(data.ACM3_T1_Max||2.99)) baseRate = parseFloat(data.ACM3_T1_Rate||24);
         else if(sqft <= parseFloat(data.ACM3_T2_Max||5.99)) baseRate = parseFloat(data.ACM3_T2_Rate||18);
         else baseRate = parseFloat(data.ACM3_T3_Rate||14);
    }

    let unitPrint = baseRate * sqft;
    const minSignPrice = parseFloat(data[`ACM${thk}_T1_Min`] || 25);
    if(unitPrint < minSignPrice) unitPrint = minSignPrice;

    // 2. Modifiers
    if (inputs.sides === 2) unitPrint *= (1 + parseFloat(data.Retail_Adder_DS_Mult||0.5));
    if (inputs.color === 'Black') unitPrint *= parseFloat(data.Retail_Adder_Black_Mult||2);

    let retailPrint = unitPrint * inputs.qty;
    if (inputs.qty >= parseFloat(data.Tier_1_Qty||10)) retailPrint *= (1 - parseFloat(data.Tier_1_Disc||0.05));

    // 3. Routing & Fees
    let routerFee = 0;
    if(inputs.shape === 'CNC Simple') routerFee = parseFloat(data.Retail_Fee_Router_Easy||30);
    if(inputs.shape === 'CNC Complex') routerFee = parseFloat(data.Retail_Fee_Router_Hard||50);

    const setupFee = parseFloat(data.Retail_Fee_Setup||15);
    const grandTotal = retailPrint + routerFee + setupFee;
    const minOrder = parseFloat(data.Retail_Min_Order||50);

    return {
        unitPrice: grandTotal / inputs.qty,
        printTotal: retailPrint,
        grandTotal: grandTotal < minOrder ? minOrder : grandTotal
    };
};