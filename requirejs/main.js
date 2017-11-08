require.config({
    paths: {
        "jquery": ["https://cdn.bootcss.com/jquery/3.2.1/jquery"]
    }
});

require(["jquery"], function ($) {
    $(function () {
        console.log("load finished");

        $('#app').html('has loaded!');
    })
})
