## webpack

webpack如今已经是前端工程师（前端配置师）必备的一项技能，我一直在想怎么去理解webpack的打包机制，是不是得从0开始一点点去看它的源码。
现在我想通过了，不去关注过程，直接看结果，也就是看看webpack打包后生成的代码，可以更加容易理解webpack是如何做到模块化的。

让我们分析一下webpack打包之后的代码到底什么样子的吧！！！

> 注：这里使用的是最新的webpack 4

1. 普通的打包：[1-simple_load_module](./1-simple_load_module)

2. 使用异步加载的方式打包: [2-load_async_module](./2-load_async_module)

3. 使用commonChunk打包: [3-load_split_module](./3-load_split_module)
