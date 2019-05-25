<button
  class='button ripple'
  style={styleButton}
  use:ripple
  >
  <div
    class='button-outline'
    style={styleOutline}
    >
    {#if icon}
      <i class='button-icon material-icons'>{icon}</i>
    {/if}
    {#if !round && !squared}
      <div class='button-label-wrapper'>
        <div class='button-label'>{label}</div>
      </div>
    {/if}
  </div>
</button>

<script>
import { ripple } from '../action'

export let label = 'Button'
export let round = false
export let squared = false
export let text = !round && !squared
export let contained = round || squared
export let outlined = false
export let raised = false
export let icon = ''
export let size = '36px'
export let color = (contained || raised) ? 'var(--theme-on-primary)' : 'var(--theme-primary)'
export let background = contained ? 'var(--theme-primary)' : 'transparent'

$: borderRadius = round ? '50%' : 'calc(1em/9)'
$: styleButton = `
  font-size: ${size};
  color: ${color};
  background-color: ${background};
  border-radius: ${borderRadius};
`
$: styleOutline = `
  width: ${(round || squared) ? '1em' : 'auto'};
  min-width: ${(round || squared) ? '1em' : '2em'};
  padding-right: ${(round || squared) ? 0 : 'calc(2em/9)'};
  padding-left: calc(${(round || squared) ? 0 : icon ? '1em/3' : 'calc(2em/9)'});
  border-color: ${outlined ? color : 'transparent'};
  border-radius: ${borderRadius};
`
</script>