var writeSource = require("./writeSource");

module.exports = function(depTree, chunk, options) {
	if(!options) {
		options = chunk;
		chunk = null;
	}
	var buffer = [];
	var modules = chunk ? chunk.modules : depTree.modulesById;
	for(var moduleId in modules) {
		if(chunk) {
			if(chunk.modules[moduleId] !== "include")
				continue;
		}
		var module = depTree.modulesById[moduleId];
		buffer.push("/******/");
		buffer.push(moduleId);
		buffer.push(": function(module, exports, require) {\n\n");
		if(options.includeFilenames) { // 添加注释：文件绝对路径
			buffer.push("/*** ");
			buffer.push(module.filename);
			buffer.push(" ***/\n\n");
		}
		buffer.push(writeSource(module));
		buffer.push("\n\n/******/},\n/******/\n");
	}
	return buffer.join("");
}
