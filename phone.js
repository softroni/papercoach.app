// papercoach.app: the phone on the home page plays a Paper Coach lesson, with Lina's voice when asked. Nothing is stored or sent.
(() => {
  const phone = document.querySelector('[data-phone]')
  if (!phone || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const q = (selector) => phone.querySelector(selector)
  const qa = (selector) => Array.from(phone.querySelectorAll(selector))
  const caption = document.querySelector('[data-phone-caption]')
  const player = q('[data-screen=player]')
  const steps = JSON.parse(player.dataset.steps)
  const lines = qa('[data-line]')
  const fills = qa('[data-fill]')
  const pen = q('[data-pen]')
  const dashes = qa('[data-dash]')
  const label = q('[data-step-label]')
  const say = q('[data-say]')
  const hint = q('[data-hint]')
  const scroll = q('[data-scroll]')
  const photo = q('[data-new]')
  const buttons = Array.from(document.querySelectorAll('[data-phone-sound]'))
  const tapOn = (name) => q('[data-tap=' + name + ']')

  const today = q('[data-today]')
  if (today) today.lastChild.textContent = 'Drawn · ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // A round belongs to its run; starting another (sound on or off) ends it at its next step.
  class Stop {}
  let run = 0
  let sound = false
  let audio

  // Only while it can be seen.
  let seen = false
  let wake
  const awake = () => seen && !document.hidden
  const resume = () => { if (awake() && wake) { wake(); wake = undefined } }
  new IntersectionObserver((entries) => {
    seen = entries[0].isIntersecting
    if (!seen && sound) quiet()
    resume()
  }).observe(phone)
  document.addEventListener('visibilitychange', () => { if (document.hidden && sound) quiet(); resume() })

  const runner = (token) => {
    const check = () => { if (token !== run) throw new Stop() }
    const wait = async (ms) => {
      if (!awake()) await new Promise((resolve) => { wake = resolve })
      check()
      await new Promise((resolve) => setTimeout(resolve, ms))
      check()
    }
    // One of Lina's lines, to its end; nothing when the sound is off. The line already playing (the one the tap
    // started) is waited for, not started again.
    const speak = (src) => new Promise((done) => {
      if (!sound || !src || !audio) return done()
      const finish = () => { audio.removeEventListener('ended', finish); audio.removeEventListener('error', finish); done() }
      audio.addEventListener('ended', finish)
      audio.addEventListener('error', finish)
      if (audio.src.endsWith(src) && !audio.paused && !audio.ended) return
      audio.src = src
      audio.play().catch(finish)
    }).then(check)
    return { check, wait, speak }
  }

  let current = q('.p-screen.on')
  const show = (name, words) => {
    const next = q('[data-screen=' + name + ']')
    if (caption) caption.textContent = words || next.dataset.caption
    if (next === current) return
    const left = current
    left.classList.replace('on', 'gone')
    setTimeout(() => left.classList.remove('gone'), 450)
    next.classList.add('on')
    current = next
  }

  const lengthOf = (line) => line.getTotalLength()
  const hideAll = () => {
    for (const line of lines) {
      const length = lengthOf(line)
      line.style.strokeDasharray = length + ' ' + length
      line.style.strokeDashoffset = length
      line.style.opacity = ''
    }
    for (const fill of fills) {
      fill.style.transition = 'none'
      fill.style.opacity = 0
    }
  }
  // A line drawn from end to end, the pen's dot at its tip.
  const draw = (line, ms, token) => new Promise((done) => {
    const length = lengthOf(line)
    const start = performance.now()
    pen.setAttribute('opacity', 0.35)
    const frame = (now) => {
      if (token !== run) return done()
      const t = Math.min(1, (now - start) / ms)
      line.style.strokeDashoffset = length * (1 - t)
      const point = line.getPointAtLength(length * t)
      pen.setAttribute('cx', point.x)
      pen.setAttribute('cy', point.y)
      if (t < 1) requestAnimationFrame(frame)
      else { pen.setAttribute('opacity', 0); done() }
    }
    requestAnimationFrame(frame)
  })

  const story = async (token) => {
    const { check, wait, speak } = runner(token)
    const tap = async (element) => {
      element.classList.add('tap')
      await wait(420)
      element.classList.remove('tap')
    }
    const playStep = async (index) => {
      const step = steps[index]
      const go = tapOn('drew')
      label.textContent = 'Step ' + (index + 1) + ' of ' + steps.length
      dashes.forEach((dash, k) => { dash.className = k < index ? 'done' : k === index ? 'now' : '' })
      say.textContent = step.say
      hint.textContent = 'Watch the line, then draw it.'
      go.textContent = index === steps.length - 1 ? 'Finish' : 'I drew it'
      if (step.color && !steps[index - 1].color) show('player', player.dataset.captionColor)
      // The lines of the steps before fade, as in the app.
      for (const line of lines) if (+line.dataset.line < index) line.style.opacity = 0.3
      const slow = index < 2
      // With her voice, as in the app: she says the step while its lines draw at their own speed.
      const speech = speak(step.voice)
      await wait(sound ? 300 : slow ? 500 : 250)
      for (const line of lines.filter((line) => +line.dataset.line === index)) {
        await draw(line, sound ? line.dataset.s * 1000 : Math.max(400, line.dataset.s * (slow ? 550 : 320)), token)
        check()
      }
      for (const fill of fills.filter((fill) => +fill.dataset.fill === index)) {
        const ms = sound ? fill.dataset.s * 1000 : Math.max(400, fill.dataset.s * 450)
        fill.style.transition = 'opacity ' + ms + 'ms ease'
        fill.style.opacity = 1
        await wait(ms)
      }
      await speech
      hint.textContent = 'Tap when your line is on the paper.'
      await wait(sound ? 1300 : slow ? 1100 : 500)
      await tap(go)
    }

    hideAll()
    scroll.style.transform = ''
    if (current !== q('[data-screen=preview]')) show('preview')
    await (sound ? speak(player.dataset.intro).then(() => wait(500)) : wait(1600))
    for (;;) {
      await tap(tapOn('start'))
      show('player')
      for (let index = 0; index < steps.length; index += 1) await playStep(index)
      for (const line of lines) line.style.opacity = ''
      show('done')
      await (sound ? speak(player.dataset.outro).then(() => wait(900)) : wait(2200))
      await tap(tapOn('add'))
      photo.classList.remove('new')
      show('book')
      void photo.offsetWidth
      photo.classList.add('new')
      await wait(2600)
      // One lesson with her voice, then silent again.
      if (sound) return quiet()
      scroll.style.transform = ''
      show('paths')
      hideAll()
      await wait(1100)
      const card = tapOn('path')
      const below = card.offsetTop + card.offsetHeight + scroll.parentElement.offsetTop - (844 - 82 - 24)
      if (below > 0) scroll.style.transform = 'translateY(' + -below + 'px)'
      await wait(below > 0 ? 1300 : 300)
      await tap(card)
      show('preview')
      await wait(2200)
    }
  }
  const restart = () => {
    run += 1
    story(run).catch((error) => { if (!(error instanceof Stop)) throw error })
  }

  const labelButtons = (on) => {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(on))
      button.textContent = on ? 'Stop Lina’s voice' : button.dataset.label
    }
  }
  function quiet() {
    if (!sound) return
    sound = false
    if (audio) { audio.pause(); audio.dispatchEvent(new Event('ended')) }
    labelButtons(false)
    restart()
  }
  for (const button of buttons) {
    button.hidden = false
    button.addEventListener('click', () => {
      if (sound) return quiet()
      // Started inside the tap, so Safari lets the same player speak the lines after it.
      audio = audio || new Audio()
      sound = true
      labelButtons(true)
      if (player.dataset.intro) { audio.src = player.dataset.intro; audio.play().catch(() => undefined) }
      if (!seen) phone.scrollIntoView({ behavior: 'smooth', block: 'center' })
      restart()
    })
  }
  restart()
})()
