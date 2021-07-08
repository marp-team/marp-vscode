# Change Log

## [Unreleased]

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
