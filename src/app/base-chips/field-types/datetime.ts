import { IntStorage } from "./int";
import { Context, Field } from "../../../main";

import { getDateTime } from "../../../utils/get-datetime";

// cannot extends because that changes the output of `decode`. I should use composition here

/** Stores a date and the time. Accepts only timestamps - number or ms since Epoch. Can be configured and filtered by in the same way as other {@link IntStorage}-based fields.
 */
export default class Datetime extends IntStorage<
	number | string,
	number | string
> {
	typeName = "datetime";

	async isProperValue(context: Context, value: number | string) {
		const int_result = await super.isProperValue(context, value);
		if (!int_result.valid) {
			return Field.invalid(context.app.i18n("invalid_datetime", [value]));
		}
		return int_result;
	}

	async decode(
		context: Context,
		db_value: number | null,
		__: number,
		format?: "human_readable"
	) {
		context.app.Logger.debug2("FIELD DATETIME", "decode", {
			db_value,
			format,
		});
		if (db_value === null || db_value === undefined) {
			return db_value;
		}
		if (format === undefined) {
			return db_value;
		}
		if (format === "human_readable") {
			const date = new Date(db_value);
			return getDateTime(date);
		}
		return db_value;
	}
}
