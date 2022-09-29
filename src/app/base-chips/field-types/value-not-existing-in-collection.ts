import ValueExistingInCollection from "./value-existing-in-collection";
import { Context, Field } from "../../../main";

export default class ValueNotExistingInCollection extends ValueExistingInCollection {
	getTypeName = () => "value-not-existing-in-collection";
	async isProperValue(
		context: Context,
		new_value: unknown,
		old_value: unknown
	) {
		const field = this.getField(context.app);
		await field.checkValue(context, new_value, old_value, null);
		if (this.include_forbidden) {
			context = new this.app.SuperContext();
		}
		const sealious_response = await field.collection
			.list(context)
			.filter({ [field.name]: new_value })
			.fetch();
		if (!sealious_response.empty) {
			return Field.invalid(
				context.app.i18n("invalid_non_existing_value", [
					field.collection.name,
					field.name,
					new_value,
				])
			);
		}
		return Field.valid();
	}
}
