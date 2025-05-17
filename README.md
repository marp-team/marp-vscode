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

> Please refer **[https://marp.app/][marp]** for more details of Marp ecosystem. We have powerful tools for Marp Markdown: [Marpit Framework](https://marpit.marp.app/), [Marp Core](https://github.com/marp-team/marp-core), [CLI tool](https://github.com/marp-team/marp-cli) and so on.

[marp]: https://marp.app/

## Usage

Marp features will be enabled when `marp: true` is written in a front-matter of Markdown document.

```markdown
---
marp: true
---

# Your slide deck

Start writing!
```

You can create a new Marp Markdown document from **"New File..."** menu (<kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>Win</kbd> + <kbd>N</kbd> / <kbd>Alt</kbd> + <kbd>Cmd</kbd> + <kbd>Ctrl</kbd> + <kbd>N</kbd>) to start writing a slide deck quickly.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/new-file.gif" alt="Create Marp Markdown" width="500" />
</p>

`marp: true` also can toggle by opening the quick picker from toolbar icon <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toolbar-icon.png" width="16" height="16" /> and selecting **"Toggle Marp feature for current Markdown"**. (`markdown.marp.toggleMarpFeature`).

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toggle.gif" alt="Toggle Marp preview" width="600" />
</p>

## Features

### Preview Marp Markdown

While enabled Marp features by `marp: true`, Marp for VS Code can preview your Marp Markdown with the same way as [a built-in Markdown preview](https://code.visualstudio.com/docs/languages/markdown#_markdown-preview).

In the preview, an active slide is highlighted based on the current position of the editor, as like as the regular Markdown preview. To disable this highlight, you can set `markdown.preview.markEditorSelection` setting to `false`.

> [!NOTE]
> If you are not familiar with editing Markdown on VS Code, we recommend to learn what you can do in [VS Code documentation](https://code.visualstudio.com/docs/languages/markdown) at first.

### IntelliSense for Marp directives

[Directives](https://marpit.marp.app/directives), the inherited feature from [Marpit framework](https://marpit.marp.app/), is an important syntax to write the deck in Marp.

If enabled Marp feature by `marp: true`, Marp for VS Code extends [IntelliSense](https://code.visualstudio.com/docs/editor/intellisense) to support auto completion, syntax highlight, hover help, and diagnostics for Marp directives.

#### Auto completion

Marp for VS Code can suggest global/local directives supported by Marp ecosystem. We remember all so you may forget them! 😛

Hit <kbd>Ctrl</kbd> + <kbd>Space</kbd> within [the front-matter](https://marpit.marp.app/directives?id=front-matter) or [HTML comment](https://marpit.marp.app/directives?id=html-comment) to show the list of directives. You can peek the help of selected directive by hitting <kbd>Ctrl</kbd> + <kbd>Space</kbd> again.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/auto-completion.gif" alt="Auto completion" width="400" />
</p>

Some directives such as `theme` and `paginate` are also supported auto completion for the value.

#### Highlight and hover help

The key of recognized directives are highlighted in the different color from the around. This visualization may help to find out meaningless definitions.

And you can see the help of a defined directive by hovering cursor on the recognized directive.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/highlight-and-hover-help.png" alt="Highlight and hover help" width="426" />
</p>

#### Diagnostics

Marp for VS Code can detect some basic problems in Marp directives. Diagnostics will help following our recommended way for writing slides.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/diagnostics.png" alt="Diagnostics" width="443" />
</p>

| Name                                 | Description                                                                                        | [Quick Fix] |
| :----------------------------------- | :------------------------------------------------------------------------------------------------- | :---------: |
| `define-math-global-directive`       | Recommend to declare math typesetting library via [`math` global directive][math global directive] |     ✅      |
| `deprecated-color-setting-shorthand` | Check [obsoleted shorthands for setting slide colors][color setting shorthand]                     |     ✅      |
| `deprecated-dollar-prefix`           | Check [obsoleted directives prefixed by `$`][dollar-prefix]                                        |     ✅      |
| `ignored-math-global-directive`      | Report ignored `math` global directive if disabled math by the extension setting                   |             |
| `overloading-global-directive`       | Find out overloaded global directives                                                              |             |
| `unknown-size`                       | Notify if the specified [size preset] was not defined in a theme                                   |             |
| `unknown-theme`                      | Notify a not recognized theme name                                                                 |             |

[quick fix]: https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings
[dollar-prefix]: https://github.com/marp-team/marpit/issues/182
[color setting shorthand]: https://github.com/marp-team/marpit/issues/331
[math global directive]: https://github.com/marp-team/marp-core#math-global-directive
[size preset]: https://github.com/marp-team/marp-core/tree/main/themes#size-name-width-height

### Export slide deck to HTML, PDF, PPTX, and image 🛡️

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
- **TXT** (_Notes only)_

Default file type can choose by the `markdown.marp.exportType` setting.

> [!IMPORTANT]
> Exporting PDF, PPTX, and image formats requires to install any one of [Google Chrome](https://www.google.com/chrome/), [Chromium](https://www.chromium.org/), [Microsoft Edge](https://www.microsoft.com/edge), or [Firefox](https://www.mozilla.org/firefox/). You may control using browser and the custom path for the browser by `markdown.marp.browser` and `markdown.marp.browserPath` settings.

> [!NOTE]
> A legacy setting `markdown.marp.chromePath` is deprecated since v2. Please use `markdown.marp.browserPath` instead.

#### Integration with GitHub Copilot agent mode

Marp for VS Code also provides the export tool for [GitHub Copilot agent mode](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode).

By instructing to export Markdown in the specified file format, Copilot in the agent mode can process the export using preferences in the current workspace.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/copilot-agent.png" alt="Integration with GitHub Copilot agent mode" width="280" />
</p>

<!--

Developer note:

Currently the export command can be accessible from GitHub Copilot Chat with `#exportMarp`, but this is not intended design. Do not mention to `#exportMarp` in README.

Users may feel strange to attach the side-effect command like `#exportMarp` as the chat context, so we want to hide this command. However, the current VS Code API does not support splitting contributions for agent's tool and for references in the chat.

https://github.com/microsoft/vscode/issues/245129#issuecomment-2767129358

-->

### Use custom theme CSS 🛡️

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

### Outline extension

When Marp Markdown is enabled, you can use the extended [outline view](https://code.visualstudio.com/docs/languages/markdown#_outline-view) like following. They are enabled by default but you may disable by the `markdown.marp.outlineExtension` setting.

#### Outline view for each slide

We extend the outline view to support slide pages in Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/outline.png" alt="Outline view for each slide" width="400" />
</p>

> [!TIP]
>
> Please choose `Sort By: Position` from context menu of its panel if you see incorrect slide order.

#### Slide folding in editor

You can fold the content of slide in editor while editing Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/fold.gif" alt="Slide folding in editor" width="360" />
</p>

### Security

#### [Workspace Trust]

Some features that may met malicious are restricted in the untrusted workspace/window. Please read [VS Code's user guide][workspace trust] for details.

Features may be restricted are marked by the shield icon 🛡️ in this documentation. Marp for VS Code is available even if the current workspace is not trusted but you can use only a basic Marp preview and IntelliSense.

[workspace trust]: https://code.visualstudio.com/docs/editor/workspace-trust

#### HTML elements in Markdown 🛡️

In the trusted workspace, if Marp Markdown was included HTML elements, [only selectivity HTML elements by Marp](https://github.com/marp-team/marp-core/blob/main/src/html/allowlist.ts) can render by default. You can control which HTML elements will be rendered by setting the `markdown.marp.html` option,

You can control which HTML elements will be rendered by setting the `markdown.marp.html` option. You can set it as `all` to allow all HTML elements, but could allow script injection from untrusted Markdown files. Use with caution.

In the untrusted workspace, HTML elements in Marp Markdown will be always ignored regardless of the selected option in `markdown.marp.html`.

> [!NOTE]
> A legacy setting `markdown.marp.enableHtml` is deprecated since v2. Please use `markdown.marp.html` instead.

## Experimental settings

Some of settings are marked as experimental. These feature may be unstable and change the spec in the future.

### [`markdown.marp.pptx.editable`](https://github.com/marp-team/marp-vscode/pull/489)

You can enable the experimental feature to export PPTX with editable contents, based on [Marp CLI's corresponding experimental option](https://github.com/marp-team/marp-cli#experimental-generate-editable-pptx---pptx-editable). This feature requires to install both of the compatible browser and [LibreOffice Impress](https://www.libreoffice.org/).

If set this setting as `smart`, Marp for VS Code will try to export into editable PPTX first, and then fallback to the regular PPTX export (non-editable) if failed.

### [`markdown.marp.strictPathResolutionDuringExport`](https://github.com/marp-team/marp-vscode/pull/367)

This experimental setting is useful to improve the export result compatibility with VS Code preview. If enabled, the export command will try to resolve relative paths in Markdown from VS Code workspace that a Markdown file belongs.

If disabled, or the Markdown does not belong to any workspace, the export command will resolve paths based on the local file system. This behavior is same as [Marp CLI](https://github.com/marp-team/marp-cli).

## Web extension

You can use Marp extension in VS Code for the Web environment like [vscode.dev](https://vscode.dev) and [github.dev](https://github.dev). Try opening https://github.dev/marp-team/marp-vscode/blob/main/docs/example.md, with an environment that has installed Marp extension.

The web extension has some limitations:

- _Export command cannot use_ because it is depending on Marp CLI that is not designed for Web. Please use VS Code that is installed to your local environment, or use either [VS Code Server](https://code.visualstudio.com/docs/remote/vscode-server) or [GitHub Codespaces](https://github.com/features/codespaces) if you wanted an environment working on Web.

## Contributing

Are you interested in contributing? Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [the common contributing guideline for Marp team](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md).

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

This extension releases under the [MIT License](LICENSE).
