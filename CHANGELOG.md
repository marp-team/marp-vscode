# Change Log

## [Unreleased]

### Breaking

- Marp renderer can no longer extend by VSCode extensions ([#17](https://github.com/marp-team/marp-vscode/pull/17))

### Changed

- Simplify Marp integration by using independent instance ([#17](https://github.com/marp-team/marp-vscode/pull/17))

### Fixed

- Fix misdetection of front-matter in code block ([#18](https://github.com/marp-team/marp-vscode/pull/18))

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
