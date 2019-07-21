export class CustomThemeError extends Error {}

export default function marpVSCodeCustomTheme({ marpit }) {
  const registeredThemes = [...marpit.themeSet.themes()].map(t => t.name)
  const { addTheme } = marpit.themeSet

  marpit.themeSet.addTheme = theme => {
    if (registeredThemes.includes(theme.name)) {
      throw new CustomThemeError(
        `Custom theme cannot override "${theme.name}" built-in theme.`
      )
    } else {
      return addTheme.call(marpit.themeSet, theme)
    }
  }
}
