var ExceptionHandler = new function(){
	var function_array = [];

	this.addErrorParser = function(function_to_add){
		function_array.push(function_to_add);
	}

	this.processError = function(err){
		var found_suitable_function = false;
		for(var i in function_array){
			var current_function = function_array[i];
			var function_output = current_function(err);
			if(function_output!=null){
				console.error("===ERROR=== ", function_output);
				//console.error(err.stack);
				found_suitable_function = true;
				break;
			}
		}
		if(!found_suitable_function){
			/*if (err.code == "unresolved_dependencies") {
				console.error("Unresolved dependencies error!");
				console.error(err.err_message);
				console.error("Module: "+err.module);
			}*/
			console.error("===ERROR===:", err.console_message || err.message);
			console.error(err.stack);
		}
	}
}

process.on('uncaughtException', function(err) {
	ExceptionHandler.processError(err);	    
});

/*
	*/



module.exports = ExceptionHandler;
