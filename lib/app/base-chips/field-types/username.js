"use strict";
const locreq = require("locreq")(__dirname);
const me_synonyms = locreq("lib/misc/me-synonyms.json");
const SuperContext = locreq("lib/super-context.js");

module.exports = function(app) {
	return {
		name: "username",
		extends: "text",
		is_proper_value: async function(context, params, new_value, old_value) {
			if (old_value === new_value) {
				return;
			}
			if (me_synonyms.indexOf(new_value) !== -1) {
				throw new Error(
					`'${new_value}'' is a reserved keyword. Please pick another username.`
				);
			}
			return app
				.run_action(
					new SuperContext(context),
					["collections", "users"],
					"show",
					{ filter: { username: new_value } }
				)
				.then(function({ items }) {
					if (items.length > 0) {
						throw new Error("Username already taken");
					}
				});
		},
	};
};
