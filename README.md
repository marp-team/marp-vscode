# Marp for VS Code

[![CircleCI](https://img.shields.io/circleci/project/github/marp-team/marp-vscode/master.svg?style=flat-square&logo=circleci)](https://circleci.com/gh/marp-team/marp-vscode/)
[![Codecov](https://img.shields.io/codecov/c/github/marp-team/marp-vscode/master.svg?style=flat-square&logo=codecov)](https://codecov.io/gh/marp-team/marp-vscode)
[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/marp-team.marp-vscode.svg?style=flat-square&logo=visual-studio-code&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)
[![LICENSE](https://img.shields.io/github/license/marp-team/marp-vscode.svg?style=flat-square)](./LICENSE)

**Create slide deck written in [Marp] Markdown on VS Code.**

We will enhance your VS Code as the slide deck writer. Mark `marp: true`, and write your deck!

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/master/images/screenshot.png" width="800" />
</p>

See the documentation of [Marpit Markdown](https://marpit.marp.app/markdown) and [the features of Marp Core](https://github.com/marp-team/marp-core#features) about how to write.

> Please refer **[https://marp.app/][marp]** for more details of Marp ecosystem. We have powerful tools for Marp Markdown: [Marpit Framework](https://marpit.marp.app/), [CLI tool](https://github.com/marp-team/marp-cli), [Web interface](https://web.marp.app/) and so on.

[marp]: https://marp.app/

## Usage

Marp preview will only be enabled when `marp: true` is written in front-matter.

```markdown
---
marp: true
---

# Your slide deck

Start writing!
```

## Features

### Preview Marp Markdown

Marp for VS Code can preview your Marp Markdown with the same way as [a native Markdown preview](https://code.visualstudio.com/docs/languages/markdown#_markdown-preview).

### Export slide deck to PDF, HTML, and image

We have integrated [Marp CLI][marp-cli] to export your deck into several formats.

To export the content of active Markdown editor, open the quick pick from Marp icon on toolbar <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/master/images/icon.png" width="16" height="16" /> and select **"Export slide deck..."**. (`markdown.marp.export`)

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/master/images/export.gif" alt="Export slide deck" width="600" />
</p>

You can also execute command from the Command Palette (<kbd>F1</kbd> or <kbd>Ctrl/Cmd+Shift+P</kbd>).

[marp-cli]: https://github.com/marp-team/marp-cli/

#### Supported file types

- **PDF**: for publishing your deck
- **HTML**: for playing your deck on the browser
- **PNG**, **JPEG** (_First slide only)_: for creating an image of title slide

> ⚠️ Export to PDF and image formats requires to install [Google Chrome](https://www.google.com/chrome/) (or [Chromium](https://www.chromium.org/)). You may also specify the custom path for Chrome and Chromium-based browser by preference `markdown.marp.chromePath` (e.g. [Microsoft Edge Insider](https://www.microsoftedgeinsider.com/)).

### Outline view for each slide

We extend [a native outline view](https://code.visualstudio.com/docs/languages/markdown#_outline-view) to support slide pages in Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/master/images/outline.png" alt="Outline view for each slide" width="400" />
</p>

> ℹ️ Please choose `Sort By: Position` from context menu of its panel if you see incorrect slide order.

### Slide folding in editor

You can fold the content of slide in editor while editing Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/master/images/fold.gif" alt="Slide folding in editor" width="360" />
</p>

## Contributing

Are you interested in contributing? Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

This extension releases under the [MIT License](LICENSE).
