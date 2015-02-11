var path = require("path"); //path.resolve(module.filename, "../../../prometheus-modules");
var ModuleManager = require("prometheus-module-manager");

var PrometheusCore = new function(){

	var mode = null;

	var proper_layer_names = {"db" : true , "biz" : true , "web" : true};

	//applies only to distributed mode
	var which_chip_types_to_start_for_layer = {
		db:  [],
		biz: ["field_type", "resource_type", "service"],   
		web: ["field_type", "resource_type", "channel"]   
	}

	function layer_name_valid(layer_name){
		return layer_name in proper_layer_names;
	}

	/**
	 * @param  {string} mode       local|distributed
	 * @param  {string} layer_name db|biz|web
	 */
	function decide_chip_types_to_start(mode, layer_name){
		if(mode=="local"){
			return ["field_type", "resource_type", "service", "channel"];
		}else if(!layer_name_valid(layer_name)){
			throw new Error("Invalid layer name: " + layer_name);
		}else{
			return which_chip_types_to_start_for_layer[layer_name];

		}
	}

	function getDispatcher(mode, layer_name){
		if(mode==="local"){
			return require("prometheus-dispatcher-local");
		}else{
			return require("prometheus-dispatcher-distributed-" + layer_name);
		}
	}

	/**
	 * [init description]
	 * @param  {string} mode       local|distributed
	 * @param  {string} layer_name db|biz|web
	 */
	this.start = function(mode, layer_name, modules_dir){
		mode = mode || "local";
		layer_name = layer_name || null;


		//module needed for basic Prometheus operations
		base_module_dir = path.resolve(module.filename, "../../prometheus-base-chips");
		ModuleManager.register_module(base_module_dir);

		modules_dir = modules_dir ||  path.resolve(module.filename, "../../../prometheus-modules");
		ModuleManager.register_modules(modules_dir);

		var chip_types_to_start = decide_chip_types_to_start(mode, layer_name);

		var dispatcher = getDispatcher(mode, layer_name);
		dispatcher.init && dispatcher.init();

		ModuleManager.prepare_chips_for_all_modules(chip_types_to_start, dispatcher);
		//console.log("I prepared chips for all modules");
		ModuleManager.start_chips_for_all_modules(chip_types_to_start);
	};

}

module.exports = PrometheusCore;