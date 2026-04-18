import type {
	LengthValue,
	Function as LightningCssFunction,
	TokenOrValue,
} from "lightningcss";

export interface Config {
	minViewPort: number;
	maxViewPort: number;
	baseFontSize: number;
	unit: "vi" | "vw" | "vh" | "vb" | "cqw" | "cqi";
}

export interface Options {
	minViewPort?: number;
	maxViewPort?: number;
	baseFontSize?: number;
	unit?: "vi" | "vw" | "vh" | "vb" | "cqw" | "cqi";
}

const SUPPORTED_UNITS = ["vi", "vw", "vh", "vb", "cqw", "cqi"] as const;

// ----------------------------------------------------------------
// 共通計算ロジック
// ----------------------------------------------------------------

function processFluid(f: LightningCssFunction, options: Config) {
	const getRem = (px: number) => `${px / options.baseFontSize}rem`;

	const getPx = (value: LengthValue) =>
		value.unit === "rem" ? value.value * options.baseFontSize : value.value;

	const setPxValues = (values: TokenOrValue[]) =>
		values.map((value) => {
			if (value.type === "length") return getPx(value.value);
		});

	const setFormulaValues = (values: TokenOrValue[]) =>
		values.map((value) => {
			if (value.type === "length") {
				return value.value.unit === "px"
					? getRem(value.value.value)
					: `${value.value.value}${value.value.unit}`;
			}
			if (value.type === "var") return `var(${value.value.name.ident})`;
		});

	// 個別単位指定を検出
	let customUnit: string | null = null;
	let argumentsWithoutUnit = f.arguments;

	const lastArg = f.arguments[f.arguments.length - 1];
	if (lastArg && lastArg.type === "token") {
		if (
			(lastArg.value.type === "ident" || lastArg.value.type === "string") &&
			(SUPPORTED_UNITS as readonly string[]).includes(lastArg.value.value)
		) {
			customUnit = lastArg.value.value;
			argumentsWithoutUnit = f.arguments.slice(0, -2);
		}
	}

	const currentUnit = customUnit || options.unit;

	const filteredArguments = argumentsWithoutUnit.filter(
		(val) => val.type !== "token",
	);

	const isFormulaOutput = filteredArguments.some((val) => val.type !== "length");

	if (!isFormulaOutput) {
		const [minSize, maxSize, setMinViewPort, setMaxViewPort] =
			setPxValues(filteredArguments);

		const minViewPort = setMinViewPort || options.minViewPort;
		const maxViewPort = setMaxViewPort || options.maxViewPort;

		if (minSize && maxSize) {
			const variablePart = (maxSize - minSize) / (maxViewPort - minViewPort);
			const constant = maxSize - maxViewPort * variablePart;
			const preferred = `${getRem(constant)} + ${100 * variablePart}${currentUnit}`;
			return { min: getRem(minSize), max: getRem(maxSize), preferred, isFormula: false };
		}
	}

	const [minSize, maxSize, setMinViewPort, setMaxViewPort] =
		setFormulaValues(filteredArguments);

	const minViewPort = setMinViewPort || options.minViewPort;
	const maxViewPort = setMaxViewPort || options.maxViewPort;

	const toRem = `(1rem / ${options.baseFontSize})`;
	const min = `(${minSize} * ${toRem})`;
	const max = `(${maxSize} * ${toRem})`;
	const variablePart = `((${maxSize} - ${minSize}) / (${maxViewPort} - ${minViewPort}))`;
	const constant = `(${minSize} - ${variablePart} * ${minViewPort} )`;
	const preferred = `((${constant} * ${toRem}) + ( ${variablePart} * 100${currentUnit}))`;

	return { min, max, preferred, isFormula: true };
}

// ----------------------------------------------------------------
// Plugin
// ----------------------------------------------------------------

export default (opts: Options = {}) => {
	const defaultOptions: Config = {
		minViewPort: 375,
		maxViewPort: 1920,
		baseFontSize: 16,
		unit: "vi",
	};

	const options = Object.assign(defaultOptions, opts);

	return {
		FunctionExit: {
			fluid(f: LightningCssFunction) {
				const result = processFluid(f, options);
				if (!result) return;
				return {
					raw: `clamp(${result.min}, ${result.preferred}, ${result.max})`,
				};
			},
			"fluid-free"(f: LightningCssFunction) {
				const result = processFluid(f, options);
				if (!result) return;
				return {
					raw: `max(${result.min}, ${result.preferred})`,
				};
			},
		},
	};
};
