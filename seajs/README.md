# sea.js 源码分析

> seajs代码很优雅，模块的加载思路与requirejs一致，创建script标签，然后设置src并插入到head中。最惊喜的是里面有一个方法`parseDependencies`，用来获取define传入的factory中所有的require依赖，可以看成一个简单的状态机，适合用来入门编译原理。

近几年前端工程化越来越完善，打包工具也已经是前端标配了，像seajs这种老古董早已停止维护，而且使用的人估计也几个了。但这并不能阻止好奇的我，为了了解当年的前端前辈们是如何在浏览器进行代码模块化的，我鼓起勇气翻开了Seajs的源码。下面就和我一起细细品味Seajs源码吧。


## 如何使用seajs

在看Seajs源码之前，先看看Seajs是如何使用的，毕竟刚入行的时候，大家就都使用browserify、webpack之类的东西了，还从来没有用过Seajs。

```html
<!-- 首先在页面中引入sea.js，也可以使用CDN资源 -->
<script type="text/javascript" src="./sea.js"></script>
<script>
// 设置一些参数
seajs.config({
  debug: true, // debug为false时，在模块加载完毕后会移除head中的script标签
  base: './js/', // 通过路径加载其他模块的默认根目录
  alias: { // 别名
    jquery: 'https://cdn.bootcss.com/jquery/3.2.1/jquery'
  }
})

seajs.use('main', function(main) {
    alert(main)
})
</script>

//main.js
define(function (require, exports, module) {
  // require('jquery')
  // var $ = window.$

  module.exports = 'main-module'
})
```

## seajs的参数配置

首先通过script导入seajs，然后对seajs进行一些配置。seajs的配置参数很多具体不详细介绍，seajs将配置项会存入一个私有对象data中，并且如果之前有设置过某个属性，并且这个属性是数组或者对象，会将新值与旧值进行合并。

```javascript
(function (global, undefined) {
  if (global.seajs) {
    return
  }
  var data = seajs.data = {}

  seajs.config = function (configData) {
    for (var key in configData) {
      var curr = configData[key] // 获取当前配置
      var prev = data[key] // 获取之前的配置
      if (prev && isObject(prev)) { // 如果之前已经设置过，且为一个对象
        for (var k in curr) {
          prev[k] = curr[k] // 用新值覆盖旧值，旧值保留不变
        }
      }
      else {
        // 如果之前的值为数组，进行concat
        if (isArray(prev)) {
          curr = prev.concat(curr)
        }
        // 确保 base 为一个路径
        else if (key === "base") {
          // 必须已 "/" 结尾
          if (curr.slice(-1) !== "/") {
            curr += "/"
          }
          curr = addBase(curr) // 转换为绝对路径
        }

        // Set config
        data[key] = curr
      }
    }
  }
})(this);
```

设置的时候还有个比较特殊的地方，就是base这个属性。这表示所有模块加载的基础路径，所以格式必须为一个路径，并且该路径最后会转换为绝对路径。比如，我的配置为`base: './js'`，我当前访问的域名为`http://qq.com/web/index.html`，最后base属性会被转化为`http://qq.com/web/js/`。然后，所有依赖的模块id都会根据该路径转换为uri，除非有定义其他配置，关于配置点到为止，到用到的地方再来细说。

## 模块的加载与执行

下面我们调用了use方法，该方法就是用来加载模块的地方，类似与requirejs中的require方法。

```javascript
// requirejs
require(['main'], function (main) {
  console.log(main)
});
```

只是这里的依赖项，seajs可以传入字符串，而requirejs必须为一个数组，seajs会将字符串转为数组，在内部seajs.use会直接调用Module.use。这个Module为一个构造函数，里面挂载了所有与模块加载相关的方法，还有很多静态方法，比如实例化Module、转换模块id为uri、定义模块等等，废话不多说直接看代码。

```javascript
seajs.use = function(ids, callback) {
  Module.use(ids, callback, data.cwd + "_use_" + cid())
  return seajs
}

// 该方法用来加载一个匿名模块
Module.use = function (ids, callback, uri) { //如果是通过seajs.use调用，uri是自动生成的
  var mod = Module.get(
    uri,
    isArray(ids) ? ids : [ids] // 这里会将依赖模块转成数组
  )

  mod._entry.push(mod) // 表示当前模块的入口为本身，后面还会把这个值传入他的依赖模块
  mod.history = {}
  mod.remain = 1 // 这个值后面会用来标识依赖模块是否已经全部加载完毕

  mod.callback = function() { //设置模块加载完毕的回调，这一部分很重要，尤其是exec方法
    var exports = []
    var uris = mod.resolve()
    for (var i = 0, len = uris.length; i < len; i++) {
      exports[i] = cachedMods[uris[i]].exec()
    }
    if (callback) {
      callback.apply(global, exports) //执行回调
    }
  }

  mod.load()
}
```

这个use方法一共做了三件事：

1. 调用Module.get，进行Module实例化
2. 为模块绑定回调函数
3. 调用load，进行依赖模块的加载

### 实例化模块，一切的开端

首先use方法调用了get静态方法，这个方法是对Module进行实例化，并且将实例化的对象存入到全局对象cachedMods中进行缓存，并且以uri作为模块的标识，如果之后有其他模块加载该模块就能直接在缓存中获取。

```javascript
var cachedMods = seajs.cache = {} // 模块的缓存对象
Module.get = function(uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}
function Module(uri, deps) {
  this.uri = uri
  this.dependencies = deps || []
  this.deps = {} // Ref the dependence modules
  this.status = 0
  this._entry = []
}
```

绑定的回调函数会在所有模块加载完毕之后调用，我们先跳过，直接看load方法。load方法会先把所有依赖的模块id转为uri，然后进行实例化，最后调用fetch方法，绑定模块加载成功或失败的回调，最后进行模块加载。具体代码如下`(代码经过精简)`：


```javascript
// 所有依赖加载完毕后执行 onload
Module.prototype.load = function() {
  var mod = this
  mod.status = STATUS.LOADING // 状态置为模块加载中

  // 调用resolve方法，将模块id转为uri。
  // 比如之前的"mian"，会在前面加上我们之前设置的base，然后在后面拼上js后缀
  // 最后变成: "http://qq.com/web/js/main.js"
  var uris = mod.resolve()

  // 遍历所有依赖项的uri，然后进行依赖模块的实例化
  for (var i = 0, len = uris.length; i < len; i++) {
    mod.deps[mod.dependencies[i]] = Module.get(uris[i])
  }

  // 将entry传入到所有的依赖模块，这个entry是我们在use方法的时候设置的
  mod.pass()

  if (mod._entry.length) {
    mod.onload()
    return
  }

  // 开始进行并行加载
  var requestCache = {}
  var m

  for (i = 0; i < len; i++) {
    m = cachedMods[uris[i]] // 获取之前实例化的模块对象
    m.fetch(requestCache) // 进行fetch
  }

  // 发送请求进行模块的加载
  for (var requestUri in requestCache) {
    if (requestCache.hasOwnProperty(requestUri)) {
      requestCache[requestUri]() //调用 seajs.request
    }
  }
}
```

### 将模块id转为uri

resolve方法实现可以稍微看下，基本上是把config里面的参数拿出来，进行拼接uri的处理。

```javascript
Module.prototype.resolve = function() {
  var mod = this
  var ids = mod.dependencies // 取出所有依赖模块的id
  var uris = []
  // 进行遍历操作
  for (var i = 0, len = ids.length; i < len; i++) {
    uris[i] = Module.resolve(ids[i], mod.uri) //将模块id转为uri
  }
  return uris
}

Module.resolve = function(id, refUri) {
  var emitData = { id: id, refUri: refUri }
  return seajs.resolve(emitData.id, refUri) // 调用 id2Uri
}

seajs.resolve = id2Uri

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
```

最后就是调用了`id2Uri`，将id转为uri，其中调用了很多的`parse`方法，这些方法不一一去看，原理大致一样，主要看下`parseAlias`。如果这个id有定义过alias，将alias取出，比如id为`"jquery"`，之前在定义alias中又有定义`jquery: 'https://cdn.bootcss.com/jquery/3.2.1/jquery'`，则将id转化为`'https://cdn.bootcss.com/jquery/3.2.1/jquery'`。代码如下：

```javascript
function parseAlias(id) { //如果有定义alias，将id替换为别名对应的地址
  var alias = data.alias
  return alias && isString(alias[id]) ? alias[id] : id
}
```

### 为依赖添加入口，方便追根溯源

resolve之后获得uri，通过uri进行Module的实例化，然后调用pass方法，这个方法主要是记录入口模块到底有多少个未加载的依赖项，存入到remain中，并将entry都存入到依赖模块的_entry属性中，方便回溯。而这个remain用于计数，最后onload的模块数与remain相等就激活entry模块的回调。具体代码如下`(代码经过精简)`：

```javascript
Module.prototype.pass = function() {
  var mod = this
  var len = mod.dependencies.length

  // 遍历入口模块的_entry属性，这个属性一般只有一个值，就是它本身
  // 具体可以回去看use方法 -> mod._entry.push(mod)
  for (var i = 0; i < mod._entry.length; i++) {
    var entry = mod._entry[i] // 获取入口模块
    var count = 0 // 计数器，用于统计未进行加载的模块
    for (var j = 0; j < len; j++) {
      var m = mod.deps[mod.dependencies[j]] //取出依赖的模块
      // 如果模块未加载，并且在entry中未使用，将entry传递给依赖
      if (m.status < STATUS.LOADED && !entry.history.hasOwnProperty(m.uri)) {
        entry.history[m.uri] = true // 在入口模块标识曾经加载过该依赖模块
        count++
        m._entry.push(entry) // 将入口模块存入依赖模块的_entry属性
      }
    }
    // 如果未加载的依赖模块大于0
    if (count > 0) {
      // 这里`count - 1`的原因也可以回去看use方法 -> mod.remain = 1
      // remain的初始值就是1，表示默认就会有一个未加载的模块，所有需要减1
      entry.remain += count - 1
      // 如果有未加载的依赖项，则移除掉入口模块的entry
      mod._entry.shift()
      i--
    }
  }
}
```

### 如何发起请求，下载其他依赖模块？

总的来说pass方法就是记录了remain的数值，接下来就是重头戏了，调用所有依赖项的fetch方法，然后进行依赖模块的加载。调用fetch方法的时候会传入一个requestCache对象，该对象用来缓存所有依赖模块的request方法。

```javascript
var requestCache = {}
for (i = 0; i < len; i++) {
  m = cachedMods[uris[i]] // 获取之前实例化的模块对象
  m.fetch(requestCache) // 进行fetch
}

Module.prototype.fetch = function(requestCache) {
  var mod = this
  var uri = mod.uri

  mod.status = STATUS.FETCHING
  callbackList[requestUri] = [mod]

  emit("request", emitData = { // 设置加载script时的一些数据
    uri: uri,
    requestUri: requestUri,
    onRequest: onRequest,
    charset: isFunction(data.charset) ? data.charset(requestUri) : data.charset,
    crossorigin: isFunction(data.crossorigin) ? data.crossorigin(requestUri) : data.crossorigin
  })

  if (!emitData.requested) { //发送请求加载js文件
    requestCache[emitData.requestUri] = sendRequest
  }

  function sendRequest() { // 被request方法，最终会调用 seajs.request
    seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset, emitData.crossorigin)
  }

  function onRequest(error) { //模块加载完毕的回调
    var m, mods = callbackList[requestUri]
    delete callbackList[requestUri]
    // 保存元数据到匿名模块，uri为请求js的uri
    if (anonymousMeta) {
      Module.save(uri, anonymousMeta)
      anonymousMeta = null
    }
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
```

经过fetch操作后，能够得到一个`requestCache`对象，该对象缓存了模块的加载方法，从上面代码就能看到，该方法最后调用的是`seajs.request`方法，并且传入了一个onRequest回调。

```javascript
for (var requestUri in requestCache) {
  requestCache[requestUri]() //调用 seajs.request
}

//用来加载js脚本的方法
seajs.request = request

function request(url, callback, charset, crossorigin) {
  var node = doc.createElement("script")
  addOnload(node, callback, url)
  node.async = true //异步加载
  node.src = url
  head.appendChild(node)
}

function addOnload(node, callback, url) {
  node.onload = onload
  node.onerror = function() {
    emit("error", { uri: url, node: node })
    onload(true)
  }

  function onload(error) {
    node.onload = node.onerror = node.onreadystatechange = null
    // 脚本加载完毕的回调
    callback(error)
  }
}
```

### 通知入口模块

上面就是request的逻辑，只不过删除了一些兼容代码，其实原理很简单，和requirejs一样，都是创建script标签，绑定onload事件，然后插入head中。在onload事件发生时，会调用之前fetch定义的onRequest方法，该方法最后会调用load方法。没错这个load方法又出现了，那么依赖模块调用和入口模块调用有什么区别呢，主要体现在下面代码中：

```javascript
if (mod._entry.length) {
  mod.onload()
  return
}
```

如果这个依赖模块没有另外的依赖模块，那么他的entry就会存在，然后调用onload模块，但是如果这个代码中有`define`方法，并且还有其他依赖项，就会走上面那么逻辑，遍历依赖项，转换uri，调用fetch巴拉巴拉。这个后面再看，先看看onload会做什么。

```javascript
Module.prototype.onload = function() {
  var mod = this
  mod.status = STATUS.LOADED
  for (var i = 0, len = (mod._entry || []).length; i < len; i++) {
    var entry = mod._entry[i]
    // 每次加载完毕一个依赖模块，remain就-1
    // 直到remain为0，就表示所有依赖模块加载完毕
    if (--entry.remain === 0) {
      // 最后就会调用entry的callback方法
      // 这就是前面为什么要给每个依赖模块存入entry
      entry.callback()
    }
  }
  delete mod._entry
}
```

### 依赖模块执行，完成全部操作

还记得最开始use方法中给入口模块设置callback方法吗，没错，兜兜转转我们又回到了起点。

```javascript
mod.callback = function() { //设置模块加载完毕的回调
  var exports = []
  var uris = mod.resolve()

  for (var i = 0, len = uris.length; i < len; i++) {
    // 执行所有依赖模块的exec方法，存入exports数组
    exports[i] = cachedMods[uris[i]].exec()
  }

  if (callback) {
    callback.apply(global, exports) //执行回调
  }

  // 移除一些属性
  delete mod.callback
  delete mod.history
  delete mod.remain
  delete mod._entry
}
```

那么这个exec到底做了什么呢？

```javascript
Module.prototype.exec = function () {
  var mod = this

  mod.status = STATUS.EXECUTING

  if (mod._entry && !mod._entry.length) {
    delete mod._entry
  }

  function require(id) {
    var m = mod.deps[id]
    return m.exec()
  }

  var factory = mod.factory

  // 调用define定义的回调
  // 传入commonjs相关三个参数: require, module.exports, module
  var exports = factory.call(mod.exports = {}, require, mod.exports, mod)
  if (exports === undefined) {
    exports = mod.exports //如果函数没有返回值，就取mod.exports
  }
  mod.exports = exports
  mod.status = STATUS.EXECUTED

  return mod.exports // 返回模块的exports
}
```

这里的factory就是依赖模块define中定义的回调函数，例如我们加载的`main.js`中，定义了一个模块。

```javascript
define(function (require, exports, module) {
  module.exports = 'main-module'
})
```

那么调用这个factory的时候，exports就为module.exports，也是是字符串`"main-moudle"`。最后callback传入的参数就是`"main-moudle"`。所以我们执行最开头写的那段代码，最后会在页面上弹出`main-moudle`。

![执行结果](https://file.shenfq.com/18-8-13/86590747.jpg)


## define定义模块

你以为到这里就结束了吗？并没有。前面只说了加载依赖模块中define方法中没有其他依赖，那如果有其他依赖呢？废话不多说，先看看define方法做了什么：

```javascript
global.define = Module.define
Module.define = function (id, deps, factory) {
  var argsLen = arguments.length

  // 参数校准
  if (argsLen === 1) {
    factory = id
    id = undefined
  }
  else if (argsLen === 2) {
    factory = deps
    if (isArray(id)) {
      deps = id
      id = undefined
    }
    else {
      deps = undefined
    }
  }

  // 如果没有直接传入依赖数组
  // 则从factory中提取所有的依赖模块到dep数组中
  if (!isArray(deps) && isFunction(factory)) {
    deps = typeof parseDependencies === "undefined" ? [] : parseDependencies(factory.toString())
  }

  var meta = { //模块加载与定义的元数据
    id: id,
    uri: Module.resolve(id),
    deps: deps,
    factory: factory
  }

  // 激活define事件, used in nocache plugin, seajs node version etc
  emit("define", meta)

  meta.uri ? Module.save(meta.uri, meta) :
    // 在脚本加载完毕的onload事件进行save
    anonymousMeta = meta
  }
```

首先进行了参数的修正，这个逻辑很简单，直接跳过。第二步判断了有没有依赖数组，如果没有，就通过parseDependencies方法从factory中获取。这个方法很有意思，是一个状态机，会一步步的去解析字符串，匹配到require，将其中的模块取出，最后放到一个数组里。这个方法在requirejs中是通过正则实现的，早期seajs也是通过正则匹配的，后来改成了这种状态机的方式，可能是考虑到性能的问题。seajs的仓库中专门有一个模块来讲这个东西的，请看[链接](https://github.com/seajs/crequire)。

获取到依赖模块之后又设置了一个meta对象，这个就表示这个模块的原数据，里面有记录模块的依赖项、id、factory等。如果这个模块define的时候没有设置id，就表示是个匿名模块，那怎么才能与之前发起请求的那个mod相匹配呢？

这里就有了一个全局变量`anonymousMeta`，先将元数据放入这个对象。然后回过头看看模块加载时设置的onload函数里面有一段就是获取这个全局变量的。

```javascript
function onRequest(error) { //模块加载完毕的回调
...
  // 保存元数据到匿名模块，uri为请求js的uri
  if (anonymousMeta) {
    Module.save(uri, anonymousMeta)
    anonymousMeta = null
  }
...
}
```

不管是不是匿名模块，最后都是通过save方法，将元数据存入到mod中。

```javascript
 // 存储元数据到 cachedMods 中
Module.save = function(uri, meta) {
  var mod = Module.get(uri)

  if (mod.status < STATUS.SAVED) {
    mod.id = meta.id || uri
    mod.dependencies = meta.deps || []
    mod.factory = meta.factory
    mod.status = STATUS.SAVED
  }
}
```

这里完成之后，就是和前面的逻辑一样了，先去校验当前模块有没有依赖项，如果有依赖项，就去加载依赖项和use的逻辑是一样的，等依赖项全部加载完毕后，通知入口模块的remain减1，知道remain为0，最后调用入口模块的回调方法。整个seajs的逻辑就已经全部走通，Yeah！


---

## 结语

有过看requirejs的经验，再来看seajs还是顺畅很多，对模块化的理解有了更加深刻的理解。阅读源码之前还是得对框架有个基本认识，并且有使用过，要不然很多地方都很懵懂。所以以后还是阅读一些工作中有经常使用的框架或类库的源码进行阅读，不能总像个无头苍蝇一样。

最后用一张流程图，总结下seajs的加载过程。

![seajs加载流程图](https://file.shenfq.com/18-8-12/312991.jpg)

