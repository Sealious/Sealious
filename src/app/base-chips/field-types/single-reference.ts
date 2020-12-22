import Bluebird from "bluebird";
import { Field, Context } from "../../../main";
import ItemList, { AttachmentOptions } from "../../../chip-types/item-list";

/** A reference to other item, in the same or other collection. Can point at items from only one, specified collection. Items with field of this type can be filtered by fields of the items it points at. Examples below.
 *
 * ## Params
 * - `target_collection` - ()=>Collection - the collection that this field points at
 * - `filter` - any - (optional) if provided, only items matching this filter can be referenced
 *
 * ## Filtering
 * Items from a collection with this type of field can be filtered by fields of the items they point at. For example, let's assume we have a collection of People:
 *
 *	```
 *	Collection.fromDefinition(
 *	  app,
 *	  {
 *	   name: "people",
 *	   fields: [
 *		  field("name", FieldTypes.Text),
 *		  field("age", FieldTypes.Int),
 *		  field("best_friend", FieldTypes.SingleReference, {target_collection: ()=>app.collections.people})
 *	   ]
 *	);
 *	```
 * Then we can perform a search for all people who have a best_friend named "John":
 * ```
 * {filter: {best_friend: {name: "John"}}}
 * ```
 */
export default class SingleReference extends Field {
	typeName = "single-reference";
	hasIndex = () => true;
	target_collection: string;
	filter: any;

	constructor(target_collection: string, filter?: any) {
		super();
		this.target_collection = target_collection;
		this.filter = filter;
	}

	getTargetCollection(context: Context) {
		return context.app.collections[this.target_collection];
	}

	async isProperValue(context: Context, input: string) {
		context.app.Logger.debug2("SINGLE REFERENCE", "isProperValue?", input);
		const filter = this.filter || {};
		if (input === "") {
			return Field.valid();
		}

		let stages = await this.getTargetCollection(context)
			.list(context)
			.filter(filter)
			.getAggregationStages();
		stages = [{ $match: { id: input } }, ...stages];
		const results = await this.app.Datastore.aggregate(
			this.getTargetCollection(context).name,
			stages
		);

		context.app.Logger.debug3(
			"SINGLE REFERENCE",
			"isProperValue/results",
			results
		);

		const decision =
			results.length > 0
				? Field.valid()
				: Field.invalid(
						`Nie masz dostępu do danego zasobu z kolekcji ${
							this.getTargetCollection(context).name
						} lub on nie istnieje.`
				  );

		context.app.Logger.debug2(
			"SINGLE REFERENCE",
			"isProperValue/decision",
			decision
		);
		return decision;
	}

	async filterToQuery(context: Context, filter: any) {
		// treating filter as a query here
		context.app.Logger.debug3("SINGLE REFERENCE", "FiltertoQuery", {
			context,
			filter,
		});
		if (typeof filter !== "object") {
			return {
				$eq: filter,
			};
		}
		const { items } = await this.app.collections[this.target_collection]
			.list(context)
			.filter(filter)
			.fetch();
		return { $in: items.map((resource) => resource.id) };
	}

	async getAggregationStages(context: Context, filter_value: unknown) {
		context.app.Logger.debug3("SINGLE REFERENCE", "getAggregationStages", {
			context,
			filter_value,
		});
		let filter: { [field_name: string]: any } = {};
		const temp_field_name = `${
			this.getTargetCollection(context).name
		}-lookup${Math.floor(Math.random() * Math.pow(10, 7))}`;
		if (!filter_value || Object.keys(filter_value as Object).length === 0)
			return [];
		if (typeof filter_value === "string") {
			return [{ $match: { [await this.getValuePath()]: filter_value } }];
		}
		if (filter_value instanceof Array) {
			let _in = filter_value;
			if (filter_value[0] instanceof Array) _in = filter_value[0];
			return [
				{
					$match: {
						[await this.getValuePath()]: { $in: _in },
					},
				},
			];
		}
		for (let field_name in filter_value as Object) {
			let field = this.getTargetCollection(context).fields[field_name];
			if (!field)
				return Promise.reject(
					"Unknown field in filter for '" +
						this.getTargetCollection(context).name +
						"': " +
						field_name
				);
			filter[field_name] = field.filterToQuery(
				context,
				(filter_value as { [field_name: string]: any })[field_name]
			);
		}
		filter = await Bluebird.props(filter);

		const ret = [
			{
				$lookup: {
					from: this.getTargetCollection(context).name,
					let: { referenced_id: `$${await this.getValuePath()}` },
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$id", "$$referenced_id"],
								},
							},
						},
						{ $match: filter },
						{ $count: "count" },
					],
					as: temp_field_name,
				},
			},
			{ $match: { [`${temp_field_name}.count`]: { $gt: 0 } } },
			{ $unset: temp_field_name },
		];

		return ret;
	}

	async getAttachments(
		context: Context,
		target_ids: string[],
		attachment_options?: AttachmentOptions
	) {
		const ret = new ItemList<any>(
			this.getTargetCollection(context),
			context
		);
		if (attachment_options) {
			// ^ is either a boolean or an object
			ret.ids(target_ids);
			if (typeof attachment_options === "object") {
				ret.attach(attachment_options);
			}
		} else {
			ret.ids([]); // return an empty list;
		}
		return ret.fetch();
	}
}