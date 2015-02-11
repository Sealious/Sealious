var ChipManager = require("prometheus-chip-manager");
var Promise = require("bluebird");
var ResourceManager = require("prometheus-resource-manager");
var DatabaseDirectAccess = require("../database/direct-access.js")
var MetadataManager = require("prometheus-metadata-manager");
//var SessionManager = require("prometheus-session-manager");
var UserManager = require("prometheus-user-manager");

var DispatcherLocal = new function(){

	var me = this;

//biz (copied) + web (copied)
	this.resources_list_by_type = function(type_name, params){
		return ResourceManager.list_by_type(type_name, params, this)
	}

	this.resources_create = function(type_name, body, owner){
		//console.log("DispatcherLocal, create", arguments, "body:", body, "owner", owner);
		return ResourceManager.create_resource(type_name, body, owner, this);
	}

	this.resources_update = function(resource_id, new_data){
		return ResourceManager.update_resource(resource_id, new_data, this);
	}
	this.resources_edit_resource_access_mode = function(resource_id, access_mode, access_mode_args){	
		return ResourceManager.edit_resource_access_mode(resource_id, access_mode, access_mode_args, this);	
	}
	this.resources_delete = function(type_name, body){
		return ResourceManager.delete_resource(type_name, body, this);
	}

	this.resources_get_by_id = function(resource_id){
		return ResourceManager.get_resource_by_id(resource_id, this);
	}

	this.resources_find = function(field_values, type){
		return ResourceManager.find_resource(field_values, type, this);
	}

	this.resources_get_access_mode = function(resource_id){
		return ResourceManager.get_resource_access_mode(resource_id, this);
	}

	this.resources_search_resource = function(type, field_name, query_string){
		return ResourceManager.search_resource(type, field_name, query_string, this);
	}

	this.resources_search_by_mode = function(type, mode){
		return ResourceManager.search_by_mode(type, mode, this);
	}

//biz + web (done)
	this.fire_service_action = function(service_name, action_name, payload){
		return ChipManager.getService(service_name).fire_action(action_name, payload);
	}


//biz (done)
	this.database_query = function(){
		//console.log("database_query arguments:\n", arguments);
		return DatabaseDirectAccess.query.apply(DatabaseDirectAccess, arguments);
	}

//biz (copied) + web (copied)
	this.metadata_increment_variable = function(){
		return MetadataManager.increment_variable.apply(MetadataManager, arguments);
	}

	function call_locally (that, fn, dispatcher){
		return function(){
			var new_arguments = [];
			for(var i in arguments){
				new_arguments.push(arguments[i]);
			}
			new_arguments.push(dispatcher);
			//console.log("calling locally with arguments", new_arguments);
			return fn.apply(that, new_arguments);
		}
	}

	var to_delegate = {
		//"session": SessionManager,
		"users": UserManager
	};

	for(var i in to_delegate){
		var that = to_delegate[i];
		for(var j in that){
			this[i+"_"+j]=call_locally(that, that[j], me);
		}
	}


}

module.exports = DispatcherLocal;
