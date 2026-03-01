window.calculateCostACM = function(inputs, data) {
    const sqin = inputs.w * inputs.h;
    const totalSqin = sqin * inputs.qty;
    const sqft = totalSqin / 144;

    // 1. Material Yield & Waste
    let sheetCost = inputs.thickness === '6mm' ? parseFloat(data.Cost_Stock_6mm_4x8 || 72.10) : parseFloat(data.Cost_Stock_3mm_4x8 || 52.09);
    const waste = parseFloat(data.Waste_Factor || 1.15);
    const sheetsNeeded = Math.ceil((totalSqin * waste) / (48 * 96));
    const matCost = sheetsNeeded * sheetCost;

    // 2. Ink & Print Physics
    const inkCost = sqft * inputs.sides * parseFloat(data.Cost_Ink_Latex || 0.16);
    const speedLF = parseFloat(data.Machine_Speed_LF_Hr || 25);
    const linearFeet = (sheetsNeeded * 8) * inputs.sides; // Assuming 8ft passes
    const printRunHrs = linearFeet / speedLF;

    const printMachCost = printRunHrs * parseFloat(data.Rate_Machine_Flatbed || 10);
    const printOpCost = printRunHrs * parseFloat(data.Rate_Operator || 25) * parseFloat(data.Labor_Attendance_Ratio || 1.0);
    const printSetupCost = (parseFloat(data.Time_Setup_Printer || 5) / 60) * parseFloat(data.Rate_Operator || 25);

    // 3. Finishing Physics (Shear vs CNC)
    let cutMachCost = 0, cutOpCost = 0, cutSetupCost = 0;
    
    if (inputs.shape === 'Rectangle') { // Shear Math
        const shearTime = ((parseFloat(data.Time_Shear_Cut || 1) * inputs.qty) / 60);
        cutOpCost = shearTime * parseFloat(data.Rate_Shop_Labor || 20);
        cutSetupCost = (parseFloat(data.Time_Shear_Setup || 5) / 60) * parseFloat(data.Rate_Shop_Labor || 20);
    } else { // CNC Math
        const rateCNC = parseFloat(data.Rate_CNC_Labor || 25);
        const runHrsCNC = ((parseFloat(inputs.shape === 'CNC Simple' ? data.Time_CNC_Easy_SqFt || 1 : data.Time_CNC_Complex_SqFt || 2)) * sqft) / 60;
        cutMachCost = runHrsCNC * parseFloat(data.Rate_Machine_CNC || 10);
        cutOpCost = runHrsCNC * rateCNC * parseFloat(data.Labor_Attendance_Ratio || 0.10);
        cutSetupCost = (parseFloat(data.Time_Setup_CNC || 10) / 60) * rateCNC;
    }

    const totalCost = matCost + inkCost + printMachCost + printOpCost + printSetupCost + cutMachCost + cutOpCost + cutSetupCost;

    return { total: totalCost, breakdown: { matCost, inkCost } };
};