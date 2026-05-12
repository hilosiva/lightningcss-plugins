import type {
	Function as LightningCssFunction,
	TokenOrValue,
} from "lightningcss";

// ----------------------------------------------------------------
// 型定義
// ----------------------------------------------------------------

export type FluidUnit = "vi" | "vw" | "vh" | "vb" | "cqw" | "cqi";
export type FluidMode = "snap" | undefined;
export type OutputMode = "clamp" | "free-max" | "free-min" | "free";

export interface Config {
	minViewPort: number;
	maxViewPort: number;
	baseFontSize: number;
	unit: FluidUnit;
	compMinViewPort?: number;
	compMaxViewPort?: number;
	mode?: FluidMode;
}

export interface Options extends Partial<Config> {}

// ----------------------------------------------------------------
// 定数
// ----------------------------------------------------------------

const SUPPORTED_UNITS = new Set<string>(["vi", "vw", "vh", "vb", "cqw", "cqi"]);
const KEYWORDS = new Set<string>(["snap", "fit", "free", "free-max", "free-min"]);

const DEFAULT_CONFIG: Config = {
	minViewPort: 375,
	maxViewPort: 1920,
	baseFontSize: 16,
	unit: "vi",
	compMinViewPort: 440,
	compMaxViewPort: 1440,
	mode: undefined,
};

// ----------------------------------------------------------------
// ユーティリティ
// ----------------------------------------------------------------

function getRem(px: number, baseFontSize: number): string {
	const val = parseFloat((px / baseFontSize).toFixed(6));
	return `${val}rem`;
}

function getLengthPx(token: TokenOrValue, baseFontSize: number): number | null {
	if (token.type !== "length") return null;
	const v = token.value;
	if (v.unit === "px") return v.value;
	if (v.unit === "rem") return v.value * baseFontSize;
	return null;
}

/**
 * lightningcss の arguments はカンマも TokenOrValue として含まれる。
 * カンマで分割してグループ配列を返す。
 */
function splitByComma(args: TokenOrValue[]): TokenOrValue[][] {
	const groups: TokenOrValue[][] = [];
	let current: TokenOrValue[] = [];

	for (const arg of args) {
		if (arg.type === "token" && arg.value.type === "comma") {
			groups.push(current);
			current = [];
		} else {
			current.push(arg);
		}
	}
	groups.push(current);

	return groups;
}

function stripWhitespace(tokens: TokenOrValue[]): TokenOrValue[] {
	return tokens.filter(
		(t) => !(t.type === "token" && t.value.type === "white-space"),
	);
}

function getIdentValue(token: TokenOrValue): string | null {
	if (token.type !== "token") return null;
	const t = token.value;
	if (t.type === "ident" || t.type === "string") return t.value;
	return null;
}

// ----------------------------------------------------------------
// パース結果の型
// ----------------------------------------------------------------

interface LengthPair {
	a: number;
	b: number;
}

interface VarToken {
	type: "var";
	name: string;
}

type SizePair =
	| { kind: "px"; min: number; max: number }
	| { kind: "var"; minToken: TokenOrValue; maxToken: TokenOrValue };

interface ParsedArgs {
	sizePair: SizePair;
	lengthPairs: LengthPair[];
	keywords: Set<string>;
	unit: FluidUnit | null;
}

// ----------------------------------------------------------------
// parseFluidArgs
// ----------------------------------------------------------------

function parseFluidArgs(
	f: LightningCssFunction,
	baseFontSize: number,
): ParsedArgs | null {
	const groups = splitByComma(f.arguments).map(stripWhitespace);

	// 第1グループ: size pair（必須）
	const g0 = groups[0] ?? [];
	if (g0.length < 2) return null;

	const [tok0, tok1] = g0;

	// size pair の解決
	let sizePair: SizePair;
	const min0 = getLengthPx(tok0, baseFontSize);
	const max0 = getLengthPx(tok1, baseFontSize);

	if (min0 !== null && max0 !== null) {
		sizePair = { kind: "px", min: min0, max: max0 };
	} else if (tok0.type === "var" && tok1.type === "var") {
		sizePair = { kind: "var", minToken: tok0, maxToken: tok1 };
	} else {
		return null;
	}

	// 残りのグループからキーワード・単位・length ペアを収集
	const foundKeywords = new Set<string>();
	let foundUnit: FluidUnit | null = null;
	const lengthPairs: LengthPair[] = [];

	for (let i = 1; i < groups.length; i++) {
		const g = groups[i];

		if (g.length === 1) {
			const ident = getIdentValue(g[0]);
			if (ident && KEYWORDS.has(ident)) {
				foundKeywords.add(ident);
				continue;
			}
			if (ident && SUPPORTED_UNITS.has(ident)) {
				foundUnit = ident as FluidUnit;
				continue;
			}
		}

		if (g.length === 2) {
			const pxA = getLengthPx(g[0], baseFontSize);
			const pxB = getLengthPx(g[1], baseFontSize);
			if (pxA !== null && pxB !== null) {
				lengthPairs.push({ a: pxA, b: pxB });
				continue;
			}
		}

		// 複数トークンのグループ内でキーワード・単位を探す（例: "free-max snap vw" など）
		for (const tok of g) {
			const ident = getIdentValue(tok);
			if (!ident) continue;
			if (KEYWORDS.has(ident)) {
				foundKeywords.add(ident);
			} else if (SUPPORTED_UNITS.has(ident)) {
				foundUnit = ident as FluidUnit;
			}
		}
	}

	return {
		sizePair,
		lengthPairs,
		keywords: foundKeywords,
		unit: foundUnit,
	};
}

// ----------------------------------------------------------------
// buildFluidOutput
// ----------------------------------------------------------------

function buildFluidOutput(
	parsed: ParsedArgs,
	options: Config,
): string | null {
	const { sizePair, lengthPairs, keywords, unit } = parsed;
	const baseFontSize = options.baseFontSize;
	const currentUnit = unit ?? options.unit;

	// 有効モード決定
	const inlineSnap = keywords.has("snap");
	const inlineFit = keywords.has("fit");

	let effectiveMode: "classic" | "snap";
	if (inlineFit) {
		effectiveMode = "classic";
	} else if (inlineSnap || options.mode === "snap") {
		effectiveMode = "snap";
	} else {
		effectiveMode = "classic";
	}

	// 出力モード
	let outputMode: OutputMode = "clamp";
	if (keywords.has("free-max")) outputMode = "free-max";
	else if (keywords.has("free-min")) outputMode = "free-min";
	else if (keywords.has("free")) outputMode = "free";

	// var() ベースの場合は classic のみ対応
	if (sizePair.kind === "var") {
		return buildVarOutput(sizePair, options, currentUnit, outputMode);
	}

	const { min: minSizePx, max: maxSizePx } = sizePair;

	if (effectiveMode === "classic") {
		return buildClassicOutput(
			minSizePx,
			maxSizePx,
			lengthPairs,
			options,
			currentUnit,
			outputMode,
		);
	} else {
		// snap モード
		if (options.compMinViewPort === undefined || options.compMaxViewPort === undefined) {
			console.warn(
				"[lightningcss-plugin-fluid] snap モードには compMinViewPort / compMaxViewPort が必要です。classic にフォールバックします。",
			);
			return buildClassicOutput(
				minSizePx,
				maxSizePx,
				lengthPairs,
				options,
				currentUnit,
				outputMode,
			);
		}
		return buildSnapOutput(
			minSizePx,
			maxSizePx,
			lengthPairs,
			options,
			currentUnit,
			outputMode,
		);
	}
}

// ----------------------------------------------------------------
// Classic モード
// ----------------------------------------------------------------

function buildClassicOutput(
	minSizePx: number,
	maxSizePx: number,
	lengthPairs: LengthPair[],
	options: Config,
	unit: string,
	outputMode: OutputMode,
): string {
	const { baseFontSize } = options;

	// length pair が1つあれば minVP/maxVP 上書き
	const minVP = lengthPairs[0]?.a ?? options.minViewPort;
	const maxVP = lengthPairs[0]?.b ?? options.maxViewPort;

	// m = (maxSize - minSize) / (maxVP - minVP)
	// b = minSize - m * minVP
	const m = (maxSizePx - minSizePx) / (maxVP - minVP);
	const b = minSizePx - m * minVP;

	const bRem = parseFloat((b / baseFontSize).toFixed(6));
	const mPct = parseFloat((m * 100).toFixed(6));

	const preferred = `calc(${bRem}rem + ${mPct}${unit})`;
	const minRem = getRem(minSizePx, baseFontSize);
	const maxRem = getRem(maxSizePx, baseFontSize);

	return formatOutput(outputMode, minRem, preferred, maxRem);
}

// ----------------------------------------------------------------
// Snap モード
// ----------------------------------------------------------------

function buildSnapOutput(
	minSizePx: number,
	maxSizePx: number,
	lengthPairs: LengthPair[],
	options: Config,
	unit: string,
	outputMode: OutputMode,
): string {
	const { baseFontSize, minViewPort, maxViewPort } = options;
	const compMinVP = options.compMinViewPort!;
	const compMaxVP = options.compMaxViewPort!;

	// length pair の解釈
	// snap モード: pair1 = compVP 上書き, pair2 = floor/ceiling
	let resolvedCompMinVP = compMinVP;
	let resolvedCompMaxVP = compMaxVP;
	let floorPx: number | null = null;
	let ceilingPx: number | null = null;

	if (lengthPairs.length >= 1) {
		resolvedCompMinVP = lengthPairs[0].a;
		resolvedCompMaxVP = lengthPairs[0].b;
	}
	if (lengthPairs.length >= 2) {
		floorPx = lengthPairs[1].a;
		ceilingPx = lengthPairs[1].b;
	}

	// 線形外挿
	const m = (maxSizePx - minSizePx) / (resolvedCompMaxVP - resolvedCompMinVP);
	const b = minSizePx - m * resolvedCompMinVP;

	const bRem = parseFloat((b / baseFontSize).toFixed(6));
	const mPct = parseFloat((m * 100).toFixed(6));

	const preferred = `calc(${bRem}rem + ${mPct}${unit})`;
	const minRem = floorPx !== null
		? getRem(floorPx, baseFontSize)
		: getRem(m * minViewPort + b, baseFontSize);
	const maxRem = ceilingPx !== null
		? getRem(ceilingPx, baseFontSize)
		: getRem(m * maxViewPort + b, baseFontSize);

	return formatOutput(outputMode, minRem, preferred, maxRem);
}

// ----------------------------------------------------------------
// var() ベース出力
// ----------------------------------------------------------------

function buildVarOutput(
	sizePair: Extract<SizePair, { kind: "var" }>,
	options: Config,
	unit: string,
	outputMode: OutputMode,
): string {
	const { baseFontSize, minViewPort, maxViewPort } = options;

	const minToken = sizePair.minToken;
	const maxToken = sizePair.maxToken;

	const toRem = `(1rem / ${baseFontSize})`;
	const minName = minToken.type === "var" ? `var(${minToken.value.name.ident})` : "";
	const maxName = maxToken.type === "var" ? `var(${maxToken.value.name.ident})` : "";

	const minRem = `(${minName} * ${toRem})`;
	const maxRem = `(${maxName} * ${toRem})`;
	const mExpr = `((${maxName} - ${minName}) / (${maxViewPort} - ${minViewPort}))`;
	const bExpr = `(${minName} - ${mExpr} * ${minViewPort})`;
	const preferred = `((${bExpr} * ${toRem}) + (${mExpr} * 100${unit}))`;

	return formatOutput(outputMode, minRem, preferred, maxRem);
}

// ----------------------------------------------------------------
// 出力フォーマット
// ----------------------------------------------------------------

function formatOutput(
	mode: OutputMode,
	minVal: string,
	preferred: string,
	maxVal: string,
): string {
	switch (mode) {
		case "clamp":
			return `clamp(${minVal}, ${preferred}, ${maxVal})`;
		case "free-max":
			return `max(${minVal}, ${preferred})`;
		case "free-min":
			return `min(${preferred}, ${maxVal})`;
		case "free":
			return preferred;
	}
}

// ----------------------------------------------------------------
// Plugin
// ----------------------------------------------------------------

export default (opts: Options = {}) => {
	const options: Config = { ...DEFAULT_CONFIG, ...opts };

	return {
		FunctionExit: {
			fluid(f: LightningCssFunction) {
				const parsed = parseFluidArgs(f, options.baseFontSize);
				if (!parsed) return;
				const result = buildFluidOutput(parsed, options);
				if (!result) return;
				return { raw: result };
			},
		},
	};
};
