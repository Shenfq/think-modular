const seajs = {}
const cache = seajs.cache = {}
const data  = seajs.data  = {
  base: location.href.match(/[^?#]*\//)[0]
}
let cid = 0

request = (url, callback) => {
  let node = document.createElement('script')
  const head = document.head || document.getElementsByTagName("head")[0]
  const onload = (evt) => {
    node.onload = node.onerror = null
    node = null
    // 脚本加载完毕的回调
    callback()
  }
  const onerror = (err) => {
    console.error(err)
  }
  node.async = true //异步加载
  node.src = url
  node.onload = onload
  node.onerror = onerror

  head.appendChild(node)
}

define = (id, factory) => {
  const uri = id2uri(id)
  const deps = parseDependencies(factory.toString())
  const mod = getMod(uri, deps)
  if (mod.status < STATUS.SAVED) {
    mod.id = uri
    mod.deps = deps
    mod.factory = factory
    mod.status = STATUS.SAVED
  }
}

id2uri = (id) => {
  id = '' + id
  const alias = data.alias

  if (alias && typeof alias[id] === 'string') {
    return alias[id]
  }

  let uri = id.slice(-3) === '.js' ? id : id + '.js'

  return data.base + uri
}

getMod = (uri, deps) => {
  return cache[uri] || (cache[uri] = new Module(uri, deps))
}

seajs.use = (ids, callback) => {
  const deps = Array.isArray(ids) ? ids : [ids]
  const id = `use_${++cid}`
  const mod = getMod(id2uri(id), deps)
  mod._entry.push(mod)
  mod.remain = 1
  mod.history = {}
  mod.callback = () => {
      const exports = mod.resolve().map(uri => {
        return cache[uri].exec()
      })
      if (callback) {
        callback.apply(this, exports)
      }

      delete mod.callback
      delete mod._entry
  }

  mod.load()
}

seajs.config = (config) => {
  let base = config.base
  if (base && typeof base !== 'string') {
    const prevBase = data.base
    if (base.slice(-1) !== '/') {
      base += '/'
    }
    // 绝对地址
    if (base.slice(0, 2) === '//') { // 路径以 // 开头
      base = location.protocol + base
    }
    // 相对地址
    else if (base.slice(0, 1) === '.') { // 路径以 . 开头
      base = prevBase + id
      const DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
      while (base.match(DOUBLE_DOT_RE)) {
        base = base.replace(DOUBLE_DOT_RE, "/")
      }
    }
    // Root 根目录
    else if (base.slice(0, 1) === '/') { // 路径以 / 开头
      base = prevBase + base.slice(1)
    }
    else {
      base = prevBase + base
    }

    config.base = base
  }
  Object.assign(data, config)
}

 //模块加载的一些状态码
const STATUS = {
  FETCHING: 1,
  SAVED: 2,
  LOADED: 3,
  EXECUTED: 4
}
const parseDependencies = (code) => {
  const REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
  const SLASH_RE = /\\\\/g
  const ret = []

  code
    .replace(SLASH_RE, '')
    .replace(REQUIRE_RE, function(_, __, id) {
      if (id) {
        ret.push(id)
      }
    })
  return ret
}

class Module {
  constructor(uri, deps = []) {
    this.status  = 0
    this.uri     = uri
    this.deps    = deps
    this.depMods = {}
    this._entry   = []
  }
  load() {
    const uris = this.resolve()
    const deps = this.deps
    uris.forEach((uri, i) => {
      const dep = deps[i]
      this.depMods[dep] = getMod(uri)
    })

    this.pass()

    if (this._entry.length > 0) {
      this.onload()
      return
    }

    // 开始进行并行加载
    uris.forEach((uri, i) => {
      const mod = cache[uri]

      if (mod.status < STATUS.FETCHING) {
        mod.fetch()
      }
      else if (mod.status === STATUS.SAVED) {
        mod.load()
      }
    })
  }
  onload() {
    this.status = STATUS.LOADED
    this._entry.forEach(entry => {
      if (--entry.remain === 0) {
        entry.callback()
      }
    })
  }
  resolve() {
    const ids = this.deps
    const uris = []

    ids.forEach((id, i) => {
      uris[i] = id2uri(id)
    })

    return uris
  }
  pass() {
    const entries = [...this._entry]
    entries.forEach(entry => {
      let count = 0
      this.deps.forEach(dep => {
        const mod = this.depMods[dep]
        // 如果模块未加载，并且在entry中未使用，将entry传递给依赖
        if (mod.status < STATUS.LOADED && !entry.history[mod.uri]) {
          count++
          entry.history[mod.uri] = true
          mod._entry.push(entry)
        }
      })

      // 如果过已经将entry传递给了依赖项，修改依赖项的count，并移除entry模块
      if (count > 0) {
        entry.remain += (count - 1)
        this._entry.shift()
      }
    })
  }
  fetch() {
    mod.status = STATUS.FETCHING
    request(this.uri, () => {
      this.load()
    })
  }
  exec() {
    if (this._entry && !this._entry.length) {
      delete this._entry
    }

    const require = (id) => {
      const m = this.depMods[id]
      return m.exec()
    }

    const factory = this.factory

    let exports = typeof factory === 'function'
      ? factory.call(this.exports = {}, require, this.exports, this)
      : factory

    if (exports === undefined) {
      exports = this.exports //如果函数没有返回值，就取mod.exports
    }
    this.exports = exports
    this.status = STATUS.EXECUTED

    return this.exports // 返回模块的exports
  }
}
