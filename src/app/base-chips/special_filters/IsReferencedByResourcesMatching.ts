import * as assert from "assert";
import { Query } from "../../../main";
import SpecialFilter from "../../../chip-types/special-filter";

type Params = {
	referencing_collection: string;
	referencing_field: string;
	field_to_check: string;
	allowed_values: any[];
	nopass_reason: string;
};

export default class IsReferencedByResourcesMatching extends SpecialFilter {
	constructor(collection: string, public params: Params) {
		super(collection, params);
		const { allowed_values, nopass_reason } = params;
		assert.ok(params);
		assert.ok(Array.isArray(allowed_values));
		assert.ok(typeof nopass_reason === "string");
	}

	async getFilteringQuery() {
		const query = new Query();
		const lookup_id = query.lookup({
			from: this.getCollection().name,
			localField: "id",
			foreignField: this.params.referencing_field,
		});
		query.match({
			[`${lookup_id}.${this.params.field_to_check}`]: {
				$in: this.params.allowed_values,
			},
		});
		return query;
	}

	getNopassReason() {
		return this.params.nopass_reason;
	}
}
