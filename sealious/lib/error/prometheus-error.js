//var createCustomError = require("custom-error-generator");

/*var PrometheusError = createCustomError('PrometheusError', null, function(message, code, module) {
	this.err_message = message;
	this.code = code;
	this.module = module;

	this.console_message = "***" + message;
});
*/
var PrometheusError = function(message, code, module) {
	this.message = message;
	this.code = code;
	this.module = module;

	this.console_message = "\n*****ERROR*****\n";
	this.console_message+= message;
	this.console_message+= "Module: "+module+"\n";
	this.console_message+= "***************\n";
}

PrometheusError.prototype = Object.create(Error.prototype);

/*function PrometheusError (message, code, module) {

	this.err_message = message.toString();
	this.err_code = code.toString();
	this.err_module = module.toString();

	this.message = "Aaa";
	this.name = "22";

	var createCustomError = require('custom-error-generator');

//var PrometheusError = require("prometheus-error");


var PrometheusError = createCustomError('PrometheusError', null, function(message, code, module) {
	//this.err_message = message;
	//this.err_code = code;
	//this.err_module = module;
});
   
/*
	console.log("\n\n*****ERROR*****");
	console.log("Message: " + this.err_message + "\nCode: " + this.err_code + "\nModule: " + this.err_module);
	console.log("***************\n\n");*/
//}

/*
PrometheusError.prototype.toString = function() {
	return this.err_message + this.code;
};
*/


module.exports = PrometheusError;