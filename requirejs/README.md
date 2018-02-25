# RequireJS源码分析（上）

`requirejs`作为`AMD`（Asynchronous Module Definition--异步的模块加载机制）规范的实现，还是有必要看看的。初识`requirejs`源码，必须先弄清楚`requirejs`的模块是如何定义的，并且要知道入口在哪个地方，如果清楚了调用方式，看源码的时候才会觉得顺畅。

在看源码的过程中，我添加了一些代码注释。如果要查看添加过注释的源码，可以直接在我的[github](https://github.com/Shenfq/think-modular/blob/master/requirejs/require.js)上进行fork。我这里的源码是目前最新的版本2.3.5。另外附上requirejs官方的[源码](https://github.com/requirejs/requirejs/tree/2.3.5)。

我把requirejs一共分成了三个部分，这三个部分外面是一个闭包，并且两个定义的全局变量。

```javascript
var requirejs, require, define;
(function (global, setTimeout) {
    //1、定义一些变量与工具方法
    var req, s, head ////some defined
    
    //add some function 
    
    //2、创建一个模块加载的上下文
    function newContext(contextName) {
        //somecode
        
        //定义一个模块加载器
        Module = function (map) {}
        Module.prototype = {
            //原型链上
        };
        
        context = { //上下文环境
            config: config, //配置
            contextName: contextName, //默认为 "_"
            nextTick: req.nextTick, //通过setTimeout，把执行放到下一个队列
            makeRequire: function (relMap, options) {
                
                function localRequire () {
                    //somecode
                    //通过setTimeout的方式加载依赖，放入下一个队列，保证加载顺序
            		context.nextTick(function () {
            		
            			intakeDefines();
            
            			requireMod = getModule(makeModuleMap(null, relMap));
            			
            			requireMod.skipMap = options.skipMap;
            
            			requireMod.init(deps, callback, errback, {
            				enabled: true
            			});
            
            			checkLoaded();
            		});
            
            		return localRequire;
                }
                return localRequire;
            }
            //xxxx
		}
        context.require = context.makeRequire(); //加载时的入口函数
        return context;
    }
    
    //3、定义require、define方法，导入data-main路径与进行模块加载
    req = requirejs = function (deps, callback, errback, optional) {
        //xxxx
        
        context = getOwn(contexts, contextName);  //获取默认环境
    	if (!context) {
    		context = contexts[contextName] = req.s.newContext(contextName); //创建一个名为'_'的环境名
    	}
    
    	if (config) {
    		context.configure(config);  //设置配置
    	}
    
    	return context.require(deps, callback, errback);
    }
    
    req.config = function (config) {
		return req(config);
	};
	
	s = req.s = {
		contexts: contexts,
		newContext: newContext
	};
	
    req({}); //初始化模块加载的上下文环境
    
    define = function (name, deps, callback) {
    
    }
    
    req(cfg); //加载data-main，主入口js
    
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)));
```

上面的代码基本能看出`requirejs`的三个部分，中间省略了很多代码。看过大概结构之后，来跟着我一步一步的窥探`requirejs`是如何加载与定义模块的。


## requirejs如何加载入口js

使用过requirejs的朋友都知道，我们会在引入requirejs的时候，在`script`标签添加`data-main`属性，作为配置和模块加载的入口。具体代码如下：

```html
<script type="text/javascript" src="./require.js" data-main="./js/main.js"></script>
```

`requirejs`先通过判断当前是否为浏览器环境，如果是浏览器环境，就遍历当前页面上所有的script标签，取出其中的`data-main`属性，并通过计算，得到baseUrl和需要提前加载js的文件名。具体代码如下：

```javascript
var isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document);

function scripts() { //获取页面上所有的target标签
    return document.getElementsByTagName('script');
}

function eachReverse(ary, func) {
    if (ary) {
        var i;
        for (i = ary.length - 1; i > -1; i -= 1) {
            if (ary[i] && func(ary[i], i, ary)) {
                break;
            }
        }
    }
}

if (isBrowser) {
    head = s.head = document.getElementsByTagName('head')[0];
    baseElement = document.getElementsByTagName('base')[0];
    if (baseElement) {
    	head = s.head = baseElement.parentNode;
    }
}
	
if (isBrowser && !cfg.skipDataMain) {
    eachReverse(scripts(), function (script) {  //遍历所有的script标签
    	//如果head标签不存在，让script标签的父节点充当head
    	if (!head) {
    		head = script.parentNode;
    	}
    	
    	dataMain = script.getAttribute('data-main');
    	if (dataMain) {  //获取data-main属性（如果存在）
    		//保存dataMain变量，防止转换后任然是路径 (i.e. contains '?')
    		mainScript = dataMain;
    		
    		//如果没有指定明确的baseUrl，设置data-main属性的路径为baseUrl
    		//只有当data-main的值不为一个插件的模块ID时才这样做
    		if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
    			//取出data-main中的路径作为baseUrl
    			src = mainScript.split('/'); //通过  /  符，进行路径切割
    			mainScript = src.pop();  //拿出data-main中的js名
    			subPath = src.length ? src.join('/') + '/' : './';  //拼接父路径，如果data-main只有一个路径，则表示当前目录
    			cfg.baseUrl = subPath;
    		}
    		
    		//去除js后缀，作模块名
    		mainScript = mainScript.replace(jsSuffixRegExp, '');
    		//如果mainScript依旧是一个路径, 将mainScript重置为dataMain
    		
    		if (req.jsExtRegExp.test(mainScript)) {
    			mainScript = dataMain;
    		}
    		
    		//将data-main的模块名放入到deps数组中
    		cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];
    
    		return true;
    	}
    });
}
```
在进行过上述操作后，我们可以得到一个cfg对象，该对象包括两个属性baseUrl和deps。比如我们上面的案例中，script标签有个属性`data-main="./js/main.js"`，经过requirejs的转后，得到的cfg对象为：

```javascript
cfg = {
    baseUrl: "./js/",
    deps: ["main"]
}
```

拿到cfg对象后，requirejs调用了req方法：`req(cfg);`。req方法就是require方法，是整个requirejs的入口函数，相当于是一个分发装置，进行参数类型的匹配，再来判断当前是config操作还是require操作，并且在这个方法里还会创建一个上下文环境，所有的模块加载和require相关的配置都会在这个上下文进行中进行。在调用`req(cfg);`之前，requirejs还调用了一次req方法：`req({});`，这一步操作就是为了创建模块加载的上下文。我们还在直接来看看req方法的源码吧：

```javascript
//最开始定义的变量
var defContextName = '_', //默认加载的模块名
    contexts = {}; //模块加载的上下文环境的容器

req = requirejs = function (deps, callback, errback, optional) {
    //Find the right context, use default
    var context, config,
    	contextName = defContextName; //默认的上下文环境
    //参数修正
    // Determine if have config object in the call.
    if (!isArray(deps) && typeof deps !== 'string') {
    	// deps is a config object
    	config = deps;  //第一个参数如果不是数组也不是字符串表示为配置参数
    	if (isArray(callback)) {
    		// 调整参数，callback此时是deps
    		deps = callback;
    		callback = errback;
    		errback = optional;
    	} else {
    		deps = [];
    	}
    }
    
    if (config && config.context) {
    	contextName = config.context;
    }
    
    context = getOwn(contexts, contextName);  //获取默认环境
    if (!context) { //如果是第一次进入，调用newContext方法进行创建
    	context = contexts[contextName] = req.s.newContext(contextName); //创建一个名为'_'的环境名
    }
    
    if (config) {
    	context.configure(config);  //设置配置
    }
    
    //如果只是加载配置，deps、callback、errback这几个参数都是空，那么调用require方法什么都不会发生
    return context.require(deps, callback, errback); //最后调用context中的require方法，进行模块加载
};

req.config = function (config) {
    return req(config); //require.config方法最终也是调用req方法
};

if (!require) {  //require方法就是req方法
    require = req;
}

s = req.s = {
    contexts: contexts,
    newContext: newContext //创建新的上下文环境
};
```

继续按照之前`req(cfg);`的逻辑来走，根据传入的cfg，会调用`context.configure(config);`，而这个context就是之前说的`requirejs`三部分中的第二个部分的`newContext`函数创建的，创建得到的context对象会放入全局的contexts对象中。我们可以在控制台打印contexts对象，看到里面其实只有一个名为`'_'`的context，这是`requrejs`默认指定的上下文。

![上下文对象](http://ovdk1wiaq.bkt.clouddn.com/17-11-19/90660695.jpg)

newContext函数中有许多的局部变量用来缓存一些已经加载的模块，还有一个模块加载器（Module），这个后面都会用到。还是先看调用的configure方法：

```javascript
function newContext (contextName) {
    var context, config = {};
    
    context = {
        configure: function (cfg) {
            //确保baseUrl以 / 结尾
            if (cfg.baseUrl) { 
            	//所有模块的根路径，
            	//默认为requirejs的文件所在路径，
            	//如果设置了data-main，则与data-main一致
            	if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
            		cfg.baseUrl += '/';
            	}
            }
            
            //其他代码，用于添加一些替他配置，与本次加载无关
            
            //如果配置项里指定了deps或者callback, 则调用require方法
            //如果实在requirejs加载之前，使用require定义对象作为配置，这很有用
            if (cfg.deps || cfg.callback) {
            	context.require(cfg.deps || [], cfg.callback);
            }
        },
        makeRequire: function (relMap, options) {
            
        }
    }
    
    return context;
} 
```

这个方法主要是用来做配置，在我们传入的cfg参数中其实并不包含requirejs的主要配置项，但是在最后因为有deps属性，逻辑能继续往下走，调用了require方法：`context.require(cfg.deps);`。上面的代码中能看出，context的require方法是使用makeRequire创建的，这里之所以用makeRequire来创建require方法，主要使用创建一个函数作用域来保存，方便为require方法拓展一些属性。

```javascript
context = {
    makeRequire: function (relMap, options) {
        options = options || {};
        function localRequire(deps, callback, errback) { //真正的require方法
        	var id, map, requireMod;
        
        	if (options.enableBuildCallback && callback && isFunction(callback)) {
        		callback.__requireJsBuild = true;
        	}
        
        	if (typeof deps === 'string') {
        		//如果deps是个字符串，而不是个数组，进行一些其他处理
        	}
        	
        	intakeDefines();
        
        	//通过setTimeout的方式加载依赖，放入下一个队列，保证加载顺序
        	context.nextTick(function () {
        		intakeDefines();
        
        		requireMod = getModule(makeModuleMap(null, relMap));
        		
        		requireMod.skipMap = options.skipMap;
        
        		requireMod.init(deps, callback, errback, {
        			enabled: true
        		});
        
        		checkLoaded();
        	});
        
        	return localRequire;
        }
        //mixin类型与extend方法，对一个对象进行属性扩展
        mixin(localRequire, {
            isBrowser,
            isUrl,
            defined,
            specified
        });
        
        return localRequire;
    }
};
context.require = context.makeRequire(); //加载时的入口函数
```

最初我是使用打断点的方式来阅读源码的，每次在看到`context.nextTick`的之后，就没有往下进行了，百思不得其解。然后我看了看nextTick到底是用来干嘛的，发现这个方法其实就是个定时器。

```javascript
context = {
    nextTick: req.nextTick, //通过setTimeout，把执行放到下一个队列
};
req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
	setTimeout(fn, 4);
} : function (fn) { fn(); };
```

我也很费解，为什么要把一些主逻辑放入到一个定时器中，这样所有的加载都会放到下一个任务队列进行。查看了requirejs的版本迭代，发现nextTick是在2.10这个版本加入的，之前也没有这个逻辑。
而且就算我把requirejs源码中的nextTick这段逻辑去除，代码也能正常运行。

![去除nextTick](http://ovdk1wiaq.bkt.clouddn.com/17-11-19/29999251.jpg)

> tips:                
这里的setTimeout之所以设置为4ms，是因为html5规范中规定了，setTimeout的最小延迟时间（`DOM_MIN_TIMEOUT_VALUE`）时，这个时间就是4ms。但是在2010年之后，所有浏览器的实现都遵循这个规定，2010年之前为10ms。
    
![html5相关规范](http://ovdk1wiaq.bkt.clouddn.com/17-11-19/28482945.jpg)
    
后来参考了网络上其他博客的一些想法，有些人认为设置setTimeout来加载模块是为了让模块的加载是按照顺序执行的，~~这个目前我也没研究透彻，先设个`todo`在这里,哈哈哈~~。

终于在[requirejs的wiki](https://github.com/requirejs/requirejs/wiki/Upgrading-to-RequireJS-2.1)上看到了相关文档，官方说法是为了让模块的加载异步化，为了防止一些细微的bug（具体是什么bug，还不是很清楚）。

![requirejs wiki](http://ovdk1wiaq.bkt.clouddn.com/17-11-19/39872244.jpg)

好了，还是继续来看`requirejs`的源码吧。在nextTick中，首先使用makeModuleMap来构造了一个模块映射，
然后立刻通过getModule新建了一个模块加载器。

```javascript
//requireMod = getModule(makeModuleMap(null, relMap));  //nextTick中的代码

//创建模块映射
function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
    var url, pluginModule, suffix, nameParts,
    	prefix = null,
    	parentName = parentModuleMap ? parentModuleMap.name : null,
    	originalName = name,
    	isDefine = true, //是否是define的模块
    	normalizedName = '';
    
    //如果没有模块名，表示是require调用，使用一个内部名
    if (!name) {
    	isDefine = false;
    	name = '_@r' + (requireCounter += 1);
    }
    
    nameParts = splitPrefix(name);
    prefix = nameParts[0];
    name = nameParts[1];
    
    if (prefix) { //如果有插件前缀
    	prefix = normalize(prefix, parentName, applyMap);
    	pluginModule = getOwn(defined, prefix); //获取插件
    }
    
    if (name) {
        //对name再进行一些特殊处理
    }
    
    return {
        prefix: prefix,
        name: normalizedName,
        parentMap: parentModuleMap,
        unnormalized: !!suffix,
        url: url,
        originalName: originalName,
        isDefine: isDefine,
        id: (prefix ?
            prefix + '!' + normalizedName :
            normalizedName) + suffix
    };
}

//获取一个模块加载器
function getModule(depMap) {
    var id = depMap.id,
        mod = getOwn(registry, id);
    
    if (!mod) { //对未注册模块，添加到模块注册器中
        mod = registry[id] = new context.Module(depMap);
    }
    
    return mod;
}

//模块加载器
Module = function (map) {
    this.events = getOwn(undefEvents, map.id) || {};
    this.map = map;
    this.shim = getOwn(config.shim, map.id);
    this.depExports = [];
    this.depMaps = [];
    this.depMatched = [];
    this.pluginMaps = {};
    this.depCount = 0;
    
    /* this.exports this.factory
       this.depMaps = [],
       this.enabled, this.fetched
    */
};

Module.prototype = {
    init: function () {},
    fetch: function () {},
    load: function () {},
    callPlugin: function () {},
    defineDep: function () {},
    check: function () {},
    enable: function () {},
    on: function () {},
    emit: function () {}
};
```

```javascript
requireMod.init(deps, callback, errback, {
	enabled: true
});
```

拿到创建的模块加载器之后，立即调用了init方法。init方法中又调用了enable方法，enable方法中为所有的depMap又重新创建了一个模块加载器，并调用了依赖项的模块加载器的enable方法，最后调用check方法，check方法又马上调用了fetch方法，fatch最后调用的是load方法，load方法迅速调用了context.load方法。千言万语不如画张图。

![Module模块加载](http://ovdk1wiaq.bkt.clouddn.com/17-11-20/1196893.jpg)

确实这一块的逻辑很绕，中间每个方法都对一些作用域内的参数有一些修改，先只了解大致流程，后面慢慢讲。
这里重点看下req.load方法，这个方法是所有模块进行加载的方法。


```javascript
req.createNode = function (config, moduleName, url) {
    var node = config.xhtml ?
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
        document.createElement('script');
    node.type = config.scriptType || 'text/javascript';
    node.charset = 'utf-8';
    node.async = true; //创建script标签添加了async属性
    return node;
};
req.load = function (context, moduleName, url) { //用来进行js模块加载的方法
    var config = (context && context.config) || {},
    	node;
    if (isBrowser) { //在浏览器中加载js文件
    
        node = req.createNode(config, moduleName, url); //创建一个script标签
        
        node.setAttribute('data-requirecontext', context.contextName); //requirecontext默认为'_'
        node.setAttribute('data-requiremodule', moduleName); //当前模块名
        
        if (node.attachEvent &&
            !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
            !isOpera) {
            
            useInteractive = true;
            
            node.attachEvent('onreadystatechange', context.onScriptLoad);
        } else {
            node.addEventListener('load', context.onScriptLoad, false);
            node.addEventListener('error', context.onScriptError, false);
        }
        node.src = url;
        
        if (config.onNodeCreated) { //script标签创建时的回调
            config.onNodeCreated(node, config, moduleName, url);
        }
        
        currentlyAddingScript = node;
        if (baseElement) { //将script标签添加到页面中
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }
        currentlyAddingScript = null;
        
        return node;
    } else if (isWebWorker) { //在webWorker环境中
    	try {
            setTimeout(function () { }, 0);
            importScripts(url); //webWorker中使用importScripts来加载脚本
            
            context.completeLoad(moduleName);
    	} catch (e) { //加载失败
            context.onError(makeError('importscripts',
                'importScripts failed for ' +
                moduleName + ' at ' + url,
                e,
                [moduleName]));
    	}
    }
};
```

requirejs加载模块的方式是通过创建script标签进行加载，并且将创建的script标签插入到head中。而且还支持在webwork中使用，在webWorker使用`importScripts()`来进行模块的加载。

最后可以看到head标签中多了个script：
![require运行之后的head标签](http://ovdk1wiaq.bkt.clouddn.com/17-11-20/84154956.jpg)


## 使用define定义一个模块

requirejs提供了模块定义的方法：`define`，这个方法遵循AMD规范，其使用方式如下：
```javascript
define(id?, dependencies?, factory);
```

> define三个参数的含义如下：

1. id表示模块名，可以忽略，如果忽略则定义的是匿名模块；
2. dependencies表示模块的依赖项，是一个数组；
3. factory表示模块定义函数，函数的return值为定义模块，如果有dependencies，该函数的参数就为这个数组的每一项，类似于angularjs的依赖注入。


factory也支持commonjs的方式来定义模块，如果define没有传入依赖数组，factory会默认传入三个参数`require, exports, module`。
没错，这三个参数与commonjs对应的加载方式保持一致。require用来引入模块，exports和module用来导出模块。

```javascript
//写法1：
define(
    ['dep1'],
    function(dep1){
        var mod;
        //...
        
        return mod;
    }
);

//写法2：
define(
    function (require, exports, module) {
        var dep1 = require('dep1'), mod;

        //...
           
        exports = mod;
    }

});
```


废话不多说，我们还是直接来看源码吧！



```javascript
/**
 * 用来定义模块的函数。与require方法不同，模块名必须是第一个参数且为一个字符串，
 * 模块定义函数（callback）必须有一个返回值，来对应第一个参数表示的模块名
 */
define = function (name, deps, callback) {
	var node, context;

	//运行匿名模块
	if (typeof name !== 'string') {
		//参数的适配
		callback = deps;
		deps = name;
		name = null;
	}

	//这个模块可以没有依赖项
	if (!isArray(deps)) {
		callback = deps;
		deps = null;
	}

	//如果没有指定名字，并且callback是一个函数，使用commonJS形式引入依赖
	if (!deps && isFunction(callback)) {
		deps = [];
		//移除callback中的注释，
		//将callback中的require取出，把依赖项push到deps数组中。
		//只在callback传入的参数不为空时做这些
		if (callback.length) { //将模块的回调函数转成字符串，然后进行一些处理
			callback
				.toString()
				.replace(commentRegExp, commentReplace) //去除注释
				.replace(cjsRequireRegExp, function (match, dep) {
					deps.push(dep); //匹配出所有调用require的模块
				});

			//兼容CommonJS写法
			deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
		}
	}

	//If in IE 6-8 and hit an anonymous define() call, do the interactive
	//work.
	if (useInteractive) { //ie 6-8 进行特殊处理
		node = currentlyAddingScript || getInteractiveScript();
		if (node) {
			if (!name) {
				name = node.getAttribute('data-requiremodule');
			}
			context = contexts[node.getAttribute('data-requirecontext')];
		}
	}

	//如果存在context将模块放到context的defQueue中，不存在contenxt，则把定义的模块放到全局的依赖队列中
	if (context) {
		context.defQueue.push([name, deps, callback]);
		context.defQueueMap[name] = true;
	} else {
		globalDefQueue.push([name, deps, callback]);
	}
};
```


通过define定义模块最后都会放入到globalDefQueue数组中，当前上下文的defQueue数组中。具体怎么拿到定义的这些模块是使用`takeGlobalQueue`来完成的。

```javascript

/**
 * 内部方法，把globalQueue的依赖取出，放到当前上下文的defQueue中
 */
function intakeDefines() { //获取并加载define方法添加的模块
	var args;

	//取出所有define方法定义的模块（放在globalqueue中）
	takeGlobalQueue();

	//Make sure any remaining defQueue items get properly processed.
	while (defQueue.length) {
		args = defQueue.shift();
		if (args[0] === null) {
			return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
				args[args.length - 1]));
		} else {
			//args are id, deps, factory. Should be normalized by the
			//define() function.
			callGetModule(args);
		}
	}
	context.defQueueMap = {};
}

function takeGlobalQueue() {
	//将全局的DefQueue添加到当前上下文的DefQueue
	if (globalDefQueue.length) {
		each(globalDefQueue, function (queueItem) {
			var id = queueItem[0];
			if (typeof id === 'string') {
				context.defQueueMap[id] = true;
			}
			defQueue.push(queueItem);
		});
		globalDefQueue = [];
	}
}

//intakeDefines()方法是在makeRequire中调用的
makeRequire: function (relMap, options) { //用于构造require方法
    options = options || {};
    
    function localRequire(deps, callback, errback) { //真正的require方法
    
        intakeDefines();
        
        context.nextTick(function () {
			//Some defines could have been added since the
			//require call, collect them.
			intakeDefines();
		}
    }
}

//同时依赖被加载完毕的时候也会调用takeGlobalQueue方法
//之前我们提到requirejs是向head头中insert一个script标签的方式加载模块的
//在加载模块的同时，为script标签绑定了一个load事件
node.addEventListener('load', context.onScriptLoad, false);

//这个事件最后会调用completeLoad方法
onScriptLoad: function (evt) {
	if (evt.type === 'load' ||
		(readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
		var data = getScriptData(evt);
		context.completeLoad(data.id);
	}
}

completeLoad: function (moduleName) {
    var found;
    takeGlobalQueue();//获取加载的js中进行define的模块
	while (defQueue.length) {
		args = defQueue.shift();
		if (args[0] === null) {
			args[0] = moduleName;
			
			if (found) {
				break;
			}
			found = true;
		} else if (args[0] === moduleName) {
			found = true;
		}

		callGetModule(args);
	}
	context.defQueueMap = {};
}

```

无论是通过require的方式拿到defie定义的模块，还是在依赖加载完毕后，通过scriptLoad事件拿到定义的模块，这两种方式最后都使用`callGetModule()`这个方法进行模块加载。下面我们还是详细看看callGetModule之后，都发生了哪些事情。



```javascript
function callGetModule(args) {
	//跳过已经加载的模块
	if (!hasProp(defined, args[0])) {
		getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
	}
}
```

其实callGetModule方法就是调用了getModule方法（之前已经介绍过了），getModule方法返回一个Module（模块加载器）实例，最后调用实例的init方法。init方法会调用check方法，在check方法里会执行define方法所定义的factory，最后将模块名与模块保存到defined全局变量中。

```javascript
exports = context.execCb(id, factory, depExports, exports);
defined[id] = exports;
```

到这里定义模块的部分已经结束了。


---


# RequireJS源码分析（下）

这里主要会讲述模块加载操作的主要流程，以及Module的主要功能。废话不多说，直接看代码吧。


模块加载使用方法：

```javascript

require.config({
    paths: {
        jquery: 'https://cdn.bootcss.com/jquery/3.2.1/jquery'
    }
});

require(['jquery'], function ($) {
    $(function () {
        console.log('jQuery load!!!');
    });
});

```

我们直接对上面的代码进行分析，假设我们调用了require方法，需要对jquery依赖加载，require对依赖的加载，都是通过Module对象中的check方法来完成的。
在上篇中，我们已经知道require方法只是进行了参数的修正，最后调用的方法是通过context.makeRequire方法进行构造的。
这个方法中最核心的代码在nextTick中，nextTick上篇中也分析过，nextTick方法其实是一个定时器。

```javascript
intakeDefines();

//通过setTimeout的方式加载依赖，放入下一个队列，保证加载顺序
context.nextTick(function () {
	//优先加载denfine的模块
	intakeDefines();

	requireMod = getModule(makeModuleMap(null, relMap));

	requireMod.skipMap = options.skipMap; //配置项，是否需要跳过map配置

	requireMod.init(deps, callback, errback, {
		enabled: true
	});

	checkLoaded();
});	

```

我们一步一步分析这几句代码：

1. `requireMod = getModule(makeModuleMap(null, relMap));`

    这里得到的实际上就是Module的实例。
    
2. `requireMod.init(deps, callback, errback, { enabled: true });`
    
    这个就是重点操作了，进行依赖项的加载。


先看getModle、makeModlueMap这两个方法是如何创建Module实例的。

```javascript

function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
    //变量的声明
	var url, pluginModule, suffix, nameParts,
		prefix = null,
		parentName = parentModuleMap ? parentModuleMap.name : null,
		originalName = name,
		isDefine = true, //是否是define的模块
		normalizedName = '';

	//如果没有模块名，表示是require调用，使用一个内部名
	if (!name) {
		isDefine = false;
		name = '_@r' + (requireCounter += 1);
	}

	nameParts = splitPrefix(name);
	prefix = nameParts[0];
	name = nameParts[1];

	if (prefix) { //如果有插件前缀
		prefix = normalize(prefix, parentName, applyMap);
		pluginModule = getOwn(defined, prefix); //获取插件
	}

	//Account for relative paths if there is a base name.
	if (name) {
		if (prefix) { //如果存在前缀
			if (isNormalized) {
				normalizedName = name;
			} else if (pluginModule && pluginModule.normalize) {
				//Plugin is loaded, use its normalize method.
				normalizedName = pluginModule.normalize(name, function (name) {
					return normalize(name, parentName, applyMap); //相对路径转为绝对路径
				});
			} else {
				normalizedName = name.indexOf('!') === -1 ?
					normalize(name, parentName, applyMap) :
					name;
			}
		} else {
			//一个常规模块，进行名称的标准化.
			normalizedName = normalize(name, parentName, applyMap);
			
			nameParts = splitPrefix(normalizedName); //提取插件
			prefix = nameParts[0];
			normalizedName = nameParts[1];
			isNormalized = true;

			url = context.nameToUrl(normalizedName); //将模块名转化成js的路径
		}
	}

	suffix = prefix && !pluginModule && !isNormalized ?
		'_unnormalized' + (unnormalizedCounter += 1) :
		'';

	return {
		prefix: prefix,
		name: normalizedName,
		parentMap: parentModuleMap,
		unnormalized: !!suffix,
		url: url,
		originalName: originalName,
		isDefine: isDefine,
		id: (prefix ?
			prefix + '!' + normalizedName :
			normalizedName) + suffix
	};
}

//执行该方法后，得到一个对象：
{
   id: "_@r2", //模块id，如果是require操作，得到一个内部构造的模块名
   isDefine: false,
   name: "_@r2", //模块名
   originalName: null,
   parentMap: undefined,
   prefix: undefined, //插件前缀
   unnormalized: false,
   url: "./js/_@r2.js" , //模块路径
}

```

这里的前缀其实是requirejs提供的插件机制，requirejs能够使用插件，对加载的模块进行一些转换。比如加载html文件或者json文件时，可以直接转换为文本或者json对象，具体使用方法如下：

```javascript
require(["text!test.html"],function(html){
    console.log(html);
});

require(["json!package.json"],function(json){
    console.log(json);
});

//或者进行domReady
require(['domReady!'], function (doc) {
    //This function is called once the DOM is ready,
    //notice the value for 'domReady!' is the current
    //document.
});
```

经过makeModuleMap方法得到了一个模块映射对象，然后这个对象会被传入getModule方法，这个方法会实例化一个Module。

```javascript
function getModule(depMap) {
	var id = depMap.id,
		mod = getOwn(registry, id);

	if (!mod) { //对未注册模块，添加到模块注册器中
		mod = registry[id] = new context.Module(depMap);
	}

	return mod;
}

//模块加载器
Module = function (map) {
	this.events = getOwn(undefEvents, map.id) || {};
	this.map = map;
	this.shim = getOwn(config.shim, map.id);
	this.depExports = [];
	this.depMaps = [];
	this.depMatched = [];
	this.pluginMaps = {};
	this.depCount = 0;
	
	/* this.exports this.factory
	   this.depMaps = [],
	   this.enabled, this.fetched
	*/
};

Module.prototype = {
    //some methods
}

context = {
    //some prop
    Module: Module
};

```


得到了Module实例之后，就是我们的重头戏了。
可以说Module是requirejs的核心，通过Module实现了依赖的加载。

```javascript
//首先调用了init方法，传入了四个参数
//分别是：依赖数组，回调函数，错误回调，配置
requireMod.init(deps, callback, errback, { enabled: true });

//我们在看看init方法做了哪些事情
init: function (depMaps, factory, errback, options) { //模块加载时的入口
	options = options || {};
	
	if (this.inited) {
		return;  //如果已经被加载直接return
	}

	this.factory = factory;

    //绑定error事件
	if (errback) {
		this.on('error', errback);
	} else if (this.events.error) {
		errback = bind(this, function (err) {
			this.emit('error', err);
		});
	}

	//将依赖数组拷贝到对象的depMaps属性中
	this.depMaps = depMaps && depMaps.slice(0);

	this.errback = errback;

	//将该模块状态置为已初始化
	this.inited = true;

	this.ignore = options.ignore;
	
	//可以在init中开启此模块为enabled模式，
	//或者在之前标记为enabled模式。然而，
	//在调用init之前不知道依赖关系，所以，
	//之前为enabled，现在触发依赖为enabled模式
	if (options.enabled || this.enabled) {
		//启用这个模块和依赖。
		//enable之后会调用check方法。
		this.enable();
	} else {
		this.check();
	}
}

```


可以注意到，在调用init方法的时候，传入了一个option参数：

```javascript
{
    enabled: true
}
```

这个参数的目的就是标记该模块是否是第一次初始化，并且需要加载依赖。由于enabled属性的设置，init方法会去调用enable方法。enable方法我稍微做了下简化，如下：

```javascript
enable: function () {
	enabledRegistry[this.map.id] = this;
	this.enabled = true;
	this.enabling = true;

	//1、enable每一个依赖， ['jQuery']
	each(this.depMaps, bind(this, function (depMap, i) {
		var id, mod, handler;

        if (typeof depMap === 'string') {
            //2、获得依赖映射
    		depMap = makeModuleMap(depMap,
    			(this.map.isDefine ? this.map : this.map.parentMap),
    			false,
    			!this.skipMap);
    		this.depMaps[i] = depMap; //获取的依赖映射
    
    		this.depCount += 1; //依赖项+1
    		
    		//3、绑定依赖加载完毕的事件
    		//用来通知当前模块该依赖已经加载完毕可以使用
    		on(depMap, 'defined', bind(this, function (depExports) {
				if (this.undefed) {
					return;
				}
				this.defineDep(i, depExports); //加载完毕的依赖模块放入depExports中，通过apply方式传入require定义的函数中
				this.check();
			}));
    	}
		id = depMap.id;
		mod = registry[id]; //将模块映射放入注册器中进行缓存
		
		if (!hasProp(handlers, id) && mod && !mod.enabled) {
		    //4、进行依赖的加载
			context.enable(depMap, this); //加载依赖
		}
	}));

	this.enabling = false;

	this.check();
},

```

简单来说这个方法一共做了三件事：

1. 遍历了所有的依赖项

    `each(this.depMaps, bind(this, function (depMap, i) {}));`

2. 获得所有的依赖映射

    `depMap = makeModuleMap(depMap);`，这个方法前面也介绍过，用于获取依赖模块的模块名、模块路径等等。根据最开始写的代码，我们对jQuery进行了依赖，最后得到的depMap，如下：
    
    ```javascript
    {
        id: "jquery",
        isDefine: true,
        name: "jquery",
        originalName: "jquery",
        parentMap: undefined,
        prefix:undefined,
        unnormalized: false,
        url: "https://cdn.bootcss.com/jquery/3.2.1/jquery.js"
    }
    ```

3. 绑定依赖加载完毕的事件，用来通知当前模块该依赖已经加载完毕可以使用

    ```javascript
    on(depMap, 'defined', bind(this, function (depExports) {});
    ```


4. 最后通过`context.enable`方法进行依赖的加载。

    ```javascript
    context = {
        enable: function (depMap) { 
            //在之前的enable方法中已经把依赖映射放到了registry中
        	var mod = getOwn(registry, depMap.id);
        	if (mod) {
        		getModule(depMap).enable();
        	}
        }
    }
    ```
    
最终调用getModule方法，进行Module对象实例化，然后再次调用enable方法。这里调用的enable方法与之前容易混淆，主要区别是，之前是require模块进行enable，这里是模块的依赖进行enable操作。我们现在再次回到那个简化后的enable方法，由于依赖的加载没有依赖项需要进行遍历，可以直接跳到enable方法最后，调用了check方法，现在我们主要看check方法。

```javascript
enable: function () {
    //将当前模块id方法已经enable的注册器中缓存
	enabledRegistry[this.map.id] = this;
	this.enabled = true;
	this.enabling = true;

	//当前依赖项为空，可以直接跳过
	each(this.depMaps, bind(this, function (depMap, i) {}));

	this.enabling = false;

    //最后调用加载器的check方法
	this.check();
},
check: function () {
	if (!this.enabled || this.enabling) {
		return;
	}
	
	var id = this.map.id;
	//一些其他变量的定义

	if (!this.inited) {
		// 仅仅加载未被添加到defQueueMap中的依赖
		if (!hasProp(context.defQueueMap, id)) {
			this.fetch(); //调用fetch() -> load() -> req.load()
		}
	} else if (this.error) {
		//没有进入这部分逻辑，暂时跳过
	} else if (!this.defining) {
		//没有进入这部分逻辑，暂时跳过
	}
},
```

初看check方法，确实很多，足足有100行，但是不要被吓到，其实依赖加载的时候，只进了第一个if逻辑`if(!this.inited)`。由于依赖加载的时候，是直接调用的加载器的enable方法，并没有进行init操作，所以进入第一个if，立马调用了fetch方法。其实fetch的关键代码就一句：


```javascript
Module.prototype = {
    fetch: function () {
        var map = this.map;
        return map.prefix ? this.callPlugin() : this.load();
    },
    load: function () {
    	var url = this.map.url;
    
    	//Regular dependency.
    	if (!urlFetched[url]) {
    		urlFetched[url] = true;
    		context.load(this.map.id, url);
    	}
    }
}


```

如果有插件就先调用callPlugin方法，如果是依赖模块直接调用load方法。load方法先拿到模块的地址，然后调用了context.load方法。这个方法在上一章已经讲过了，大致就是动态创建了一个script标签，然后把src设置为这个url，最后将script标签insert到head标签中，完成一次模块加载。

```html
<!--最后head标签中会有一个script标签，这就是我们要加载的jQuery-->
<script type="text/javascript" charset="utf-8" async data-requirecontext="_" data-requiremodule="jquery" src="https://cdn.bootcss.com/jquery/3.2.1/jquery.js"></script>
```

到这一步，还只进行了一半，我们只是加载jquery.js，并没有拿到jquery对象。翻翻jQuery的源码，就能在最后看到jQuery使用了define进行定义。

```javascript
if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}
```

关于define在上一章已经讲过了，最后jQuery模块会push到globalDefQueue数组中。具体怎么从globalDefQueue中获取呢？答案是通过事件。在前面的load方法中，为script标签绑定了一个onload事件，在jquery.js加载完毕之后会触发这个事件。该事件最终调用context.completeLoad方法，这个方法会拿到全局define的模块，然后进行遍历，通过调用callGetModule，来执行define方法中传入的回调函数，得到最终的依赖模块。

```javascript
//为加载jquery.js的script标签绑定load事件
node.addEventListener('load', context.onScriptLoad, false);

function getScriptData(evt) {
	var node = evt.currentTarget || evt.srcElement;
	
	removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
	removeListener(node, context.onScriptError, 'error');

	return {
		node: node,
		id: node && node.getAttribute('data-requiremodule')
	};
}

context = {
    onScriptLoad: function (evt) {
    	if (evt.type === 'load' ||
    		(readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
    		interactiveScript = null;
    		
    		//通过该方法可以获取当前script标签加载的js的模块名
    		//并移除绑定的load与error事件
    		var data = getScriptData(evt);
    		//调用completeLoad方法
    		context.completeLoad(data.id);
    	}
    },
    completeLoad: function (moduleName) {
		var found, args, mod;
		
		//从globalDefQueue拿到define定义的模块，放到当前上下文的defQueue中	
		takeGlobalQueue(); 
		
		while (defQueue.length) {
			args = defQueue.shift();

			callGetModule(args); //运行define方法传入的回调，得到模块对象
		}
		//清空defQueueMap
		context.defQueueMap = {};

		mod = getOwn(registry, moduleName);

		checkLoaded();
	}
};

function callGetModule(args) {
    //args内容就是define方法传入的三个参数，分别是，
    //模块名、依赖数组、返回模块的回调。
    //拿之前jquery中的define方法来举例，到这一步时，args如下：
    //["jquery", [], function() {return $;}]
	if (!hasProp(defined, args[0])) {
	    //跳过已经加载的模块，加载完毕后的代码都会放到defined中缓存，避免重复加载
		getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
	}
}
```

在callGetModule方法中，再次看到了getModule这个方法，这里又让我们回到了起点，又一次构造了一个Module实例，并调用init方法。所以说嘛，Module真的是requirejs的核心。首先这个Module实例会在registry中获取，因为在之前我们已经构造过一次了，并且直接调用了enable方法来进行js的异步加载，然后调用init方法之后的逻辑我也不啰嗦了，init会调用enable，enable又会调用check，现在我们主要来看看check中发生了什么。

```javascript
check: function () {
	if (!this.enabled || this.enabling) {
		return;
	}

	var err, cjsModule,
		id = this.map.id,
		depExports = this.depExports,
		exports = this.exports,
		factory = this.factory;

	if (!this.inited) {
		// 调用fetch方法，异步的进行js的加载
	} else if (this.error) {
	    // 错误处理
		this.emit('error', this.error);
	} else if (!this.defining) {
		this.defining = true;

		if (this.depCount < 1 && !this.defined) { //如果依赖数小于1，表示依赖已经全部加载完毕
			if (isFunction(factory)) { //判断factory是否为函数
				exports = context.execCb(id, factory, depExports, exports);
			} else {
				exports = factory;
			}

			this.exports = exports;

			if (this.map.isDefine && !this.ignore) {
				defined[id] = exports; //加载的模块放入到defined数组中缓存
			}

			//Clean up
			cleanRegistry(id);

			this.defined = true;
		}
		
		this.defining = false;

		if (this.defined && !this.defineEmitted) {
			this.defineEmitted = true;
			this.emit('defined', this.exports); //激活defined事件
			this.defineEmitComplete = true;
		}

	}
}
```

这次调用check方法会直接进入最后一个`else if`中，这段逻辑中首先判断了该模块的依赖是否全部加载完毕（`this.depCount < 1`），我们这里是jquery加载完毕后来获取jquery对象，所以没有依赖项。然后判断了回调是否是一个函数，如果是函数则通过execCb方法执行回调，得到需要暴露的模块（也就是我们的jquery对象）。另外回调也可能不是一个函数，这个与require.config中的shim有关，可以自己了解一下。拿到该模块对象之后，放到defined对象中进行缓存，之后在需要相同的依赖直接获取就可以了（`defined[id] = exports;`）。

到这里的时候，依赖的加载可以说是告一段落了。但是有个问题，依赖加载完毕后，require方法传入的回调还没有被执行。那么依赖加载完毕了，我怎么才能通知之前require定义的回调来执行呢？没错，可以利用观察者模式，这里requirejs中自己定义了一套事件系统。看上面的代码就知道，将模块对象放入defined后并没有结束，之后通过requirejs的事件系统激活了这个依赖模块defined事件。

激活的这个事件，是在最开始，对依赖项进行遍历的时候绑定的。

```javascript
//激活defined事件
this.emit('defined', this.exports);


//遍历所有的依赖，并绑定defined事件
each(this.depMaps, bind(this, function (depMap, i) {
    on(depMap, 'defined', bind(this, function (depExports) {
		if (this.undefed) {
			return;
		}
		this.defineDep(i, depExports); //将获得的依赖对象，放到指定位置
		this.check();
	}));
}

defineDep: function (i, depExports) {
	if (!this.depMatched[i]) {
		this.depMatched[i] = true;
		this.depCount -= 1; 
		//将require对应的deps存放到数组的指定位置
		this.depExports[i] = depExports;
	}
}
```

到这里，我们已经有眉目了。在事件激活之后，调用defineDep方法，先让depCount减1，这就是为什么check方法中需要判断depCount是否小于1的原因（只有小于1才表示所以依赖加载完毕了），然后把每个依赖项加载之后得到的对象，按顺序存放到depExports数组中，而这个depExports就对应require方法传入的回调中的arguments。

最后，事件函数调用check方法，我们已经知道了check方法会使用context.execCb来执行回调。其实这个方法没什么特别，就是调用apply。


```javascript
context.execCb(id, factory, depExports, exports);

execCb: function (name, callback, args, exports) {
	return callback.apply(exports, args);
}
```

到这里，整个一次require的过程已经全部结束了。核心还是Module构造器，不过是require加载依赖，还是define定义依赖，都需要通过Module，而Module中最重要的两个方法enable和check是重中之重。通过require源码的分析，对js的异步，还有早期的模块化方案有了更加深刻的理解。