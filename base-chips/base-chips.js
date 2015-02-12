module.exports.prepare_field_type_text = require("./field-types/text.js");
module.exports.prepare_field_type_int = require("./field-types/int.js");
module.exports.prepare_field_type_date = require("./field-types/date.js");
module.exports.prepare_field_type_email = require("./field-types/email.js");

//user_data resource type
module.exports.prepare_resource_type_user_data = require("./resource-types/user_data.js")

//session_manager service
module.exports.prepare_service_session_manager = require("./services/session_manager.js")

module.exports.prepare_channel_http_session = require("./channels/http_session.js");

module.exports.prepare_channel_http = require("./channels/http.js");
module.exports.prepare_channel_www_server = require("./channels/www_server.js")