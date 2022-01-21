import { v4 as uuid } from "uuid";
import getPort from "get-port";
import { Environment } from "../app/config";
import { App } from "../main";
import mailcatcher from "./mailcatcher";
import MockRestApi from "./rest-api";
import { get_test_app, TestAppType } from "./test-app";
import { strategy } from "sharp";

type TestCallback = (params: CallbackParams) => Promise<any>;

type extendFn = null | ((app_class: TestAppType) => TestAppType);

const test_collections: { [collection: string]: string } = {};

export async function withStoppedApp(
	extend_fn: extendFn,
	cb: TestCallback,
	test_collection?: string // tests with the same collection get assigned the same db id
): Promise<any> {
	await withTestApp(
		"auto_start" && false,
		"dev",
		extend_fn,
		cb,
		test_collection
	);
}

export async function withRunningApp(
	extend_fn: extendFn,
	cb: TestCallback,
	test_collection?: string // tests with the same collection get assigned the same db id
): Promise<any> {
	await withTestApp(
		"auto_start" && true,
		"dev",
		extend_fn,
		cb,
		test_collection
	);
}

export async function withRunningAppProd(
	extend_fn: extendFn,
	cb: TestCallback,
	test_collection?: string
): Promise<any> {
	await withTestApp(
		"auto_start" && true,
		"production",
		extend_fn,
		cb,
		test_collection
	);
}

function getAppID(test_collection?: string) {
	let uniq_id;
	if (test_collection) {
		if (!test_collections[test_collection]) {
			test_collections[test_collection] = uuid();
		}
		uniq_id = test_collections[test_collection];
	} else {
		uniq_id = uuid();
	}
	return uniq_id;
}

type ProdAppCallbackParams = {
	app: App;
	base_url: string;
	smtp_api_uri: string;
	rest_api: MockRestApi;
	port: number;

	mail_api: ReturnType<typeof mailcatcher>;
};

export async function withProdApp(
	app: App,
	port: number,
	smtp_api_uri: string,
	stop_app: boolean = false,
	fn: (params: ProdAppCallbackParams) => Promise<unknown>
): Promise<any> {
	const base_url = `http://localhost:${port}`;
	try {
		await fn({
			app: app,
			port: port,
			base_url,
			smtp_api_uri,
			mail_api: mailcatcher(smtp_api_uri, app),
			rest_api: new MockRestApi(base_url),
		});
	} catch (e) {
		console.error(e);
		throw e;
	} finally {
		if (app.Datastore.db) {
			app.Logger.info("TEST APP", "Clearing the database...");
			for (const collection_name in app.collections) {
				// eslint-disable-next-line no-await-in-loop
				await app.Datastore.remove(
					collection_name,
					{},
					"just_one" && false
				);
			}
			await app.Datastore.remove(
				app.Metadata.db_collection_name,
				{},
				"just_one" && false
			);
		}
		if (app.status !== "stopped" && stop_app) {
			await app.stop();
		}
	}
}

type CallbackParams = {
	app: App;
	base_url: string;
	smtp_api_url: string;
	rest_api: MockRestApi;
	port: number;

	mail_api: ReturnType<typeof mailcatcher>;

	app_class: TestAppType;
};

async function withTestApp(
	auto_start: boolean,
	env: Environment,
	extend_fn: extendFn,
	fn: (params: CallbackParams) => Promise<unknown>,
	test_collection?: string
) {
	const port = await getPort();
	const base_url = `http://127.0.0.1:${port}`;
	const smtp_api_url = `http://${
		process.env.SEALIOUS_SMTP_HOST || "127.0.0.1"
	}:1088`;

	const TestApp = get_test_app({
		env,
		port,
		base_url,
		uniq_id: getAppID(test_collection),
	});
	let modified_app_class;
	if (extend_fn) {
		modified_app_class = extend_fn(TestApp);
	} else {
		modified_app_class = TestApp;
	}

	const app = new modified_app_class();
	if (auto_start) {
		await app.start();
	}
	try {
		await fn({
			app: app as App,
			port,
			app_class: modified_app_class,
			base_url,
			smtp_api_url,
			mail_api: mailcatcher(smtp_api_url, app),
			rest_api: new MockRestApi(base_url),
		});
	} catch (e) {
		console.error(e);
		throw e;
	} finally {
		if (app.status !== "stopped") {
			await app.stop();
		}
	}
}
