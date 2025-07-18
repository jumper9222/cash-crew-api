import express from "express";
import cors from "cors";
import { pool } from "./config/database";
import {
  fetchTransactions,
  postTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transactions/transactions";

const app = express();

// Configure CORS
const corsOptions = {
  origin: ["https://www.cashcrewapp.com", "http://localhost:3001"],
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

app.get("/", (req, res) => {
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

const port = 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
