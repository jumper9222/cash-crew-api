import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
	console.error("Missing required database environment variables");
	throw new Error("Missing required database environment variables");
}

export const pool = new Pool({
	host: PGHOST,
	database: PGDATABASE,
	user: PGUSER,
	password: PGPASSWORD,
	port: 5432,
	ssl: {
		rejectUnauthorized: false,
	},
});

// Test the database connection
pool.on("error", (err) => {
	console.error("Unexpected error on idle client", err);
	process.exit(-1);
});

pool.on("connect", () => {
	console.log("Connected to PostgreSQL database");
});
