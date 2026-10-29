import { Cu as useCssVar, Ed as computed, Id as defineComponent, Nf as unref, Od as createBlock, Qd as openBlock } from "./vendor-z-loPfiR.js";
import { FE as useI18n } from "./app-BkkQzNat.js";
import { a as INSIGHTS_UNIT_MAPPING, t as GRANULARITY_DATE_FORMAT_MASK } from "./insights.constants-CSqQ5A6h.js";
import { s as transformInsightsFailureRate } from "./insights.utils-Cia_8oJL.js";
import { t as smartDecimal } from "./smart-decimal-J4QaRFI_.js";
import { t as Bar } from "./dist-oG9Qh3py.js";
import { t as generateBarChartOptions } from "./chartjs.utils-CXu-dRxK.js";
//#endregion
//#region ../../modules/insights/frontend/src/components/charts/InsightsChartFailureRate.vue
var InsightsChartFailureRate_default = /* @__PURE__ */ defineComponent({
	__name: "InsightsChartFailureRate",
	props: {
		data: {},
		type: {},
		granularity: {},
		startDate: {},
		endDate: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const colorPrimary = useCssVar("--color--primary", document.body);
		const chartOptions = computed(() => generateBarChartOptions({ plugins: { tooltip: { callbacks: { label: (context) => {
			return `${context.dataset.label ?? ""} ${smartDecimal(context.parsed.y)}${INSIGHTS_UNIT_MAPPING[props.type](context.parsed.y)}`;
		} } } } }));
		const chartData = computed(() => {
			const labels = [];
			const data = [];
			for (const entry of props.data) {
				labels.push(GRANULARITY_DATE_FORMAT_MASK[props.granularity](entry.date));
				data.push(transformInsightsFailureRate(entry.values.failureRate));
			}
			return {
				labels,
				datasets: [{
					label: i18n.baseText("insights.banner.title.failureRate"),
					data,
					backgroundColor: colorPrimary.value
				}]
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Bar), {
				"data-test-id": "insights-chart-failure-rate",
				data: chartData.value,
				options: chartOptions.value
			}, null, 8, ["data", "options"]);
		};
	}
});
//#endregion
export { InsightsChartFailureRate_default as default };
