import crypto from "crypto";
const algorithm = "sha512";
import { promisify } from "util";

const pbkdf2 = promisify(crypto.pbkdf2);

const SecureHasher = {
	generateRandomSalt(salt_length: number) {
		return crypto.randomBytes(salt_length).toString("base64");
	},
	async hash(
		value_to_hash: crypto.BinaryLike,
		salt: crypto.BinaryLike,
		{ iterations, key_length }: any
	) {
		const key = await pbkdf2(
			value_to_hash,
			salt,
			iterations,
			key_length,
			algorithm
		);
		return `${iterations}.${key_length}.${salt}.${key.toString("hex")}`;
	},
	async matches(value: crypto.BinaryLike, hash_with_params: string) {
		const [iterations, key_length, salt, hash] = hash_with_params.split(
			"."
		);

		const key = await pbkdf2(
			value,
			salt,
			parseInt(iterations, 10),
			parseInt(key_length, 10),
			algorithm
		);
		return key.toString("hex") === hash;
	},
};

export default SecureHasher;
