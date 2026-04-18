#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// =====================
// Guides
// =====================

const FLUID_SETUP_GUIDE = `
# lightningcss-plugin-fluid セットアップガイド

CSS の \`fluid()\` / \`fluid-free()\` 関数を \`clamp()\` / \`max()\` に変換する lightningcss プラグインです。

## インストール

\`\`\`bash
pnpm add lightningcss-plugin-fluid -D
\`\`\`

## vite.config.ts の設定

\`\`\`ts
import { defineConfig } from "vite";
import lightningcss from "vite-plugin-lightningcss"; // or vite built-in css.transformer

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
/* fluid(minSize, maxSize) */
.title {
  font-size: fluid(24px, 48px);
}

/* fluid-free(minSize, maxSize) — 上限なしで伸び続ける */
.hero {
  font-size: fluid-free(24px, 48px);
}

/* 個別に単位指定 */
.text {
  font-size: fluid(16px, 24px, vw);
}

/* ビューポートも指定 */
.text {
  font-size: fluid(16px, 24px, 375px, 1280px);
}

/* ビューポート + 単位を両方指定 */
.text {
  font-size: fluid(16px, 24px, 375px, 1280px, vw);
}
\`\`\`

## 出力例

\`\`\`css
/* fluid() → clamp() */
font-size: clamp(1.5rem, .878641rem + .517799vi, 3rem);

/* fluid-free() → max()（上限なし） */
font-size: max(1.5rem, .878641rem + .517799vi);
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

\`\`\`ts
fluidVisitor({
  unit: "cqi", // コンテナクエリベースに変更
})
\`\`\`
`;

const FLUID_FUNCTIONS_GUIDE = `
# fluid() / fluid-free() 関数リファレンス

## fluid()

\`clamp(minSize, preferred, maxSize)\` を生成します。上下限ともに固定されます。

### 構文

\`\`\`
fluid(minSize, maxSize)
fluid(minSize, maxSize, unit)
fluid(minSize, maxSize, minViewPort, maxViewPort)
fluid(minSize, maxSize, minViewPort, maxViewPort, unit)
\`\`\`

### 引数

| 引数 | 型 | 説明 |
|------|----|------|
| minSize | px / rem | 最小サイズ（必須） |
| maxSize | px / rem | 最大サイズ（必須） |
| unit | vi / vw / vh / vb / cqw / cqi | 個別単位指定（省略可） |
| minViewPort | px | 最小ビューポート（省略可） |
| maxViewPort | px | 最大ビューポート（省略可） |

### 使用例

\`\`\`css
/* 基本 */
font-size: fluid(16px, 24px);
/* → clamp(1rem, .878641rem + .517799vi, 1.5rem) */

/* 単位指定 */
font-size: fluid(16px, 24px, vw);
/* → clamp(1rem, .878641rem + .517799vw, 1.5rem) */

/* ビューポート指定 */
font-size: fluid(16px, 24px, 375px, 1280px);
/* → clamp(1rem, .833333rem + .833333vi, 1.5rem) */

/* CSS カスタムプロパティ */
font-size: fluid(var(--font-sm), var(--font-lg));
\`\`\`

---

## fluid-free()

\`max(minSize, preferred)\` を生成します。下限のみ固定し、上限なしで伸び続けます。

### 構文

\`fluid()\` と同じ引数を受け付けます（maxSize は傾き計算にのみ使用）。

### 使用例

\`\`\`css
/* 基本 */
font-size: fluid-free(16px, 24px);
/* → max(1rem, .878641rem + .517799vi) */

/* 単位指定 */
font-size: fluid-free(16px, 24px, vw);
/* → max(1rem, .878641rem + .517799vw) */
\`\`\`

### fluid() との使い分け

| | fluid() | fluid-free() |
|---|---------|-------------|
| 出力 | clamp() | max() |
| 上限 | あり（maxSize で固定） | なし（大画面で自由に伸びる） |
| 向く用途 | 本文・UI コンポーネント | ヒーロー見出し・装飾要素 |
`;

// =====================
// Helpers
// =====================

function detectInstalledPackages(cwd: string): {
  hasFluid: boolean;
} {
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    const content = fs.readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    return {
      hasFluid: "lightningcss-plugin-fluid" in deps,
    };
  } catch {
    return { hasFluid: true };
  }
}

// =====================
// MCP Server
// =====================

const server = new McpServer({
  name: "lightningcss-plugins-mcp",
  version: "0.1.0",
});

const cwd = process.cwd();
const { hasFluid } = detectInstalledPackages(cwd);

if (hasFluid) {
  server.registerTool(
    "get_fluid_setup",
    {
      description: "lightningcss-plugin-fluid のインストール・vite.config 設定・CSS での基本的な使い方を返す",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: "text", text: FLUID_SETUP_GUIDE }],
    })
  );

  server.registerTool(
    "get_fluid_options",
    {
      description: "lightningcss-plugin-fluid の全オプション（minViewPort・maxViewPort・baseFontSize・unit）の詳細を返す",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: "text", text: FLUID_OPTIONS_GUIDE }],
    })
  );

  server.registerTool(
    "get_fluid_functions",
    {
      description: "fluid() と fluid-free() の引数・出力・使い分けのリファレンスを返す",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: "text", text: FLUID_FUNCTIONS_GUIDE }],
    })
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("lightningcss-plugins-mcp server running on stdio");
}

main().catch(console.error);
