// cost_yard.js (Physics Engine)
window.calculateCostYard = function(inputs, data) {
    // 1. Bill of Materials
    const blankCost = parseFloat(data.Cost_Blank_Standard || 0.65);
    const waste = parseFloat(data.Waste_Factor || 1.05);
    const matCost = (blankCost * waste) * inputs.qty;
    
    const stakeCost = inputs.hasStakes ? (parseFloat(data.Cost_Stake || 0.65) * inputs.qty) : 0;
    
    const areaSqFt = (24 * 18) / 144;
    const inkCost = areaSqFt * inputs.qty * inputs.sides * parseFloat(data.Cost_Ink_Base || 0.16);

    // 2. Linear Nesting Physics (HP R1000)
    const bedCap = parseFloat(data.Printer_Bed_Capacity || 3);
    const speedLF = parseFloat(data.Machine_Speed_LF_Hr || 25);
    
    const setsNeeded = Math.ceil(inputs.qty / bedCap);
    const lfPerSet = 2.0; // 24" feed direction
    const totalLF = setsNeeded * lfPerSet * inputs.sides;
    
    const runHrs = totalLF / speedLF;

    // 3. Labor & Overhead Utilization
    const rateOp = parseFloat(data.Rate_Operator || 25);
    const rateMach = parseFloat(data.Rate_Machine || 10);
    const attnRatio = 1.0; // 100% Attendance required for Yard Signs
    
    const costMachine = runHrs * rateMach;
    const costOp = runHrs * rateOp * attnRatio;
    const costSetup = (parseFloat(data.Time_Setup_Base || 15) / 60) * rateOp;

    return {
        total: matCost + stakeCost + inkCost + costMachine + costOp + costSetup,
        breakdown: { matCost, stakeCost, inkCost, costMachine, costOp, costSetup }
    };
};