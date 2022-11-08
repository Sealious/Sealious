import { v4 as uuid } from "uuid";
import Field, { ValidationResult } from "../../../chip-types/field";
import type Context from "../../../context";

export class Uuid extends Field {
	typeName = "uuid";

	isOldValueSensitive = (): boolean => true;

	async isProperValue(): Promise<ValidationResult> {
		return Field.valid();
	}

	async encode(_: Context, __: unknown, old_value: string): Promise<string> {
		const ret = old_value ? old_value : uuid();
		return ret;
	}

	async getMatchQueryValue(
		context: Context,
		filter: string
	): Promise<string> {
		return filter;
	}

	async decode(_: Context, value: string): Promise<string> {
		return value;
	}

	async filterToQuery(
		_: Context,
		filter: unknown
	): Promise<{
		$eq: unknown;
	}> {
		return { $eq: filter };
	}

	async getDefaultValue(): Promise<string> {
		return uuid();
	}
}
