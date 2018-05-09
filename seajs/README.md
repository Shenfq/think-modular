# sea.js 源码分析

seajs代码很优雅，模块的加载思路与requirejs一致，创建script标签，然后设置src并插入到head中。

最惊喜的是里面有一个方法`parseDependencies`，用来获取define传入的factory中所有的require依赖，可以看成一个简单的状态机，适合用来入门编译原理。

该方法的代码在这里： [crequire](https://github.com/seajs/crequire)
