# Contributing to Marp for VS Code

Thank you for taking the time to read how to contribute to Marp for VS Code! This is the guideline for contributing to Marp for VS Code.

We are following [**the contributing guideline of Marp team projects**](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md). _You have to read this before starting work._

## Setup repository

```bash
git clone https://github.com/marp-team/marp-vscode.git
cd ./marp-vscode

npm install
```

## Development

Typically using VS Code's debugger is good. See launch configurations on [`.vscode/launch.json`](../.vscode/launch.json).

### Launch configurations

- **Build and run**: Compile TypeScript and run compiled extension.
- **Run**: Only run compiled extension. It's useful running together with `npm run watch`. Recommend to execute `Restart Debugging` manually when updated source code.
- **Run with extensions**: Run compiled extension with enabled other installed extensions. It's useful to validate the race condition.

#### Environment variants

Launch configurations have 2 extra environment variants `[Web]` and `[Pseudo web]` to [develop web extensions][web extensions].

- **No variant**: Test extension on the new VS Code host. For normal extension development.
- **`[Web]`**: Test web extension on the new browser that opens VS Code web.
- **`[Pseudo web]`**: Test web extension on the new VS Code host that simulates Web environment. In this mode, please note that a contribution to Markdown preview will not work correctly. ([microsoft/vscode#133399](https://github.com/microsoft/vscode/issues/133399))

[web extensions]: https://code.visualstudio.com/api/extension-guides/web-extensions

### Unit testing

Marp team adopts [Jest](https://jestjs.io/) as test runner. This repository can run unit test by `npm run test:unit`.

```bash
npm run test:unit
```

> _NOTE:_ It seems to be difficult to run VSCode's E2E test on Jest. We're welcome to contribute for supporting E2E tests.

### Package VSIX

```bash
npm run package
```

## Release

### Publish to Visual Studio Marketplace (_For maintainer_)

A way to release is different from other projects of Marp Team targeted to npm.

Just run `npm run vsce:publish [major|minor|patch]` at the latest `main` branch. It can [bump version](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md#bump-version) and release to Marketplace at once. Don't forget `git push && git push --tags`!
