// papercoach.app: plays one of Lina's lines when its button is tapped. Nothing is stored or sent.
(() => {
  let audio
  let playing
  const stop = () => {
    if (audio) audio.pause()
    if (playing) playing.setAttribute('aria-pressed', 'false')
    playing = undefined
  }
  for (const button of document.querySelectorAll('[data-voice]')) {
    button.hidden = false
    button.addEventListener('click', () => {
      const again = playing === button
      stop()
      if (again) return
      audio = new Audio(button.dataset.voice)
      audio.addEventListener('ended', stop)
      playing = button
      button.setAttribute('aria-pressed', 'true')
      audio.play().catch(stop)
    })
  }
})()
