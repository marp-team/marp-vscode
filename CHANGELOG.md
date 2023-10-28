# Change Log

## [Unreleased]

## v2.8.0 - 2023-10-28

### Changed

- Upgrade Node.js to v18 LTS ([#437](https://github.com/marp-team/marp-vscode/pull/437))
- Upgrade Marp Core to [v3.9.0](https://github.com/marp-team/marp-core/releases/tag/v3.9.0) ([#440](https://github.com/marp-team/marp-vscode/pull/440))
  - Added `lang` global directive
  - Enabled [CSS container query](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries) support for child elements of `section` element by default
- Upgrade Marp CLI to [v3.4.0](https://github.com/marp-team/marp-cli/releases/tag/v3.4.0) ([#444](https://github.com/marp-team/marp-vscode/pull/444))
- Upgrade dependent packages to the latest version ([#445](https://github.com/marp-team/marp-vscode/pull/445))

### Added

- IntelliSense definition for `lang` global directive ([#430](https://github.com/marp-team/marp-vscode/issues/430), [#446](https://github.com/marp-team/marp-vscode/pull/446))

### Fixed

- Disappeared inline elements with `position: relative` that are the direct children of the slide ([#442](https://github.com/marp-team/marp-vscode/issues/442), [#443](https://github.com/marp-team/marp-vscode/pull/443))

## v2.7.0 - 2023-08-04

### Changed

- Upgrade Marp Core to [v3.8.0](https://github.com/marp-team/marp-core/releases/tag/v3.8.0) ([#427](https://github.com/marp-team/marp-vscode/pull/427))
  - Support `paginate: skip` and `paginate: hold` from Marpit framework [v2.5.0](https://github.com/marp-team/marpit/releases/v2.5.0)
- Upgrade Marp CLI to [v3.2.0](https://github.com/marp-team/marp-cli/releases/tag/v3.2.0) ([#427](https://github.com/marp-team/marp-vscode/pull/427))
- Update IntelliSense for `paginate` directive: Suggest new keywords `skip` and `hold` ([#429](https://github.com/marp-team/marp-vscode/pull/429))

### Fixed

- Apply VS Code's link renderer when rendering Markdown in preview ([#428](https://github.com/marp-team/marp-vscode/pull/428))

## v2.6.0 - 2023-04-16

### Added

- Support named anchor links in Markdown preview and exported HTML ([#415](https://github.com/marp-team/marp-vscode/pull/415))

### Changed

- Upgrade Marp Core to [v3.6.0](https://github.com/marp-team/marp-core/releases/tag/v3.6.0) ([#414](https://github.com/marp-team/marp-vscode/pull/414), [#415](https://github.com/marp-team/marp-vscode/pull/415))
- Upgrade Marp CLI to [v2.5.0](https://github.com/marp-team/marp-cli/releases/tag/v2.5.0) ([#415](https://github.com/marp-team/marp-vscode/pull/415))

## v2.5.0 - 2023-02-20

### Changed

- Upgrade Marp Core to [v3.5.0](https://github.com/marp-team/marp-core/releases/tag/v3.5.0) ([#408](https://github.com/marp-team/marp-vscode/pull/408), [#411](https://github.com/marp-team/marp-vscode/pull/411))
- Upgrade Marp CLI to [v2.4.0](https://github.com/marp-team/marp-cli/releases/tag/v2.4.0) ([#408](https://github.com/marp-team/marp-vscode/pull/408), [#410](https://github.com/marp-team/marp-vscode/pull/410))
  - [Slide transitions](https://github.com/marp-team/marp-cli/blob/main/docs/bespoke-transitions/README.md) powered by [View Transition API](https://www.w3.org/TR/css-view-transitions-1/) is stably available
- Upgrade dependent packages to the latest version ([#408](https://github.com/marp-team/marp-vscode/pull/408))

### Added

- Auto completion for [Marp CLI's `transition` local directive](https://github.com/marp-team/marp-cli/blob/main/docs/bespoke-transitions/README.md#transition-local-directive) ([#409](https://github.com/marp-team/marp-vscode/issues/409), [#412](https://github.com/marp-team/marp-vscode/pull/412))

### Fixed

- Mitigate conflicting with `express` module in other extensions while exporting ([#402](https://github.com/marp-team/marp-vscode/issues/402), [#407](https://github.com/marp-team/marp-vscode/issues/407), [#408](https://github.com/marp-team/marp-vscode/pull/408))

## v2.4.1 - 2023-01-09

### Changed

- Upgrade Marp Core to [v3.4.2](https://github.com/marp-team/marp-core/releases/tag/v3.4.2) ([#397](https://github.com/marp-team/marp-vscode/pull/397))
- Upgrade Marp CLI to [v2.3.0](https://github.com/marp-team/marp-cli/releases/tag/v2.3.0) ([#397](https://github.com/marp-team/marp-vscode/pull/397), [#393](https://github.com/marp-team/marp-vscode/issues/393))
- Upgrade dependent packages to the latest version ([#397](https://github.com/marp-team/marp-vscode/pull/397))

## v2.4.0 - 2022-12-11

> 🆙 **This is a first stable release of v2.x!** You can see differences from v1 at [#392](https://github.com/marp-team/marp-vscode/pull/392).

### Breaking

- Marp for VS Code v2 has made as stable release ([#392](https://github.com/marp-team/marp-vscode/pull/392))
- VS Code 1.72 and later required ([#390](https://github.com/marp-team/marp-vscode/pull/390))

### Changed

- Upgrade Marp Core to [v3.4.0](https://github.com/marp-team/marp-core/releases/tag/v3.4.0) ([#390](https://github.com/marp-team/marp-vscode/pull/390))
- Upgrade Marp CLI to [v2.2.2](https://github.com/marp-team/marp-cli/releases/tag/v2.2.2) ([#390](https://github.com/marp-team/marp-vscode/pull/390))
- Upgrade Node.js and dependent packages ([#390](https://github.com/marp-team/marp-vscode/pull/390))

### Removed

- `markdown.marp.toolbarButtonForQuickPick` setting ([#385](https://github.com/marp-team/marp-vscode/issues/385), [#391](https://github.com/marp-team/marp-vscode/pull/391))
  - The toolbar button still can hide from VS Code user interface: https://code.visualstudio.com/updates/v1_72#_hide-actions-from-tool-bars

## v2.3.0 - 2022-09-24

### Added

- `markdown.marp.pdf.outlines` option to generate outlines in exported PDF ([#381](https://github.com/marp-team/marp-vscode/issues/381), [#384](https://github.com/marp-team/marp-vscode/pull/384))

### Changed

- Upgrade Marp Core to [v3.3.3](https://github.com/marp-team/marp-core/releases/tag/v3.3.3) ([#378](https://github.com/marp-team/marp-vscode/pull/378))
- Upgrade Marp CLI to [v2.2.0](https://github.com/marp-team/marp-cli/releases/tag/v2.2.0) ([#384](https://github.com/marp-team/marp-vscode/pull/384))

## v2.2.1 - 2022-08-12

### Changed

- Upgrade Marp Core to [v3.3.2](https://github.com/marp-team/marp-core/releases/tag/v3.3.2) ([#374](https://github.com/marp-team/marp-vscode/pull/374))
- Upgrade Marp CLI to [v2.1.2](https://github.com/marp-team/marp-cli/releases/tag/v2.1.2) ([#375](https://github.com/marp-team/marp-vscode/pull/375))

## v2.2.0 - 2022-08-11

### Breaking

- VS Code >= 1.66 is now required ([#371](https://github.com/marp-team/marp-vscode/pull/371))

### Changed

- Upgrade Marp Core to [v3.3.0](https://github.com/marp-team/marp-core/releases/tag/v3.3.0) ([#371](https://github.com/marp-team/marp-vscode/pull/371))
- Upgrade Marp CLI to [v2.1.0](https://github.com/marp-team/marp-cli/releases/tag/v2.1.0) ([#371](https://github.com/marp-team/marp-vscode/pull/371))
  - macOS: `markdown.marp.chromePath` is now able to recognize the `.app` folder path
- Upgrade Node.js and dependent packages to the latest version ([#371](https://github.com/marp-team/marp-vscode/pull/371))

## v2.1.0 - 2022-06-10

### Added

- `deprecated-color-setting-shorthand` auto-fixable diagnostic for replacing [deprecated shorthands for setting colors](https://github.com/marp-team/marpit/issues/331) ([#358](https://github.com/marp-team/marp-vscode/issues/358), [#366](https://github.com/marp-team/marp-vscode/pull/366))
- Experimental `markdown.marp.strictPathResolutionDuringExport` setting ([#367](https://github.com/marp-team/marp-vscode/pull/367))
- Sponsor button for Visual Studio Marketplace ([#365](https://github.com/marp-team/marp-vscode/pull/365))

## v2.0.1 - 2022-06-06

### Changed

- Upgrade Marp Core to [v3.2.1](https://github.com/marp-team/marp-core/releases/tag/v3.2.1) ([#361](https://github.com/marp-team/marp-vscode/pull/361))
- Upgrade Marp CLI to [v2.0.3](https://github.com/marp-team/marp-cli/releases/tag/v2.0.3) ([#361](https://github.com/marp-team/marp-vscode/pull/361))

### Fixed

- Improved base path resolving in a proxy server for virtual workspace ([#359](https://github.com/marp-team/marp-vscode/issues/359))
- Auto-scaling is not working in the preview ([#360](https://github.com/marp-team/marp-vscode/issues/360))

## v2.0.0 - 2022-06-03

### ⚡️ Breaking

- VS Code >= 1.63 is now required ([#357](https://github.com/marp-team/marp-vscode/pull/357))
- Upgrade Marp Core to [v3.2.0](https://github.com/marp-team/marp-core/releases/tag/v3.2.0) ([#357](https://github.com/marp-team/marp-vscode/pull/357))
  - This is the first version of using v3 core. Refer to [the article of ecosystem update](https://marp.app/blog/202205-ecosystem-update). ([Major changes in Marp Core v3.0.0](https://github.com/marp-team/marp-core/releases/tag/v3.0.0))
- Changed the default of `markdown.marp.mathTypesetting` to `mathjax` ([#357](https://github.com/marp-team/marp-vscode/pull/357))

### Changed

- Upgrade Marp CLI to [v2.0.1](https://github.com/marp-team/marp-cli/releases/tag/v2.0.1) ([#357](https://github.com/marp-team/marp-vscode/pull/357))
- Upgrade dependent packages to the latest version ([#357](https://github.com/marp-team/marp-vscode/pull/357))

## v1.5.2 - 2022-04-22

### Fixed

- Prevent accidental conflict with globally polluted variables by VS Code ([#345](https://github.com/marp-team/marp-vscode/issues/345), [#347](https://github.com/marp-team/marp-vscode/pull/347))
- Prevent accidental conflict between IDs by Markdown headings and internal IDs for preview ([#348](https://github.com/marp-team/marp-vscode/pull/348))

## v1.5.1 - 2022-04-17

### Changed

- Upgrade Marp Core to [v2.4.1](https://github.com/marp-team/marp-core/releases/tag/v2.4.1) ([#343](https://github.com/marp-team/marp-vscode/pull/343))
  - Transform Unicode 14.0 emojis into images
  - Fixed too thickness MathJax math typesettings in PDF rendering
  - Fixed a bug scoped style does not apply styling to pseudo elements `section::before` and `::after` whenever using advanced background image
- Upgrade Marp CLI to [v1.7.1](https://github.com/marp-team/marp-cli/releases/tag/v1.7.1) ([#343](https://github.com/marp-team/marp-vscode/pull/343))
  - Fixed: Cannot write the conversion output to the drive root
- Upgrade Node.js and dependent packages ([#343](https://github.com/marp-team/marp-vscode/pull/343))

## v1.5.0 - 2022-03-06

### Changed

- Upgrade Marp CLI to [v1.7.0: The presenter view update in HTML output](https://github.com/marp-team/marp-cli/releases/tag/v1.7.0) ([#333](https://github.com/marp-team/marp-vscode/pull/333))
- Upgrade dependent packages to the latest version ([#333](https://github.com/marp-team/marp-vscode/pull/333))
- Web extension is no longer early preview ([#334](https://github.com/marp-team/marp-vscode/pull/334))

## v1.4.7 - 2022-01-23

### Changed

- Upgrade Marp Core to [v2.3.2](https://github.com/marp-team/marp-core/releases/tag/v2.3.2) ([#325](https://github.com/marp-team/marp-vscode/pull/325))
- Upgrade Marp CLI to [v1.5.2](https://github.com/marp-team/marp-cli/releases/tag/v1.5.2) ([#325](https://github.com/marp-team/marp-vscode/pull/325))
  - Improved WSL 2 detection and browser resolution
- Upgrade dependent packages to the latest version ([#325](https://github.com/marp-team/marp-vscode/pull/325))

## v1.4.6 - 2021-11-27

### Changed

- Upgrade Marp Core to [v2.3.0](https://github.com/marp-team/marp-core/releases/tag/v2.3.0) ([#316](https://github.com/marp-team/marp-vscode/pull/316))
- Upgrade Marp CLI to [v1.5.0](https://github.com/marp-team/marp-cli/releases/tag/v1.5.0) ([#316](https://github.com/marp-team/marp-vscode/pull/316))
  - Support [`::backdrop` CSS selector provided by Marpit framework](https://marpit.marp.app/inline-svg?id=backdrop-css-selector) in HTML export
- Upgrade dependent packages to the latest version ([#316](https://github.com/marp-team/marp-vscode/pull/316))

### Fixed

- Improve initialization of preview styling in VS Code 1.63 ([#317](https://github.com/marp-team/marp-vscode/pull/317))

## v1.4.5 - 2021-11-22

### Fixed

- Regression about CSS attribute selector with `$=` substring matcher for slide's `class` ([#313](https://github.com/marp-team/marp-vscode/issues/313), [#314](https://github.com/marp-team/marp-vscode/pull/314))

## v1.4.4 - 2021-11-11

### Changed

- Make compatible to upcoming new Markdown preview in VS Code v1.63 ([#307](https://github.com/marp-team/marp-vscode/pull/307))
- Upgrade Marp Core to [v2.2.0](https://github.com/marp-team/marp-core/releases/tag/v2.2.0) ([#309](https://github.com/marp-team/marp-vscode/pull/309))
- Upgrade Marp CLI to [v1.4.2](https://github.com/marp-team/marp-cli/releases/tag/v1.4.2) ([#309](https://github.com/marp-team/marp-vscode/pull/309))
- Upgrade develolpment Node and dependencies to the latest ([#309](https://github.com/marp-team/marp-vscode/pull/309))

## v1.4.3 - 2021-10-06

### Fixed

- Fix regression about export with local custom theme ([#302](https://github.com/marp-team/marp-vscode/issues/302), [#303](https://github.com/marp-team/marp-vscode/pull/303))

## v1.4.2 - 2021-10-02

### Fixed

- Web extension does not recognize custom theme provided by remote URL ([#300](https://github.com/marp-team/marp-vscode/issues/300), [#301](https://github.com/marp-team/marp-vscode/pull/301))

## v1.4.1 - 2021-10-02

### Added

- Custom theme CSS support for web extension ([#289](https://github.com/marp-team/marp-vscode/issues/289), [#298](https://github.com/marp-team/marp-vscode/pull/298))

### Changed

- Completely move build system from rollup to webpack ([#290](https://github.com/marp-team/marp-vscode/pull/290))
- Upgrade Marp CLI to [v1.4.1](https://github.com/marp-team/marp-cli/releases/tag/v1.4.1) ([#295](https://github.com/marp-team/marp-vscode/pull/295))
- Upgrade dependent packages to the latest version ([#299](https://github.com/marp-team/marp-vscode/pull/299))

### Fixed

- Update launch option for testing web extension ([#296](https://github.com/marp-team/marp-vscode/pull/296))

### Removed

- Alert about preview of web extension ([#297](https://github.com/marp-team/marp-vscode/pull/297))

## v1.4.0 - 2021-09-03

### Breaking

- VS Code >= 1.60 is now required ([#283](https://github.com/marp-team/marp-vscode/pull/283))

### Added

- [Early preview] Set up build for Web extension such as [github.dev](https://github.dev) ([#281](https://github.com/marp-team/marp-vscode/issues/281), [#283](https://github.com/marp-team/marp-vscode/pull/283))
- A guide for creating Marp Markdown quickly ([#287](https://github.com/marp-team/marp-vscode/pull/287))

### Fixed

- Fix the default export name for untitled Markdown ([#280](https://github.com/marp-team/marp-vscode/issues/280), [#285](https://github.com/marp-team/marp-vscode/pull/285))

### Changed

- Upgrade Marp CLI to [v1.4.0](https://github.com/marp-team/marp-cli/releases/tag/v1.4.0) ([#282](https://github.com/marp-team/marp-vscode/pull/282))
- Upgrade dependent packages to the latest ([#286](https://github.com/marp-team/marp-vscode/pull/286))

## v1.3.0 - 2021-08-21

### Added

- Auto completion for [`size` global directive](https://github.com/marp-team/marp-core#size-global-directive) ([#276](https://github.com/marp-team/marp-vscode/pull/276))
- `unknown-size` diagnostic: Notify if the specified size preset was not defined in a theme ([#276](https://github.com/marp-team/marp-vscode/pull/276))
- Auto-trigger suggestion for value of supported directives ([#277](https://github.com/marp-team/marp-vscode/pull/277))
- `markdown.marp.pdf.noteAnnotations` config: Add presenter notes to exported PDF as note annotations ([#278](https://github.com/marp-team/marp-vscode/pull/278))
- IntelliSense support for new metadata options in [Marp CLI v1.3.0](https://github.com/marp-team/marp-cli/releases/tag/v1.3.0): `author` and `keywords` global directives ([#279](https://github.com/marp-team/marp-vscode/pull/279))

### Changed

- Update contribution for "New File…" in File menu and welcome screen to stable spec in VS Code 1.59 ([#270](https://github.com/marp-team/marp-vscode/pull/270))
- Upgrade Marp Core to [v2.1.1](https://github.com/marp-team/marp-core/releases/tag/v2.1.1) ([#275](https://github.com/marp-team/marp-vscode/pull/275))
- Upgrade Marp CLI to [v1.3.2](https://github.com/marp-team/marp-cli/releases/tag/v1.3.2) ([#275](https://github.com/marp-team/marp-vscode/pull/275))
- Upgrade dependent packages to the latest ([#275](https://github.com/marp-team/marp-vscode/pull/275))

## v1.2.0 - 2021-07-30

### Added

- IntelliSense and auto-completion for [`math` global directive](https://github.com/marp-team/marp-core#math-global-directive) ([#266](https://github.com/marp-team/marp-vscode/pull/266))
- Diagnostics for `math` global directive ([#267](https://github.com/marp-team/marp-vscode/pull/267))
  - `define-math-global-directive`: Recommend to declare math typesetting library
  - `ignored-math-global-directive`: Report ignored `math` global directive if disabled math by the extension setting
- Handle the export command into non-file scheme ([#262](https://github.com/marp-team/marp-vscode/issues/262), [#269](https://github.com/marp-team/marp-vscode/pull/269))
  - Support direct export from [the remote container](https://code.visualstudio.com/docs/remote/containers) to the local file system

### Fixed

- VS Code 1.58 does not open Workspace Trust from a notification of export command ([#259](https://github.com/marp-team/marp-vscode/issues/259), [#260](https://github.com/marp-team/marp-vscode/pull/260))

### Changed

- Upgrade Marp Core to [v2.1.0](https://github.com/marp-team/marp-core/releases/tag/v2.1.0) ([#265](https://github.com/marp-team/marp-vscode/pull/265))
  - [`math` global directive](https://github.com/marp-team/marp-core#math-global-directive) for switching math typesetting library in current Markdown
- Upgrade Marp CLI to [v1.2.0](https://github.com/marp-team/marp-cli/releases/tag/v1.2.0) ([#265](https://github.com/marp-team/marp-vscode/pull/265))
- Upgrade dependent packages to the latest ([#265](https://github.com/marp-team/marp-vscode/pull/265))
- Use bundled `node-fetch` instead of `axios` to improve install performance ([#268](https://github.com/marp-team/marp-vscode/pull/268))

## v1.1.0 - 2021-07-08

### Added

- `markdown.marp.newMarpMarkdown` command to create empty Marp Markdown ([#255](https://github.com/marp-team/marp-vscode/pull/255))
- Contribution to "New File…" in File menu and welcome screen _(Experimental: Required opt-in by `workbench.welcome.experimental.startEntries` in VS Code 1.58+)_ ([#255](https://github.com/marp-team/marp-vscode/pull/255))
- Allow to disable math typesetting in Marp Markdown by `"markdown.marp.mathTypesetting": "off"` setting ([#256](https://github.com/marp-team/marp-vscode/issues/256), [#258](https://github.com/marp-team/marp-vscode/pull/258))

### Fixed

- Silence `unknown-theme` diagnostic if definition of theme directive is incompleted ([#257](https://github.com/marp-team/marp-vscode/pull/257))

## v1.0.3 - 2021-06-19

### Fixed

- Apply patch to work VS Code built-in scroll stabilizer to Marp preview always (works only in VS Code 1.57+) ([#248](https://github.com/marp-team/marp-vscode/issues/248), [#252](https://github.com/marp-team/marp-vscode/pull/252))

### Changed

- Upgrade Node and dependent packages to the latest ([#253](https://github.com/marp-team/marp-vscode/pull/253))

## v1.0.2 - 2021-06-07

### Changed

- Update documentation of workspace trust ([#244](https://github.com/marp-team/marp-vscode/pull/244))
- Upgrade dependent packages to the latest version ([#245](https://github.com/marp-team/marp-vscode/pull/245))

## v1.0.1 - 2021-05-18

### Fixed

- Wrong highlight in CRLF ([#239](https://github.com/marp-team/marp-vscode/issues/239), [#240](https://github.com/marp-team/marp-vscode/pull/240))

## v1.0.0 - 2021-05-17

### Breaking

- VS Code >= 1.56 is now required ([#231](https://github.com/marp-team/marp-vscode/pull/231))
- Renamed command `markdown.marp.toggleMarpPreview` to `markdown.marp.toggleMarpFeature` ([#235](https://github.com/marp-team/marp-vscode/pull/235))

### Added

- IntelliSense for Marp directives ([#158](https://github.com/marp-team/marp-vscode/issues/158), [#235](https://github.com/marp-team/marp-vscode/pull/235))
  - Auto completion for directive keys and some values
  - Syntax highlight for recognized directive keys
  - Hover help for recognized directives

* `overloading-global-directive` diagnostic: Mark overloaded global directive in the subsequent definition ([#232](https://github.com/marp-team/marp-vscode/pull/232))
* `unknown-theme` diagnostic: Mark if the specified theme name is not recognized by the extension ([#236](https://github.com/marp-team/marp-vscode/pull/236))

### Changed

- Support [Workspace Trust](https://code.visualstudio.com/updates/v1_56#_workspace-trust): Restrict some features in the untrusted workspace ([#231](https://github.com/marp-team/marp-vscode/pull/231))
- Upgrade Marp Core to [v2.0.3](https://github.com/marp-team/marp-core/releases/v2.0.3) ([#237](https://github.com/marp-team/marp-vscode/pull/237))
- Upgrade Marp CLI to [v1.1.1](https://github.com/marp-team/marp-cli/releases/v1.1.1) ([#237](https://github.com/marp-team/marp-vscode/pull/237))
  - PPTX export will become to pre-render images with high resolution
- Upgrade dependent packages to the latest version ([#237](https://github.com/marp-team/marp-vscode/pull/237))

## v0.19.1 - 2021-05-11

### Fixed

- Presenter notes are not applied to PPTX correctly ([#229](https://github.com/marp-team/marp-vscode/issues/229), [#230](https://github.com/marp-team/marp-vscode/pull/230))

### Changed

- Upgrade Marp CLI to [v1.1.0](https://github.com/marp-team/marp-cli/releases/v1.1.0) ([#230](https://github.com/marp-team/marp-vscode/pull/230))

## v0.19.0 - 2021-05-10

### Breaking

- VS Code >= 1.52 is now required ([#225](https://github.com/marp-team/marp-vscode/pull/225))

### Added

- Apply [`markdown.preview.typographer` for VS Code 1.56](https://code.visualstudio.com/updates/v1_56#_markdown-preview-typographer-support) to Marp preview and the export result ([#226](https://github.com/marp-team/marp-vscode/issues/226), [#228](https://github.com/marp-team/marp-vscode/pull/228))
- Improved support for a [virtual workspace](https://code.visualstudio.com/updates/v1_56#_define-whether-your-extension-supports-a-virtual-workspace) ([#224](https://github.com/marp-team/marp-vscode/issues/224), [#225](https://github.com/marp-team/marp-vscode/pull/225))

### Changed

- Upgrade Marp Core to [v2.0.2](https://github.com/marp-team/marp-core/releases/v2.0.2) ([#228](https://github.com/marp-team/marp-vscode/pull/228))
- Upgrade Marp CLI to [v1.0.3](https://github.com/marp-team/marp-cli/releases/v1.0.3) ([#228](https://github.com/marp-team/marp-vscode/pull/228))

## v0.18.0 - 2021-05-01

### Added

- Set up automated publication into [Open VSX](https://open-vsx.org/extension/marp-team/marp-vscode) ([#211](https://github.com/marp-team/marp-vscode/issues/211), [#218](https://github.com/marp-team/marp-vscode/pull/218))
- `markdown.marp.outlineExtension` preference to enable or disable the outline extension ([#212](https://github.com/marp-team/marp-vscode/issues/212), [#221](https://github.com/marp-team/marp-vscode/pull/221))

### Changed

- Upgrade Marp Core to [v2.0.1](https://github.com/marp-team/marp-core/releases/v2.0.1) ([#217](https://github.com/marp-team/marp-vscode/pull/217))
- Upgrade Marp CLI to [v1.0.1](https://github.com/marp-team/marp-cli/releases/v1.0.1) ([#216](https://github.com/marp-team/marp-vscode/pull/216))
- Upgrade development Node and dependent packages to the latest ([#220](https://github.com/marp-team/marp-vscode/pull/220))

## v0.17.3 - 2021-03-14

### Fixed

- Conversion into PPTX takes only the first slide if using Chromium >= v89 ([#202](https://github.com/marp-team/marp-vscode/issues/202), [#205](https://github.com/marp-team/marp-vscode/pull/205))

### Changed

- Upgrade Marp CLI to [v0.23.3](https://github.com/marp-team/marp-cli/releases/v0.23.3) ([#205](https://github.com/marp-team/marp-vscode/pull/205))
- Upgrade dependent packages to the latest version ([#205](https://github.com/marp-team/marp-vscode/pull/205))

## v0.17.2 - 2021-02-11

### Fixed

- KaTeX does not be rendered together with header/footer ([#200](https://github.com/marp-team/marp-vscode/issues/200), [#201](https://github.com/marp-team/marp-vscode/pull/201))

### Changed

- Upgrade to [Marp Core v1.4.3](https://github.com/marp-team/marp-core/releases/v1.4.3) and [Marp CLI v0.23.2](https://github.com/marp-team/marp-cli/releases/v0.23.2) ([#201](https://github.com/marp-team/marp-vscode/pull/201))
- Upgrade dependent packages to the latest version ([#201](https://github.com/marp-team/marp-vscode/pull/201))

## v0.17.1 - 2021-02-07

### Fixed

- VS Code for Web makes broken slide preview on Safari ([#192](https://github.com/marp-team/marp-vscode/issues/192), [#197](https://github.com/marp-team/marp-vscode/pull/197))
- Prevent leaking defined MathJax macros into other Markdown preview ([#195](https://github.com/marp-team/marp-vscode/pull/195))

### Changed

- Upgrade to [Marp Core v1.4.2](https://github.com/marp-team/marp-core/releases/v1.4.2) and [Marp CLI v0.23.1](https://github.com/marp-team/marp-cli/releases/v0.23.1) ([#195](https://github.com/marp-team/marp-vscode/pull/195), [#197](https://github.com/marp-team/marp-vscode/pull/197))
- Upgrade dependent packages to the latest version ([#195](https://github.com/marp-team/marp-vscode/pull/195))
- Make icons for editor action monochrome, to follow [VS Code extension guideline](https://code.visualstudio.com/api/references/extension-guidelines#editor-actions) ([#193](https://github.com/marp-team/marp-vscode/issues/193), [#196](https://github.com/marp-team/marp-vscode/pull/196))
- Rename `master` branch to `main` ([#198](https://github.com/marp-team/marp-vscode/pull/198))

## v0.17.0 - 2020-12-05

### Added

- GitHub Actions workflow to upload packaged VSIX into release page ([#182](https://github.com/marp-team/marp-vscode/issues/182), [#188](https://github.com/marp-team/marp-vscode/pull/188))

### Changed

- Upgrade to [Marp Core v1.4.0](https://github.com/marp-team/marp-core/releases/v1.4.0) ([#186](https://github.com/marp-team/marp-vscode/pull/186))
  - Stopped the confusable auto-detection of syntax highlight for code block
  - Added support for more emoji shorthands
- Upgrade to [Marp CLI v0.23.0](https://github.com/marp-team/marp-cli/releases/v0.23.0) ([#186](https://github.com/marp-team/marp-vscode/pull/186))
  - Export into PDF/image is working with Apple Silicon
  - Auto-detection of Chromium browser for export has supported Microsoft Edge for Linux
  - No longer required restarting VS Code after changing `markdown.marp.chromePath` configuration
- Upgrade development Node LTS to 14 ([#186](https://github.com/marp-team/marp-vscode/pull/186))
- Upgrade dependent packages to the latest version ([#186](https://github.com/marp-team/marp-vscode/pull/186))
- Switch package manager from yarn to npm ([#187](https://github.com/marp-team/marp-vscode/pull/187))

## v0.16.0 - 2020-10-19

### Fixed

- Fix broken background images caused by regression in Chrome >= 85, by updated [Marp CLI v0.22.0](https://github.com/marp-team/marp-cli/releases/v0.22.0) ([#175](https://github.com/marp-team/marp-vscode/issues/175), [#176](https://github.com/marp-team/marp-vscode/pull/176))

### Added

- Support for export through installed Microsoft Edge, by updated [Marp CLI v0.22.0](https://github.com/marp-team/marp-cli/releases/v0.22.0) ([#176](https://github.com/marp-team/marp-vscode/pull/176))

### Changed

- Upgrade to [Marp CLI v0.22.0](https://github.com/marp-team/marp-cli/releases/v0.22.0) ([#176](https://github.com/marp-team/marp-vscode/pull/176))
- Upgrade dependent packages to the latest version ([#177](https://github.com/marp-team/marp-vscode/pull/177))

## v0.15.1 - 2020-09-16

### Fixed

- Fix failure of export with [Snap Chromium](https://snapcraft.io/chromium) in Linux, by updated [Marp CLI v0.21.1](https://github.com/marp-team/marp-cli/releases/v0.21.1) ([#166](https://github.com/marp-team/marp-vscode/issues/166), [#167](https://github.com/marp-team/marp-vscode/pull/167))

> **NOTE:** We've known to fail the export command if both of VS Code and Chromium have installed by snap: [marp-team/marp-cli#287](https://github.com/marp-team/marp-cli/issues/287). It's probably insecure but setting custom Chrome path to [the raw binary of snap Chromium](https://github.com/marp-team/marp-cli/issues/287#issuecomment-693500881) may help you as a workaround.

### Changed

- Upgrade to [Marp Core v1.3.0](https://github.com/marp-team/marp-core/releases/v1.3.0) and [Marp CLI v0.21.1](https://github.com/marp-team/marp-cli/releases/v0.21.1) ([#167](https://github.com/marp-team/marp-vscode/pull/167))
- Upgrade dependent packages to the latest version ([#167](https://github.com/marp-team/marp-vscode/pull/167))

## v0.15.0 - 2020-07-25

### Breaking

- VS Code >= 1.43 ([Electron 7](https://code.visualstudio.com/updates/v1_43#_electron-70-update)) is now required ([#154](https://github.com/marp-team/marp-vscode/pull/154))

### Added

- Open extension settings from quick pick ([#155](https://github.com/marp-team/marp-vscode/pull/155))
- Set up GitHub Dependabot for marp-team packages ([#156](https://github.com/marp-team/marp-vscode/pull/156))

### Changed

- Upgrade to [Marp Core v1.2.2](https://github.com/marp-team/marp-core/releases/v1.2.2) and [Marp CLI v0.20.0](https://github.com/marp-team/marp-cli/releases/v0.20.0) ([#151](https://github.com/marp-team/marp-vscode/pull/151))
- Upgrade development Node and dependent packages to the latest version ([#151](https://github.com/marp-team/marp-vscode/pull/151))
- Migrate from TSLint to ESLint ([#157](https://github.com/marp-team/marp-vscode/pull/157))

## v0.14.0 - 2020-06-14

### Added

- Add `markdown.marp.mathTypesetting` configuration to control math typesetting library for Marp Core's math plugin ([#145](https://github.com/marp-team/marp-vscode/issues/145), [#148](https://github.com/marp-team/marp-vscode/pull/148))

### Changed

- Upgrade to [Marp Core v1.2.0](https://github.com/marp-team/marp-core/releases/v1.2.0) and [Marp CLI v0.18.1](https://github.com/marp-team/marp-cli/releases/v0.18.1) ([#147](https://github.com/marp-team/marp-vscode/pull/147))
- Upgrade dependent packages to the latest version ([#147](https://github.com/marp-team/marp-vscode/pull/147))

## v0.13.0 - 2020-04-18

### Breaking

- VS Code >= 1.40 ([Electron >= 6](https://code.visualstudio.com/updates/v1_40#_electron-60-update)) is now required ([#138](https://github.com/marp-team/marp-vscode/pull/138))

### Changed

- Upgrade to [Marp Core v1.1.1](https://github.com/marp-team/marp-core/releases/v1.1.1) and [Marp CLI v0.17.4](https://github.com/marp-team/marp-cli/releases/v0.17.4) ([#137](https://github.com/marp-team/marp-vscode/pull/137))
- Upgrade dependent packages to the latest version ([#130](https://github.com/marp-team/marp-vscode/pull/130), [#137](https://github.com/marp-team/marp-vscode/pull/137))

## v0.12.1 - 2020-02-23

### Fixed

- Fix failing PDF/PPTX/image export with [Snapd Chromium](https://snapcraft.io/install/chromium/ubuntu), by bumped [Marp CLI v0.17.1](https://github.com/marp-team/marp-cli/releases/tag/v0.17.1) ([#94](https://github.com/marp-team/marp-vscode/issues/94), [#127](https://github.com/marp-team/marp-vscode/pull/127))

### Changed

- Upgrade Marp CLI to [v0.17.1](https://github.com/marp-team/marp-cli/releases/v0.17.1) ([#127](https://github.com/marp-team/marp-vscode/pull/127))
- Upgrade development Node and dependent packages to the latest version ([#127](https://github.com/marp-team/marp-vscode/pull/127))

## v0.12.0 - 2020-01-21

### Added

- Presenter view in the exported HTML, provided by [Marp CLI v0.17.0](https://github.com/marp-team/marp-cli/releases/v0.17.0) ([#118](https://github.com/marp-team/marp-vscode/pull/118))

### Changed

- Upgrade Marp Core to [v1.0.1](https://github.com/marp-team/marp-core/releases/v1.0.1) and Marp CLI to [v0.17.0](https://github.com/marp-team/marp-cli/releases/v0.17.0) ([#118](https://github.com/marp-team/marp-vscode/pull/118))
- Upgrade development Node and dependent packages to the latest version ([#111](https://github.com/marp-team/marp-vscode/pull/111), [#118](https://github.com/marp-team/marp-vscode/pull/118))
- Update community health files ([#107](https://github.com/marp-team/marp-vscode/pull/107))

## v0.11.2 - 2019-11-18

### Fixed

- Last slide visually shifted in HTML export ([#101](https://github.com/marp-team/marp-vscode/issues/101), [#106](https://github.com/marp-team/marp-vscode/pull/106))

### Changed

- Update toolbar icon to match VS Code outline style ([#105](https://github.com/marp-team/marp-vscode/pull/105))
- Upgrade [Marp Core v0.15.2](https://github.com/marp-team/marp-core/releases/tag/v0.15.2) and [Marp CLI v0.16.2](https://github.com/marp-team/marp-cli/releases/tag/v0.16.2) ([#106](https://github.com/marp-team/marp-vscode/pull/106))

## v0.11.1 - 2019-11-17

### Added

- Add documentation about how to enable HTML into README ([#98](https://github.com/marp-team/marp-vscode/issues/98), [#99](https://github.com/marp-team/marp-vscode/pull/99) by [@eric-burel](https://github.com/eric-burel))

### Fixed

- Apply messy workaround to broken logic of theme directory resolution ([#100](https://github.com/marp-team/marp-vscode/issues/100), [#103](https://github.com/marp-team/marp-vscode/pull/103))

### Changed

- Upgrade dependent packages to the latest version ([#102](https://github.com/marp-team/marp-vscode/pull/102))
- Upgrade Node for development to 12 LTS ([#104](https://github.com/marp-team/marp-vscode/pull/104))

## v0.11.0 - 2019-11-07

### Breaking

- VS Code >= 1.36 is now required ([#91](https://github.com/marp-team/marp-vscode/pull/91))
- [GFM strikethrough syntax](https://github.com/marp-team/marp-core/issues/102) added to Marp Core v0.15.0 may break existing slides

### Changed

- Change warning level for dollar prefixed global directives to error ([#90](https://github.com/marp-team/marp-vscode/issues/90), [#92](https://github.com/marp-team/marp-vscode/pull/92))
- Upgrade Marp Core to [v0.15.1](https://github.com/marp-team/marp-core/releases/v0.15.1) and Marp CLI to [v0.16.1](https://github.com/marp-team/marp-cli/releases/v0.16.1) ([#93](https://github.com/marp-team/marp-vscode/pull/93))
- Upgrade dependent packages to the latest version ([#78](https://github.com/marp-team/marp-vscode/pull/78), [#93](https://github.com/marp-team/marp-vscode/pull/93))

### Fixed

- Export command does not respond on Remote WSL extension ([#89](https://github.com/marp-team/marp-vscode/issues/89))

### Removed

- Drop support for VS Code < 1.36 ([#79](https://github.com/marp-team/marp-vscode/issues/79), [#91](https://github.com/marp-team/marp-vscode/pull/91))
- Deprecated dollar prefix support for global directives ([#92](https://github.com/marp-team/marp-vscode/pull/92))

## v0.10.1 - 2019-09-17

### Fixed

- Incorrect style initialization for VS Code preview pane elements ([#74](https://github.com/marp-team/marp-vscode/issues/74), [#75](https://github.com/marp-team/marp-vscode/pull/75))

## v0.10.0 - 2019-09-16

### Added

- Output warning about [deprecated dollar prefix](https://github.com/marp-team/marpit/issues/182) in global directives ([#70](https://github.com/marp-team/marp-vscode/pull/70))

### Changed

- Upgrade Marp Core to [v0.13.1](https://github.com/marp-team/marp-core/releases/v0.13.1) and Marp CLI to [v0.14.1](https://github.com/marp-team/marp-cli/releases/v0.14.1) ([#70](https://github.com/marp-team/marp-vscode/pull/70))
- Disable style minification on preview ([#71](https://github.com/marp-team/marp-vscode/pull/71))
- Update CircleCI configuration to use v2.1 ([#72](https://github.com/marp-team/marp-vscode/pull/72))
- Upgrade dependent packages to the latest version ([#73](https://github.com/marp-team/marp-vscode/pull/73))

## v0.9.0 - 2019-08-28

### Added

- `markdown.marp.toggleMarpPreview` command to toggle Marp preview ([#52](https://github.com/marp-team/marp-vscode/issues/52), [#63](https://github.com/marp-team/marp-vscode/pull/63))

## v0.8.2 - 2019-08-23

### Fixed

- Fix disappeared images in exported PDF on some Windows environment ([#64](https://github.com/marp-team/marp-vscode/issues/64), [#65](https://github.com/marp-team/marp-vscode/pull/65))

### Changed

- Upgrade Marp Core to [v0.12.1](https://github.com/marp-team/marp-core/releases/v0.12.1) and Marp CLI to [v0.13.0](https://github.com/marp-team/marp-cli/releases/v0.13.0) ([#65](https://github.com/marp-team/marp-vscode/pull/65))
- Upgrade dependent packages to the latest version ([#65](https://github.com/marp-team/marp-vscode/pull/65))

## v0.8.1 - 2019-08-01

### Fixed

- Fix regression of not working `size` global directive ([#61](https://github.com/marp-team/marp-vscode/issues/61), [#62](https://github.com/marp-team/marp-vscode/pull/62))

## v0.8.0 - 2019-07-29

### Added

- Custom theme support ([#13](https://github.com/marp-team/marp-vscode/issues/13), [#39](https://github.com/marp-team/marp-vscode/issues/39), [#59](https://github.com/marp-team/marp-vscode/pull/59))

### Changed

- Upgrade Marp Core to [v0.12.0](https://github.com/marp-team/marp-core/releases/v0.12.0) and Marp CLI to [v0.12.1](https://github.com/marp-team/marp-cli/releases/v0.12.1) ([#60](https://github.com/marp-team/marp-vscode/pull/60))
- Upgrade dependent packages to the latest version ([#60](https://github.com/marp-team/marp-vscode/pull/60))

## v0.7.1 - 2019-07-09

### Fixed

- v0.7.0 cannot export slide deck to any types ([#57](https://github.com/marp-team/marp-vscode/issues/57))

## v0.7.0 - 2019-07-09

### Added

- Support export to PowerPoint document (`.pptx`) ([#56](https://github.com/marp-team/marp-vscode/pull/56))
- `markdown.marp.exportType` configuration to set the default export type ([#56](https://github.com/marp-team/marp-vscode/pull/56))

### Changed

- Upgrade Marp CLI to [v0.12.0](https://github.com/marp-team/marp-cli/releases/v0.12.0) ([#56](https://github.com/marp-team/marp-vscode/pull/56))

## v0.6.0 - 2019-06-29

### Added

- [`size` global directive](https://github.com/marp-team/marp-core#size-global-directive) for 4:3 slide deck, from an updated [Marp Core v0.11.0](https://github.com/marp-team/marp-core/releases/v0.11.0) ([#55](https://github.com/marp-team/marp-vscode/pull/55))

### Changed

- Migrate to [`@types/vscode`](https://www.npmjs.com/package/@types/vscode) package ([#54](https://github.com/marp-team/marp-vscode/pull/54))
- Upgrade Marp Core to [v0.11.0](https://github.com/marp-team/marp-core/releases/v0.11.0) and Marp CLI to [v0.11.1](https://github.com/marp-team/marp-cli/releases/v0.11.1) ([#55](https://github.com/marp-team/marp-vscode/pull/55))
- Upgrade dependent packages to the latest version ([#55](https://github.com/marp-team/marp-vscode/pull/55))

## v0.5.2 - 2019-06-17

### Fixed

- Fix wrong hit area for link caused by Marpit polyfill when using VS Code >= 1.36 ([#45](https://github.com/marp-team/marp-vscode/issues/45), [#49](https://github.com/marp-team/marp-vscode/pull/49))
- Better scroll-sync when using VS Code >= 1.36 ([#50](https://github.com/marp-team/marp-vscode/pull/50))

### Changed

- Upgrade Marp Core to [v0.10.1](https://github.com/marp-team/marp-core/releases/v0.10.1) ([#51](https://github.com/marp-team/marp-vscode/pull/51))
- Upgrade dependent packages to the latest version ([#51](https://github.com/marp-team/marp-vscode/pull/51))

## v0.5.1 - 2019-06-12

### Added

- Add `markdown.marp.chromePath` preference to allow setting custom Chrome path ([#44](https://github.com/marp-team/marp-vscode/issues/44), [#46](https://github.com/marp-team/marp-vscode/pull/46))
- Test environment against Node v10.11.0 (Electron 4) ([#48](https://github.com/marp-team/marp-vscode/pull/48))

### Changed

- Upgrade Node for development to v10.16.0 ([#48](https://github.com/marp-team/marp-vscode/pull/48))

## v0.5.0 - 2019-06-03

### Fixed

- Fix not-working Marpit color shorthand ([#40](https://github.com/marp-team/marp-vscode/issues/40), [#42](https://github.com/marp-team/marp-vscode/pull/42))

### Changed

- Upgrade Marp Core to [v0.10.0](https://github.com/marp-team/marp-core/releases/v0.10.0) ([#42](https://github.com/marp-team/marp-vscode/pull/42))
- Upgrade dependent packages to the latest version ([#42](https://github.com/marp-team/marp-vscode/pull/42))

## v0.4.1 - 2019-05-14

### Fixed

- Improve activation performance of extension by lazy-loaded Marp CLI ([#37](https://github.com/marp-team/marp-vscode/pull/37))

## v0.4.0 - 2019-05-13

### Added

- Add toolbar button for quick pick of Marp commands ([#33](https://github.com/marp-team/marp-vscode/issues/33), [#36](https://github.com/marp-team/marp-vscode/pull/36))

## v0.3.2 - 2019-05-11

### Removed

- Remove `vsce` from devDependencies to fix incorrect packaging about `tmp` ([#35](https://github.com/marp-team/marp-vscode/pull/35))

## v0.3.1 - 2019-05-11

### Fixed

- Fix prevented activation of extension ([#34](https://github.com/marp-team/marp-vscode/issues/34))

## v0.3.0 - 2019-05-11

### Added

- Add command to export PDF, HTML, and images via Marp CLI integration (`markdown.marp.export`) ([#4](https://github.com/marp-team/marp-vscode/issues/4), [#30](https://github.com/marp-team/marp-vscode/pull/30))
- Add contributing guideline ([#31](https://github.com/marp-team/marp-vscode/pull/31))
- Automate GitHub release ([#32](https://github.com/marp-team/marp-vscode/pull/32))

### Changed

- Upgrade Marp Core to [v0.9.0](https://github.com/marp-team/marp-core/releases/v0.9.0) ([#29](https://github.com/marp-team/marp-vscode/pull/29))
- Upgrade dependent packages to the latest version ([#29](https://github.com/marp-team/marp-vscode/pull/29), [#32](https://github.com/marp-team/marp-vscode/pull/32))

## v0.2.1 - 2019-04-25

### Fixed

- Improve scroll sync by re-implemented line number mapping to each page ([#25](https://github.com/marp-team/marp-vscode/pull/25))
- Improve engine compatibility with VS Code ([#27](https://github.com/marp-team/marp-vscode/pull/27))

## v0.2.0 - 2019-04-10

### Added

- A separated breaks option `markdown.marp.breaks` for Marp Markdown ([#16](https://github.com/marp-team/marp-vscode/issues/16), [#22](https://github.com/marp-team/marp-vscode/pull/22))
- Outline view support for each slide ([#23](https://github.com/marp-team/marp-vscode/pull/23))
- Make each slide be foldable in editor ([#23](https://github.com/marp-team/marp-vscode/pull/23))

### Fixed

- Refresh Markdown preview on updating configuration (for VS Code >= 1.34) ([#20](https://github.com/marp-team/marp-vscode/pull/20))
- Use Marp Core options when rendering by Marp ([#21](https://github.com/marp-team/marp-vscode/pull/21))

### Changed

- Upgrade Marp Core to [v0.8.0](https://github.com/marp-team/marp-core/releases/v0.8.0) ([#23](https://github.com/marp-team/marp-vscode/pull/23))
- Upgrade dependent packages to the latest version ([#24](https://github.com/marp-team/marp-vscode/pull/24))

## v0.1.0 - 2019-03-22

### Breaking

- Marp renderer can no longer extend by VS Code extensions ([#17](https://github.com/marp-team/marp-vscode/pull/17))

### Changed

- Simplify Marp integration by using independent instance ([#17](https://github.com/marp-team/marp-vscode/pull/17))
- Upgrade dependent packages to the latest ([#19](https://github.com/marp-team/marp-vscode/pull/19))

### Fixed

- Fix misdetection of front-matter in code block ([#18](https://github.com/marp-team/marp-vscode/pull/18))
- Take into account a zoom level when scaling slide via polyfill ([#8](https://github.com/marp-team/marp-vscode/issues/8), [#19](https://github.com/marp-team/marp-vscode/pull/19))

## v0.0.6 - 2019-03-19

### Added

- [Direction keyword](https://marpit.marp.app/image-syntax?id=direction-keyword) for background images, from [Marpit v0.8.0](https://github.com/marp-team/marpit/releases/v0.8.0) ([#14](https://github.com/marp-team/marp-vscode/pull/14))
- "Enable HTML" option (`markdown.marp.enableHtml`) to allow HTML in Marp slide preview ([#10](https://github.com/marp-team/marp-vscode/issues/10), [#15](https://github.com/marp-team/marp-vscode/pull/15))

### Changed

- Upgrade dependent packages to the latest, includes [Marp Core v0.7.0](https://github.com/marp-team/marp-core/releases/v0.7.0) ([#14](https://github.com/marp-team/marp-vscode/pull/14))

## v0.0.5 - 2019-03-02

### Fixed

- Fix not-rendered math by conflict with [Markdown All in One](https://github.com/yzhang-gh/vscode-markdown) extension ([#9](https://github.com/marp-team/marp-vscode/issues/9), [#11](https://github.com/marp-team/marp-vscode/pull/11))

### Changed

- Upgrade dependent packages to the latest ([#11](https://github.com/marp-team/marp-vscode/pull/11))

## v0.0.4 - 2019-02-13

### Changed

- Revert to use SVG twemoji image ([#5](https://github.com/marp-team/marp-vscode/pull/5))
- Upgrade dependent packages to the latest, includes [Marp Core v0.6.1](https://github.com/marp-team/marp-core/releases/v0.6.1) ([#6](https://github.com/marp-team/marp-vscode/pull/6))

## v0.0.3 - 2019-02-08

### Fixed

- Incorrect theme styles caused by VS Code default styles ([#2](https://github.com/marp-team/marp-vscode/issues/2), [#3](https://github.com/marp-team/marp-vscode/pull/3))

## v0.0.2 - 2019-02-08

### Fixed

- Prevent debounce by scrollbar while resizing ([#1](https://github.com/marp-team/marp-vscode/pull/1))

## v0.0.1 - 2019-02-05

- Initial release.
