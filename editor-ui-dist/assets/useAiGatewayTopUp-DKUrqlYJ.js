import { s as useI18n } from "./src-Bo6fIRlP.js";
import { t as useUsersStore } from "./users.store-BfSz61wr.js";
import { t as useTelemetry } from "./useTelemetry-D-DsTw_T.js";
import { t as useCloudPlanStore } from "./cloudPlan.store-SBh_K3XM.js";
import { n as useToast } from "./useToast-BzvNGcnO.js";
import { l as CLOUD_N8N_CONNECT_TOP_UP_PATH, qr as AI_GATEWAY_TOP_UP_MODAL_KEY } from "./constants-CfolRcla.js";
import { n as useUIStore } from "./ui.store-DF3DguxG.js";
import { t as usePageRedirectionHelper } from "./usePageRedirectionHelper-C73M5vDP.js";
//#region src/app/composables/useAiGatewayTopUp.ts
function useAiGatewayTopUp() {
	const uiStore = useUIStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const { goToCloudDashboard } = usePageRedirectionHelper();
	function resolveVariant() {
		if (usersStore.isInstanceOwner && cloudPlanStore.userIsTrialing) return "ownerTrial";
		if (cloudPlanStore.userIsTrialing) return "memberTrial";
		return "member";
	}
	async function openTopUp(options) {
		telemetry.track("User clicked ai gateway top up", {
			source: options.source,
			credential_type: options.credentialType
		});
		if (usersStore.isInstanceOwner && !cloudPlanStore.userIsTrialing) {
			try {
				await goToCloudDashboard({
					redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
					mode: "open"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("aiGateway.topUp.modal.cta.openAdminPanelError"));
			}
			return;
		}
		uiStore.openModalWithData({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { variant: resolveVariant() }
		});
	}
	return { openTopUp };
}
//#endregion
export { useAiGatewayTopUp as t };
