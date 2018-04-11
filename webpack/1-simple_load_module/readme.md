### 背景

有三个js文件（main.js、module-a.js、module-b.js），
在main中引入了module-a和module-b两个js文件。
现在通过webpack，以main.js为入口文件，将三个js文件打包成一个js。

让我们来看看打包生成的js是怎么来实现模块化的，注意一下代码并不是源码，
是精简之后的代码，想看源码可以去到`dist/app.js`。

```javascript
(function (modules) {
  var cached = {} //已加载过的模块的缓存
  function require (moduleId) { //moduleId表示进行import时的路径名
    if (cached[moduleId]) { //如果缓存有，从缓存中获取
      return installedModules[moduleId].exports
    }

    var module = cached[moduleId] = {
			id: moduleId, //模块id
			loaded: false, //是否加载完毕，默认还没有进行加载
			exports: {} //模块通过exprots暴露的变量
    }

    modules[moduleId].call(module.exports, module, module.exports, require)

    module.loaded = true //加载完毕修改状态

		return module.exports //返回模块对象
  }

  require.modules = modules
  require.cached  = cached
  require.r = function(exports) {
		Object.defineProperty(exports, '__esModule', { value: true });
	};

  return require(require.s = "main.js") //默认加载第一个模块（主入口）

})({  //打包后的所有的模块对象的形式(键为路径，值为模块主代码)，放在自执行函数的参数中
  'main.js': function () {/* main.js中的代码 */},
  'module-a.js': function () {/* module-a.js中的代码 */},
  'module-b.js': function () {/* module-b.js中的代码 */},
})
```

大致就是在匿名函数中定义了一个require方法，然后所有的模块都放到自执行函数的参数中，
每加载一个模块都会执行传入的模块加载函数，并将函数返回的值放入模块对象的exports中，
最后把模块对象放到内部（cached）进行缓存。

下面看看各个模块是如何进行加载的：

```javascript
modules[moduleId].call(module.exports, module, module.exports, require)
{
  "./src/main.js": (function(module, exports, require) {
    "use strict";
    require.r(exports);
    var module_a = require(/*! ./module-a.js */ "module-a.js");
    var module_b = require(/*! ./module-b.js */ "module-b.js");
    const people = Object.assign({}, module_a["default"], module_b["default"]);

    console.log(people);

  })
}


```
