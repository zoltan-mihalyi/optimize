interface OptionalAssumptionOptions {
    noNativeOverwrites?:boolean;
    noGlobalPropertyOverwrites?:boolean
}

interface OptionalOptimizeOptions {
    assumptions?:OptionalAssumptionOptions;
}

interface AssumptionOptions extends OptionalAssumptionOptions {
    noNativeOverwrites:boolean;
    noGlobalPropertyOverwrites:boolean;
}

interface OptimizeOptions extends OptionalOptimizeOptions {
    assumptions:AssumptionOptions;
}
