// papercoach.app: counts this page's visit, and a tap on the App Store, a printable or Lina's voice, in PostHog.
// No cookie, nothing stored on the device, a new random id for every event, no location. See softroni.com/privacy-policy, "Our websites".
(() => {
  const POSTHOG = 'https://us.i.posthog.com/i/v0/e/'
  const TOKEN = 'phc_ypKEM2MfVWZQZEz24GhQwzG3NyfZksRgHEMpUiLojXQt'
  const ua = navigator.userAgent || ''
  const id = () => {
    try { return crypto.randomUUID() } catch (e) { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2) }
  }
  let referrer = 'none'
  try { if (document.referrer) referrer = new URL(document.referrer).hostname || 'none' } catch (e) {}
  const inApp =
    /musical_ly|BytedanceWebview|trill_|TikTok/i.test(ua) ? 'tiktok' :
    /Barcelona/.test(ua) ? 'threads' :
    /Instagram/.test(ua) ? 'instagram' :
    /FBAN|FBAV|FB_IAB|FBIOS/.test(ua) ? 'facebook' :
    /Pinterest/i.test(ua) ? 'pinterest' :
    /Twitter/i.test(ua) ? 'x' :
    /Snapchat/i.test(ua) ? 'snapchat' :
    /LinkedInApp/i.test(ua) ? 'linkedin' :
    (/; wv\)/.test(ua) || (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua))) ? 'webview' : 'browser'
  const os = (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) ? 'ios'
    : /Android/.test(ua) ? 'android' : /Macintosh/.test(ua) ? 'mac' : /Windows/.test(ua) ? 'windows' : 'other'
  const traffic = /(^|#)test\b/.test(location.hash) ? 'test'
    : (navigator.webdriver || /bot|crawl|spider|slurp|preview|headless|google-|inspectiontool|facebookexternalhit|facebot|bytespider|lighthouse|pingdom|python|curl|wget/i.test(ua)) ? 'bot'
    : 'human'
  const send = (event, more) => {
    try {
      const properties = Object.assign({
        path: location.pathname, referrer_host: referrer, in_app: inApp, os, lang: (navigator.language || '').slice(0, 12), traffic,
        $process_person_profile: false, $geoip_disable: true, $lib: 'papercoach-site'
      }, more)
      fetch(POSTHOG, {
        method: 'POST', body: 'data=' + encodeURIComponent(JSON.stringify({ api_key: TOKEN, event, distinct_id: id(), properties })),
        keepalive: true, mode: 'no-cors', credentials: 'omit', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(() => {})
    } catch (e) {} // no fetch: nothing is counted, and the page works the same
  }
  // A page loaded ahead (prerendered, or in a tab never looked at) counts once it is seen, if it ever is.
  let seen = false
  const view = () => {
    if (seen || document.prerendering || document.visibilityState === 'hidden') return
    seen = true
    send('site_page_viewed', {})
  }
  document.addEventListener('prerenderingchange', view)
  document.addEventListener('visibilitychange', view)
  view()
  // Before the page's own scripts see the tap, so Lina's button still says whether she was playing.
  document.addEventListener('click', (click) => {
    const target = click.target instanceof Element ? click.target : null
    const voice = target && target.closest('button.voice')
    if (voice) {
      if (voice.getAttribute('aria-pressed') !== 'true') send('site_lina_played', { where: voice.hasAttribute('data-phone-sound') ? 'phone' : 'step' })
      return
    }
    const link = target && target.closest('a[href]')
    if (!link) return
    let url
    try { url = new URL(link.href, location.href) } catch (e) { return }
    if (url.hostname === 'apps.apple.com') send('site_store_tapped', { campaign: url.searchParams.get('ct') || 'none' })
    else if (url.hostname === location.hostname && url.pathname.endsWith('.pdf')) send('site_printable_opened', { file: url.pathname })
  }, true)
})()
