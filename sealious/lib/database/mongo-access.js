//this is how we access the server by methods (locally);
var config = require("prometheus-config");
var simpleargs = require("simpleargs");
var connections = require('./mongo_connections.js');

var serverCache = connections(config.mongo_host, config.mongo_port);

var Promise = require("bluebird");

var db_name = config.mongo_db_name;

var databaseServer = new function() {

    this.options = null;
    this.initialized = false;
    this.server = null;

    var that = this;

    this.isRemote = function() {
        if (this.options == null) {
            return null;
        } else {
            return this.options.mode == "rest";
        }
    }

    this.init = function(options) {
        this.options = options == undefined ? {} : options;
        if (simpleargs(process.argv.slice(2))["l"] == "db") {
            this.options.mode = "rest";
        }
        this.initialized = true;
    }

    this.query = function(collection, mode, query, options, output_options) {
        //console.log("mongo_access.query");
        //console.log("arguments:\n", arguments);
        query = query || {};
        options = options ? options : {};
        output_options = output_options || {};
        return new Promise(function(resolve, reject) {
            serverCache(db_name, collection, function(err, collection_object) {
                //console.log("inside serverCache callback");
                console.log(mode);
                if (err) {
                    reject(err);
                } else {
                    if (query.prometheus_id)
                        query.prometheus_id = parseInt(query.prometheus_id);

                    switch (mode) {
                        case "find":
                            //console.log("\t!!!!find");
                            var cursor = collection_object[mode](query, options);
                            if (output_options.sort) {
                                cursor.sort(output_options.sort);
                            }
                            if (output_options.skip) {
                                cursor.skip(output_options.skip);
                            }
                            if (output_options.amount) {
                                cursor.limit(output_options.amount);
                            }
                            cursor.toArray(function(err, val) {
                                if (err) {
                                    reject(err)
                                } else {
                                    resolve(val);
                                }
                            })
                            break;
                        case "insert":
                       
                            //if (query.body.message){
                            	//var tmp = query.body.message.replace(/(<([^>]+)>)/ig, "");
                                //query.body.message = tmp;
                            //}
                            
                            collection_object[mode](query, options, function(err, inserted) {

                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(inserted);
                                }
                            })
                            break;
                        case "update":
                            //`options` is new object value (entire document)
                            console.log("mongo-access.js", "preforming update with options:", options, "with query", query)
                            collection_object["update"](query, options, function(err, inserted) {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(inserted);
                                }
                            })
                            break;
                        case "delete":
                            //console.log("mongo_access with query", query);

                            collection_object["remove"](query, options, function(err, delete_response) {
                                if (err) {
                                    //console.log("mongo_access err");
                                    reject(err);
                                } else {
                                    //console.log("mongo_access win");
                                    resolve(delete_response);
                                }
                            })

                    }

                }
            })
        })
    }
}

databaseServer.init();

module.exports = databaseServer;
