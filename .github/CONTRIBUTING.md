# Contributing to Marp for VS Code

Thank you for taking the time to read how to contribute to Marp for VS Code! This is the guideline for contributing to Marp for VS Code.

We are following [**the contributing guideline of Marp team projects**](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md). _You have to read this before starting work._

## Setup repository

The most important difference of Marp for VS Code from common Marp team packages is **using npm package manager instead of yarn**.

```bash
git clone https://github.com/marp-team/marp-vscode.git
cd ./marp-vscode

npm install
```

We had met the trouble of VSIX packaging with yarn many times. [An opened issue in vscode-vsce](https://github.com/microsoft/vscode-vsce/issues/432) is not so received attentions from developers in spite of that many extension authors are using yarn.

Thus, using `npm` is the safest way to develop stable VS Code extension continuously for now.

## Development

Typically using VS Code's debugger is good. See launch configurations on [`.vscode/launch.json`](../.vscode/launch.json)

### Launch configurations

- **Build and run**: Compile TypeScript and run compiled extension.
- **Run**: Only run compiled extension. It's useful running together with `npm run watch`. Recommend to execute `Restart Debugging` manually when updated source code.
- **Run with extensions**: Run compiled extension with enabled other installed extensions. It's useful to validate the race condition.

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

Just run `npm run vsce:publish [major|minor|patch]` at the latest `master` branch. It can [bump version](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md#bump-version) and release to Marketplace at once. Don't forget `git push && git push --tags`!
