import { composeVisitors, transform } from "lightningcss";
import { describe, expect, it } from "vitest";
import fluidVisitor from "../dist/index";
import type { Config } from "../dist/index";

describe("fluidVisitor", () => {
	it("should transform fluid function correctly", () => {
		const input = "p {font-size: fluid(16px 24px)} ";

		const output = transform({
			filename: "input.css",
			code: Buffer.from(input),
			minify: false,
			sourceMap: false,
			drafts: {
				customMedia: true,
			},
			nonStandard: {
				deepSelectorCombinator: true,
			},
			errorRecovery: true,
			visitor: composeVisitors([fluidVisitor()]),
		}).code.toString();

		console.log(output);

		expect(output).toContain("clamp");
		expect(output).toContain("1rem");
		expect(output).toContain("1.5rem");
	});

	it("should handle custom configuration", () => {
		const input = "p {font-size: fluid(1rem  1.5rem, 360px 768px)} ";

		const customConfig: Partial<Config> = {
			minViewPort: 320,
			maxViewPort: 1280,
			baseFontSize: 16,
			unit: "cqi",
		};

		const output = transform({
			filename: "input.css",
			code: Buffer.from(input),
			minify: false,
			sourceMap: false,
			drafts: {
				customMedia: true,
			},
			nonStandard: {
				deepSelectorCombinator: true,
			},
			errorRecovery: true,
			visitor: composeVisitors([fluidVisitor(customConfig)]),
		}).code.toString();

		console.log(output);

		expect(output).toContain("clamp");
		expect(output).toContain("1rem");
		expect(output).toContain("1.5rem");
		expect(output).toContain("cqi");
	});
	it("should handle custom property", () => {
		const input = "p {font-size: fluid(var(--font-sm) var(--font-lg))} ";

		const output = transform({
			filename: "input.css",
			code: Buffer.from(input),
			minify: false,
			sourceMap: false,
			drafts: {
				customMedia: true,
			},
			nonStandard: {
				deepSelectorCombinator: true,
			},
			errorRecovery: true,
			visitor: composeVisitors([fluidVisitor()]),
		}).code.toString();

		console.log(output);

		expect(output).toContain("clamp");
	});

	it("should handle individual unit specification", () => {
		const input = "p {font-size: fluid(16px, 24px, vw)} ";

		const output = transform({
			filename: "input.css",
			code: Buffer.from(input),
			minify: false,
			sourceMap: false,
			drafts: {
				customMedia: true,
			},
			nonStandard: {
				deepSelectorCombinator: true,
			},
			errorRecovery: true,
			visitor: composeVisitors([fluidVisitor()]),
		}).code.toString();

		console.log(output);

		expect(output).toContain("clamp");
		expect(output).toContain("vw");
		expect(output).not.toContain("vi"); // デフォルトのviが使われていないことを確認
	});

	it("should handle individual unit with viewport specification", () => {
		const input = "p {font-size: fluid(16px, 24px, 320px, 1280px, cqi)} ";

		const output = transform({
			filename: "input.css",
			code: Buffer.from(input),
			minify: false,
			sourceMap: false,
			drafts: {
				customMedia: true,
			},
			nonStandard: {
				deepSelectorCombinator: true,
			},
			errorRecovery: true,
			visitor: composeVisitors([fluidVisitor()]),
		}).code.toString();

		console.log(output);

		expect(output).toContain("clamp");
		expect(output).toContain("cqi");
		expect(output).not.toContain("vi");
	});

	it("should use global config when no individual unit specified", () => {
		const input = "p {font-size: fluid(16px, 24px)} ";

		const customConfig: Partial<Config> = {
			unit: "cqw",
		};

		const output = transform({
			filename: "input.css",
			code: Buffer.from(input),
			minify: false,
			sourceMap: false,
			drafts: {
				customMedia: true,
			},
			nonStandard: {
				deepSelectorCombinator: true,
			},
			errorRecovery: true,
			visitor: composeVisitors([fluidVisitor(customConfig)]),
		}).code.toString();

		console.log(output);

		expect(output).toContain("clamp");
		expect(output).toContain("cqw");
	});
});
