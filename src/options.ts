interface OptionalAssumptionOptions {
    noNativeOverwrites?: boolean;
}

interface OptionalOptimizeOptions {
    assumptions?: OptionalAssumptionOptions;
}

interface AssumptionOptions {
    noNativeOverwrites: boolean;
}

interface OptimizeOptions extends OptionalOptimizeOptions {
    assumptions: AssumptionOptions;
}
