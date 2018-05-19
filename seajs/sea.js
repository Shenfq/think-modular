/**
 * Sea.js 3.0.1 | seajs.org/LICENSE.md
 */
(function(global, undefined) {

  // Avoid conflicting when `sea.js` is loaded multiple times
  if (global.seajs) {
    return
  }

  var seajs = global.seajs = { //定义seajs全局变量
    // The current version of Sea.js being used
    version: "3.0.1"
  }

  var data = seajs.data = {} //数据存储对象，存储模块id、事件函数等等


  /**
   * util-lang.js - The minimal language enhancement
   */

  function isType(type) {
    return function(obj) {
      return {}.toString.call(obj) == "[object " + type + "]"
    }
  }

  var isObject = isType("Object")
  var isString = isType("String")
  var isArray = Array.isArray || isType("Array")
  var isFunction = isType("Function")
  var isUndefined = isType("Undefined")

  var _cid = 0
  function cid() {
    return _cid++
  }

  /**
   * util-events.js - 自定义事件系统
   */

  var events = data.events = {}

  // 绑定事件
  seajs.on = function(name, callback) {
    var list = events[name] || (events[name] = [])
    list.push(callback)
    return seajs
  }

  // 移除事件. If `callback` is undefined, remove all callbacks for the
  // event. If `event` and `callback` are both undefined, remove all callbacks
  // for all events
  seajs.off = function(name, callback) {
    // Remove *all* events
    if (!(name || callback)) {
      events = data.events = {}
      return seajs
    }

    var list = events[name]
    if (list) {
      if (callback) {
        for (var i = list.length - 1; i >= 0; i--) {
          if (list[i] === callback) {
            list.splice(i, 1)
          }
        }
      }
      else {
        delete events[name]
      }
    }

    return seajs
  }

  // 触发事件, firing all bound callbacks. Callbacks receive the same
  // arguments as `emit` does, apart from the event name
  var emit = seajs.emit = function(name, data) {
    var list = events[name]

    if (list) {
      // 拷贝事件队列，防止被修改
      list = list.slice()

      // 执行事件回调
      for(var i = 0, len = list.length; i < len; i++) {
        list[i](data)
      }
    }

    return seajs
  }

  /**
   * util-path.js - The utilities for operating path such as id, uri
   */

  var DIRNAME_RE = /[^?#]*\//

  var DOT_RE = /\/\.\//g
  var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
  var MULTI_SLASH_RE = /([^:/])\/+\//g

  // Extract the directory portion of a path
  // dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
  // ref: http://jsperf.com/regex-vs-split/2
  function dirname(path) { //匹配当前url的路径
    return path.match(DIRNAME_RE)[0]
  }

  // Canonicalize a path
  // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
  function realpath(path) {
    // /a/b/./c/./d ==> /a/b/c/d
    path = path.replace(DOT_RE, "/")

    /*
      @author wh1100717
      a//b/c ==> a/b/c
      a///b/////c ==> a/b/c
      DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
    */
    path = path.replace(MULTI_SLASH_RE, "$1/")

    // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
    while (path.match(DOUBLE_DOT_RE)) {
      path = path.replace(DOUBLE_DOT_RE, "/")
    }

    return path
  }

  // 将id进行标准化
  // normalize("path/to/a") ==> "path/to/a.js"
  // NOTICE: substring is faster than negative slice and RegExp
  function normalize(path) {
    var last = path.length - 1
    var lastC = path.charCodeAt(last)

    // 如果uri已 # 结尾，去除#
    if (lastC === 35 /* "#" */) {
      return path.substring(0, last)
    }

    return (path.substring(last - 2) === ".js" ||
        path.indexOf("?") > 0 ||
        lastC === 47 /* "/" */) ? path : path + ".js"
  }


  var PATHS_RE = /^([^/:]+)(\/.+)$/
  var VARS_RE = /{([^{]+)}/g

  function parseAlias(id) { //如果有定义alias，将id替换为别名对应的地址
    var alias = data.alias
    return alias && isString(alias[id]) ? alias[id] : id
  }

  function parsePaths(id) { //替换路径
    var paths = data.paths
    var m

    if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
      id = paths[m[1]] + m[2]
    }

    return id
  }

  function parseVars(id) { //替换{}中的变量
    var vars = data.vars

    if (vars && id.indexOf("{") > -1) {
      id = id.replace(VARS_RE, function(m, key) {
        return isString(vars[key]) ? vars[key] : m
      })
    }

    return id
  }

  function parseMap(uri) { //map转换
    var map = data.map
    var ret = uri

    if (map) {
      for (var i = 0, len = map.length; i < len; i++) {
        var rule = map[i]

        ret = isFunction(rule) ?
            (rule(uri) || uri) :
            uri.replace(rule[0], rule[1])

        // Only apply the first matched rule
        if (ret !== uri) break
      }
    }

    return ret
  }


  var ABSOLUTE_RE = /^\/\/.|:\//
  var ROOT_DIR_RE = /^.*?\/\/.*?\//

  function addBase(id, refUri) {
    var ret
    var first = id.charCodeAt(0)

    // Absolute 绝对地址
    if (ABSOLUTE_RE.test(id)) { // 路径以 // 开头 或 带有 :/
      ret = id
    }
    // Relative 相对地址
    else if (first === 46 /* "." */) { // 路径以 . 开头
      ret = (refUri ? dirname(refUri) : data.cwd) + id
    }
    // Root 根目录
    else if (first === 47 /* "/" */) { // 路径以 / 开头
      var m = data.cwd.match(ROOT_DIR_RE)
      ret = m ? m[0] + id.substring(1) : id
    }
    // 顶级目录
    else {
      ret = data.base + id
    }

    // Add default protocol when uri begins with "//"
    if (ret.indexOf("//") === 0) {
      ret = location.protocol + ret
    }

    return realpath(ret)
  }

  function id2Uri(id, refUri) { // 将id转为uri，转换配置中的一些变量
    if (!id) return ""

    id = parseAlias(id)
    id = parsePaths(id)
    id = parseAlias(id)
    id = parseVars(id)
    id = parseAlias(id)
    id = normalize(id)
    id = parseAlias(id)

    var uri = addBase(id, refUri)
    uri = parseAlias(uri)
    uri = parseMap(uri)

    return uri
  }

  // For Developers
  seajs.resolve = id2Uri

  // 检测环境，是否为webworker
  var isWebWorker = typeof window === 'undefined' && typeof importScripts !== 'undefined' && isFunction(importScripts)

  // Ignore about:xxx and blob:xxx
  var IGNORE_LOCATION_RE = /^(about|blob):/
  var loaderDir
  // Sea.js's full path
  var loaderPath
  // Location is read-only from web worker, should be ok though 当前加载文件的路径
  var cwd = (!location.href || IGNORE_LOCATION_RE.test(location.href)) ? '' : dirname(location.href)

  if (isWebWorker) {
    // Web worker doesn't create DOM object when loading scripts
    // Get sea.js's path by stack trace.
    var stack
    try {
      var up = new Error()
      throw up
    } catch (e) {
      // IE won't set Error.stack until thrown
      stack = e.stack.split('\n')
    }
    // First line is 'Error'
    stack.shift()

    var m
    // Try match `url:row:col` from stack trace line. Known formats:
    // Chrome:  '    at http://localhost:8000/script/sea-worker-debug.js:294:25'
    // FireFox: '@http://localhost:8000/script/sea-worker-debug.js:1082:1'
    // IE11:    '   at Anonymous function (http://localhost:8000/script/sea-worker-debug.js:295:5)'
    // Don't care about older browsers since web worker is an HTML5 feature
    var TRACE_RE = /.*?((?:http|https|file)(?::\/{2}[\w]+)(?:[\/|\.]?)(?:[^\s"]*)).*?/i
    // Try match `url` (Note: in IE there will be a tailing ')')
    var URL_RE = /(.*?):\d+:\d+\)?$/
    // Find url of from stack trace.
    // Cannot simply read the first one because sometimes we will get:
    // Error
    //  at Error (native) <- Here's your problem
    //  at http://localhost:8000/_site/dist/sea.js:2:4334 <- What we want
    //  at http://localhost:8000/_site/dist/sea.js:2:8386
    //  at http://localhost:8000/_site/tests/specs/web-worker/worker.js:3:1
    while (stack.length > 0) {
      var top = stack.shift()
      m = TRACE_RE.exec(top)
      if (m != null) {
        break
      }
    }
    var url
    if (m != null) {
      // Remove line number and column number
      // No need to check, can't be wrong at this point
      var url = URL_RE.exec(m[1])[1]
    }
    // Set
    loaderPath = url
    // Set loaderDir
    loaderDir = dirname(url || cwd)
    // This happens with inline worker.
    // When entrance script's location.href is a blob url,
    // cwd will not be available.
    // Fall back to loaderDir.
    if (cwd === '') {
      cwd = loaderDir
    }
  }
  else {
    var doc = document
    var scripts = doc.scripts

    // 建议为加载seajs的标签添加 'id="seajsnode"'
    var loaderScript = doc.getElementById("seajsnode") ||
      scripts[scripts.length - 1]

    function getScriptAbsoluteSrc(node) {
      return node.hasAttribute ? // non-IE6/7
        node.src :
        // 低版本ie下，需要第二个参数为4才会返回完整路径的src
        node.getAttribute("src", 4)
    }
    loaderPath = getScriptAbsoluteSrc(loaderScript) //获取加载scrpit标签的完整路径
    // 当seajs被内联加载时, 设置 loaderDir 为当前工作路径
    loaderDir = dirname(loaderPath || cwd)
  }

  /**
   * util-request.js - The utilities for requesting script and style files
   * ref: tests/research/load-js-css/test.html
   */
  if (isWebWorker) {
    function requestFromWebWorker(url, callback, charset, crossorigin) {
      // Load with importScripts
      var error
      try {
        importScripts(url) //webwork中使用importScripts方法加载其他js脚本
      } catch (e) {
        error = e
      }
      callback(error)
    }
    // For Developers
    seajs.request = requestFromWebWorker
  }
  else {
    var doc = document
    var head = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement
    var baseElement = head.getElementsByTagName("base")[0]

    var currentlyAddingScript
    //定义远程加载js的方法
    function request(url, callback, charset, crossorigin) {
      var node = doc.createElement("script")

      if (charset) {
        node.charset = charset
      }

      if (!isUndefined(crossorigin)) {
        node.setAttribute("crossorigin", crossorigin)
      }

      addOnload(node, callback, url)

      node.async = true //异步加载
      node.src = url

      // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
      // the end of the insert execution, so use `currentlyAddingScript` to
      // hold current node, for deriving url in `define` call
      currentlyAddingScript = node

      // ref: #185 & http://dev.jquery.com/ticket/2709
      baseElement ? //将新建的 script 标签插入到 head
          head.insertBefore(node, baseElement) :
          head.appendChild(node)

      currentlyAddingScript = null
    }

    function addOnload(node, callback, url) {
      var supportOnload = "onload" in node

      if (supportOnload) {
        node.onload = onload
        node.onerror = function() {
          emit("error", { uri: url, node: node })
          onload(true)
        }
      }
      else {
        node.onreadystatechange = function() {
          if (/loaded|complete/.test(node.readyState)) {
            onload()
          }
        }
      }

      function onload(error) {
        // Ensure only run once and handle memory leak in IE
        node.onload = node.onerror = node.onreadystatechange = null

        // Remove the script to reduce memory leak
        if (!data.debug) {
          head.removeChild(node)
        }

        // 去除对node的引用，防止内存泄漏
        node = null
        // 脚本加载完毕的回调
        callback(error)
      }
    }

    //用来加载js脚本的方法
    seajs.request = request

  }

  var interactiveScript

  function getCurrentScript() { //获取当前加载中的script标签
    if (currentlyAddingScript) {
      return currentlyAddingScript
    }

    // For IE6-9 browsers, the script onload event may not fire right
    // after the script is evaluated. Kris Zyp found that it
    // could query the script nodes and the one that is in "interactive"
    // mode indicates the current script
    // ref: http://goo.gl/JHfFW
    if (interactiveScript && interactiveScript.readyState === "interactive") {
      return interactiveScript
    }

    var scripts = head.getElementsByTagName("script")

    for (var i = scripts.length - 1; i >= 0; i--) {
      var script = scripts[i]
      if (script.readyState === "interactive") {
        interactiveScript = script
        return interactiveScript
      }
    }
  }

  /**
   * util-deps.js - 一个状态机，用来解析所有的通过require导入的模块，获取依赖关系
   * ref: tests/research/parse-dependencies/test.html
   * ref: https://github.com/seajs/crequire
   */

  function parseDependencies(s) {
    if(s.indexOf('require') == -1) {
      return []
    }
    var index = 0, peek, length = s.length, isReg = 1, modName = 0, res = []
    var parentheseState = 0, parentheseStack = []
    var braceState, braceStack = [], isReturn
    while(index < length) {
      readch()
      if(isBlank()) { //是否为空格
        if(isReturn && (peek == '\n' || peek == '\r')) {
          braceState = 0
          isReturn = 0
        }
      }
      else if(isQuote()) { //是否为引号
        dealQuote()
        isReg = 1
        isReturn = 0
        braceState = 0
      }
      else if(peek == '/') { //注释或正则
        readch()
        if(peek == '/') { //双斜杠注释
          index = s.indexOf('\n', index)
          if(index == -1) {
            index = s.length
          }
        }
        else if(peek == '*') { //斜杠+星注释
          var i = s.indexOf('\n', index)
          index = s.indexOf('*/', index)
          if(index == -1) {
            index = length
          }
          else {
            index += 2 //跳过从 /* 到 */ 的部分
          }
          if(isReturn && i != -1 && i < index) {
            braceState = 0
            isReturn = 0
          }
        }
        else if(isReg) { //正则
          dealReg()
          isReg = 0
          isReturn = 0
          braceState = 0
        }
        else {
          index--
          isReg = 1
          isReturn = 0
          braceState = 1
        }
      }
      else if(isWord()) {
        dealWord()
      }
      else if(isNumber()) {
        dealNumber()
        isReturn = 0
        braceState = 0
      }
      else if(peek == '(') {
        parentheseStack.push(parentheseState)
        isReg = 1
        isReturn = 0
        braceState = 1
      }
      else if(peek == ')') {
        isReg = parentheseStack.pop()
        isReturn = 0
        braceState = 0
      }
      else if(peek == '{') {
        if(isReturn) {
          braceState = 1
        }
        braceStack.push(braceState)
        isReturn = 0
        isReg = 1
      }
      else if(peek == '}') {
        braceState = braceStack.pop()
        isReg = !braceState
        isReturn = 0
      }
      else {
        var next = s.charAt(index)
        if(peek == ';') {
          braceState = 0
        }
        else if(peek == '-' && next == '-'
          || peek == '+' && next == '+'
          || peek == '=' && next == '>') {
          braceState = 0
          index++
        }
        else {
          braceState = 1
        }
        isReg = peek != ']'
        isReturn = 0
      }
    }
    return res //返回所有依赖
    function readch() { //前移
      peek = s.charAt(index++)
    }
    function isBlank() {
      return /\s/.test(peek)
    }
    function isQuote() {
      return peek == '"' || peek == "'"
    }
    function dealQuote() {
      var start = index
      var c = peek
      var end = s.indexOf(c, start)
      if(end == -1) {
        index = length
      }
      else if(s.charAt(end - 1) != '\\') {
        index = end + 1
      }
      else {
        while(index < length) {
          readch()
          if(peek == '\\') {
            index++
          }
          else if(peek == c) {
            break
          }
        }
      }
      if(modName) {
        //maybe substring is faster  than slice .
        res.push(s.substring(start, index - 1))
        modName = 0
      }
    }
    function dealReg() {
      index--
      while(index < length) {
        readch()
        if(peek == '\\') {
          index++
        }
        else if(peek == '/') {
          break
        }
        else if(peek == '[') {
          while(index < length) {
            readch()
            if(peek == '\\') {
              index++
            }
            else if(peek == ']') {
              break
            }
          }
        }
      }
    }
    function isWord() { //是否为一个词
      return /[a-z_$]/i.test(peek)
    }
    function dealWord() { //是否是关键词
      var s2 = s.slice(index - 1)
      var r = /^[\w$]+/.exec(s2)[0]
      parentheseState = {
        'if': 1,
        'for': 1,
        'while': 1,
        'with': 1
      }[r]
      isReg = {
        'break': 1,
        'case': 1,
        'continue': 1,
        'debugger': 1,
        'delete': 1,
        'do': 1,
        'else': 1,
        'false': 1,
        'if': 1,
        'in': 1,
        'instanceof': 1,
        'return': 1,
        'typeof': 1,
        'void': 1
      }[r]
      isReturn = r == 'return'
      braceState = {
        'instanceof': 1,
        'delete': 1,
        'void': 1,
        'typeof': 1,
        'return': 1
      }.hasOwnProperty(r)
      modName = /^require\s*(?:\/\*[\s\S]*?\*\/\s*)?\(\s*(['"]).+?\1\s*[),]/.test(s2)
      if(modName) {
        r = /^require\s*(?:\/\*[\s\S]*?\*\/\s*)?\(\s*['"]/.exec(s2)[0]
        index += r.length - 2
      }
      else {
        index += /^[\w$]+(?:\s*\.\s*[\w$]+)*/.exec(s2)[0].length - 1
      }
    }
    function isNumber() {
      return /\d/.test(peek)
        || peek == '.' && /\d/.test(s.charAt(index))
    }
    function dealNumber() {
      var s2 = s.slice(index - 1)
      var r
      if(peek == '.') {
        r = /^\.\d+(?:E[+-]?\d*)?\s*/i.exec(s2)[0]
      }
      else if(/^0x[\da-f]*/i.test(s2)) {
        r = /^0x[\da-f]*\s*/i.exec(s2)[0]
      }
      else {
        r = /^\d+\.?\d*(?:E[+-]?\d*)?\s*/i.exec(s2)[0]
      }
      index += r.length - 1
      isReg = 0
    }
  }

  /**
   * module.js - The core of module loader
   */

  var cachedMods = seajs.cache = {}
  var anonymousMeta

  var fetchingList = {}
  var fetchedList = {}
  var callbackList = {}

  var STATUS = Module.STATUS = { //模块加载的一些状态码
    // 1 - The `module.uri` is being fetched 模块加载中
    FETCHING: 1,
    // 2 - The meta data has been saved to cachedMods 元数据已经被存储在了cachedMods中
    SAVED: 2,
    // 3 - The `module.dependencies` are being loaded 模块依赖已经加载完毕
    LOADING: 3,
    // 4 - The module are ready to execute 模块准备执行中
    LOADED: 4,
    // 5 - The module is being executed 模块已经被执行
    EXECUTING: 5,
    // 6 - The `module.exports` is available module.exports处于可用状态
    EXECUTED: 6,
    // 7 - 404 错误信息，比如404
    ERROR: 7
  }

  //模块加载器，用来进行模块的加载
  function Module(uri, deps) {
    this.uri = uri
    this.dependencies = deps || []
    this.deps = {} // Ref the dependence modules
    this.status = 0

    this._entry = []
  }

  // 转换模块依赖
  Module.prototype.resolve = function() {
    var mod = this
    var ids = mod.dependencies
    var uris = []

    for (var i = 0, len = ids.length; i < len; i++) {
      uris[i] = Module.resolve(ids[i], mod.uri) //将模块id转为uri
    }
    return uris
  }

  Module.prototype.pass = function() {
    var mod = this

    var len = mod.dependencies.length

    for (var i = 0; i < mod._entry.length; i++) {
      var entry = mod._entry[i]
      var count = 0
      for (var j = 0; j < len; j++) {
        var m = mod.deps[mod.dependencies[j]] //取出依赖的模块
        // If the module is unload and unused in the entry, pass entry to it
        if (m.status < STATUS.LOADED && !entry.history.hasOwnProperty(m.uri)) {
          entry.history[m.uri] = true
          count++
          m._entry.push(entry)
          if(m.status === STATUS.LOADING) {
            m.pass()
          }
        }
      }
      // If has passed the entry to it's dependencies, modify the entry's count and del it in the module
      if (count > 0) {
        entry.remain += count - 1
        mod._entry.shift()
        i--
      }
    }
  }

  // 所有依赖加载完毕后执行 onload
  Module.prototype.load = function() {
    var mod = this

    // 如果当前模块在loading中，等待onlaod事件的调用
    if (mod.status >= STATUS.LOADING) {
      return
    }

    mod.status = STATUS.LOADING //模块加载中

    // Emit `load` event for plugins such as combo plugin
    var uris = mod.resolve()
    emit("load", uris)

    for (var i = 0, len = uris.length; i < len; i++) {
      mod.deps[mod.dependencies[i]] = Module.get(uris[i])
    }

    // Pass entry to it's dependencies
    mod.pass()

    // If module has entries not be passed, call onload
    if (mod._entry.length) {
      mod.onload()
      return
    }

    // 开始进行并行加载
    var requestCache = {}
    var m

    for (i = 0; i < len; i++) {
      m = cachedMods[uris[i]]

      if (m.status < STATUS.FETCHING) {
        m.fetch(requestCache)
      }
      else if (m.status === STATUS.SAVED) {
        m.load()
      }
    }

    // Send all requests at last to avoid cache bug in IE6-9. Issues#808
    for (var requestUri in requestCache) {
      if (requestCache.hasOwnProperty(requestUri)) {
        requestCache[requestUri]() //调用 seajs.request
      }
    }
  }

  // Call this method when module is loaded
  Module.prototype.onload = function() {
    var mod = this
    mod.status = STATUS.LOADED

    // When sometimes cached in IE, exec will occur before onload, make sure len is an number
    for (var i = 0, len = (mod._entry || []).length; i < len; i++) {
      var entry = mod._entry[i]
      if (--entry.remain === 0) {
        entry.callback()
      }
    }

    delete mod._entry
  }

  // Call this method when module is 404
  Module.prototype.error = function() {
    var mod = this
    mod.onload()
    mod.status = STATUS.ERROR
  }

  // 执行一个模块
  Module.prototype.exec = function () {
    var mod = this

    // When module is executed, DO NOT execute it again. When module
    // is being executed, just return `module.exports` too, for avoiding
    // circularly calling
    if (mod.status >= STATUS.EXECUTING) {
      return mod.exports
    }

    mod.status = STATUS.EXECUTING

    if (mod._entry && !mod._entry.length) {
      delete mod._entry
    }

    //non-cmd module has no property factory and exports
    if (!mod.hasOwnProperty('factory')) {
      mod.non = true
      return
    }

    // Create require
    var uri = mod.uri

    function require(id) {
      var m = mod.deps[id] || Module.get(require.resolve(id))
      if (m.status == STATUS.ERROR) {
        throw new Error('module was broken: ' + m.uri)
      }
      return m.exec()
    }

    require.resolve = function(id) {
      return Module.resolve(id, uri)
    }

    require.async = function(ids, callback) {
      Module.use(ids, callback, uri + "_async_" + cid())
      return require
    }

    // Exec factory
    var factory = mod.factory

    var exports = isFunction(factory) ?
      factory.call(mod.exports = {}, require, mod.exports, mod) :
      factory

    if (exports === undefined) {
      exports = mod.exports
    }

    // Reduce memory leak
    delete mod.factory

    mod.exports = exports
    mod.status = STATUS.EXECUTED

    // Emit `exec` event
    emit("exec", mod)

    return mod.exports
  }

  // 设置模块的加载中的一些属性，以及onload方法
  Module.prototype.fetch = function(requestCache) {
    var mod = this
    var uri = mod.uri

    mod.status = STATUS.FETCHING

    // Emit `fetch` event for plugins such as combo plugin
    var emitData = { uri: uri }
    emit("fetch", emitData)
    var requestUri = emitData.requestUri || uri

    // Empty uri or a non-CMD module
    if (!requestUri || fetchedList.hasOwnProperty(requestUri)) {
      mod.load()
      return
    }

    if (fetchingList.hasOwnProperty(requestUri)) {
      callbackList[requestUri].push(mod)
      return
    }

    fetchingList[requestUri] = true //状态置为加载中
    callbackList[requestUri] = [mod]

    // Emit `request` event for plugins such as text plugin
    emit("request", emitData = {
      uri: uri,
      requestUri: requestUri,
      onRequest: onRequest,
      charset: isFunction(data.charset) ? data.charset(requestUri) : data.charset,
      crossorigin: isFunction(data.crossorigin) ? data.crossorigin(requestUri) : data.crossorigin
    })

    if (!emitData.requested) {
      requestCache ?
        requestCache[emitData.requestUri] = sendRequest :
        sendRequest()
    }

    function sendRequest() {
      seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset, emitData.crossorigin)
    }

    function onRequest(error) { //模块加载完毕的回调
      delete fetchingList[requestUri]
      fetchedList[requestUri] = true //状态置为加载完毕

      // Save meta data of anonymous module
      if (anonymousMeta) {
        Module.save(uri, anonymousMeta)
        anonymousMeta = null
      }

      // Call callbacks
      var m, mods = callbackList[requestUri]
      delete callbackList[requestUri]
      while ((m = mods.shift())) {
        // When 404 occurs, the params error will be true
        if(error === true) {
          m.error()
        }
        else {
          m.load()
        }
      }
    }
  }

  // 将id转化为uri
  Module.resolve = function(id, refUri) {
    // 有些插件模块需要调用resolve事件来将id转为uri，比如text-plugin
    var emitData = { id: id, refUri: refUri }
    emit("resolve", emitData)

    return emitData.uri || seajs.resolve(emitData.id, refUri) // 调用 id2Uri
  }

  // 定义一个模块
  Module.define = function (id, deps, factory) {
    var argsLen = arguments.length

    // define(factory) 一个参数时，为factory
    if (argsLen === 1) {
      factory = id
      id = undefined
    }
    else if (argsLen === 2) {
      factory = deps

      // define(deps, factory) 第一个参数为数组，表示依赖模块
      if (isArray(id)) {
        deps = id
        id = undefined
      }
      // define(id, factory) 第一个参数不为数组，表示模块id
      else {
        deps = undefined
      }
    }

    // 从factory中提取所有的依赖模块到dep数组中
    if (!isArray(deps) && isFunction(factory)) {
      deps = typeof parseDependencies === "undefined" ? [] : parseDependencies(factory.toString())
    }

    var meta = { //模块加载与定义的元数据
      id: id,
      uri: Module.resolve(id),
      deps: deps,
      factory: factory
    }

    // 在IE6-9中，通过获取加载中的script标签来获取匿名模块的uri
    if (!isWebWorker && !meta.uri && doc.attachEvent && typeof getCurrentScript !== "undefined") {
      var script = getCurrentScript()

      if (script) {
        meta.uri = script.src
      }

      // NOTE: If the id-deriving methods above is failed, then falls back
      // to use onload event to get the uri
    }

    // 激活define事件, used in nocache plugin, seajs node version etc
    emit("define", meta)

    meta.uri ? Module.save(meta.uri, meta) :
      // Save information for "saving" work in the script onload event
      anonymousMeta = meta
  }

  // 存储元数据到 cachedMods 中
  Module.save = function(uri, meta) {
    var mod = Module.get(uri)

    // Do NOT override already saved modules
    if (mod.status < STATUS.SAVED) {
      mod.id = meta.id || uri
      mod.dependencies = meta.deps || []
      mod.factory = meta.factory
      mod.status = STATUS.SAVED

      emit("save", mod)
    }
  }

  // 获取已存在的模块，或者新建一个模块
  Module.get = function(uri, deps) {
    return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
  }

  // 该方法用来加载一个匿名模块
  Module.use = function (ids, callback, uri) {
    var mod = Module.get(uri, isArray(ids) ? ids : [ids]) //获取或新建模块

    mod._entry.push(mod) //放入入口模块中
    mod.history = {}
    mod.remain = 1

    mod.callback = function() { //设置模块加载完毕的回调
      var exports = []
      var uris = mod.resolve()

      for (var i = 0, len = uris.length; i < len; i++) {
        exports[i] = cachedMods[uris[i]].exec()
      }

      if (callback) {
        callback.apply(global, exports) //执行回调
      }

      delete mod.callback
      delete mod.history
      delete mod.remain
      delete mod._entry
    }

    mod.load()
  }


  // 对外暴露的公共api

  seajs.use = function(ids, callback) { //类似于requirejs的main属性
    Module.use(ids, callback, data.cwd + "_use_" + cid())
    return seajs
  }

  Module.define.cmd = {}
  global.define = Module.define //全局变量中，define调用的实际为 Module.define


  // For Developers

  seajs.Module = Module
  data.fetchedList = fetchedList
  data.cid = cid

  seajs.require = function(id) {
    var mod = Module.get(Module.resolve(id))
    if (mod.status < STATUS.EXECUTING) {
      mod.onload()
      mod.exec()
    }
    return mod.exports
  }

  /**
   * config.js - The configuration for the loader
   */

  // The root path to use for id2uri parsing
  data.base = loaderDir

  // The loader directory
  data.dir = loaderDir

  // The loader's full path
  data.loader = loaderPath

  // The current working directory
  data.cwd = cwd

  // The charset for requesting files
  data.charset = "utf-8"

  // @Retention(RetentionPolicy.SOURCE)
  // The CORS options, Don't set CORS on default.
  //
  //data.crossorigin = undefined

  // data.alias - An object containing shorthands of module id
  // data.paths - An object containing path shorthands in module id
  // data.vars - The {xxx} variables in module id
  // data.map - An array containing rules to map module uri
  // data.debug - Debug mode. The default value is false

  seajs.config = function(configData) {

    for (var key in configData) {
      var curr = configData[key]
      var prev = data[key]

      // Merge object config such as alias, vars
      if (prev && isObject(prev)) { //如果之前已经设置过，将两个值进行merge
        for (var k in curr) {
          prev[k] = curr[k]
        }
      }
      else {
        // 如果config为array，进行concat，比如map属性
        if (isArray(prev)) {
          curr = prev.concat(curr)
        }
        // 确保 base 为一个相对路径
        else if (key === "base") {
          // Make sure end with "/"
          if (curr.slice(-1) !== "/") {
            curr += "/"
          }
          curr = addBase(curr)
        }

        // Set config
        data[key] = curr
      }
    }

    emit("config", configData) //如果有定义了设置config的事件，则触发
    return seajs
  }

})(this);
