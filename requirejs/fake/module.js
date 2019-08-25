define('module', ['jquery'], ($) => {
  $(function () {
    $('#app').html('loaded')
  })

  return {
    add: (a, b) => {
      return a + b
    }
  }
})