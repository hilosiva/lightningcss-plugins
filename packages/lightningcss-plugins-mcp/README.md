# lightningcss-plugins-mcp

Claude Code 用の MCP サーバーです。`@hilosiva` の lightningcss プラグインのセットアップ・オプション・関数リファレンスを Claude が直接参照できるようにします。

## 対応プラグイン

- [lightningcss-plugin-fluid](https://www.npmjs.com/package/lightningcss-plugin-fluid) — `fluid()` / `fluid-free()` 関数で流体タイポグラフィを実現

## インストール

```bash
pnpm add lightningcss-plugins-mcp -D
```

## セットアップ

プロジェクトルートの `.mcp.json` に追加します：

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

## 提供ツール

プロジェクトの `package.json` を読み取り、インストール済みのプラグインに対応するツールのみを登録します。

### lightningcss-plugin-fluid がインストールされている場合

| ツール名 | 内容 |
|---------|------|
| `get_fluid_setup` | インストール・vite.config 設定・基本的な使い方 |
| `get_fluid_options` | `minViewPort` / `maxViewPort` / `baseFontSize` / `unit` の詳細 |
| `get_fluid_functions` | `fluid()` / `fluid-free()` の引数・出力・使い分け |
