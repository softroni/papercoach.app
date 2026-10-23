// papercoach.app: plays one of Lina's lines when its button is tapped, drawing its step's lines with it. Nothing is stored or sent.
(() => {
  let audio
  let playing
  let run = 0
  const stop = () => {
    run += 1
    if (audio) audio.pause()
    if (playing) playing.setAttribute('aria-pressed', 'false')
    playing = undefined
  }
  // The step's lines, one after another at their own speed, as the app draws them while she speaks.
  const draw = async (svg, token) => {
    const paths = Array.from(svg.querySelectorAll('[data-s]'))
    for (const path of paths) {
      const length = path.getTotalLength()
      path.style.strokeDasharray = length + ' ' + length
      path.style.strokeDashoffset = length
    }
    for (const path of paths) {
      const length = path.getTotalLength()
      const ms = path.dataset.s * 1000
      const start = performance.now()
      await new Promise((done) => {
        const frame = (now) => {
          const t = token === run ? Math.min(1, (now - start) / ms) : 1
          path.style.strokeDashoffset = length * (1 - t)
          if (t < 1) requestAnimationFrame(frame)
          else done()
        }
        requestAnimationFrame(frame)
      })
    }
  }
  for (const button of document.querySelectorAll('[data-voice]')) {
    button.hidden = false
    button.addEventListener('click', () => {
      const again = playing === button
      stop()
      if (again) return
      const token = run
      audio = new Audio(button.dataset.voice)
      audio.addEventListener('ended', () => { if (token === run) stop() })
      playing = button
      button.setAttribute('aria-pressed', 'true')
      audio.play().catch(stop)
      const svg = button.dataset.draw && document.getElementById(button.dataset.draw)
      if (svg) draw(svg, token)
    })
  }
})()
