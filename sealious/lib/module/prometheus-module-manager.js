var fs = require("fs");
var Set = require("Set");
var path = require("path");
var Core = require("prometheus-core");
var LayerManager = require("prometheus-layer-manager");
var ServiceWrapper = require("prometheus-service-wrapper");
var ResourceTypeManager = require("prometheus-resource-type-manager");
var AssociationInterface = require("prometheus-association");
//var createCustomError = require('custom-error-generator');

var PrometheusError = require("prometheus-error");




var module_info = [];
var modules = {};


function Module(module_path){
	var settings_path = path.resolve(module_path, "package.json");
	var settings_json_string = fs.readFileSync(settings_path);
	var settings = JSON.parse(settings_json_string);
	var module_id  = settings["prometheus-module-id"];
	this.id = module_id;
	this.path = module_path;
	settings.executed = false; //used as a semaphore in register_modules function
	settings.requires = settings["prometheus-required-chips"] || [];
	settings.defines = settings["prometheus-defined-chips"] || [];
	module_info[module_id] = settings;
	var defines = settings["prometheus-defined-chips"];
	if(defines){
		for(var i in defines){
			Core.registerChip(defines[i]);
		}
	}
	modules[module_id] = this;

}

Module.prototype = (function(){

	this.channels_executed = false;
	this.services_executed = false;

	this.getAllChipsIDs = function(){
		//returns a combined array of both what the module defines and requires
		var requires = this.getInfo().requires;
		var defines = this.getInfo().defines;
		var ret_set = new Set();
		ret_set.addAll(requires? requires : []);
		ret_set.addAll(defines? defines : []);
		return ret_set.toArray();
	}

	this.getUsedChannelsIDs = function(){
		var chips = this.getAllChipsIDs();
		var res =[];
		for(var i in chips){
			var chip_name = chips[i];
			if(chip_name.indexOf("channel.")==0){
				res.push(chip_name);
			}
		}	
		return res;
	}

	this.getAllChips = function(){
		var ids = this.getAllChipsIDs();
		var res = [];
		for(var i in ids){
			var id = ids[i];
			var type = id.split(".")[0];
			switch(type){
				case "channel":
					res[id] = Core.getChannel(id.split(".")[1]);
					break;
				case "service":
					if(this.services_executed && LayerManager.isLocal()){
						res[id] = Core.getService(id.split(".")[1]);						
					}else{
						res[id] = new ServiceWrapper(id.split(".")[1])
					}
					break;
			}
		}
		return res;
	}

	this.getChannels = function(){
		var chips = this.getAllChipsIDs();
		var ret = [];
		for(var i in chips){
			if(chips[i].indexOf("channel.")!=-1){
				var channel = Core.getChannel(chips[i].slice("channel.".length));
				ret[chips[i]] = channel;
			}
		}
		return ret;
	}

	this.getInfo = function(){
		return module_info[this.id];
	}

	this.register_channels = function(execute){
		if(!this.channels_registred){
			this.channels_registred = true;
			if(this.body.register_channels){
				var channel_ids = this.body.register_channels();
				var dependencies = [];
				for(var i in channel_ids){
					var current_channel_id = channel_ids[i];
					var channel_info = this.body.channel_info(current_channel_id);
					if(execute){
						var channel_body = this.body.channel_object(current_channel_id, dependencies);						
					}
					Core.registerChannel(current_channel_id, channel_info, channel_body)
				}
			}		
		}
		if(execute){
			this.channels_executed=true;
		}
	}

	this.getDefindedChipsIDsByType = function(type) {
		var defines_service = [];
		var chips = module_info[this.id].defines;
		for (var service in chips) {
			if (chips[service].indexOf(type) != -1) {
				var dot = chips[service].indexOf(".");
				defines_service.push(chips[service].substr(dot+1, chips[service].length));
			}
		}
		return defines_service;
	}

	this.register_resource_types = function(){
		var resource_type_names = this.getDefindedChipsIDsByType("resource-type");
		for(var i in resource_type_names){
			var resource_type_name = resource_type_names[i];
			console.log("registering ", resource_type_name);
			var resource_type_fields = this.body.construct_resource_type(resource_type_name);
			ResourceTypeManager.create(resource_type_name, resource_type_fields);
		}
		if(this.body.construct_associations){
			this.body.construct_associations(AssociationInterface);
		}
	}

	this.register_services = function(execute){
		if(!this.services_registred){
			this.services_registred = true;
			var service_ids = this.getDefindedChipsIDsByType("service");
			if(service_ids){
				var dependencies = this.getChannels();
				for(var i in service_ids){
					var current_service_id = service_ids[i];
					var service_info = this.body.service_info(current_service_id);
					if(execute){
						var service_body = this.body.construct_service(current_service_id, dependencies);						
					}
					Core.registerService(current_service_id, service_info, service_body)
				}
			}
		}
		if(execute){
			this.services_executed=true;
		}
	}

	this.setup_channels = function(){
		var channel_ids = this.getUsedChannelsIDs();
		var dependencies = this.getAllChips();
		for(var i in channel_ids){
			var channel_id = channel_ids[i];
			if(this.body.channel_setup){
				this.body.channel_setup(channel_id, dependencies)
			}
		}		
	}

	this.post_execute_setup = function(){
		if(this.channels_executed){
			this.setup_channels();
		}
	}

	this.execute = function(scope){
		this.body = require(this.path);
		var execute_services = false;
		var execute_channels = false;
		for(var i in scope){
			switch(scope[i]){
				case "channels":
					execute_channels = true;
					break;
				case "services":
					execute_services = true;
					break;
				default:
					break;
			}
		}
		this.register_resource_types();
		this.register_services(execute_services);
		this.register_channels(execute_channels);
		this.post_execute_setup();
	};

	return this;
})();

var modules_executed = false;



function decide_module_execution_order(){
	var all_modules_registred = false;
	var module_ids_in_order = [];
	var registered_chips = new Set();
	var registred_ids = new Set();
	var was_registred_by = [];
	while(!all_modules_registred){
		all_modules_registred = true;
		registred_in_this_iteration = 0;
		for(var current_module_id in module_info){
			if(registred_ids.has(current_module_id)){
				continue;
			}
			current_module_info = module_info[current_module_id];
			if(!current_module_info.registred){
				var can_execute = true;
				if(!current_module_info.requires){
					//value not set, no requirements;
				}else{
					for(var j in current_module_info.requires){
						if(!registered_chips.has(current_module_info.requires[j])){
							can_execute = false;
						}
					}
				}
				for (var i=0; i<current_module_info.defines.length; i++){
					var current_chip_id = current_module_info.defines[i];
					if (registered_chips.has(current_chip_id)){
						var error_message = "Chip " + current_chip_id + " has already been registered by module " + was_registred_by[current_chip_id] + ", so module " + current_module_id + " can not be executed.";
						throw new PrometheusError(error_message, "chip_already_eists", "prometheus-module-manager");
					}
				}
				if(can_execute){
					module_ids_in_order.push(current_module_id);
					registred_ids.add(current_module_id);
					registered_chips.addAll(current_module_info.defines);
					for(var chip in current_module_info.defines){
						was_registred_by[current_module_info.defines[chip]] = current_module_id;
					}

					registred_in_this_iteration = 1;
				}else{
					all_modules_registred = false;
				}
			}
		}
		if(registred_in_this_iteration === 0){
			
			//throw new Error("Uresolvable modules dependencies.\n" + where_the_unresolvable_is(module_info));
			
			var error_message = where_the_unresolvable_is(module_info);
			/*var PrometheusError = createCustomError('PrometheusError', null, function(message, code, module){
				this.err_message = message;
				this.code = code;
				this.module = module;
			});*/

			throw new PrometheusError(error_message, "unresolved_dependencies", "prometheus-module-manager");
		}
	}
	return module_ids_in_order;
}

function where_the_unresolvable_is(modules){
//it takes array of modules and search for unresolvable dependencies
	var message = "";
	var has_unresolved = false;
	var defined_chips = [];

	for (var current_module in modules){
		for (var i in modules[current_module].defines){
			defined_chips.push(modules[current_module].defines[i]);
		}		
	}

	for(var i in modules){
		for(var j in modules){
			if(i!=j && intersection_of_arrays(modules[i].requires, modules[j].defines).length && intersection_of_arrays(modules[j].requires, modules[i].defines).length){
				message += "There are cyclic dependencies between modules: " + i + " and " + j + "\n";
				has_unresolved = true;
			}
		}
	}

	for (var k in modules) {
	    for(var requirement in modules[k].requires) {
	        if (defined_chips.indexOf(modules[k].requires[requirement]) == -1) {
	            has_unresolved = true;
	            message += "Module '" + k + "' requires '"  + modules[k].requires[requirement] + "' which was not found!\n";
	        }
	    }
	}
	if(!has_unresolved){
	    message = "There are no unresolved dependencies";
	}
	return message;
}

function intersection_of_arrays(array1, array2){
	array3 = array1.filter(function(n) {
	    return array2.indexOf(n) != -1;
	});
	return array3;
}

module.exports.execute_modules = function(scope){
	var id_order = decide_module_execution_order();
	for(var i in id_order){
		modules[id_order[i]].execute(scope);
	}
};

module.exports.loadPath = function(module_path){
	var module_id = path.basename(module_path);
	if(module_info[module_id]){
		//do nothing. module already loaded;
	}else{
		new Module(module_path);
	}
};
