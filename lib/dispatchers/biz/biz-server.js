var config = require("prometheus-config");
var biz_access = require("prometheus-biz-accessor");

var io = require('socket.io')(); // utworzenie servera
io.listen(config.biz_layer_config.port);

console.log("###############\n    Socket.io started on port " + config.biz_layer_config.port + "\n###############");


/********************************

    POŁĄCZNIE Z WARSTWĄ WEBOWĄ

*********************************/
 
// nowe połącznie
io.on('connection', function(socket) {
        console.log("# A client connected!!");
        socket.on('hello_server', function(data) {
                global.user = data.params;
                console.log(global[data.method](data.params)); //greetings from client
                
                //Wysyłanie do wszystkich (z wyjątkiem użytkownika, który się podłączył)
                socket.broadcast.emit('notification', { method:"getNotification", params: "User " + user + "właśnie dołączył do biz.", id: 1});
       
        });
        
        socket.emit("hello_client", {method:"greetings", params: "Brawo! Połączyłeś się z warstwą biznesową.", id: 1});

        socket.on("service_event", function(data){
            var service_name = data.service_name;
            var event_name = data.event_name;
            var payload = data.payload;
            var request_id = data.request_id;
            biz_access.emit_service_event(service_name, event_name, payload, function(data){
                var data_to_send = {};
                data_to_send.request_id = request_id;
                data_to_send.payload = data;
                socket.emit("service_event_response", data_to_send);
                //console.log("response emitted with event service_event_response:", data_to_send);
            });
        });
        
        //event wylogowania
        socket.on('logout',function(){
                socket.disconnect(); // zamknięcie połączenia
        });
        socket.on('disconnect', function() {
                console.log("User  disconnected"); // event rozłączenia
        });
});

global.greetings = function(data) {
        return "New user connected: " + data +", sending greetings...";
}