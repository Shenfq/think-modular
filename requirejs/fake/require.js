let reqCounter = 0
const defMap = {} // 缓存加载的模块
const registry = {} // 已注册的模块
const cfg = { paths: {} } // 配置信息

const getModule = (name = `@mod_${++reqCounter}`) => {
  let mod = registry[name]
  if (!mod) {
    mod = registry[name] = new Module(name)
  }
  return mod
}

const nameToUrl = name => {
  const url = cfg.paths[name]
  if (url) {
    return url
  }
  const jsName = name.indexOf('.js') === (name.length - 3) ? name : name + '.js'
  const { origin, pathname } = location
  const pathArray = pathname.split('/')
  pathArray.pop()
  pathArray.push(jsName)
  return origin + pathArray.join('/')
}
// 模块加载
const loadModule =  (name, url) => {
  const head = document.getElementsByTagName('head')[0]
  const node = document.createElement('script')
  node.type = 'text/javascript'
  node.async = true // 添加了async属性
  node.setAttribute('data-module', name)
  node.addEventListener('load', onScriptLoad, false)
  node.src = url
  head.appendChild(node)
  return node
}

const onScriptLoad = evt => {
  const node = evt.currentTarget
  node.removeEventListener('load', onScriptLoad, false)

  const name = node.getAttribute('data-module')
  const mod = getModule(name)
  const def = defMap[name]
  mod.init(def.deps, def.callback)
}

class Module {
  constructor(name) {
    this.defined = false
    this.name = name
    this.depCount = 0
    this.depMaps = []
    this.depExports = []
    this.events = {}
  }
  init(deps, callback) {
    this.deps = deps
    this.callback = callback
    if (deps.length === 0) {
      this.check()
    } else {
      this.enable()
    }
  }
  enable() {
    this.deps.forEach((name, i) => {
      const url = nameToUrl(name)
      const mod = getModule(name)
      this.depMaps[i] = mod
      this.depCount++
      // 绑定事件
      mod.on('defined', exports => {
        this.depCount--
        this.depExports[i] = exports
        this.check()
      })
      loadModule(name, url)
    });
  }
  check() {
    let exports = this.exports
    if (this.depCount < 1 && !this.defined) { //如果依赖数小于1，表示依赖已经全部加载完毕
      exports = this.callback.apply(null, this.depExports)
      this.exports = exports
      this.defined = true
    }
    this.emit('defined', exports); //激活defined事件
  }
  on(name, cb) {
    let cbs = this.events[name]
    if (!cbs) {
      cbs = this.events[name] = []
    }
    cbs.push(cb)
  }
  emit(name, ...args) {
    const cbs = this.events[name]
    if (!Array.isArray(cbs)) {
      return
    }
    cbs.forEach(cb => {
      cb(...args)
    })
  }
}

// 全局 require 方法
req = require = (deps, callback) => {
  if (!deps && !callback) {
    return
  }
  if (!deps) {
    deps = []
  }
  if (typeof deps === 'function') {
    callback = deps
    deps = []
  }
  const mod = getModule()
  mod.init(deps, callback)
}

// 扩展配置
req.config = config => {
  Object.assign(cfg, config)
}

define = (name, deps, callback) => {
  defMap[name] = { name, deps, callback }
}

define.amd = {}