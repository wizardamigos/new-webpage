const timeline_page = require('timeline-page')
const sparkle_effect = require('sparkle-effect')
/******************************************************************************
  DESKTOP COMPONENT
******************************************************************************/
// ----------------------------------------
// MODULE STATE & ID
var count = 0
const [cwd, dir] = [process.cwd(), __filename].map(x => new URL(x, 'file://').href)
const ID = dir.slice(cwd.length)
const STATE = { ids: {}, net: {} } // all state of component module
// ----------------------------------------
const sheet = new CSSStyleSheet()
sheet.replaceSync(get_theme())
const default_opts = { page: 'TIMELINE' }
const shopts = { mode: 'closed' }
// ----------------------------------------
module.exports = desktop
// ----------------------------------------
async function desktop (opts = default_opts, protocol) {
  // ----------------------------------------
  // ID + JSON STATE
  // ----------------------------------------
  const id = `${ID}:${count++}` // assigns their own name
  const status = {}
  const state = STATE.ids[id] = { id, status, wait: {}, net: {}, aka: {} } // all state of component instance
  const cache = resources({})
  var current_theme
  // ----------------------------------------
  // OPTS
  // ----------------------------------------
  const { page, theme, themes } = opts
  const { light_theme, dark_theme } = themes
  current_theme = themes[theme]
  // ----------------------------------------
  // PROTOCOL
  // ----------------------------------------
  const on = {}
  const channel = use_protocol('up')({ protocol, state, on })
  // ----------------------------------------
  // TEMPLATE
  // ----------------------------------------
  const el = document.createElement('div')
  const shadow = el.attachShadow(shopts)
  shadow.adoptedStyleSheets = [sheet]
  shadow.innerHTML = `<div class="desktop">
    <div class="content"></div>
    <div class="shell"></div>
  </div>`
  // ----------------------------------------
  const content_sh = shadow.querySelector('.content').attachShadow(shopts)
  const desktop_el = shadow.querySelector('.desktop')
  // ----------------------------------------
  // ELEMENTS
  // ----------------------------------------
  {//sparkle effect
    const element = sparkle_effect({colors: ["#8A2BE2", "#FFC0CB", "#808080", "#0000FF", "#FFFFE0", "#FFFF00", "#39FF14", "#FFFFFF"]})
    desktop_el.prepend(element)
  }
  // ----------------------------------------
  // RESOURCE POOL (can't be serialized)
  // ----------------------------------------
  const navigate = cache({
    TIMELINE
  })
  
  // ----------------------------------------
  // INIT
  // ----------------------------------------
  on_navigate_page({data: 'TIMELINE'})
  on_theme()
  return el

  function on_social (message) {
    console.log('@TODO: open ', message.data)
  }
  function on_navigate_page (msg) {
    const { data: active_page } = msg
    const page = navigate(active_page)
    content_sh.replaceChildren(page)
  }
  function on_theme () {
    current_theme = current_theme === light_theme ? dark_theme : light_theme
    channel.send({
      head: [id, channel.send.id, channel.mid++],
      type: 'theme_change',
      data: current_theme
    })
  }
  function TIMELINE () {
    const on = {}
    const protocol = use_protocol('timeline_page')({ state, on })
    const opts = { data: current_theme }
    const element = timeline_page(opts, protocol)
    return element
  }
}
function get_theme (opts) {
  return`
    * { box-sizing: border-box; }
    :host {
      display: flex;
      flex-direction: column;
      font-family: Arial;
      color: var(--primary_color);
      background-color: var(--bg_color_2);
      background-size: 8px 8px;
      height: 100vh;
    }
    svg {
      fill: var(--bg_color_2);
    }
    .desktop {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .content {
      height:100%;
      overflow-x: scroll;
      scrollbar-width: none;
    }
    ::-webkit-scrollbar {
      display: none;
    }
    .shell {
      flex-grow: 1;
    }
  `
}
// ----------------------------------------------------------------------------
function shadowfy (props = {}, sheets = []) {
  return element => {
    const el = Object.assign(document.createElement('div'), { ...props })
    const sh = el.attachShadow(shopts)
    sh.adoptedStyleSheets = sheets
    sh.append(element)
    return el
  }
}
function use_protocol (petname) {
  return ({ protocol, state, on = { } }) => {
    if (petname in state.aka) throw new Error('petname already initialized')
    const { id } = state
    const invalid = on[''] || (message => console.error('invalid type', message))
    if (protocol) return handshake(protocol(Object.assign(listen, { id })))
    else return handshake
    // ----------------------------------------
    // @TODO: how to disconnect channel
    // ----------------------------------------
    function handshake (send) {
      state.aka[petname] = send.id
      const channel = state.net[send.id] = { petname, mid: 0, send, on }
      return protocol ? channel : Object.assign(listen, { id })
    }
    function listen (message) {
      const [from] = message.head
      const by = state.aka[petname]
      if (from !== by) return invalid(message) // @TODO: maybe forward
      console.log(`[${id}]:${petname}>`, message)
      const { on } = state.net[by]
      const action = on[message.type] || invalid
      action(message)
    }
  }
}
// ----------------------------------------------------------------------------
function resources (pool) {
  var num = 0
  return factory => {
    const prefix = num++
    const get = name => {
      const id = prefix + name
      if (pool[id]) return pool[id]
      const type = factory[name]
      return pool[id] = type()
    }
    return Object.assign(get, factory)
  }
}