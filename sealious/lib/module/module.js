var fs = require("fs");
var ModuleInfo = require("./module-info.js");
var ChipManager = require("prometheus-chip-manager");
var Channel = require("../chip-types/channel.js");
var Service = require("prometheus-service");
var DispatcherWrapper = require("prometheus-dispatcher-wrapper");
var ResourceType = require("prometheus-resource-type");
var FieldType = require("prometheus-field-type");

var Module = function(path_to_module){
	this.path = path_to_module;
	this.registred = false;
	this.executed = false;
	this.info = new ModuleInfo(path_to_module);
	this.id = this.info.id;
	this.body = require(path_to_module);
}

var chip_type_startable = {
	service: true,
	channel: true,
	resource_type: false,
	field_type: false
}

Module.prototype = new function(){

	this.generate_chip_action_method_name = function(chip_name, chip_type, action){
		var ret =  action + "_" + chip_type + "_" + chip_name;
		return ret;
	}

	this.get_defined_chips_by_type = function(type){
		var ret = [];
		for(var i in this.info.defines){
			if(this.info.defines[i].indexOf(type)==0){
				ret.push(this.info.defines[i].split(".")[1]);
			}
		}
		return ret;
	}

	this.get_required_chips_by_type = function(type){
		var ret = [];
		for(var i in this.info.requires){
			if(this.info.requires[i].indexOf(type)==0){
				ret.push(this.info.requires[i].split(".")[1]);
			}
		}
		return ret;	
	}

	this.get_allowed_chips_longids = function(){
		var defines = this.info.defines;
		var requires = this.info.requires;
		return defines.concat(requires);
	}

	this.prepare_all_channel = function(real_dispatcher){
		var channel_ids = this.get_defined_chips_by_type("channel");
		//var dependencies = this.getDependencies();
		var wrapped_dispatcher = new DispatcherWrapper(real_dispatcher, this.get_allowed_chips_longids());

		for(var i in channel_ids){
			var id = channel_ids[i];
			var channel_object = new Channel(id);
			var prepare_function_name = this.generate_chip_action_method_name(channel_ids[i], "channel", "prepare");
			if(this.body[prepare_function_name]){
				this.body[prepare_function_name](channel_object, wrapped_dispatcher, this.getDependencies());
			}
			ChipManager.register_channel(channel_object);
		}

		var required_channel_ids = this.get_required_chips_by_type("channel");
		for(var i in required_channel_ids){
			var id = required_channel_ids[i];
			var channel = ChipManager.get_channel(id);
			var prepare_function_name = this.generate_chip_action_method_name(required_channel_ids[i], "channel", "prepare");
			if(this.body[prepare_function_name]){
				this.body[prepare_function_name](channel, wrapped_dispatcher, this.getDependencies());
			}
		}
	}

	this.prepare_all_service = function(){
		var service_ids = this.get_defined_chips_by_type("service");
		for(var i in service_ids){
			var service_id = service_ids[i];
			var service_object = new Service(service_id);
			var prepare_function_name = this.generate_chip_action_method_name(service_id, "service", "prepare");
			if(this.body[prepare_function_name]){
				this.body[prepare_function_name](service_object);
			}
			ChipManager.register_service(service_object);
		}
	}

	this.prepare_all_resource_type = function(){
		var resource_type_ids = this.get_defined_chips_by_type("resource_type");
		for(var i in resource_type_ids){
			var resource_type_id = resource_type_ids[i];
			var resource_type_object = new ResourceType(resource_type_id);
			var prepare_function_name = this.generate_chip_action_method_name(resource_type_id, "resource_type", "prepare");
			if(this.body[prepare_function_name]){
				this.body[prepare_function_name](resource_type_object);
			}
			ChipManager.register_resource_type(resource_type_object);
		}
	}

	this.prepare_all_field_type = function(){
		var field_type_ids = this.get_defined_chips_by_type("field_type");
		for(var i in field_type_ids){
			var field_type_id = field_type_ids[i];
			/*
			var fieldType_object = Object.create(FieldType.prototype, {
				id: {				
					writable: false, 
					configurable: false, 
					value: field_type_id 
				},
			});
			*/
			var field_type_generator_fn = function(){};
			field_type_generator_fn.prototype = Object.create(FieldType.prototype);
			field_type_generator_fn.id = field_type_id;
			var prepare_function_name = this.generate_chip_action_method_name(field_type_id, "field_type", "prepare");
			//console.log("trying to call ", prepare_function_name);
			if(this.body[prepare_function_name]){
				this.body[prepare_function_name](field_type_generator_fn);
			}
			ChipManager.register_field_type(field_type_generator_fn);
		}
	}

	this.getDependencies = function(){
		var ret = [];
		var longids = this.get_allowed_chips_longids();
		for(var i in longids){
			var longid = longids[i];
			var chip = ChipManager.get_chip_by_longid(longid);
			ret[longid] = chip;
		}
		return ret;
	}

	this.start_all_service = function(){
		var service_ids = this.get_defined_chips_by_type("service");
		for(var i in service_ids){
			var service_id = service_ids[i];
			var service = ChipManager.get_service(service_id);
			service.start();
		}
	}

	this.start_all_channel = function(){
		//run the "start" method of each defined channel
		var channel_ids = this.get_defined_chips_by_type("channel");
		for(var i in channel_ids){
			var channel_id = channel_ids[i];
			var channel = ChipManager.get_channel(channel_id);
			channel.start();
		}
		//also postprocess all channels required by this module
		var required_channel_ids = this.get_required_chips_by_type("channel");
		var dependencies = this.getDependencies();
		for(var i in required_channel_ids){
			channel_id = required_channel_ids[i];
			var postprocess_function_name = this.generate_chip_action_method_name(channel_id, "channel", "postprocess");
			var required_channel = ChipManager.get_channel(channel_id);
			var postprocess_function = this.body[postprocess_function_name]
			if(postprocess_function){
				postprocess_function(required_channel, dependencies);
			}
		}
	}

	this.prepare = function(chip_types, real_dispatcher){
		for(var i in chip_types){
			var function_name = "prepare_all_"+chip_types[i];
			this[function_name](real_dispatcher);
		}
	}

	this.start = function(chip_types){
		for(var i in chip_types){
			if(chip_type_startable[chip_types[i]]){
				this["start_all_"+chip_types[i]]();				
			}
		}
	}
}

module.exports = Module;