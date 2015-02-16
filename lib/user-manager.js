var Promise = require("bluebird");
/*
function UserRepresentation(database_entry){
	this.database_entry = database_entry;
	if(!database_entry.body){
		console.log("database_entry missing:", database_entry.body);
	}
	console.log("DATABASE_ENTRY: ", database_entry);
}

UserRepresentation.prototype = new function(){
	var data = this.database_entry.body
	data.username = database_entry.username;
	data.userdata_id = database_entry.userdata_id;
}
*/

var UserManager = new function(){
var that = this;

	this.create_user = function(username, password, dispatcher){
		var user_data;
		return dispatcher.users_user_exists(username, dispatcher)
			.then(function(user_exists){	
				if (!user_exists){
					console.log("user-manager.js user doesnt' exist, creating it");
					return dispatcher.resources_create("user", {username: username})
						.then(function(user_data_resource){
							user_data = user_data_resource;
							return dispatcher.metadata_increment_variable("first_free_user_id", dispatcher);
						})
						.then(function(first_free_user_id){
							//console.log("user-manager", user_data_resource);
							var body = {
								user_id : first_free_user_id,
								password: password, 
								username: username,
								userdata_id: user_data.id
							};	
							return dispatcher.datastore.insert("users", body);
						})
				}else{
					console.log("==========rzucam Error============");
					throw new Error("409.1");
				}
			})
	}

	this.user_exists = function(username, dispatcher){
		return new Promise(function(resolve, reject){
			dispatcher.resources_find({username: username}, "user")
			.then(function(matched_documents){
				console.log("user-manager.js", "matched_documents", matched_documents);
				console.log("user-manager.js user_exists resolving with", matched_documents.length===1)
				resolve(matched_documents.length===1);
			});			
		})
	}

	this.password_match = function(username, password, dispatcher){
		username = username.toString();
		password = password.toString();
		return new Promise(function(resolve, reject){
			dispatcher.datastore.find("users", {username: username, password: password})
			.then(function(result){
				if(result[0]){
					resolve(result[0].user_id);
				}else{
					resolve(false);
				}
			})			
		})
	}

	this.get_all_users = function(dispatcher){
		return dispatcher.datastore.find("users")
	}

	this.get_user_data = function(user_id, dispatcher){
		user_id = parseInt(user_id);
		return new Promise(function(resolve, reject){
			dispatcher.datastore.find("users", {user_id: user_id})
			.then(function(user_documents){
				if(user_documents.length===0){
					reject("user does not exist");
					return;
				}
				return dispatcher.resources_get_by_id(user_documents[0].userdata_id);
			})
			.then(function(userdata_resource){
				resolve(userdata_resource);
			})
		})
	}

	this.update_user_data = function(user_id, new_user_data, dispatcher){
		return dispatcher.datastore.find("users", {user_id: user_id})
		.then(function(user_document){
			console.log("user-manager.js user_document", user_document);
			userdata_id = user_document[0].userdata_id;
			return dispatcher.resources_update(userdata_id, new_user_data);
		})
	}

	this.delete_user = function(username, dispatcher){
 		return new Promise(function(resolve, reject){ 			
 			dispatcher.datastore.delete("users", {username: username})
 			.then(function(data){
				resolve(data);
			}).catch(function(e){
	 			reject(e);
	 		});			
 		});
 	}



}

module.exports = UserManager;