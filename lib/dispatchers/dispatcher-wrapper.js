var Set = require("Set");

function DispatcherWrapper(real_dispatcher, allowed_chip_longids){

	this.real_dispatcher = real_dispatcher;



	this.allowed_chip_longids = new Set();
	this.allowed_chip_longids.addAll(allowed_chip_longids);


	var functions_to_copy = [ 
		"resources_update", 
		"resources_search_resource", 
		"users_user_id_exists", 
		"users_update_user_data", 
		"users_delete_user", 
		"users_get_all_users",
		"resources_find", 
		"resources_get_access_mode",
		"resources_edit_resource_access_mode", 
		"resources_get_by_id", 
		"users_create_user", 
		"users_get_user_data", 
		"users_password_match", 
		"users_user_exists", 
		"database_query",
		"resources_search_by_mode"
		];

	for(var i in functions_to_copy){
		this[functions_to_copy[i]] = this.real_dispatcher[functions_to_copy[i]];
	}

}

DispatcherWrapper.prototype = new function(){

	var that = this;

	this.resources_list_by_type = function(type_name){
		if(this.can_access("resource_type." + type_name)){
			return this.real_dispatcher.resources_list_by_type(type_name);
		}else{
			throw new Sealious.Errors.DependencyError("cannot access chip: resource_type."+type_name);
		}
	}

	this.resources_create = function(type_name, body, owner){
		if(this.can_access("resource_type." + type_name)){
			return this.real_dispatcher.resources_create.apply(this.real_dispatcher, arguments);
		}else{
			throw new Sealious.Errors.DependencyError("cannot access chip: resource_type."+type_name);
		}
	}

	this.resources_delete = function(type_name, body){
		if(this.can_access("resource_type." + type_name)){
			return this.real_dispatcher.resources_delete.apply(this.real_dispatcher, arguments);
		}
	}

	this.can_access = function(requested_chip_longid){
		if (this.allowed_chip_longids.has("resource_type.*") && requested_chip_longid.indexOf("resource_type") === 0) {
			return true;
		} else {
			return this.allowed_chip_longids.has(requested_chip_longid);
		}
	}

}

module.exports = DispatcherWrapper;
