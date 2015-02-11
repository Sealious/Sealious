var config = require("prometheus-config")
var Hapi = require('hapi');
var DatabaseAccess = require("../database/direct-access.js");//.direct_access;

var server = new Hapi.Server(config.db_layer_config.port);

//console.log("I'm in database-rest-server");

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('jestę serwerę 1');
    }
});

// otrzymujemy zapytanie i wysylamy je do mongo
// wracamy do góry
// może być wiele wymian między biz i db, ale kiedy wszystkie zapytania się przetworzą, wracamy do web

server.route({
    method: 'GET',
    path: '/api/rest/v1/{collection_name}/',
    handler: function (request, reply) {
        var collection_name = request.params.collection_name;
        var query = (request.query.query && JSON.parse(request.query.query))||{};
        for(var i in query){
            if(query[i].toString().slice(0, 3) == "$R("){
                var regex_declaration = query[i].slice(3, -1);
                query[i] = new RegExp(regex_declaration.split("/")[1], regex_declaration.split("/")[2]);
            }
        }
        var options = (request.query.options && JSON.parse(request.query.options)) || {};
        var output_options = JSON.parse(request.query.output_options);
        DatabaseAccess.query(collection_name, "find", query, options, output_options).then(function(data){
            reply(data); // odpowiedz na zapytanie http
        })
    }  
}); 

/* POST NA ZASÓB */
server.route({
    method: 'POST',
    path: '/api/rest/v1/{collection_name}/',
    handler: function (request, reply) {
        var collection_name = request.params.collection_name;
        var options2 = JSON.parse(request.payload.json_encoded_payload);
        var query = options2.query;
        var mode = options2.mode;
        var options = options2.options;
        DatabaseAccess.query(collection_name, "insert", query, options).then(function(data){
            reply(data);
        });
    }  
});

server.route({
    method: 'PUT',
    path: '/api/rest/v1/{collection_name}/',
    handler: function (request, reply) {
        var collection_name = request.params.collection_name;
        var options2 = JSON.parse(request.payload.json_encoded_payload);
        var query = options2.query;
        var mode = options2.mode;
        var options = options2.options;
        DatabaseAccess.query(collection_name, "update", query, options).then(function(data){
            reply(data);
        });
    }  
});

server.route({
    method: 'DELETE',
    path: '/api/rest/v1/{collection_name}/',
    handler: function (request, reply) {
        var collection_name = request.params.collection_name;
        var options2 = JSON.parse(request.payload.json_encoded_payload);
        var query = options2.query;
        var mode = options2.mode;
        var options = options2.options;
        DatabaseAccess.query(collection_name, "delete", query, options).then(function(data){
            console.log("database-rest-server.js", "database response after DELETE statement:", data, ".");
            reply(data);
        });
    }  
});


/*
server.start(function () {
});

*/

module.exports = server;