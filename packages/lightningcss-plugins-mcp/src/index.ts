#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// =====================
// Guides
// =====================

const FLUID_SETUP_GUIDE = `
# lightningcss-plugin-fluid セットアップガイド

CSS の \`fluid()\` 関数を \`clamp()\` / \`max()\` / \`min()\` / \`calc()\` に変換する lightningcss プラグインです。

## インストール

\`\`\`bash
pnpm add lightningcss-plugin-fluid -D
\`\`\`

## vite.config.ts の設定

\`\`\`ts
import { defineConfig } from "vite";
import lightningcss from "vite-plugin-lightningcss"; // or vite built-in css.transformer
import fluidVisitor from "lightningcss-plugin-fluid";

export default defineConfig({
  css: {
    transformer: "lightningcss",
    lightningcss: {
      visitor: fluidVisitor({
        minViewPort: 375,
        maxViewPort: 1920,
        baseFontSize: 16,
        unit: "vi",
      }),
    },
  },
});
\`\`\`

## CSS での使い方

\`\`\`css
/* 基本（clamp 出力） */
.title {
  font-size: fluid(24px 48px);
}

/* ビューポート上書き */
.title {
  font-size: fluid(24px 48px, 375px 1280px);
}

/* 上限なし（max() 出力） */
.hero {
  font-size: fluid(24px 48px, free-max);
}

/* snap モード（カンプ幅でスナップして対応幅へ外挿） */
.catch {
  font-size: fluid(40px 80px, snap);
}

/* global snap 設定済み時に classic に戻す */
.text {
  font-size: fluid(16px 24px, fit);
}

/* 単位指定 */
.text {
  font-size: fluid(16px 24px, vw);
}
\`\`\`

## 出力例

\`\`\`css
/* fluid(16px 24px) → clamp() */
font-size: clamp(1rem, calc(.878641rem + .517799vi), 1.5rem);

/* fluid(16px 24px, free-max) → max() */
font-size: max(1rem, calc(.878641rem + .517799vi));

/* fluid(40px 80px, snap) → clamp()（カンプ幅: 440–1440px） */
font-size: clamp(2.3375rem, calc(1.4rem + 4vi), 6.2rem);
\`\`\`
`;

const FLUID_OPTIONS_GUIDE = `
# lightningcss-plugin-fluid オプションリファレンス

## minViewPort

- **型**: \`number\`
- **デフォルト**: \`375\`

流体スケーリングの最小ビューポート幅（px）。

## maxViewPort

- **型**: \`number\`
- **デフォルト**: \`1920\`

流体スケーリングの最大ビューポート幅（px）。

## baseFontSize

- **型**: \`number\`
- **デフォルト**: \`16\`

px → rem 変換の基準フォントサイズ。

## unit

- **型**: \`"vi" | "vw" | "vh" | "vb" | "cqw" | "cqi"\`
- **デフォルト**: \`"vi"\`

流体スケーリングに使用するビューポート単位。

| 単位 | 基準軸 | 用途 |
|------|--------|------|
| \`vi\` | インライン軸（横書き = 幅） | 汎用・推奨 |
| \`vw\` | ビューポート幅 | 横幅基準 |
| \`vh\` | ビューポート高さ | 縦幅基準 |
| \`vb\` | ブロック軸（横書き = 高さ） | 論理プロパティ対応 |
| \`cqw\` | コンテナ幅 | コンテナクエリ対応 |
| \`cqi\` | コンテナインライン軸 | コンテナクエリ・推奨 |

## compMinViewPort

- **型**: \`number\`
- **デフォルト**: \`440\`

\`snap\` モード使用時のカンプ最小幅（px）。CSS内で compMinVP を省略した時に使われる。

## compMaxViewPort

- **型**: \`number\`
- **デフォルト**: \`1440\`

\`snap\` モード使用時のカンプ最大幅（px）。CSS内で compMaxVP を省略した時に使われる。

## mode

- **型**: \`"snap" | undefined\`
- **デフォルト**: \`undefined\`

\`"snap"\` を設定すると、すべての \`fluid()\` 呼び出しがデフォルトで snap モードになります。
プロパティ単位で \`fit\` キーワードを使うと classic モードに戻せます。

\`\`\`ts
fluidVisitor({
  compMinViewPort: 440,
  compMaxViewPort: 1440,
  mode: "snap", // 全体を snap モードに
})
\`\`\`
`;

const FLUID_FUNCTIONS_GUIDE = `
# fluid() 関数リファレンス

\`fluid()\` 単一の関数で、キーワード引数によってすべての出力パターンに対応します。

## 基本構文

\`\`\`
fluid(minSize maxSize)
fluid(minSize maxSize, minVP maxVP)
fluid(minSize maxSize, outputKeyword)
fluid(minSize maxSize, minVP maxVP, outputKeyword)
fluid(minSize maxSize, outputKeyword, unit)
fluid(minSize maxSize, minVP maxVP, outputKeyword, unit)
\`\`\`

引数はカンマ区切りのグループで構成され、キーワード・単位はどのグループに書いても順不同で認識されます。

---

## キーワード一覧

| キーワード | 意味 |
|---|---|
| \`snap\` | このプロパティだけ snap モードで計算（カンプ幅で外挿） |
| \`fit\` | global snap 設定時にこのプロパティだけ classic モードに戻す |
| \`free-max\` | \`max()\` 出力（上限なし） |
| \`free-min\` | \`min()\` 出力（下限なし） |
| \`free\` | \`calc()\` のみ（上下限なし） |
| \`vw\` 等 | 単位上書き（vi / vw / vh / vb / cqw / cqi） |

---

## Classic モード（デフォルト）

対応ビューポート幅（minViewPort–maxViewPort）を基準に線形補間します。

**数式:**
\`\`\`
m = (maxSize - minSize) / (maxVP - minVP)
b = minSize - m * minVP
preferred = calc(b_rem + m * 100<unit>)
\`\`\`

**出力パターン:**
| キーワード | 出力 |
|---|---|
| （なし） | \`clamp(minSize_rem, preferred, maxSize_rem)\` |
| \`free-max\` | \`max(minSize_rem, preferred)\` |
| \`free-min\` | \`min(preferred, maxSize_rem)\` |
| \`free\` | \`preferred\`（calc のみ） |

### 使用例

\`\`\`css
/* 基本 */
font-size: fluid(16px 24px);
/* → clamp(1rem, calc(.878641rem + .517799vi), 1.5rem) */

/* ビューポート上書き */
font-size: fluid(16px 24px, 375px 1280px);
/* → clamp(1rem, calc(.792818rem + .883978vi), 1.5rem) */

/* 上限なし */
font-size: fluid(16px 24px, free-max);
/* → max(1rem, calc(.878641rem + .517799vi)) */

/* 単位指定 */
font-size: fluid(16px 24px, vw);
/* → clamp(1rem, calc(.878641rem + .517799vw), 1.5rem) */

/* 複合 */
font-size: fluid(16px 24px, free-max, vw);
/* → max(1rem, calc(.878641rem + .517799vw)) */

/* CSS カスタムプロパティ */
font-size: fluid(var(--font-sm) var(--font-lg));
\`\`\`

---

## Snap モード

カンプ（デザインカンプ）の幅を基準に線形外挿します。
カンプ幅でのサイズが実際の対応ブラウザ幅でも再現されます。

**有効化方法:**
- インライン: \`snap\` キーワードを追加
- グローバル: オプションで \`mode: "snap"\` を設定

**数式（線形外挿）:**
\`\`\`
m = (maxSize - minSize) / (compMaxVP - compMinVP)
b = minSize - m * compMinVP
preferred = calc(b_rem + m * 100<unit>)

clampMin = floor_rem or S(minViewPort)_rem
clampMax = ceiling_rem or S(maxViewPort)_rem
\`\`\`

**構文（snap 時、lengthペアの解釈が変わる）:**
\`\`\`
fluid(minSize maxSize, snap)
fluid(minSize maxSize, compMinVP compMaxVP, snap)
fluid(minSize maxSize, compMinVP compMaxVP, floor ceiling, snap)
fluid(minSize maxSize, snap, free-max)
fluid(minSize maxSize, snap, free-max, vw)
\`\`\`

### 使用例

\`\`\`css
/* 基本（compMinViewPort: 440 / compMaxViewPort: 1440 設定済み） */
font-size: fluid(40px 80px, snap);
/* → clamp(2.3375rem, calc(1.4rem + 4vi), 6.2rem) */

/* カンプ幅をプロパティ単位で上書き */
font-size: fluid(40px 80px, 768px 1440px, snap);

/* floor / ceiling で絶対上下限を指定 */
font-size: fluid(14px 16px, 440px 1440px, 14px 18px, snap);
/* → clamp(.875rem, calc(.82rem + .2vi), 1.125rem) */

/* snap + 出力モード */
font-size: fluid(40px 80px, snap, free-max);
/* → max(2.3375rem, calc(1.4rem + 4vi)) */

/* snap + 単位（キーワードは順不同） */
font-size: fluid(40px 80px, free-max, snap, vw);
/* → max(2.3375rem, calc(1.4rem + 4vw)) */
\`\`\`

---

## Global snap + inline fit（Classic に戻す）

\`mode: "snap"\` 設定時、特定プロパティだけ classic に戻したい場合は \`fit\` を使います。

\`\`\`css
/* mode: "snap" 設定済みでも、この1行だけ classic */
font-size: fluid(40px 80px, fit);

/* classic + 対応幅上書き */
font-size: fluid(40px 80px, 375px 1280px, fit);

/* classic + free-max */
font-size: fluid(40px 80px, fit, free-max);
\`\`\`
`;

// =====================
// MCP Server
// =====================

const server = new McpServer({
  name: "lightningcss-plugins-mcp",
  version: "0.3.0",
});

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

server.registerTool(
  "get_fluid_setup",
  {
    description: "lightningcss-plugin-fluid のインストール・vite.config 設定・CSS での基本的な使い方を返す",
    inputSchema: {},
    annotations: TOOL_ANNOTATIONS,
  },
  async () => ({
    content: [{ type: "text", text: FLUID_SETUP_GUIDE }],
  })
);

server.registerTool(
  "get_fluid_options",
  {
    description: "lightningcss-plugin-fluid の全オプション（minViewPort・maxViewPort・baseFontSize・unit・compMinViewPort・compMaxViewPort・mode）の詳細を返す",
    inputSchema: {},
    annotations: TOOL_ANNOTATIONS,
  },
  async () => ({
    content: [{ type: "text", text: FLUID_OPTIONS_GUIDE }],
  })
);

server.registerTool(
  "get_fluid_functions",
  {
    description: "fluid() 関数の引数・キーワード・出力パターン・使用例のリファレンスを返す",
    inputSchema: {},
    annotations: TOOL_ANNOTATIONS,
  },
  async () => ({
    content: [{ type: "text", text: FLUID_FUNCTIONS_GUIDE }],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("lightningcss-plugins-mcp server running on stdio");
}

main().catch(console.error);
