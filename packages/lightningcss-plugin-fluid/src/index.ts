import type {
	LengthValue,
	Function as LightningCssFunction,
	TokenOrValue,
} from "lightningcss";

export interface Config {
	minViewPort: number;
	maxViewPort: number;
	baseFontSize: number;
	unit: "vi" | "vw" | "cqw" | "cqi";
}

export interface Options {
	minViewPort?: number;
	maxViewPort?: number;
	baseFontSize?: number;
	unit?: "vi" | "vw" | "cqw" | "cqi";
}

export default (opts: Options = {}) => ({
	FunctionExit: {
		fluid(f: LightningCssFunction) {
			const defaultOptions: Config = {
				minViewPort: 375,
				maxViewPort: 1920,
				baseFontSize: 16,
				unit: "vi",
			};

			const options = Object.assign(defaultOptions, opts);

			let isFormulaOutput = false;

			const getRem = (px: number) => {
				return `${px / options.baseFontSize}rem`;
			};

			const getPx = (value: LengthValue) => {
				if (value.unit === "rem") {
					return value.value * options.baseFontSize;
				}

				return value.value;
			};

			const setPxValues = (values: TokenOrValue[]) => {
				return values.map((value) => {
					if (value.type === "length") {
						return getPx(value.value);
					}
				});
			};

			const setFormulaValues = (values: TokenOrValue[]) => {
				return values.map((value) => {
					if (value.type === "length") {
						return value.value.unit === "px"
							? getRem(value.value.value)
							: `${value.value.value}${value.value.unit}`;
					}

					if (value.type === "var") {
						return `var(${value.value.name.ident})`;
					}
				});
			};

			// 個別単位指定を検出
			let customUnit: string | null = null;
			let argumentsWithoutUnit = f.arguments;

			// 最後の引数が単位指定かチェック
			const lastArg = f.arguments[f.arguments.length - 1];
			if (lastArg && lastArg.type === "token") {
				if (
					(lastArg.value.type === "ident" || lastArg.value.type === "string") &&
					["vi", "vw", "cqw", "cqi"].includes(lastArg.value.value)
				) {
					customUnit = lastArg.value.value;
					// 単位とその前のカンマを除去
					argumentsWithoutUnit = f.arguments.slice(0, -2);
				}
			}

			// 使用する単位を決定
			const currentUnit = customUnit || options.unit;

			// tokenを削除
			const filteredArguments = argumentsWithoutUnit.filter(
				(val) => val.type !== "token",
			);

			if (filteredArguments.some((val) => val.type !== "length")) {
				// Length以外がある場合
				isFormulaOutput = true;
			}

			if (!isFormulaOutput) {
				const [minSize, maxSize, setMinViewPort, setMaxViewPort] =
					setPxValues(filteredArguments);

				const minViewPort = setMinViewPort || options.minViewPort;
				const maxViewPort = setMaxViewPort || options.maxViewPort;

				if (minSize && maxSize) {
					const variablePart =
						(maxSize - minSize) / (maxViewPort - minViewPort);
					const constant = maxSize - maxViewPort * variablePart;

					return {
						raw: `clamp(${getRem(minSize)}, ${getRem(constant)} + ${100 * variablePart}${currentUnit}, ${getRem(maxSize)})`,
					};
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
			const variable = `((${constant} * ${toRem}) + ( ${variablePart} * 100${currentUnit}))`;

			return {
				raw: `clamp(${min}, ${variable}, ${max})`,
			};
		},
	},
});
