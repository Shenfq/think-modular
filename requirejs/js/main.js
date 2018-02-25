require.config({
    paths: {
        jquery: 'https://cdn.bootcss.com/jquery/3.2.1/jquery',
        underscore: 'https://cdn.bootcss.com/underscore.js/1.4.3/underscore',
    },
    shim: {
        underscore: {
            exports: '_'
        }
    }
});


require(['jquery', 'math'], function ($, math) {
    $(function () {
        var result = math.add(4, 5);
        console.log(result);
        console.log(math.random(1, 40));
        console.log(math.max([12, 43, 5, 8, 55, 90]));

        $('#app').html('has loaded!');
    })
});

/* define(['jquery', 'math'], function ($, math) {
    $(function () {
        var result = math.add(4, 5);
        console.log(result);
        console.log(math.random(1,40));
        console.log(math.max([12,43,5,8,55,90]));

        $('#app').html('has loaded!');
    })
});
 */
/* define(function (require, exports, module) {
    var $ = require('jquery');
    var math = require('math');
    $(function () {
        var result = math.add(4, 5);
        console.log(result);
        console.log(math.random(1, 40));
        console.log(math.max([12, 43, 5, 8, 55, 90]));

        $('#app').html('has loaded!');
    })
}); */