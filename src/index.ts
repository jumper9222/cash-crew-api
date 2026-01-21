import cors from "cors";
import express from "express";
import { pool } from "./config/database";
import { createGroup } from "./groups/createGroup";
import { fetchGroups } from "./groups/fetchGroups";
import { updateGroup } from "./groups/updateGroup ";
import { firebaseAuthMiddleware } from "./middleware/firebaseAuth.middleware";
import { fetchTransactionTemplates } from "./transaction-templates/transaction-templates";
import { fetchTransactions } from "./transactions/fetchTransactions";
import { postTransaction } from "./transactions/postTransaction";
import { deleteTransaction } from "./transactions/transactions";
import { updateTransaction } from "./transactions/updateTransaction";

const app = express();

// Configure CORS
const corsOptions = {
	origin: ["https://www.cashcrewapp.com", "http://localhost:5173", "file://"],
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

async function getPostgresVersion() {
	const client = await pool.connect();
	try {
		const res = await client.query("SELECT version()");
		console.log(res.rows[0]);
	} finally {
		client.release();
	}
}

getPostgresVersion().catch(console.error);

app.get("/", (_, res) => {
	res.send("If you see this, the API is working!");
});

// Fetch all transactions and splits associated to user
app.get("/transactions/:user_id", fetchTransactions);

// Post transaction and post splits conditionally
app.post("/transaction/:user_id", postTransaction); // Handle singular form for backward compatibility

// Update transaction and update/create/delete splits conditionally
app.put("/transaction/:transaction_id", updateTransaction); // Handle singular form for backward compatibility

// Delete transaction and delete splits conditionally
app.delete("/transaction/:user_id/:transaction_id", deleteTransaction); // Handle singular form for backward compatibility

app.get("/transaction-templates/:user_id", fetchTransactionTemplates);

app.get("/groups", firebaseAuthMiddleware, fetchGroups);
app.post("/groups", createGroup);
app.put("/groups", firebaseAuthMiddleware, updateGroup);
// app.put("/groups/:group_id", firebaseAuthMiddleware, softDeleteGroup);

// app.post("/groups/:group_id", firebaseAuthMiddleware, addGroupMember);
// app.get("/groups/:group_id", firebaseAuthMiddleware, fetchGroupMembers);
// app.put("/groups/:group_id", firebaseAuthMiddleware, softDeleteGroupMember);

const port = 3001;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});

export default app;
