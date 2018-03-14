const assert = require("assert");
const SmtpMailer = require("./smtp-mailer");
const LoggerMailer = require("./logger-mailer");

const environment_to_mailer = {
	dev: LoggerMailer,
	production: SmtpMailer,
};

module.exports = app => {
	let environment;
	let config;
	let mailer;
	app.ConfigManager.setDefault("email", {
		from_name: "Noreply",
		from_address: "example@example.com",
	});
	app.ConfigManager.setDefault("smtp", SmtpMailer.default_config);
	return {
		async init() {
			config = app.ConfigManager.get("email");

			assert(typeof config.from_name === "string");
			assert(
				typeof config.from_address === "string",
				"Please set a config value for 'email.from_address'"
			);

			environment = app.ConfigManager.get("core.environment");
			mailer = new environment_to_mailer[environment](app);

			return mailer.verify();
		},
		async send(message) {
			return mailer.sendEmail({
				to: message.to,
				subject: message.subject,
				text: message.text,
				html: message.html,
				attachments: message.attachments,
				from_name: app.ConfigManager.get("email.from_name"),
			});
		},
	};
};
