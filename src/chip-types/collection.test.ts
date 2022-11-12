import assert from "assert";
import Int from "../app/base-chips/field-types/int";
import { App, FieldTypes, Policies } from "../main";
import type { TestApp } from "../test_utils/test-app";
import {
	TestAppConstructor,
	withRunningApp,
	withStoppedApp,
	withTestApp,
} from "../test_utils/with-test-app";
import Collection from "./collection";

type Policies = Collection["policies"];

function extend(t: TestAppConstructor<TestApp>, passedPolicies: Policies = {}) {
	return class extends t {
		collections = {
			...App.BaseCollections,
			coins: new (class extends Collection {
				fields = { value: new Int() };
				policies = passedPolicies;
			})(),
		};
	};
}

describe("collection router", () => {
	it("propertly responds to a GET request to list resources", async () =>
		withRunningApp(extend, async ({ rest_api }) => {
			await rest_api.post("/api/v1/collections/coins", { value: 2 });
			const response = await rest_api.get("/api/v1/collections/coins");
			assert.ok(response.items[0].id);
			assert.strictEqual(response.items[0].value, 2);
		}));
});

describe("policy sharing for list and show", () => {
	it("proper inheritance of list policy from show policy", () => {
		return withRunningApp(
			(t) => {
				return extend(t, { show: new Policies.Noone() });
			},
			async ({ app }) => {
				assert.strictEqual(
					app.collections.coins.getPolicy("list") instanceof
						Policies.Noone,
					true
				);
			}
		);
	});
	it("proper inheritance of show policy from list policy", () => {
		return withRunningApp(
			(t) => {
				return extend(t, { list: new Policies.Noone() });
			},
			async ({ app }) => {
				assert.strictEqual(
					app.collections.coins.getPolicy("show") instanceof
						Policies.Noone,
					true
				);
			}
		);
	});

	it("action policy is favoured over inherited policy", () => {
		return withRunningApp(
			(t) => {
				return extend(t, {
					list: new Policies.Noone(),
					show: new Policies.LoggedIn(),
				});
			},
			async ({ app }) => {
				assert.strictEqual(
					app.collections.coins.getPolicy("list") instanceof
						Policies.Noone,
					true
				);
			}
		);
	});
});

describe("types", () => {
	it("throws a ts error when a required field is missing", () => {
		// this test does not have to run in runitme, just creating a code structure to reflect the use case mentioned here: https://forum.sealcode.org/t/sealious-problem-z-typami/1399/3

		return withRunningApp(
			(t: TestAppConstructor<TestApp>) =>
				class TheApp extends t {
					collections = {
						...App.BaseCollections,
						withRequired:
							new (class withRequired extends Collection {
								fields = {
									required: FieldTypes.Required(
										new FieldTypes.Int()
									),
								};
							})(),
					};
				},
			async ({ app }) => {
				await app.collections.withRequired.create(
					new app.SuperContext(),
					{ required: 2 } // try removing or renaming this property and you should get an error
				);
				await app.collections.withRequired.suCreate({ required: 2 });
			}
		);
	});

	it("doesn't throw a ts error when a non-required field is missing", () => {
		return withRunningApp(
			(t: TestAppConstructor<TestApp>) =>
				class TheApp extends t {
					collections = {
						...App.BaseCollections,
						withRequired:
							new (class withRequired extends Collection {
								fields = {
									nonrequired: new FieldTypes.Int(),
								};
							})(),
					};
				},
			async ({ app }) => {
				await app.collections.withRequired.create(
					new app.SuperContext(),
					{}
				);
			}
		);
	});
});

describe("collection", () => {
	describe("removeByID", () => {
		it("calls after:remove", async () =>
			withRunningApp(
				(t) =>
					class extends t {
						collections = {
							...App.BaseCollections,
							test: new (class extends Collection {
								fields = {};
							})(),
						};
					},
				async ({ app }) => {
					let called = false;
					app.collections.test.on("after:remove", async () => {
						called = true;
					});
					const item = await app.collections.test.suCreate({});
					await app.collections.test.suRemoveByID(item.id);
					assert.strictEqual(called, true);
				}
			));
	});
});
