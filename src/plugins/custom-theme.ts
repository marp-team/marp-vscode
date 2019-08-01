export class CustomThemeError extends Error {}

export default function marpVSCodeCustomTheme(instance) {
  const { marpit, parse } = instance
  const registeredThemes = [...marpit.themeSet.themes()].map(t => t.name)
  const { addTheme } = marpit.themeSet

  // `size` global directive support in Marp Core may override an instance of
  // default themes. Even if default themes were overridden, we should not throw
  // error while parsing Markdown by markdown-it.
  let whileParsing = false

  marpit.themeSet.addTheme = theme => {
    if (!whileParsing && registeredThemes.includes(theme.name)) {
      throw new CustomThemeError(
        `Custom theme cannot override "${theme.name}" built-in theme.`
      )
    } else {
      return addTheme.call(marpit.themeSet, theme)
    }
  }

  instance.parse = (...args) => {
    try {
      whileParsing = true
      return parse.apply(instance, args)
    } finally {
      whileParsing = false
    }
  }
}
