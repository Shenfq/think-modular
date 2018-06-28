define('math', function (require, exports, module) {
  console.log('loading math')
  require('underscore/underscore')
  var _ = window._

  var isNumber = _.isNumber

  module.exports =  {
    add: function (a, b) {
      if (!isNumber(a) || !isNumber(b)) return 0
      return a + b
    },
    random: _.random,
    max: _.max,
    min: _.min,
  }
})
