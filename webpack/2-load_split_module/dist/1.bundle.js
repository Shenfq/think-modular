(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[1],{

/***/ "./src/module-b.js":
/*!*************************!*\
  !*** ./src/module-b.js ***!
  \*************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash */ "../node_modules/lodash/lodash.js");
/* harmony import */ var lodash__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash__WEBPACK_IMPORTED_MODULE_0__);


/* harmony default export */ __webpack_exports__["default"] = ({
  age: 22,
  changeAge (age) {
    if (!lodash__WEBPACK_IMPORTED_MODULE_0___default.a.isInteger(age)) {
      console.error('Age must be an integer')
      return false
    }
    this.age = age;
  }
});

/***/ })

}]);