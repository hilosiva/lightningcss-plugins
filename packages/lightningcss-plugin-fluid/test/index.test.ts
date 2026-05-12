import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import fluidVisitor from "../dist/index";
import type { Config } from "../dist/index";

// ----------------------------------------------------------------
// ヘルパー
// ----------------------------------------------------------------

const transform_ = (input: string, config: Partial<Config> = {}) =>
	transform({
		filename: "input.css",
		code: Buffer.from(input),
		minify: false,
		sourceMap: false,
		drafts: { customMedia: true },
		nonStandard: { deepSelectorCombinator: true },
		errorRecovery: true,
		visitor: composeVisitors([fluidVisitor(config)]),
	}).code.toString();

// ----------------------------------------------------------------
// Classic モード
// ----------------------------------------------------------------

describe("Classic モード", () => {
	it("基本: fluid(16px 24px) → clamp を含む", () => {
		const output = transform_("p { font-size: fluid(16px 24px) }");
		console.log(output);
		expect(output).toContain("clamp(");
	});

	it("VP 指定: fluid(16px 24px, 375px 1280px) → clamp", () => {
		const output = transform_("p { font-size: fluid(16px 24px, 375px 1280px) }");
		console.log(output);
		expect(output).toContain("clamp(");
	});

	it("free-max: max() を含み clamp を含まない", () => {
		const output = transform_("p { font-size: fluid(16px 24px, free-max) }");
		console.log(output);
		expect(output).toContain("max(");
		expect(output).not.toContain("clamp(");
	});

	it("free-min: min() を含み clamp を含まない", () => {
		const output = transform_("p { font-size: fluid(16px 24px, free-min) }");
		console.log(output);
		expect(output).toContain("min(");
		expect(output).not.toContain("clamp(");
	});

	it("free: calc() のみ、clamp/max/min を含まない", () => {
		const output = transform_("p { font-size: fluid(16px 24px, free) }");
		console.log(output);
		expect(output).toContain("calc(");
		expect(output).not.toContain("clamp(");
		expect(output).not.toContain("max(");
		expect(output).not.toContain("min(");
	});

	it("unit: fluid(16px 24px, vw) → vw を含み vi を含まない", () => {
		const output = transform_("p { font-size: fluid(16px 24px, vw) }");
		console.log(output);
		expect(output).toContain("vw");
		expect(output).not.toContain("vi");
	});

	it("free-max + unit: fluid(16px 24px, free-max, vw) → max() と vw", () => {
		const output = transform_("p { font-size: fluid(16px 24px, free-max, vw) }");
		console.log(output);
		expect(output).toContain("max(");
		expect(output).toContain("vw");
	});

	it("var(): fluid(var(--sm) var(--lg)) → clamp を含む", () => {
		const output = transform_("p { font-size: fluid(var(--sm) var(--lg)) }");
		console.log(output);
		expect(output).toContain("clamp(");
	});
});

// ----------------------------------------------------------------
// Snap モード（inline snap キーワード）
// ----------------------------------------------------------------

describe("Snap モード（inline）", () => {
	const snapConfig: Partial<Config> = {
		compMinViewPort: 440,
		compMaxViewPort: 1440,
	};

	it("基本: fluid(40px 80px, snap) → clamp と calc", () => {
		const output = transform_("p { font-size: fluid(40px 80px, snap) }", snapConfig);
		console.log(output);
		expect(output).toContain("clamp(");
		expect(output).toContain("calc(");
	});

	it("カンプ幅 per-call 上書き: fluid(40px 80px, 768px 1440px, snap) → clamp と calc", () => {
		const output = transform_("p { font-size: fluid(40px 80px, 768px 1440px, snap) }", snapConfig);
		console.log(output);
		expect(output).toContain("clamp(");
		expect(output).toContain("calc(");
	});

	it("floor/ceiling: fluid(14px 16px, 440px 1440px, 14px 18px, snap) → .875rem / 1.125rem", () => {
		const output = transform_(
			"p { font-size: fluid(14px 16px, 440px 1440px, 14px 18px, snap) }",
			snapConfig,
		);
		console.log(output);
		// lightningcss が 0.875rem → .875rem に正規化する
		expect(output).toContain(".875rem");
		expect(output).toContain("1.125rem");
	});

	it("snap + free-max: max() と calc", () => {
		const output = transform_("p { font-size: fluid(40px 80px, snap, free-max) }", snapConfig);
		console.log(output);
		expect(output).toContain("max(");
		expect(output).toContain("calc(");
	});

	it("snap + free-min: min() と calc", () => {
		const output = transform_("p { font-size: fluid(40px 80px, snap, free-min) }", snapConfig);
		console.log(output);
		expect(output).toContain("min(");
		expect(output).toContain("calc(");
	});

	it("snap + free: calc のみ（clamp/max/min なし）", () => {
		const output = transform_("p { font-size: fluid(40px 80px, snap, free) }", snapConfig);
		console.log(output);
		expect(output).toContain("calc(");
		expect(output).not.toContain("clamp(");
		expect(output).not.toContain("max(");
		expect(output).not.toContain("min(");
	});

	it("snap + unit: fluid(40px 80px, snap, vw) → vw、vi なし", () => {
		const output = transform_("p { font-size: fluid(40px 80px, snap, vw) }", snapConfig);
		console.log(output);
		expect(output).toContain("vw");
		expect(output).not.toContain("vi");
	});

	it("キーワード順不同: fluid(40px 80px, free-max, snap, vw) → max() と vw", () => {
		const output = transform_("p { font-size: fluid(40px 80px, free-max, snap, vw) }", snapConfig);
		console.log(output);
		expect(output).toContain("max(");
		expect(output).toContain("vw");
	});
});

// ----------------------------------------------------------------
// Global snap モード（mode: "snap"）
// ----------------------------------------------------------------

describe("Global snap モード（mode: \"snap\"）", () => {
	const globalSnapConfig: Partial<Config> = {
		compMinViewPort: 440,
		compMaxViewPort: 1440,
		mode: "snap",
	};

	it("基本: fluid(40px 80px) → snap が自動適用、clamp と calc", () => {
		const output = transform_("p { font-size: fluid(40px 80px) }", globalSnapConfig);
		console.log(output);
		expect(output).toContain("clamp(");
		expect(output).toContain("calc(");
	});

	it("fit で classic に戻す: fluid(40px 80px, fit) → clamp（classic の数式）", () => {
		const snapOutput = transform_("p { font-size: fluid(40px 80px) }", globalSnapConfig);
		const fitOutput = transform_("p { font-size: fluid(40px 80px, fit) }", globalSnapConfig);
		console.log("snap:", snapOutput);
		console.log("fit:", fitOutput);
		// fit は classic に戻すため snap とは異なる preferred 値になる
		expect(fitOutput).toContain("clamp(");
		expect(fitOutput).not.toEqual(snapOutput);
	});

	it("fit + VP 上書き: fluid(40px 80px, 375px 1280px, fit) → clamp（classic）", () => {
		const output = transform_("p { font-size: fluid(40px 80px, 375px 1280px, fit) }", globalSnapConfig);
		console.log(output);
		expect(output).toContain("clamp(");
	});

	it("global snap + free-max: fluid(40px 80px, free-max) → max(", () => {
		const output = transform_("p { font-size: fluid(40px 80px, free-max) }", globalSnapConfig);
		console.log(output);
		expect(output).toContain("max(");
	});

	it("global snap + fit + free-max: fluid(40px 80px, fit, free-max) → max(（classic の数式）", () => {
		const output = transform_("p { font-size: fluid(40px 80px, fit, free-max) }", globalSnapConfig);
		console.log(output);
		expect(output).toContain("max(");
	});
});
