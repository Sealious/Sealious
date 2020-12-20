import { App, Context } from "../main";
import UUIDGenerator from "shortid";
import fs, { ReadStream } from "fs";
import { basename } from "path";
import { getType } from "mime";
import { PassThrough, Readable } from "stream";

const locreq = require("locreq")(__dirname);

export type FileDBEntry = {
	filename: string;
	id: string;
};

export default class File {
	filename?: string;
	mime_type?: string;
	id?: string;
	app: App;
	data?: Readable;
	constructor(app: App) {
		this.app = app;
	}

	getDataPath(): string | null {
		if (!this.id) {
			return null;
		}
		const upload_path = this.app.ConfigManager.get("upload_path");
		const data_path = locreq.resolve(`${upload_path}/${this.id}`);
		return data_path;
	}

	getMimeType(): string {
		if (!this.filename) {
			throw new Error("Set filename first");
		}
		return getType(this.filename) || "unknown";
	}

	getStream() {
		const path = this.getDataPath();
		if (!path) {
			return null;
		}
		return fs.createReadStream(path);
	}

	getURL() {
		return `/api/v1/uploaded-files/${this.id}/${this.filename}`;
	}

	static async fromID(app: App, id: string) {
		const matches = await app.Datastore.find("files", { id });
		const file_data = matches[0] as FileDBEntry;
		const ret = new FileFromDB(app);
		ret.filename = file_data.filename;
		ret.id = id;
		return ret;
	}

	static async fromPath(app: App, path: string) {
		const ret = new FileFromPath(app);
		ret.filename = basename(path);
		ret.data = fs.createReadStream(path);
		return ret;
	}

	static async fromData(app: App, buffer: Buffer | string) {
		const stream = new Readable();
		stream._read = () => {};
		stream.push(buffer);
		stream.push(null);
		const ret = new File(app);
		ret.data = stream;
		return ret;
	}

	toDBEntry(): FileDBEntry {
		if (!this.filename) {
			throw new Error("Missing filename");
		}
		if (!this.id) {
			throw new Error("Missing id");
		}
		return {
			filename: this.filename,
			id: this.id,
		};
	}

	async save() {
		if (this.id) {
			throw new Error(
				"This file has already been saved and cannot be edited"
			);
		}
		if (!this.data) {
			throw new Error("Please provide file data before saving");
		}
		if (!this.filename) {
			throw new Error("Please provide file data before saving");
		}
		this.id = UUIDGenerator();
		const upload_path = this.app.ConfigManager.get("upload_path");
		const upload_path_with_sealious_name = `${upload_path}/${this.id}`;

		const writeStream = fs.createWriteStream(
			upload_path_with_sealious_name
		);
		this.data.pipe(writeStream);
		await new Promise((resolve, reject) => {
			this.data?.on("end", resolve);
			this.data?.on("close", resolve);
			this.data?.on("error", reject);
		});

		await this.app.Datastore.insert("files", this.toDBEntry(), {});
		return this;
	}
}

export class FileFromDB extends File {
	filename: string;
	getDataPath(): string {
		return super.getDataPath() as string;
	}
}

export class FileFromPath extends File {
	filename: string;
	data: ReadStream;
}
