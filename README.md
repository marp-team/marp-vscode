# Marp for VS Code

[![CircleCI](https://img.shields.io/circleci/project/github/marp-team/marp-vscode/main.svg?style=flat-square&logo=circleci)](https://circleci.com/gh/marp-team/marp-vscode/)
[![Codecov](https://img.shields.io/codecov/c/github/marp-team/marp-vscode/main.svg?style=flat-square&logo=codecov)](https://codecov.io/gh/marp-team/marp-vscode)
[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/marp-team.marp-vscode.svg?style=flat-square&logo=visual-studio-code&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)
[![Open VSX](https://img.shields.io/open-vsx/v/marp-team/marp-vscode?label=Open%20VSX&style=flat-square)](https://open-vsx.org/extension/marp-team/marp-vscode)
[![LICENSE](https://img.shields.io/github/license/marp-team/marp-vscode.svg?style=flat-square)](./LICENSE)

**Create slide deck written in [Marp] Markdown on VS Code.**

We will enhance your VS Code as the slide deck writer. Mark `marp: true`, and write your deck!

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/screenshot.png" width="800" />
</p>

See the documentation of [Marpit Markdown](https://marpit.marp.app/markdown) and [the features of Marp Core](https://github.com/marp-team/marp-core#features) about how to write.

> Please refer **[https://marp.app/][marp]** for more details of Marp ecosystem. We have powerful tools for Marp Markdown: [Marpit Framework](https://marpit.marp.app/), [CLI tool](https://github.com/marp-team/marp-cli), [Web interface](https://web.marp.app/) and so on.

[marp]: https://marp.app/

## Usage

Marp preview for Markdown document will be enabled when `marp: true` is written in front-matter.

```markdown
---
marp: true
---

# Your slide deck

Start writing!
```

It also can toggle by opening the quick picker from toolbar icon <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toolbar-icon.png" width="16" height="16" /> and selecting **"Toggle Marp preview for current Markdown"**. (`markdown.marp.toggleMarpPreview`).

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toggle.gif" alt="Toggle Marp preview" width="600" />
</p>

## Features

### Preview Marp Markdown

Marp for VS Code can preview your Marp Markdown with the same way as [a native Markdown preview](https://code.visualstudio.com/docs/languages/markdown#_markdown-preview).

### Export slide deck to HTML, PDF, PPTX, and image

We have integrated [Marp CLI][marp-cli] to export your deck into several formats.

To export the content of active Markdown editor, open the quick pick from Marp icon on toolbar <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toolbar-icon.png" width="16" height="16" /> and select **"Export slide deck..."**. (`markdown.marp.export`)

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/export.gif" alt="Export slide deck" width="600" />
</p>

You can also execute command from the Command Palette (<kbd>F1</kbd> or <kbd>Ctrl/Cmd+Shift+P</kbd>).

[marp-cli]: https://github.com/marp-team/marp-cli/

#### Supported file types

- **HTML**
- **PDF**
- **PPTX** (PowerPoint document)
- **PNG** (_First slide only)_
- **JPEG** (_First slide only)_

Default file type can choose by `markdown.marp.exportType` preference.

> ⚠️ Export except HTML requires to install any one of [Google Chrome](https://www.google.com/chrome/), [Chromium](https://www.chromium.org/), or [Microsoft Edge](https://www.microsoft.com/edge). You may also specify the custom path for Chrome / Chromium-based browser by preference `markdown.marp.chromePath`.

### Use custom theme

You can register and use [custom theme CSS for Marpit](https://marpit.marp.app/theme-css) / [Marp Core](https://github.com/marp-team/marp-core/tree/main/themes#readme) by setting `markdown.marp.themes`, that includes remote URLs, or relative paths to local files in the current workspace.

```javascript
// Please put `.vscode/settings.json` on your workspace
{
  "markdown.marp.themes": [
    "https://example.com/foo/bar/custom-theme.css",
    "./themes/your-theme.css"
  ]
}
```

It's very similar to [a way for using custom styles in ordinary Markdown preview](https://code.visualstudio.com/docs/languages/markdown#_using-your-own-css). The registered theme can use by specifying theme name in [`theme` global directive](https://marpit.marp.app/directives?id=theme).

```css
/* @theme your-theme */

@import 'default';

section {
  background: #fc9;
}
```

```markdown
---
marp: true
theme: your-theme
---

# Use your own theme
```

Markdown preview will reload updated theme CSS automatically when you edited the registered local CSS file. It's very useful for creating your own theme.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/custom-theme.gif" alt="Use custom theme" width="600" />
</p>

### Outline view for each slide

We extend [a native outline view](https://code.visualstudio.com/docs/languages/markdown#_outline-view) to support slide pages in Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/outline.png" alt="Outline view for each slide" width="400" />
</p>

> ℹ️ Please choose `Sort By: Position` from context menu of its panel if you see incorrect slide order.

### Slide folding in editor

You can fold the content of slide in editor while editing Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/fold.gif" alt="Slide folding in editor" width="360" />
</p>

### Enable HTML in Marp Markdown

You can enable previsualization of HTML code within Marp Markdown with the `markdown.marp.enableHtml` option. This feature is disabled as a default because it could allow script injection from untrusted Markdown files. Use with caution.

## Contributing

Are you interested in contributing? Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [the common contributing guideline for Marp team](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md).

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

This extension releases under the [MIT License](LICENSE).
