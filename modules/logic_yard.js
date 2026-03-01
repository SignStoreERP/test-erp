// logic_yard.js (Retail Engine)
window.calculateRetailYard = function(inputs, data) {
    // 1. Fetch Variables
    const baseSS = parseFloat(data.Retail_Price_Sign_SS || 25.00);
    const adderDS = parseFloat(data.Retail_Price_Sign_DS || 2.50);
    
    const stk1P = parseFloat(data.Retail_Stake_T1_Price || 2.00);
    const stkT2Q = parseFloat(data.Retail_Stake_T2_Qty || 50);
    const stkT2P = parseFloat(data.Retail_Stake_T2_Price || 1.75);
    const stkT3Q = parseFloat(data.Retail_Stake_T3_Qty || 100);
    const stkT3P = parseFloat(data.Retail_Stake_T3_Price || 1.50);

    // 2. Print Tier Logic
    let unitPrint = baseSS + (inputs.sides === 2 ? adderDS : 0);
    const t1Qty = parseFloat(data.Tier_1_Qty || 10);
    const t1Price = parseFloat(data.Tier_1_Price || 23.75);
    
    if (inputs.qty >= t1Qty) {
        unitPrint = t1Price + (inputs.sides === 2 ? adderDS : 0);
    }

    // 3. Stake Tier Logic
    let activeStakePrice = stk1P;
    if (inputs.qty >= stkT3Q) activeStakePrice = stkT3P;
    else if (inputs.qty >= stkT2Q) activeStakePrice = stkT2P;

    // 4. Final Math
    let retailPrint = unitPrint * inputs.qty;
    let retailStake = inputs.hasStakes ? (activeStakePrice * inputs.qty) : 0;

    return {
        unitPrice: (retailPrint + retailStake) / inputs.qty,
        printTotal: retailPrint,
        stakeTotal: retailStake,
        grandTotal: retailPrint + retailStake
    };
};