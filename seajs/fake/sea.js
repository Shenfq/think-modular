seajs = { //定义seajs全局变量
  version: "3.0.1"
}

let _cid = 0
const data = seajs.data = {}
const cachedMods = seajs.cache = {}

const save = (uri, mate) => {
  const mod = Module.get(uri)
  mod.id = meta.id || uri
  mod.dependencies = meta.deps || []
  mod.factory = meta.factory
}

// 定义一个模块
define = (id, factory) => {
  if (!factory) {
    factory = id
    id = undefined
  }

  const deps = parseDependencies(factory.toString())

  const meta = { //模块加载与定义的元数据
    id, deps, factory,
    uri: Module.resolve(id),
  }

  meta.uri ? Module.save(meta.uri, meta) :
    // 在脚本加载完毕的onload事件进行save
    anonymousMeta = meta
}



//模块加载器，用来进行模块的加载
function Module(uri, deps) {
  this.uri = uri
  this.dependencies = deps || []
  this.deps = {}
  this.status = 0

  this._entry = []
}

Module.get = function(uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}
