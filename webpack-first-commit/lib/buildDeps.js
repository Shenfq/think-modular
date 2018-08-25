var parse = require("./parse");
var resolve = require("./resolve");
var fs = require("fs");
var path = require("path");

/**
 * context: current directory
 * mainModule: the entrance module
 * options:
 * callback: function(err, result)
 */
module.exports = function buildDeps(context, mainModule, options, callback) {
	if(!callback) {
		callback = options;
		options = {};
	}
	if(!options) options = {};

	var depTree = {
		modules: {},
		modulesById: {},
		chunks: {},
		nextModuleId: 0,
		nextChunkId: 0,
		chunkModules: {} // used by checkObsolete
	}
	var mainModuleId;
	addModule(depTree, context, mainModule, options, function(err, id) {
    if(err) {
			callback(err);
			return;
		}
    mainModuleId = id;
		buildTree();
	});
	function buildTree() {
		addChunk(depTree, depTree.modulesById[mainModuleId], options);
		for(var chunkId in depTree.chunks) {
      // 移除已经存在与父chunk的module
      removeParentsModules(depTree, depTree.chunks[chunkId]);
      // 移除空的chunk
      removeChunkIfEmpty(depTree, depTree.chunks[chunkId]);
      // 检查chunk下的module排序
			checkObsolete(depTree, depTree.chunks[chunkId]);
    }
    // console.log(JSON.stringify(depTree, null, '  '))
		callback(null, depTree);
	}
}

function addModule(depTree, context, module, options, callback) {
	resolve(context, module, options.resolve, function(err, filename) {
		if(err) {
			callback(err);
			return;
		}
		if(depTree.modules[filename]) { // 加载过的模块不再重复加载
			callback(null, depTree.modules[filename].id);
		} else {
			var module = depTree.modules[filename] = {
				id: depTree.nextModuleId++, // 模块id从0开始，每加载一个模块 + 1
				filename: filename // 依据一定规则获取的有效的模块的绝对地址
			};
			depTree.modulesById[module.id] = module;
			fs.readFile(filename, "utf-8", function(err, source) {
				if(err) {
					callback(err);
					return;
				}
        var deps = parse(source); // 解析ast，得到全部的依赖项
				module.requires = deps.requires || [];
				module.asyncs = deps.asyncs || [];
				module.source = source;

				var requires = {};
				function add(r) {
					requires[r.name] = requires[r.name] || [];
					requires[r.name].push(r);
        }
        // 将所有依赖文件存入requires对象中，
        // 结构： 文件名: [ ...在文件中的位置 ]
				if(module.requires)
					module.requires.forEach(add);
				if(module.asyncs)
					module.asyncs.forEach(function addContext(c) {
						if(c.requires)
							c.requires.forEach(add);
						if(c.asyncs)
							c.asyncs.forEach(addContext);
					});
        requiresNames = Object.keys(requires); // 所有依赖文件名
				var count = requiresNames.length; // 依赖文件的总数
				var errors = [];
				if(requiresNames.length)
					requiresNames.forEach(function(moduleName) { // 加载所有依赖文件
						addModule(depTree, path.dirname(filename), moduleName, options, function(err, moduleId) {
							if(err) {
								errors.push(err+"\n @ " + filename + " (line " + requires[moduleName][0].line + ", column " + requires[moduleName][0].column + ")");
							} else {
								requires[moduleName].forEach(function(requireItem) {
									requireItem.id = moduleId; // 缓存模块id
								});
							}
							count--;
							if(count === 0) { // 所有依赖文件加载完毕
								if(errors.length) {
									callback(errors.join("\n"));
								} else {
									end();
								}
							}
						});
					});
				else end()
				function end() {
					callback(null, module.id);
				}
			});
		}
	});
}

// 构建一个`块`，webpack中一个chunk是多个module的集合
function addChunk(depTree, chunkStartpoint, options) {
	var chunk = {
		id: depTree.nextChunkId++,
		modules: {},
		context: chunkStartpoint
	};
	depTree.chunks[chunk.id] = chunk;
	if(chunkStartpoint) { // 表示当前chunk的第一个加载的module，一般就是webpack的entry
    chunkStartpoint.chunkId = chunk.id;
    // 将模块添加到chunk中
		addModuleToChunk(depTree, chunkStartpoint, chunk.id, options);
	}
	return chunk;
}

function addModuleToChunk(depTree, context, chunkId, options) {
	context.chunks = context.chunks || [];
	if(context.chunks.indexOf(chunkId) === -1) {
		context.chunks.push(chunkId);
    if(context.id !== undefined)
      // 将chunk包含的module的状态改为include
			depTree.chunks[chunkId].modules[context.id] = "include";
		if(context.requires) {
      // 将入口模块所有的同步依赖模块也添加到该chunk
      // 只有requires会被添加，asyncs不会添加
			context.requires.forEach(function(requireItem) {
				addModuleToChunk(depTree, depTree.modulesById[requireItem.id], chunkId, options);
			});
    }
    // 所有异步加载模块放入子chunk中
		if(context.asyncs) {
			context.asyncs.forEach(function(context) {
				var subChunk
				if(context.chunkId) {
					subChunk = depTree.chunks[context.chunkId];
				} else {
					subChunk = addChunk(depTree, context, options);
				}
				subChunk.parents = subChunk.parents || [];
				subChunk.parents.push(chunkId);
			});
		}
	}
}

function removeParentsModules(depTree, chunk) {
	if(!chunk.parents) return;
	for(var moduleId in chunk.modules) {
		var inParent = false;
    chunk.parents.forEach(function(parentId) {
      if(depTree.chunks[parentId].modules[moduleId])
        inParent = true;
		});
		if(inParent) {
      // 如果模块已经存在与父chunk，修改状态
			chunk.modules[moduleId] = "in-parent";
		}
	}
}

function removeChunkIfEmpty(depTree, chunk) {
	var hasModules = false;
	for(var moduleId in chunk.modules) {
		if(chunk.modules[moduleId] === "include") {
			hasModules = true;
			break;
		}
	}
	if(!hasModules) {
		chunk.context.chunkId = null;
		chunk.empty = true;
	}
}

function checkObsolete(depTree, chunk) {
	var modules = [];
	for(var moduleId in chunk.modules) {
		if(chunk.modules[moduleId] === "include") {
			modules.push(moduleId);
		}
	}
	if(modules.length === 0) return;
	modules.sort();
  var moduleString = modules.join(" ");
	if(depTree.chunkModules[moduleString]) {
    chunk.equals = depTree.chunkModules[moduleString];
		if(chunk.context)
			chunk.context.chunkId = chunk.equals;
	} else
		depTree.chunkModules[moduleString] = chunk.id;
}
