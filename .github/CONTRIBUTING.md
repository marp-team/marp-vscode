# Contributing to Marp for VS Code

Thank you for taking the time to read how to contribute to Marp for VS Code! This is the guideline for contributing to Marp for VS Code.

We are following [**the contributing guideline of Marp team projects**](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md). _You have to read this before starting work._

## Development

Typically using VS Code's debugger is good. See launch configurations on [`.vscode/launch.json`](../.vscode/launch.json)

### Launch configurations

- **Build and run**: Compile TypeScript and run compiled extension.
- **Run**: Only run compiled extension. It's useful running together with `yarn watch`. Recommend to execute `Restart Debugging` manually when updated source code.
- **Run with extensions**: Run compiled extension with enabled other installed extensions. It's useful to validate the race condition.

### Unit testing

Marp team adopts [Jest](https://jestjs.io/) as test runner. This repository can run unit test by `yarn test:unit`.

```bash
yarn test:unit
```

> _NOTE:_ It seems to be difficult to run VSCode's E2E test on Jest. We're welcome to contribute for supporting E2E tests.

### Package VSIX

```bash
yarn package
```

> _NOTE:_ Packaging tasks will run `vsce` via `npx` to avoid some troubles while bundling. (e.g. [#35](https://github.com/marp-team/marp-vscode/pull/35), [#57](https://github.com/marp-team/marp-vscode/issues/57))

## Release

### Publish to Visual Studio Marketplace (_For maintainer_)

A way to release is different from other projects of Marp Team targeted to npm.

Just run `yarn vsce:publish [major|minor|patch]` at the latest `master` branch. It can [bump version](https://github.com/marp-team/.github/blob/master/CONTRIBUTING.md#bump-version) and release to Marketplace at once. Don't forget `git push && git push --tags`!
