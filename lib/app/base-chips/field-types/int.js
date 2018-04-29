"use strict";
const locreq = require("locreq")(__dirname);
const Errors = locreq("lib/response/error.js");

const human_comparators_to_query = {
	">": "$gt",
	gt: "$gt",
	gte: "$gte",
	">=": "$gte",
	"=>": "$gte",
	"<": "$lt",
	lt: "$lt",
	lte: "$lte",
	"<=": "$lte",
	"=<": "$lte",
	"=": "$eq",
};

const proper_value_checkers = [
	(params, value) => {
		if (Number.isFinite(params.min) && value < params.min)
			return [
				false,
				`Value should be larger or equal to '${params.min}.`,
			];
		else return [true];
	},
	(params, value) => {
		if (Number.isFinite(params.max) && value > params.max)
			return [
				false,
				`Value should be smaller or equal to '${params.max}.`,
			];
		else return [true];
	},
];

const int = {
	name: "int",
	get_description: function() {
		return "An integer number.";
	},
	is_proper_value: function(context, params, new_value) {
		if (!Number.isInteger(new_value)) {
			return Promise.reject(
				`Value '${new_value}' is not a int number format.`
			);
		}

		const failed_checks = proper_value_checkers
			.map(fn => fn(params, new_value))
			.filter(element => !element[0]);
		if (failed_checks.length === 0) {
			return Promise.resolve();
		} else {
			return Promise.reject(failed_checks.map(e => e[1]).join(" "));
		}
	},
	encode: function(context, params, value_in_code) {
		return parseInt(value_in_code, 10);
	},
	filter_to_query: function(context, params, field_filter) {
		if (typeof field_filter !== "object") {
			return {
				$eq: parseInt(field_filter),
			};
		}
		// treating filter as a query here
		const new_filter = {};
		for (const comparator in field_filter) {
			const new_comparator = human_comparators_to_query[comparator];
			if (new_comparator === undefined) {
				throw new Errors.ValidationError(
					`Unknown comparator: '${comparator}'.`
				);
			}
			new_filter[new_comparator] = parseInt(field_filter[comparator]);
		}
		return new_filter;
	},
};

module.exports = int;
