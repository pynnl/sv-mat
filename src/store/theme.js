import { writable, derived } from 'svelte/store'

let light = {
  primary: '#6200ee',
  primaryVariant: '#3700b3',
  secondary: '#03dac6',
  secondaryVariant: '#018786',
  background: '#fff',
  surface: '#fff',
  error: '#b00020',
  onPrimary: '#fff',
  onSecondary: '#000',
  onBackground: '#000',
  onSurface: '#000',
  onError: '#fff'
}

let primary = writable()
let primaryVariant = writable()
let secondary = writable()
let secondaryVariant = writable()
let background = writable()
let surface = writable()
let error = writable()
let onPrimary = writable()
let onSecondary = writable()
let onBackground = writable()
let onSurface = writable()
let onError = writable()

let theme = {
  primary,
  primaryVariant,
  secondary,
  secondaryVariant,
  background,
  surface,
  error,
  onPrimary,
  onSecondary,
  onBackground,
  onSurface,
  onError
}

setTheme()

function setTheme (_theme = light) {
  for (let i in theme)
    theme[i].set(_theme[i])
}

export {
  primary,
  primaryVariant,
  secondary,
  secondaryVariant,
  background,
  surface,
  error,
  onPrimary,
  onSecondary,
  onBackground,
  onSurface,
  onError,

  setTheme
}
