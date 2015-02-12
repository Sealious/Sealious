var fs = require("fs");
var Set = require("Set");
var path = require("path");

var Module = require("./module.js");

function intersection_of_arrays(array1, array2){
	//console.log("comparing arrays, ", array1, array2)
	array3 = array1.filter(function(n) {
		return array2.indexOf(n) != -1;
	});
	return array3;
}

var ModuleManager = new function(){

	var modules_by_id = {};

	function get_module_count(){
		var c = 0;
		for(var i in modules_by_id){
			c++;
		}
		return c;
	}

	this.register_module = function(module_dir){
		var current_module = new Module(module_dir);
		modules_by_id[current_module.id] = current_module;
		current_module.registered = true;
	}

	this.register_modules = function(modules_dir){
		var modules_dir_contents = fs.readdirSync(modules_dir);
		for(var i in modules_dir_contents){
			var current_module_path = path.resolve(modules_dir, modules_dir_contents[i]);
			this.register_module(current_module_path);
		}
	}

	function decide_module_execution_order(){
		var accepted_module_ids = new Set();
		var accepted_chip_ids = new Set();
		var module_ids_in_order = [];
		do{
			var any_accepted_in_this_iteration = false;
			for(var module_id in modules_by_id){
				if(!accepted_module_ids.has(module_id)){
					var current_module = modules_by_id[module_id]
					var current_module_info = current_module.info;
					var can_be_accepted = true;
					for(var i in current_module_info.requires){
						if(current_module_info.requires[i].indexOf(".*") !== -1) {
							continue;
						}
						else if(!accepted_chip_ids.has(current_module_info.requires[i])){
							can_be_accepted = false;
							break;
						}

					}
					for(var i in current_module_info.defines){
						if(accepted_chip_ids.has(current_module_info.defines[i])){
							throw new Error("Duplicate chip declaration: " + current_module_info.defines[i]);
						}
					}
					if(can_be_accepted){
						module_ids_in_order.push(current_module.id);
						accepted_module_ids.add(current_module.id);
						accepted_chip_ids.addAll(current_module_info.defines);
						any_accepted_in_this_iteration = true
					}
				}
			}			
		}while(any_accepted_in_this_iteration);
		var accepted_modules_count = module_ids_in_order.length;
		var modules_total = get_module_count();
		if(modules_total!=accepted_modules_count){
			var error_message = deduce_dependency_issues();
			throw new Error(error_message);
		}else{
			return module_ids_in_order;
		}

	}

	function deduce_dependency_issues(){
		var message = "";
		var has_unresolved = false;
		var defined_chips = [];
		for (var id in modules_by_id){
			for (var i in modules_by_id[id].defines){
				defined_chips.push(modules_by_id[id].defines[i]);
			}		
		}
		for(var i in modules_by_id){
			for(var j in modules_by_id){
				//console.log(modules_by_id[i].info.defines.length, modules_by_id[i].info.requires.length);
				if(i!=j && intersection_of_arrays(modules_by_id[i].info.requires, modules_by_id[j].info.defines).length && intersection_of_arrays(modules_by_id[j].requires, modules_by_id[i].defines).length){
					message += "There are cyclic dependencies between modules_by_id: " + i + " and " + j + "\n";
					has_unresolved = true;
				}
			}
		}
		for (var k in modules_by_id) {
		    for(var requirement in modules_by_id[k].requires) {
		        if (defined_chips.indexOf(modules_by_id[k].requires[requirement]) == -1) {
		            has_unresolved = true;
		            message += "Module '" + k + "' requires '"  + modules_by_id[k].requires[requirement] + "' which was not found!\n";
		        }
		    }
		}
		if(!has_unresolved){
		    message = "There are no unresolved dependencies";
		}
		return message;
	}

	this.prepare_chips_for_all_modules = function(chip_types_to_start, real_dispatcher){
		//console.log("got request to prepre all chips of type", chip_types_to_start);
		var module_execution_order = decide_module_execution_order();
		for(var i in module_execution_order){
			var id = module_execution_order[i];
			var current_module = modules_by_id[id];
			current_module.prepare(chip_types_to_start, real_dispatcher);
		}
	}

	this.start_chips_for_all_modules = function(chip_types_to_start){
		var module_execution_order = decide_module_execution_order();
		for(var i in module_execution_order){
			var id = module_execution_order[i];
			var current_module = modules_by_id[id];
			current_module.start(chip_types_to_start);
		}
	}

}

module.exports = ModuleManager;