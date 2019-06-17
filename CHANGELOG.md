# Change Log

## [Unreleased]

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
