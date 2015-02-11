var fs = require("fs");
var path = require('path')
var Set = require('Set');
//var Channel = require('prometheus-channel')

var channels = {};
//var channel_info = {};

var services = {};
//var service_info = {};

var resource_types = {};
var field_types = {};

var registred_chips_longids = new Set();

var Core = new function(){

	this.register_channel = function(channel){
		registred_chips_longids.add("channel." + channel.id);
		channels[channel.id] = channel;
	}

	this.register_service = function(service){
		registred_chips_longids.add("service." + service.id);
		services[service.id] = service;
	}
	
	this.register_resource_type = function(resource_type){
		registred_chips_longids.add("resource_type." + resource_type.id);
		resource_types[resource_type.id] = resource_type;
	}

	this.register_field_type = function(field_type){
		registred_chips_longids.add("field_type."+field_type.id);
		field_types[field_type.id] = field_type;
	}

	this.get_chip_by_longid = function(longid){
		var type = longid.split(".")[0];
		var name = longid.split(".")[1];
		return this["get_"+type](name);
	}

	this.chip_is_registred = function(chip_name){
		return registred_chips_longids.has(chip_name);
	}

	this.get_channel = function(id){
		//console.log("chnnels:", channels);
		return channels[id] || null;
	}

	this.get_service = function(id){
		return services[id] || null;
	}

	this.get_resource_type = function(id){
		return resource_types[id];
	}

	this.get_field_type = function(id){
		console.log("ChipMnager.js - got request for field_type", id);
		return field_types[id];
	}

	this.getServices = function(){
		return services;
	}
}


module.exports = Core;
//!!important! export Core before importning Modules (circular dependency fail)
Modules = require("prometheus-module-manager");

