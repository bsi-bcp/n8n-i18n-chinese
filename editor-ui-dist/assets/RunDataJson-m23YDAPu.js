const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/RunDataJsonActions-DnsgHfhn.js","assets/_plugin-vue_export-helper-D-F0WtqU.js","assets/chunk-CC9Q-vWm.js","assets/src-BvYowTlb.js","assets/preload-helper-CMc80dNB.js","assets/lib-DCPrRYqD.js","assets/_MapCache-CPwf3e7E.js","assets/isObject-DhlHus-H.js","assets/merge-CuvWsBtd.js","assets/get-Bo7Q_OPC.js","assets/isSymbol-C6Qru_BO.js","assets/expression-runtime-stub-BVpRST7F.js","assets/__vite-browser-external-CTj19RIp.js","assets/src-Bo6fIRlP.js","assets/vue.runtime.esm-bundler-DYHsQBZB.js","assets/workflows.store-CyNGMYqF.js","assets/dist-CaaDNBsJ.js","assets/useRootStore-zV3ddzsk.js","assets/lib-BfKcigC9.js","assets/assert-Bdjmvwie.js","assets/settings.store-DuH97XDt.js","assets/dist-C7QIcMVA.js","assets/evaluation.store-BQJfd372.js","assets/useDebounce-C57cDTa1.js","assets/sortBy-D5wdwS2E.js","assets/_baseOrderBy-CaRWhkdT.js","assets/vue-router-BayijiqM.js","assets/truncate-B0m9bkui.js","assets/useStorage-B16FZojw.js","assets/views-C90GDGvU.js","assets/htmlUtils-Ctm3wldL.js","assets/users.store-BfSz61wr.js","assets/users-BrAvMlFE.js","assets/workflowsList.store-btNOTGAu.js","assets/useTelemetry-D-DsTw_T.js","assets/constants-CfolRcla.js","assets/durations-B_eUP1zI.js","assets/typesUtils-MNq3j-_F.js","assets/dateformat-D2IU5Pza.js","assets/useDocumentTitle-BvpyR-io.js","assets/useDocumentTitle-6bi708wm.js","assets/ui.store-DF3DguxG.js","assets/versions-DL8ulxHS.js","assets/src-BReyYJZ9.js","assets/posthog.store-BzH8pehx.js","assets/src-7WmJaBUb.js","assets/permissions-DKa3WUtV.js","assets/rbac.store-DSw92OLD.js","assets/dropdown-BrkOjeOo.js","assets/button-b-33zQuv.js","assets/plugin-vue_export-helper-BzAIjVFD.js","assets/use-global-config-B9s1fE31.js","assets/style-CrfjZ4vy.js","assets/use-namespace-BshMeVV-.js","assets/use-size-B9dDFU_7.js","assets/use-z-index-Ql57fIeL.js","assets/use-form-item-BNc6JE8v.js","assets/icon-C7Ztfkpw.js","assets/tooltip-nRRsBgKp.js","assets/focus-trap-BnIAnEo2.js","assets/isUndefined-DOEKnRJI.js","assets/scrollbar-4ZIg2YWs.js","assets/refs-DBkXg6DH.js","assets/injectionKeys-3Y80kNds.js","assets/useClipboard-Cf_E7JVC.js","assets/useToast-BzvNGcnO.js","assets/useExternalHooks-Cr71H9NL.js","assets/z-indexes-BK7a2z5d.js","assets/N8nIconButton-CfAoE05L.js","assets/N8nButton-6VtgyeI4.js","assets/N8nIcon-CCyp7MLb.js","assets/Icon-CN0UVd9e.js","assets/Icon-D_OWYp2w.css","assets/N8nButton-Cp4gXyRS.css","assets/useInjectWorkflowId-Cg49-9_V.js","assets/useNodeHelpers-D1AK6w9s.js","assets/useLoadingService-Bb0_BM-S.js","assets/event-bus-CMKWyTES.js","assets/usePrivateCredentials-DemsARP7.js","assets/usePinnedData-DJl60Tej.js","assets/useExternalHooks-BPKVRmq3.js","assets/RunDataJsonActions-72pRvfr_.css"])))=>i.map(i=>d[i]);
import { $ as openBlock, E as createElementBlock, Gt as unref, It as ref, M as defineAsyncComponent, N as defineComponent, S as computed, T as createCommentVNode, bt as withCtx, j as createVNode, v as Suspense, vn as normalizeClass, w as createBlock } from "./vue.runtime.esm-bundler-DYHsQBZB.js";
import { t as __vitePreload } from "./preload-helper-CMc80dNB.js";
import { t as _plugin_vue_export_helper_default } from "./_plugin-vue_export-helper-D-F0WtqU.js";
import { g as useElementSize } from "./dist-CaaDNBsJ.js";
import { O as injectWorkflowDocumentStore, Vn as executionDataToJson, un as injectNDVStore, zi as isString, zt as getMappedExpression } from "./workflows.store-CyNGMYqF.js";
import { t as useTelemetry } from "./useTelemetry-D-DsTw_T.js";
import { B as nonExistingJsonPath } from "./constants-CfolRcla.js";
import { m as shorten } from "./typesUtils-MNq3j-_F.js";
import { t as useExternalHooks } from "./useExternalHooks-BPKVRmq3.js";
import { t as Draggable_default } from "./Draggable-BnNYQqyg.js";
import { t as TextWithHighlights_default } from "./TextWithHighlights-C_q67RY1.js";
import { n as MappingPill_default, t as useTelemetryContext } from "./useTelemetryContext-DAFDvkL7.js";
import { t as P } from "./vue-json-pretty-DpGjbIln.js";
//#region src/features/ndv/runData/components/RunDataJson.vue?vue&type=script&setup=true&lang.ts
var RunDataJson_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RunDataJson",
	props: {
		editMode: { default: () => ({}) },
		pushRef: {},
		paneType: {},
		node: {},
		inputData: {},
		mappingEnabled: { type: Boolean },
		distanceFromActive: {},
		outputIndex: {},
		runIndex: {},
		totalRuns: {},
		search: {},
		compact: { type: Boolean },
		execution: {}
	},
	setup(__props) {
		const LazyRunDataJsonActions = defineAsyncComponent(async () => await __vitePreload(() => import("./RunDataJsonActions-DnsgHfhn.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81])));
		const props = __props;
		const ndvStore = injectNDVStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const externalHooks = useExternalHooks();
		const telemetry = useTelemetry();
		const telemetryContext = useTelemetryContext();
		const selectedJsonPath = ref(nonExistingJsonPath);
		const draggingPath = ref(null);
		const jsonDataContainer = ref(null);
		const { height } = useElementSize(jsonDataContainer);
		const jsonData = computed(() => executionDataToJson(props.inputData));
		const highlight = computed(() => ndvStore.value.highlightDraggables);
		const getShortKey = (el) => {
			if (!el) return "";
			return shorten(el.dataset.name ?? "", 16, 2);
		};
		const getJsonParameterPath = (path) => {
			const subPath = path.replace(/^(\["?\d"?])/, "");
			return getMappedExpression({
				nodeName: props.node.name,
				distanceFromActive: props.distanceFromActive,
				path: subPath,
				binaryMode: workflowDocumentStore?.value?.settings?.binaryMode
			});
		};
		const canDraggableDrop = computed(() => ndvStore.value.canDraggableDrop);
		const draggableStickyPosition = computed(() => ndvStore.value.draggableStickyPos);
		const onDragStart = (el, data) => {
			if (el?.dataset.path) draggingPath.value = el.dataset.path;
			ndvStore.value.draggableStartDragging({
				type: "mapping",
				data: data ?? "",
				dimensions: el?.getBoundingClientRect() ?? null
			});
			ndvStore.value.resetMappingTelemetry();
		};
		const onDragEnd = (el) => {
			ndvStore.value.draggableStopDragging();
			draggingPath.value = null;
			const mappingTelemetry = ndvStore.value.mappingTelemetry;
			const telemetryPayload = {
				src_node_type: props.node.type,
				src_field_name: el.dataset.name ?? "",
				src_nodes_back: props.distanceFromActive,
				src_run_index: props.runIndex,
				src_runs_total: props.totalRuns,
				src_field_nest_level: el.dataset.depth ?? 0,
				src_view: "json",
				src_element: el,
				success: false,
				view_shown: telemetryContext.view_shown,
				...mappingTelemetry
			};
			setTimeout(() => {
				externalHooks.run("runDataJson.onDragEnd", telemetryPayload);
				telemetry.track("User dragged data for mapping", telemetryPayload);
			}, 1e3);
		};
		const formatKey = (value) => {
			return isString(value) ? `"${value}"` : JSON.stringify(value);
		};
		const formatValue = (value) => {
			return JSON.stringify(value);
		};
		const getListItemName = (path) => {
			return path.replace(/^(\["?\d"?]\.?)/g, "");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "jsonDataContainer",
				ref: jsonDataContainer,
				class: normalizeClass([_ctx.$style.jsonDisplay, {
					[_ctx.$style.highlight]: highlight.value,
					[_ctx.$style.compact]: props.compact
				}])
			}, [(openBlock(), createBlock(Suspense, null, {
				default: withCtx(() => [!__props.editMode.enabled ? (openBlock(), createBlock(unref(LazyRunDataJsonActions), {
					key: 0,
					node: __props.node,
					"pane-type": __props.paneType,
					"push-ref": __props.pushRef,
					"distance-from-active": __props.distanceFromActive,
					"selected-json-path": selectedJsonPath.value,
					"json-data": jsonData.value,
					"output-index": __props.outputIndex,
					"run-index": __props.runIndex,
					execution: __props.execution
				}, null, 8, [
					"node",
					"pane-type",
					"push-ref",
					"distance-from-active",
					"selected-json-path",
					"json-data",
					"output-index",
					"run-index",
					"execution"
				])) : createCommentVNode("", true)]),
				_: 1
			})), createVNode(Draggable_default, {
				type: "mapping",
				"target-data-key": "mappable",
				disabled: !__props.mappingEnabled,
				"can-drop": canDraggableDrop.value,
				"sticky-position": draggableStickyPosition.value,
				onDragstart: onDragStart,
				onDragend: onDragEnd
			}, {
				preview: withCtx(({ canDrop, el }) => [el ? (openBlock(), createBlock(MappingPill_default, {
					key: 0,
					html: getShortKey(el),
					"can-drop": canDrop
				}, null, 8, ["html", "can-drop"])) : createCommentVNode("", true)]),
				default: withCtx(() => [createVNode(unref(P), {
					data: jsonData.value,
					deep: 10,
					"show-length": true,
					"selected-value": selectedJsonPath.value,
					"root-path": "",
					"selectable-type": "single",
					class: "json-data",
					virtual: true,
					height: unref(height),
					"onUpdate:selectedValue": _cache[0] || (_cache[0] = ($event) => selectedJsonPath.value = $event)
				}, {
					renderNodeKey: withCtx(({ node }) => [createVNode(TextWithHighlights_default, {
						content: formatKey(node.key),
						search: __props.search,
						"data-target": "mappable",
						"data-value": getJsonParameterPath(node.path),
						"data-name": node.key,
						"data-path": node.path,
						"data-depth": node.level,
						class: normalizeClass({
							[_ctx.$style.mappable]: __props.mappingEnabled,
							[_ctx.$style.dragged]: draggingPath.value === node.path
						})
					}, null, 8, [
						"content",
						"search",
						"data-value",
						"data-name",
						"data-path",
						"data-depth",
						"class"
					])]),
					renderNodeValue: withCtx(({ node }) => [createVNode(TextWithHighlights_default, {
						content: formatValue(node.content),
						search: __props.search,
						"data-target": "mappable",
						"data-value": getJsonParameterPath(node.path),
						"data-name": getListItemName(node.path),
						"data-path": node.path,
						"data-depth": node.level,
						class: normalizeClass([{
							[_ctx.$style.mappable]: __props.mappingEnabled,
							[_ctx.$style.dragged]: draggingPath.value === node.path
						}, "ph-no-capture"])
					}, null, 8, [
						"content",
						"search",
						"data-value",
						"data-name",
						"data-path",
						"data-depth",
						"class"
					])]),
					_: 1
				}, 8, [
					"data",
					"selected-value",
					"height"
				])]),
				_: 1
			}, 8, [
				"disabled",
				"can-drop",
				"sticky-position"
			])], 2);
		};
	}
});
var RunDataJson_vue_vue_type_style_index_0_lang_module_default = {
	jsonDisplay: "_jsonDisplay_803o3_1",
	mappable: "_mappable_803o3_18",
	highlight: "_highlight_803o3_24",
	dragged: "_dragged_803o3_25",
	compact: "_compact_803o3_30"
};
var RunDataJson_default = /* @__PURE__ */ _plugin_vue_export_helper_default(RunDataJson_vue_vue_type_script_setup_true_lang_default, [["__cssModules", { "$style": RunDataJson_vue_vue_type_style_index_0_lang_module_default }]]);
//#endregion
export { RunDataJson_default as default };
