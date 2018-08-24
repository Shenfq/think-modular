var a = require("./deps/a");
var b = require("./deps/b");
require.ensure(["./deps/c"], function (require) {
  require("./deps/b").xyz();
  var d = require("./deps/d");
});
