function ripple (node) {
  let { classList, style } = node
  let mouseUp
  let animationEnd

  node.addEventListener('animationend', ({ animationName: name }) => {
    if (name === 'ripple-start-size') {
      animationEnd = true
      mouseUp && classList.add('ripple-end')
    } else if (name === 'ripple-end') {
      classList.remove('ripple-start', 'ripple-end')
    }
  })

  node.addEventListener('mousedown', evt => {
    classList.remove('ripple-start', 'ripple-end')

    let rect = node.getBoundingClientRect()
    let x = evt.pageX - rect.x + 'px'
    let y = evt.pageY - rect.y + 'px'

    style.setProperty('--ripple-offset-x', x)
    style.setProperty('--ripple-offset-y', y)

    mouseUp = false
    animationEnd = false
    classList.add('ripple-start')

    window.addEventListener('mouseup', mouseup)
  })

  function mouseup () {
    mouseUp = true
    animationEnd && classList.add('ripple-end')
    window.removeEventListener('mouseup', mouseup)
  }

  return {
    destroy () {
      window.removeEventListener('mouseup', mouseup)
    }
  }
}

export { ripple }
