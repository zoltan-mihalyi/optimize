interface OptimizeOptions {
    assumptions:AssumptionOptions;
}

interface AssumptionOptions {
    noNativeOverwrites:boolean;
    noGlobalPropertyOverwrites:boolean;
    noGlobalPropertyReads:boolean;
}

type OptionalAssumptionOptions = Partial<AssumptionOptions>;

type OptionalOptimizeOptions = Partial<OptimizeOptions>;