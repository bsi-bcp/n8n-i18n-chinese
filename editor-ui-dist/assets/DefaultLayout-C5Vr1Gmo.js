import { Hd as createVNode, Id as createBlock, Wd as defineComponent, of as openBlock, uf as resolveComponent, xf as withCtx } from "./vendor-D9HlBS7Y.js";
import { $S as BaseLayout_default } from "./app-C1H1qOk3.js";
import { t as AppSidebar_default } from "./AppSidebar-DOUfU5RS.js";
//#endregion
//#region src/app/layouts/DefaultLayout.vue
var DefaultLayout_default = /* @__PURE__ */ defineComponent({
	__name: "DefaultLayout",
	setup(__props) {
		return (_ctx, _cache) => {
			const _component_RouterView = resolveComponent("RouterView");
			return openBlock(), createBlock(BaseLayout_default, null, {
				sidebar: withCtx(() => [createVNode(AppSidebar_default)]),
				default: withCtx(() => [createVNode(_component_RouterView)]),
				_: 1
			});
		};
	}
});
//#endregion
export { DefaultLayout_default as default };
