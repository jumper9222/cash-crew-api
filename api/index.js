let express = require('express');
const cors = require('cors');
const { pool } = require('./config/database');
require('ts-node/register');
const { fetchTransactions, postTransaction, updateTransaction, deleteTransaction } = require('./transactions/transactions');

let app = express();
app.use(cors());
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

getPostgresVersion();

app.get("/", (req, res) => {
    res.send("If you see this, the API is working!")
})

//Fetch all transactions and splits associated to user
app.get("/transactions/:user_id", fetchTransactions)

//Post transaction and post splits conditionally
app.post("/transaction/:user_id", postTransaction)

//Update transaction
app.put("/transaction/:transaction_id", updateTransaction)

//Delete transaction
app.delete("/transaction/:user_id/:transaction_id", deleteTransaction)

// app.get("/comments/:transaction_id", async (req, res) => {
//     const client = await pool.connect();
//     const { transaction_id } = req.params;
//     try {
//         const comments = await client.query("SELECT * FROM comments WHERE transaction_id = $1", [transaction_id])
//         res.status(200).json(comments.rows)
//     } catch (error) {
//         console.error("Error executing query", error.stack)
//         res.status(500).json({ error: "Error fetching comments" })
//     } finally {
//         client.release();
//     }
// })

// //Post Split
// app.post("/split/:transaction_id", async (req, res) => {
//     const { transaction_id } = req.params;
//     const {
//         user_id,
//         split_amount,
//         currency,
//         category
//     } = req.body;
//     const client = await pool.connect();
//     try {
//         const response = await client.query(
//             "INSERT INTO splits (transaction_id, user_id, split_amount, currency, category) VALUES ($1, $2, $3, $4, $5) RETURNING *",
//             [transaction_id, user_id, split_amount, currency, category]
//         );
//         res.status(201).json(response.rows[0]);
//     } catch (error) {
//         console.error("Error creating split", error)
//         res.status(500).json({ message: "Error creating split", error })
//     } finally {
//         client.release();
//     }
// })

//Post comment
// app.post("/comment/:transaction_id", async (req, res) => {
//     const { transaction_id } = req.params;
//     const {
//         user_id,
//         comment,
//     } = req.body;
//     const client = await pool.connect();
//     try {
//         const response = await client.query(
//             "INSERT INTO comments (transaction_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *",
//             [transaction_id, user_id, comment]
//         );
//         res.status(201).json(response.rows[0]);
//     } catch (error) {
//         res.status(500).send(error)
//     } finally {
//         client.release();
//     }
// })

// app.put("/transaction/split/:user_id/:transaction_id", async (req, res) => {
//     const { user_id, transaction_id } = req.params;
//     const splits = request.body;
//     const client = pool.connect();

//     try {
//         const transactionExists = await client.query(
//             'SELECT * FROM transactions WHERE id = $1 AND user_id = $2'
//             [transaction_id, user_id]
//         );
//         const splitsExists = await client.query(
//             'SELECT * FROM splits WHERE transaction_id = $1'
//             [transaction_id]
//         );

//         if (transactionExists.length > 0 && splitsExists.length > 0) {
//             try {
//                 const response = await Promise.all(splits.map(async split => {
//                     const { split_amount, currency, category, splitId } = split;
//                     try {
//                         const response = await client.query(
//                             'UPDATE splits SET split_amount = $1, currency = $2, category = $3 WHERE id = $4 RETURNING *',
//                             [split_amount, currency, category, splitId])
//                         console.log("Split updated successfully")
//                         return response.rows[0]
//                     } catch (error) {
//                         console.error("Error updating split", error)
//                         throw error
//                     }
//                 }))
//                 res.status(201).json(response.rows);
//             } catch (error) {
//                 console.error("Error updating splits", error)
//                 throw error
//             }
//         }
//     } catch (error) {
//         console.error("Error finding transactions and splits or error updating splits", error)
//     } finally {
//         client.release();
//     }
// })

// app.put("/comment/:transaction_id/:comment_id", async (req, res) => {
//     const { transaction_id, comment_id } = req.params;
//     const {
//         user_id,
//         comment,
//     } = req.body;
//     const client = await pool.connect();
//     try {
//         const response = await client.query(
//             "UPDATE comments SET comment = $1 WHERE transaction_id = $2 AND id = $3 AND user_id = $4 RETURNING *",
//             [comment, transaction_id, comment_id, user_id]
//         );
//         res.status(201).json(response.rows[0]);
//     } catch (error) {
//         console.error("Error updating comment", error)
//         res.status(500).send(error)
//     } finally {
//         client.release();
//     }
// })

// app.delete("/split/:user_id/:transaction_id/:split_id", async (req, res) => {
//     const client = await pool.connect();
//     const { user_id, transaction_id, split_id } = req.params;
//     try {
//         const response = await client.query(
//             "DELETE FROM splits WHERE user_id = $1 AND transaction_id = $2 AND id = $3 RETURNING *",
//             [user_id, transaction_id, split_id])
//         res.status(200).json(response.rows)
//     } catch (error) {
//         console.error("Error split", error)
//         res.status(500).send(error);
//     } finally {
//         client.release();
//     }
// })

// app.delete("/comment/:user_id/:comment_id", async (req, res) => {
//     const { user_id, comment_id } = req.params;
//     const client = await pool.connect();
//     try {
//         const response = await client.query(
//             "DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *",
//             [comment_id, user_id]
//         );
//         res.status(201).json(response.rows[0]);
//     } catch (error) {
//         console.error("Error deleting comment", error)
//         res.status(500).send(error)
//     } finally {
//         client.release();
//     }
// })

app.listen(3001, () => {
    console.log("Server is running on port 3001")
})