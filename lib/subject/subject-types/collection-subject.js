"use strict";
const assert = require("assert");
const locreq = require("locreq")(__dirname);
const Promise = require("bluebird");
const shortid = require("shortid");
const merge = require("merge");
const clone = require("clone");
const expandHash = require("expand-hash");
const Sealious = locreq("lib/main.js");
const batch_action = require("./_batch_action.js");

const SingleResource = require("./single-resource-subject.js");
const Subject = locreq("lib/subject/subject.js");
const Errors = locreq("lib/response/error.js");

function CollectionSubject(app, collection, named_filters = []) {
	this.collection = collection;
	this.name = "Collection";

	assert(Array.isArray(named_filters));
	this.named_filters = named_filters;

	// these methods are here so they can havve access to 'app' variable

	this.create_resource = function(context, body) {
		const self = this;
		return CollectionSubject.prototype.__create_resource(
			app.ChipManager.get_datastore_chip(),
			self.collection,
			context,
			body
		);
	};

	this.list_resources = function(context, params) {
		const datastore = app.ChipManager.get_datastore_chip();
		const self = this;
		return CollectionSubject.prototype.__list_resources(
			datastore,
			self.collection,
			context,
			params,
			named_filters
		);
	};

	this.create_many = function(context, params) {
		// test with: http -f POST localhost:8081/api/v1/collections/animals __multiple=true mode=cartesian sources[0][0]=literal sources[0][1][pole]=wartosc sources[0][1][bark]=bork sources[1][0]=collection_fields sources[1][1][collection]=shelters sources[1][1][filter][city]=Poznań sources[1][1][fields][0]=id

		/*
		  params.mode = "batch" | "cartesian"

		  for "cartesian" mode:
		  * 'sources'   - a list of value sources to generate the cartesian product
		    Each source is a 2-element array, where the first element is the source type, and the second one is the params

			source types:
			* 'literal': second element needs to be a key->value map
			* `collection_fields`: values from a collection
			  * collection
			  * filter
			  * fields[]
			  * map_to[]
		*/
		const self = this;
		return batch_action(app, context, params, function(context, body) {
			return app.run_action(
				context,
				["collections", self.collection.name],
				"create",
				body
			);
		});
	};

	this.delete_many = function(context, params) {
		const self = this;
		return batch_action(app, context, params, function(context, body) {
			return app
				.run_action(
					context,
					["collections", self.collection.name],
					"show",
					{
						filter: body,
					}
				)
				.each(function(resource) {
					return app.run_action(
						context,
						["collections", self.collection.name, resource.id],
						"delete"
					);
				});
		});
	};

	this.delete = function(context, params) {
		if (params.__multiple) {
			return this.delete_many(context, params);
		} else {
			throw new app.Sealious.Errors.NotFound(
				"Cannot delete a collection. Try using the '__multiple: true' mode"
			);
		}
	};

	this.get_child_subject = async function(key) {
		if (key[0] === "@") {
			return new CollectionSubject(app, collection, [
				...named_filters,
				key.slice(1),
			]);
		} else {
			const resource_id = key;
			const single_resource_subject = new SingleResource(
				app,
				this.collection,
				resource_id
			);
			return single_resource_subject;
		}
	};
}

CollectionSubject.prototype = Object.create(Subject.prototype);

CollectionSubject.prototype.__create_resource = function(
	datastore,
	collection,
	context,
	body
) {
	return collection
		.check_if_action_is_allowed(context, "create", { body: body })
		.then(function() {
			return collection.validate_field_values(context, true, body);
		})
		.then(function() {
			return collection.encode_field_values(context, body);
		})
		.then(function(encoded_body) {
			const newID = shortid();
			const resource_data = {
				sealious_id: newID,
				collection: collection.name,
				body: encoded_body,
				created_context: context,
				last_modified_context: context,
			};
			return datastore.insert(collection.name, resource_data, {});
		})
		.then(function(database_entry) {
			return collection.get_resource_representation(
				context,
				database_entry
			);
		})
		.then(function(representation) {
			return new Sealious.Responses.ResourceCreated(representation);
		});
};

CollectionSubject.prototype.__preprocess_resource_filter = function(
	collection,
	context,
	filter
) {
	filter = clone(filter) || {};
	const expanded_filter = expandHash(filter);
	const processed_filter = {};
	for (const field_name in expanded_filter) {
		if (!collection.fields[field_name]) {
			continue;
		}
		const field = collection.fields[field_name];
		const field_filter = expanded_filter[field_name];
		if (field_filter instanceof Array) {
			processed_filter[field_name] = Promise.all(
				field_filter.map(field.encode.bind(field, context))
			).then(filters => {
				return { $in: filters };
			});
		} else {
			processed_filter[field_name] = field.filter_to_query(
				context,
				field_filter
			);
		}
	}
	return Promise.props(processed_filter);
};

const get_output_options = function(collection, params) {
	const output_options = {};

	if (params.pagination) {
		const default_pagination_params = {
			page: 1,
			items: 10,
		};
		const full_pagination_params = merge(
			default_pagination_params,
			params.pagination
		);

		const must_be_int = ["items", "page"];
		must_be_int.forEach(function(attribute_name) {
			if (isNaN(parseInt(full_pagination_params[attribute_name]))) {
				full_pagination_params[attribute_name] =
					default_pagination_params[attribute_name];
			} else {
				full_pagination_params[attribute_name] = parseInt(
					full_pagination_params[attribute_name]
				);
			}
		});

		output_options.skip =
			(full_pagination_params.page - 1) * full_pagination_params.items;
		output_options.amount =
			parseInt(full_pagination_params.items) +
			(parseInt(full_pagination_params.forward_buffer) || 0);
	} else {
		if (params.skip) {
			output_options.skip = parseInt(params.skip);
		}
		if (params.amount) {
			output_options.amount = parseInt(params.count);
		}
	}

	if (params.sort) {
		const full_sort_params = clone(params.sort);
		for (const field_name in full_sort_params) {
			switch (full_sort_params[field_name]) {
				case "desc":
					full_sort_params[field_name] = -1;
					break;
				case "asc":
					full_sort_params[field_name] = 1;
					break;
				default:
					delete full_sort_params[field_name];
			}
		}
		output_options.sort = full_sort_params;
	}

	return output_options;
};

CollectionSubject.prototype.__list_resources = async function(
	datastore,
	collection,
	context,
	params,
	named_filters
) {
	if (params === undefined || params === null) {
		params = {};
	}

	if (params.calculate === "false" || params.calculate === false) {
		params.calculate = false;
	} else if (typeof params.calculate !== "object") {
		params.calculate = true;
	}

	await collection.check_if_action_is_allowed(context, "show");
	const aggregation_stages = await collection.get_aggregation_stages(
		context,
		"show",
		params,
		named_filters
	);

	const output_options = get_output_options(this.collection, params);

	const documents = await datastore.aggregate(
		collection.name,
		aggregation_stages,
		{},
		output_options
	);

	const decoded_items = [];
	const access_strategy = collection.get_access_strategy("show");
	const is_item_sensitive = await access_strategy.is_item_sensitive();

	for (let document of documents) {
		try {
			let item = await collection.get_resource_representation(
				context,
				document,
				params.format,
				params.calculate
			);
			if (is_item_sensitive) {
				await access_strategy.check(context, item);
			}
			decoded_items.push(item);
		} catch (e) {}
	}
	return { attachments: {}, items: decoded_items };
};

CollectionSubject.prototype.perform_action = function(
	context,
	action_name,
	args
) {
	switch (action_name) {
		case "create":
			if (args.__multiple) {
				return this.create_many(context, args);
			} else {
				return this.create_resource(context, args);
			}
		case "show":
			return this.list_resources(context, args);
		case "delete":
			return this.delete(context, args);
		default:
			throw new Errors.DeveloperError(
				`Unknown action for '${
					this.collection.name
				}' collection: '${action_name}'`
			);
	}
};

CollectionSubject.subject_name = "collection";

module.exports = CollectionSubject;
