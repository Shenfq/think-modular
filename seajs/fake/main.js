define('main', function (require, exports, module) {
  require('jquery')
  var $ = window.$
  console.log('loaded jquery')

  $(function () {
    $('#app').html('has loaded!')
  })

  module.exports = 'main-module'
})
