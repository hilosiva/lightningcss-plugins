# lightningcss-plugin-fluid

CSS の `fluid()` 関数を `clamp()` / `max()` / `min()` / `calc()` に変換する LightningCSS プラグインです。

キーワード引数でモードを切り替えられます。

## インストール

```bash
pnpm add lightningcss-plugin-fluid -D
```

## セットアップ

`visitor` に `composeVisitors` を使って登録します。以下は `vite` を使っている場合の例です。

`vite.config.ts`
```ts
import { defineConfig } from "vite";
import { composeVisitors } from "lightningcss";
import fluidVisitor from "lightningcss-plugin-fluid";

export default defineConfig({
  css: {
    transformer: "lightningcss",
    lightningcss: {
      visitor: composeVisitors([fluidVisitor({
        minViewPort: 375,
        maxViewPort: 1920,
      })]),
    },
  },
});
```

> `vite` のドキュメントには `css.lightningcss` の `visitor` オプションは記載されていませんが、内部的には設定できます（TypeScript では型エラーになる場合があります）。

## 使い方

```css
fluid(minSize maxSize)
fluid(minSize maxSize, minVP maxVP)
fluid(minSize maxSize, keyword)
fluid(minSize maxSize, minVP maxVP, keyword)
fluid(minSize maxSize, keyword, unit)
```

`minSize` と `maxSize` は必須で、`px` または `rem` で指定します。  
それ以外の引数はカンマ区切りのグループで、**キーワードと単位はどのグループでも順不同**で認識されます。

### 基本例

```css
/* clamp() 出力（デフォルト） */
font-size: fluid(16px 24px);
/* → clamp(1rem, calc(.878641rem + .517799vi), 1.5rem) */

/* ビューポートを指定 */
font-size: fluid(16px 24px, 375px 1280px);

/* 単位を指定 */
font-size: fluid(16px 24px, vw);
/* → clamp(1rem, calc(.878641rem + .517799vw), 1.5rem) */

/* ビューポート + 単位 */
font-size: fluid(16px 24px, 375px 1280px, vw);
```

## キーワード

### 出力モード

| キーワード | 出力 | 説明 |
|---|---|---|
| （なし） | `clamp()` | 上下限あり（デフォルト） |
| `free-max` | `max()` | 上限なし（下限のみ固定） |
| `free-min` | `min()` | 下限なし（上限のみ固定） |
| `free` | `calc()` のみ | 上下限なし |

```css
/* 上限なし（ヒーロー見出しなど） */
font-size: fluid(24px 48px, free-max);
/* → max(1.5rem, calc(1.25728rem + 1.0356vi)) */

/* 下限なし */
font-size: fluid(24px 48px, free-min);
/* → min(calc(1.25728rem + 1.0356vi), 3rem) */

/* 上下限なし */
font-size: fluid(24px 48px, free);
/* → calc(1.25728rem + 1.0356vi) */

/* 組み合わせ（順不同） */
font-size: fluid(16px 24px, free-max, vw);
font-size: fluid(16px 24px, vw, free-max);  /* 同じ結果 */
```

### スナップモード（`snap` / `fit`）

カンプ（デザインカンプ）の幅と実際の対応幅が異なる場合に、カンプ通りの値を再現します。

**通常の `fluid()`**: minSize / maxSize が「対応幅の両端での値」  
**snap モード**: minSize / maxSize が「カンプ幅の両端での値」→ 対応幅まで線形外挿

```css
/* snap: カンプ幅(440-1440px)を基点に対応幅(375-1920px)まで外挿 */
font-size: fluid(40px 80px, snap);
/* → clamp(2.3375rem, calc(1.4rem + 4vi), 6.2rem) */

/* カンプ幅を per-call で上書き */
font-size: fluid(40px 80px, 768px 1440px, snap);

/* floor / ceiling で絶対上下限を指定 */
font-size: fluid(14px 16px, 440px 1440px, 14px 18px, snap);
/* → clamp(.875rem, calc(.82rem + .2vi), 1.125rem) */

/* snap + 出力モード（順不同） */
font-size: fluid(40px 80px, snap, free-max);
font-size: fluid(40px 80px, free-max, snap, vw);
```

`mode: "snap"` オプションでプロジェクト全体をスナップモードにした場合、`fit` キーワードで個別に通常モードへ戻せます。

```css
/* mode: "snap" 設定済み時に、この1行だけ通常モード */
font-size: fluid(16px 24px, fit);
font-size: fluid(16px 24px, 375px 1280px, fit);
font-size: fluid(16px 24px, fit, free-max);
```

## カスタムプロパティ

```css
/* 単位なし px 値のカスタムプロパティに対応 */
--font-sm: 14;
--font-lg: 20;

font-size: fluid(var(--font-sm) var(--font-lg));
```

## オプション

| オプション名 | 既定値 | 型 | 説明 |
|---|---|---|---|
| `minViewPort` | `375` | `number` | 対応ブラウザの最小ビューポート幅（px） |
| `maxViewPort` | `1920` | `number` | 対応ブラウザの最大ビューポート幅（px） |
| `baseFontSize` | `16` | `number` | px → rem 変換の基準フォントサイズ |
| `unit` | `"vi"` | `"vi" \| "vw" \| "vh" \| "vb" \| "cqw" \| "cqi"` | 流体スケーリングに使用する単位 |
| `minCompSize` | `440` | `number` | snap モードのカンプ最小幅デフォルト（px） |
| `maxCompSize` | `1440` | `number` | snap モードのカンプ最大幅デフォルト（px） |
| `mode` | `undefined` | `"snap" \| undefined` | `"snap"` でプロジェクト全体をスナップモードに |

```ts
fluidVisitor({
  minViewPort: 375,
  maxViewPort: 1920,
  baseFontSize: 16,
  unit: "vi",

  // snap モードを使う場合
  minCompSize: 440,
  maxCompSize: 1440,
  mode: "snap", // 全体スナップON（省略時は inline snap キーワードのみ有効）
})
```

## Claude Code MCP サーバー

[lightningcss-plugins-mcp](https://www.npmjs.com/package/lightningcss-plugins-mcp) を使うと、Claude Code がこのプラグインのセットアップ・オプション・関数の使い方を直接参照できます。

```bash
pnpm add lightningcss-plugins-mcp -D
```

`.mcp.json` に追加：

```json
{
  "mcpServers": {
    "lightningcss-plugins": {
      "command": "npx",
      "args": ["lightningcss-plugins-mcp"]
    }
  }
}
```
