let express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require("dotenv").config();
let {
    PGHOST,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
} = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT version()");
        console.log(res.rows[0]);
    } finally {
        client.release();
    }
}

getPostgresVersion();

app.get("/", (req, res) => {
    res.send("If you see this, the API is working!")
})

app.get("/transactions/:user_id", async (req, res) => {
    const client = await pool.connect();
    const { user_id } = req.params;
    try {
        const transactions = await client.query("SELECT * FROM transactions WHERE user_id = $1", [user_id])
        const splits = await client.query("SELECT * FROM splits WHERE user_id = $1", [user_id])
        res.status(200).json({ transactions: transactions.rows, splits: splits.rows })
    } catch (error) {
        console.error("Error executing query", error.stack)
        res.status(500).json({ error: "Error fetching transactions" })
    } finally {
        client.release();
    }
})

app.get("/comments/:transaction_id", async (req, res) => {
    const client = await pool.connect();
    const { transaction_id } = req.params;
    try {
        const comments = await client.query("SELECT * FROM comments WHERE transaction_id = $1", [transaction_id])
        res.status(200).json(comments.rows)
    } catch (error) {
        console.error("Error executing query", error.stack)
        res.status(500).json({ error: "Error fetching comments" })
    } finally {
        client.release();
    }
})

app.post("/transaction/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const {
        title,
        description,
        date,
        totalAmount,
        currency,
        dateModified,
        category
    } = req.body;
    const client = await pool.connect();
    try {
        const response = await client.query(
            "INSERT INTO transactions (title, description, date, total_amount, currency, date_modified, user_id, category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [title, description, date, totalAmount, currency, dateModified, user_id, category]
        );
        res.status(201).json(response.rows[0]);
    } catch (error) {
        res.status(500).send(error)
    } finally {
        client.release();
    }
})

app.post("/split/:transaction_id", async (req, res) => {
    const { transaction_id } = req.params;
    const {
        user_id,
        split_amount,
        currency,
        category
    } = req.body;
    const client = await pool.connect();
    try {
        const response = await client.query(
            "INSERT INTO splits (transaction_id, user_id, split_amount, currency, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [transaction_id, user_id, split_amount, currency, category]
        );
        res.status(201).json(response.rows[0]);
    } catch (error) {
        console.error("Error creating split", error)
        res.status(500).json({ message: "Error creating split", error })
    } finally {
        client.release();
    }
})

app.post("/comment/:transaction_id", async (req, res) => {
    const { transaction_id } = req.params;
    const {
        user_id,
        comment,
    } = req.body;
    const client = await pool.connect();
    try {
        const response = await client.query(
            "INSERT INTO comments (transaction_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *",
            [transaction_id, user_id, comment]
        );
        res.status(201).json(response.rows[0]);
    } catch (error) {
        res.status(500).send(error)
    } finally {
        client.release();
    }
})

app.put("/transaction/:user_id/:transaction_id", async (req, res) => {
    const { user_id, transaction_id } = req.params;
    const {
        title,
        description,
        date,
        totalAmount,
        currency,
        dateModified,
        category,
        splits
    } = req.body;
    const client = await pool.connect();
    try {
        const transaction = await client.query(
            "UPDATE transactions SET title = $1, description = $2, date = $3, total_amount = $4, currency = $5, date_modified = $6, category = $7 WHERE user_id = $8 AND id = $9 RETURNING *",
            [title, description, date, totalAmount, currency, dateModified, category, user_id, transaction_id]
        );
        let updatedSplits = []
        if (splits.length > 0) {
            updatedSplits = await Promise.all(splits.map(async (split) => {
                const { split_amount, currency, category, splitId } = split
                try {
                    const response = await client.query(
                        'UPDATE splits SET split_amount = $1, currency = $2, category = $3 WHERE id = $4 RETURNING *',
                        [split_amount, currency, category, splitId])
                    console.log("Split updated successfully")
                    return response.rows[0]
                } catch (error) {
                    console.error("Error updating split", error)
                    throw error
                }
            }));
        }
        res.status(201).json({ transaction: transaction.rows[0], splits: updatedSplits });
    } catch (error) {
        console.error("Error updating transaction", error)
        res.status(500).send(error)
    } finally {
        client.release();
    }
})

app.put("/comment/:transaction_id/:comment_id", async (req, res) => {
    const { transaction_id, comment_id } = req.params;
    const {
        user_id,
        comment,
    } = req.body;
    const client = await pool.connect();
    try {
        const response = await client.query(
            "UPDATE comments SET comment = $1 WHERE transaction_id = $2 AND id = $3 AND user_id = $4 RETURNING *",
            [comment, transaction_id, comment_id, user_id]
        );
        res.status(201).json(response.rows[0]);
    } catch (error) {
        console.error("Error updating comment", error)
        res.status(500).send(error)
    } finally {
        client.release();
    }
})

app.delete("/transaction/:user_id/:transaction_id", async (req, res) => {
    const client = await pool.connect();
    const { user_id, transaction_id } = req.params;
    try {
        const response = await client.query(
            "DELETE FROM transactions WHERE user_id = $1 AND id = $2 RETURNING *",
            [user_id, transaction_id])
        res.status(200).json(response.rows)
    } catch (error) {
        console.error("Error deleting transaction and/or splits", error)
        res.status(500).send(error);
    } finally {
        client.release();
    }
})

app.delete("/split/:user_id/:transaction_id/:split_id", async (req, res) => {
    const client = await pool.connect();
    const { user_id, transaction_id, split_id } = req.params;
    try {
        const response = await client.query(
            "DELETE FROM splits WHERE user_id = $1 AND transaction_id = $2 AND id = $3 RETURNING *",
            [user_id, transaction_id, split_id])
        res.status(200).json(response.rows)
    } catch (error) {
        console.error("Error split", error)
        res.status(500).send(error);
    } finally {
        client.release();
    }
})

app.delete("/comment/:user_id/:comment_id", async (req, res) => {
    const { user_id, comment_id } = req.params;
    const client = await pool.connect();
    try {
        const response = await client.query(
            "DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *",
            [comment_id, user_id]
        );
        res.status(201).json(response.rows[0]);
    } catch (error) {
        console.error("Error deleting comment", error)
        res.status(500).send(error)
    } finally {
        client.release();
    }
})

app.listen(3001, () => {
    console.log("Server is running on port 3001")
})