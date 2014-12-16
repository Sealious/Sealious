var ChipManager = require("prometheus-chip-manager");
var ExceptionHandler = require("prometheus-exception-handler");

ExceptionHandler.addErrorParser(function(err){
	if(err.code=="EACCES"){
		return "cannot listen on port 80 without root";
	}
	if (err.code=="EADDRINUSE") {
		return "Port 80 is already taken";
	}
})

module.exports.register_channels = function(){
	return ["www-server"];
}



module.exports.channel_info = function(channel_id){
	var ret = {};
	if(channel_id=="www-server"){
		ret["name"] = "WWW Server";
		ret["description"] = "A simple HTTP server on port 80";
		ret["single_instance"] = true;
	}
	return ret;
}

module.exports.channel_object = function(channel_id){
	if(channel_id=="www-server"){
		var http_channel = ChipManager.getChannel("http");
		var server = http_channel.new_server("www", 80, {cors:true});
		server.start(function(err){
			console.log("www server started at port 80");
			console.log('HTTP: '+server.info.uri+'\n================ \n');
		})
		return server;
	}
}