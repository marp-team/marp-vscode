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

Marp features will be enabled when `marp: true` is written in a front-matter of Markdown document.

```markdown
---
marp: true
---

# Your slide deck

Start writing!
```

It also can toggle by opening the quick picker from toolbar icon <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toolbar-icon.png" width="16" height="16" /> and selecting **"Toggle Marp feature for current Markdown"**. (`markdown.marp.toggleMarpFeature`).

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/toggle.gif" alt="Toggle Marp preview" width="600" />
</p>

## Features

### Preview Marp Markdown

While enabled Marp features by `marp: true`, Marp for VS Code can preview your Marp Markdown with the same way as [a built-in Markdown preview](https://code.visualstudio.com/docs/languages/markdown#_markdown-preview).

If you are not familiar with editing Markdown on VS Code, we recommend to learn what you can do in [VS Code documentation](https://code.visualstudio.com/docs/languages/markdown) at first.

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

| Name                            | Description                                                                                        | [Quick Fix] |
| :------------------------------ | :------------------------------------------------------------------------------------------------- | :---------: |
| `define-math-global-directive`  | Recommend to declare math typesetting library via [`math` global directive][math global directive] |     ✅      |
| `deprecated-dollar-prefix`      | Check [obsoleted directives prefixed by `$`][dollar-prefix]                                        |     ✅      |
| `ignored-math-global-directive` | Report ignored `math` global directive if disabled math by the extension setting                   |             |
| `overloading-global-directive`  | Find out overloaded global directives                                                              |             |
| `unknown-size`                  | Notify if the specified [size preset] was not defined in a theme                                   |             |
| `unknown-theme`                 | Notify a not recognized theme name                                                                 |             |

[quick fix]: https://code.visualstudio.com/docs/editor/refactoring#_code-actions-quick-fixes-and-refactorings
[dollar-prefix]: https://github.com/marp-team/marpit/issues/182
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

Default file type can choose by `markdown.marp.exportType` preference.

> ⚠️ Export except HTML requires to install any one of [Google Chrome](https://www.google.com/chrome/), [Chromium](https://www.chromium.org/), or [Microsoft Edge](https://www.microsoft.com/edge). You may also specify the custom path for Chrome / Chromium-based browser by preference `markdown.marp.chromePath`.

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

When Marp Markdown is enabled, you can use the extended [outline view](https://code.visualstudio.com/docs/languages/markdown#_outline-view) like following. They are enabled by default but you may disable by `markdown.marp.outlineExtension` preference.

#### Outline view for each slide

We extend the outline view to support slide pages in Marp Markdown.

<p align="center">
  <img src="https://raw.githubusercontent.com/marp-team/marp-vscode/main/docs/outline.png" alt="Outline view for each slide" width="400" />
</p>

> ℹ️ Please choose `Sort By: Position` from context menu of its panel if you see incorrect slide order.

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

#### Enable HTML in Marp Markdown 🛡️

You can enable previsualization of HTML code within Marp Markdown with the `markdown.marp.enableHtml` option.

It could allow script injection from untrusted Markdown files. Thus, this feature is disabled as a default and will be _always ignored in the untrusted workspace_. Use with caution.

## Web extension (Early preview)

You can test installing and using Marp extension in VS Code on the Web environment like [github.dev](https://github.dev). The web extension has many limitations:

- _Export command cannot use_ because it is depending on Marp CLI that is not designed for Web. Please use VS Code that is installed to your local environment or GitHub Codespaces.
- Currently, VS Code's Markdown engine for the web seems not be able to extend. Thus, Markdown preview and outline extensions are not available on the web for now.

## Contributing

Are you interested in contributing? Please see [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [the common contributing guideline for Marp team](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md).

## Author

Managed by [@marp-team](https://github.com/marp-team).

- <img src="https://github.com/yhatt.png" width="16" height="16"/> Yuki Hattori ([@yhatt](https://github.com/yhatt))

## License

This extension releases under the [MIT License](LICENSE).
