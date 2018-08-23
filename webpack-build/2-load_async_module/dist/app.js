(function(modules) { // webpack启动器
 	// JSONP的回调（使用JSONP的方式进行模块的异步加载），用来加载chunk
 	function webpackJsonpCallback(data) {
 		var chunkIds = data[0];
 		var moreModules = data[1]

 		// add "moreModules" to the modules object,
 		// then flag all "chunkIds" as loaded and fire callback
 		var moduleId, chunkId, i = 0, resolves = [];
 		for(;i < chunkIds.length; i++) {
 			chunkId = chunkIds[i];
 			if(installedChunks[chunkId]) {
 				resolves.push(installedChunks[chunkId][0]);
 			}
 			installedChunks[chunkId] = 0;
 		}
 		for(moduleId in moreModules) {
 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
 				modules[moduleId] = moreModules[moduleId];
 			}
 		}
 		if(parentJsonpFunction) parentJsonpFunction(data);
 		while(resolves.length) {
 			resolves.shift()();
 		}

 	};


 	// 模块缓存对象
 	var installedModules = {};

 	// 加载异步块并进行缓存
 	var installedChunks = {
 		"app": 0
 	};



 	// require方法的实现
 	function __webpack_require__(moduleId) {

 		// 检查该模块是否已在缓存中
 		if(installedModules[moduleId]) {
 			return installedModules[moduleId].exports;
 		}
 		// 创建一个新模块 (并将模块放入缓存对象中)
 		var module = installedModules[moduleId] = {
 			i: moduleId,
 			l: false,
 			exports: {}
 		};

 		// 执行模块方法
 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

 		// 标记模块为已加载
 		module.l = true;

 		// 返回加载后的模块对象
 		return module.exports;
 	}

 	// This file contains only the entry chunk.
 	// The chunk loading function for additional chunks
 	__webpack_require__.e = function requireEnsure(chunkId) {
 		var promises = [];


 		// 使用JSONP加载模块

 		var installedChunkData = installedChunks[chunkId];
 		if(installedChunkData !== 0) { // 0表示模块已经被安装过

 			// 返回promise表示 "正在加载中".
 			if(installedChunkData) {
 				promises.push(installedChunkData[2]);
 			} else {
 				// 设置promise到chunk缓存中
 				var promise = new Promise(function(resolve, reject) {
 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
 				});
 				promises.push(installedChunkData[2] = promise);

 				// 开始加载chunk
 				var head = document.getElementsByTagName('head')[0];
 				var script = document.createElement('script');

 				script.charset = 'utf-8';
 				script.timeout = 120000;

 				if (__webpack_require__.nc) {
 					script.setAttribute("nonce", __webpack_require__.nc);
 				}
 				script.src = __webpack_require__.p + "" + ({}[chunkId]||chunkId) + ".bundle.js";
 				var timeout = setTimeout(function(){ //超时时间2分钟
 					onScriptComplete({ type: 'timeout', target: script });
 				}, 120000);
 				script.onerror = script.onload = onScriptComplete;
 				function onScriptComplete(event) {
 					// 避免IE中发生内存泄漏
 					script.onerror = script.onload = null;
 					clearTimeout(timeout);
 					var chunk = installedChunks[chunkId];
 					if(chunk !== 0) {
 						if(chunk) {
 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
 							var realSrc = event && event.target && event.target.src;
 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
 							error.type = errorType;
 							error.request = realSrc;
 							chunk[1](error);
 						}
 						installedChunks[chunkId] = undefined;
 					}
 				};
 				head.appendChild(script);
 			}
 		}
 		return Promise.all(promises);
 	};

	// 暴露所有模块对象 (__webpack_modules__)
	__webpack_require__.m = modules;

	// 暴露已缓存的模块
	__webpack_require__.c = installedModules;

 	// 为模块暴露的其他变量（除default之外的变量），定义一个getter函数
 	__webpack_require__.d = function(exports, name, getter) {
 		if(!__webpack_require__.o(exports, name)) {
 			Object.defineProperty(exports, name, {
 				configurable: false,
 				enumerable: true,
 				get: getter
 			});
 		}
 	};

	// 定义exports使用的是es的方式导出，在require的时候会默认加载default
	__webpack_require__.r = function (exports) {
		Object.defineProperty(exports, '__esModule', { value: true });
	};

	// 获取默认模块默认暴露的变量，兼容多种模块化方案
	__webpack_require__.n = function (module) {
		var getter = module && module.__esModule ?
			function getDefault() { return module['default']; } : //如果是es的模块化方案，默认取default
			function getModuleExports() { return module; };
		__webpack_require__.d(getter, 'a', getter);
		return getter;
	};

 	// Object.prototype.hasOwnProperty.call
 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

 	// 公共路径，webpack中设置的 pbulicPath
 	__webpack_require__.p = "";

 	// on error function for async loading
 	__webpack_require__.oe = function(err) { console.error(err); throw err; };

 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
	jsonpArray.push = webpackJsonpCallback; //重写push方法为jsonp回调函数，在异步加载的chunk中会调用webpackJsonp.push
 	jsonpArray = jsonpArray.slice();
 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
 	var parentJsonpFunction = oldJsonpFunction;


 	// Load entry module and return exports
 	return __webpack_require__(__webpack_require__.s = "./2-load_async_module/src/main.js");
 })({

  "./2-load_async_module/src/main.js":
  /*!*****************************************!*\
    !*** ./2-load_async_module/src/main.js ***!
    \*****************************************/
  (function(module, exports, __webpack_require__) {

    __webpack_require__.e(/*! import() */ 0).then(__webpack_require__.bind(null, /*! ./module-a.js */ "./2-load_async_module/src/module-a.js"));

  })

});