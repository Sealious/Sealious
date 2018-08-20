const locreq = require("locreq")(__dirname);
const assert = require("assert");
const tough = require("tough-cookie");
const { promise_timeout, assert_throws_async } = locreq("test_utils");
const { with_stopped_app_prod } = locreq("test_utils/with-test-app.js");

describe("finalize registration", () => {
	it("allows to register an account (entire flow)", async () =>
		with_stopped_app_prod(async ({ app, mail_api, rest_api }) => {
			app.ConfigManager.set("roles", ["admin"]);
			await app.start();
			const cookieJar = new tough.CookieJar();
			const options = {
				jar: cookieJar,
				withCredentials: true,
			};

			await rest_api.post(
				"/api/v1/collections/registration-intents",
				{ email: "user@example.com", role: "admin" },
				options
			);
			const message_metadata = (await mail_api.get_messages()).filter(
				message => message.recipients[0] == "<user@example.com>"
			)[0];
			assert(message_metadata.subject);

			const message = await mail_api.get_message_by_id(
				message_metadata.id
			);
			const token = message.match(/token=([^?&]+)/)[1];

			await rest_api.post("/finalize-registration-intent", {
				email: "user@example.com",
				token,
				password: "password",
				username: "user",
			});

			await rest_api.post(
				"/api/v1/sessions",
				{ username: "user", password: "password" },
				options
			);

			const user_data = await rest_api.get(
				"/api/v1/users/me?format[roles]=expand",
				options
			);
			assert(user_data.body.roles);
			assert.equal(user_data.body.roles.length, 1);
			assert.equal(user_data.body.roles[0].body.role, "admin");
		}));
});
