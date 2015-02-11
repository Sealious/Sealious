var Promise = require("bluebird");
var ChipManager = require("prometheus-chip-manager");

/**
 * A field in a resource type
 * @class
 * @param {string} name
 * @param {object} options
 */
function ResourceTypeField(declaration){
	this.name = declaration.name;
	this.type_name = declaration.type;
	var type_constructor = ChipManager.get_field_type(declaration.type);
	this.type_arguments = declaration.arguments;
	this.type = new type_constructor(declaration.arguments);
	this.required = declaration.required || false;
	this.derived = declaration.derived || false;
}

ResourceTypeField.prototype = new function(){
	/**
	 * Shorthand for ResourceTypeField.type.isProperValue
	 * @alias ResourceTypeField#isProperValue
	 * @param  {object}  value
	 * @return {Promise}
	 */
	this.isProperValue = function(value, dispatcher){
		var that = this;
		return new Promise(function(resolve, reject){
			that.type.isProperValue(value, dispatcher).then(
				resolve,
				function(err){
					var new_error = {
						field_name: that.name,
						error_message: err
					}
					reject(new_error);
				}
			);
		})
	}

	/**
	 * Encodes a value for this field so it can be stored safey in database. Reverse of @link ResourceTypeField#decodeValue
	 * @alias ResourceTypeField#encodeValue
	 * @param  {any} value
	 * @param  {Boolean} as_hashmap
	 * @return {Promise}
	 */
	this.encode_value = function(value, as_hashmap){
		//console.log("encode value", value);
		var that = this;
		return this.type.encode(value).then(function(encoded_value){
			var ret_promise = new Promise(function(resolve, reject){
				if(as_hashmap){
					var ret = {};
					ret[that.name] = encoded_value;
					resolve(ret);
				}else{
					resolve(encoded_value);
				}
			})
			return ret_promise;
		});
	}

	/**
	 * @alias ResourceTypeField#decodeValue
	 * @todo Zaimplementować tę funkcję
	 */
	 this.decodeValue = function(){

	 }
}

module.exports = ResourceTypeField;