(function(modules) {
	// 已加载模块的缓存
	var installedModules = {};

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
	__webpack_require__.r = function(exports) {
		Object.defineProperty(exports, '__esModule', { value: true });
	};

	// 获取默认模块默认暴露的变量，兼容多种模块化方案
	__webpack_require__.n = function(module) {
		var getter = module && module.__esModule ?
			function getDefault() { return module['default']; } : //如果是es的模块化方案，默认取default
			function getModuleExports() { return module; };
		__webpack_require__.d(getter, 'a', getter);
		return getter;
	};

	// Object.prototype.hasOwnProperty.call
	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

	// __webpack_public_path__
	__webpack_require__.p = "";

	// 加载入口模块
	return __webpack_require__(__webpack_require__.s = "./src/main.js");
})({
  "./src/main.js":
  /*!*********************!*\
    !*** ./src/main.js ***!
    \*********************/
  (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    __webpack_require__.r(__webpack_exports__);
    var _module_a_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./module-a.js */ "./src/module-a.js");
    var _module_b_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./module-b.js */ "./src/module-b.js");
    const people = Object.assign({}, _module_a_js__WEBPACK_IMPORTED_MODULE_0__["default"], _module_b_js__WEBPACK_IMPORTED_MODULE_1__["default"]);

    console.log(people);

  }),
  "./src/module-a.js":
  /*!*************************!*\
    !*** ./src/module-a.js ***!
    \*************************/
  (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    __webpack_require__.r(__webpack_exports__);
    __webpack_exports__["default"] = ({
        name: "shenfq"
    });

  }),
  "./src/module-b.js":
  /*!*************************!*\
    !*** ./src/module-b.js ***!
    \*************************/
  /*! exports provided: default */
  (function(module, __webpack_exports__, __webpack_require__) {

    "use strict";
    __webpack_require__.r(__webpack_exports__);
    __webpack_exports__["default"] = ({
        age: 22
    });

  })
});
