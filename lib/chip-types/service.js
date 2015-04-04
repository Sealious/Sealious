var Promise = require("bluebird");

var Service = function(parent_module_path, name){
	this.name = name;
	this.event_handlers = {};
	this.longid = "service."+name;
	this.default_configuration = {};
	Sealious.ChipManager.add_chip("service", this.name, this, parent_module_path);
}

Service.prototype = new function(){

	this.on = function(event_name, callback){
		if(!this.event_handlers[event_name]){
			this.event_handlers[event_name] = callback;
		}
	}

	this.fire_action = function(event_name, payload){
		var that = this;
		return new Promise(function(resolve, reject){
			if(!that.event_handlers[event_name]){
				throw new Sealious.Errors.ValidationError("event ", event_name, "does not have a handler attached"); //~
			}else{
				that.event_handlers[event_name](payload, function(){
					resolve();
				});
			}			
		})
	}

	this.start = function(){
		return true;
	}
}

Service.is_a_constructor = false;

module.exports = Service;