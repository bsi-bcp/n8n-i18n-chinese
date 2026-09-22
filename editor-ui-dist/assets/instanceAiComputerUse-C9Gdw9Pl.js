import { S as computed } from "./vue.runtime.esm-bundler-DYHsQBZB.js";
import { Ga as INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT, Ha as INSTANCE_AI_COMPUTER_USE_EXPERIMENT } from "./constants-CfolRcla.js";
import { t as usePostHog } from "./posthog.store-BzH8pehx.js";
//#region src/experiments/instanceAiMcpConnections/useInstanceAiMcpConnectionsExperiment.ts
function useInstanceAiMcpConnectionsExperiment() {
	const posthogStore = usePostHog();
	return { isFeatureEnabled: computed(() => posthogStore.getVariant(INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT.name) === INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT.variant) };
}
//#endregion
//#region src/experiments/instanceAiComputerUse/useInstanceAiComputerUseExperiment.ts
function useInstanceAiComputerUseExperiment() {
	const posthogStore = usePostHog();
	return { isFeatureEnabled: computed(() => posthogStore.getVariant(INSTANCE_AI_COMPUTER_USE_EXPERIMENT.name) === INSTANCE_AI_COMPUTER_USE_EXPERIMENT.variant) };
}
//#endregion
export { useInstanceAiMcpConnectionsExperiment as n, useInstanceAiComputerUseExperiment as t };
