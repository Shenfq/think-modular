(function(modules) { // webpackBootstrap
	// The module cache  模块的缓存
	var installedModules = {};
	// The require function
	function __webpack_require__(moduleId) {  //模块加载器
		// Check if module is in cache
		if(installedModules[moduleId]) {
			return installedModules[moduleId].exports;
		}
		// Create a new module (and put it into the cache)
		var module = installedModules[moduleId] = {  //模块对象
			i: moduleId,  //id
			l: false,     //loaded
			exports: {}
		};
		// Execute the module function   模块加载，传入三个参数
		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
		// Flag the module as loaded
		module.l = true;  //加载完毕将状态置为true
		// Return the exports of the module
		return module.exports;
	}
	// expose the modules object (__webpack_modules__)
	__webpack_require__.m = modules;
	// expose the module cache
	__webpack_require__.c = installedModules;
	// define getter function for harmony exports
	__webpack_require__.d = function(exports, name, getter) {
		if(!__webpack_require__.o(exports, name)) {
			Object.defineProperty(exports, name, {
				configurable: false,
				enumerable: true,
				get: getter
			});
		}
	};
	// getDefaultExport function for compatibility with non-harmony modules
	__webpack_require__.n = function(module) {
		var getter = module && module.__esModule ?
			function getDefault() { return module['default']; } :
			function getModuleExports() { return module; };
		__webpack_require__.d(getter, 'a', getter);
		return getter;
	};
	// Object.prototype.hasOwnProperty.call
	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
	// __webpack_public_path__
	__webpack_require__.p = "";
	// Load entry module and return exports
	return __webpack_require__(__webpack_require__.s = 0);  //默认加载第一个模块
})
([
    /* 0 */
    (function(module, __webpack_exports__, __webpack_require__) {

        "use strict";
        Object.defineProperty(__webpack_exports__, "__esModule", { value: true }); //表示是使用es6的方式进行的模块加载
        /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__module_a_js__ = __webpack_require__(1);
        /* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__module_b_js__ = __webpack_require__(2);

        const people = Object.assign({}, __WEBPACK_IMPORTED_MODULE_0__module_a_js__["a" /* default */], __WEBPACK_IMPORTED_MODULE_1__module_b_js__["a" /* default */]);

        console.log(people);

    }),
    /* 1 */
    (function(module, __webpack_exports__, __webpack_require__) {

        "use strict";
        /* harmony default export */ __webpack_exports__["a"] = ({
            name: "shenfq"
        });

    }),
    /* 2 */
    (function(module, __webpack_exports__, __webpack_require__) {

        "use strict";
        /* harmony default export */ __webpack_exports__["a"] = ({
            age: 22
        });

    })
]);