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

//Fetch all transactions and splits associated to user
app.get("/transactions/:user_id", async (req, res) => {
    const client = await pool.connect();
    const { user_id } = req.params;
    try {
        const response = await client.query(
            `SELECT 
                t.id AS transaction_id, 
                t.title, 
                t.description, 
                t.date, 
                t.total_amount,
                t.currency,
                t.user_id AS paid_by,
                t.category,
                t.date_modified,
                t.is_split,
                t.photo_url,
                s.id AS split_id,
                s.user_id AS split_uid,
                s.split_amount, 
                s.category AS split_category
                FROM transactions t
            LEFT JOIN splits s ON t.id = s.transaction_id
            WHERE t.user_id = $1 
            
            UNION ALL
            
            SELECT 
            t.id AS transaction_id, 
            t.title, 
            t.description, 
            t.date, 
            t.total_amount,
            t.currency,
            t.user_id AS paid_by,
            t.category,
            t.date_modified,
            t.is_split,
            t.photo_url,
            s.id AS split_id,
            s.user_id AS split_uid,
            s.split_amount, 
            s.category AS split_category
            FROM transactions t
            JOIN splits s ON t.id = s.transaction_id
            LEFT JOIN splits s1 ON t.id = s1.transaction_id
            WHERE s1.user_id = $1
            AND t.user_id <> $1`,
            [user_id]
        )
        res.status(200).json(response.rows)
    } catch (error) {
        console.error("Error executing query", error.stack)
        res.status(500).json({ error: "Error fetching transactions" })
    } finally {
        client.release();
    }
})

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

//Post transaction and post splits conditionally
app.post("/transaction/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const {
        title,
        description,
        date,
        totalAmount,
        currency,
        category,
        isSplit,
        photoURL,
        splits
    } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN')
        const transactionResponse = await client.query(
            `INSERT INTO transactions (title, description, date, total_amount, currency, user_id, category, is_split, photo_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *,
                id AS transaction_id,
                user_id as paid_by`,
            [title, description, date, totalAmount, currency, user_id, category, isSplit, photoURL]
        );

        let splitsResponse = [];

        if (splits.length > 1) {
            const transaction_id = transactionResponse.rows[0].transaction_id

            splitsResponse = await Promise.all(splits.map(async (split) => {
                const { user_id, split_amount, currency, category } = split;
                return client.query(
                    `INSERT INTO splits (user_id, transaction_id, split_amount, currency, category)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *`,
                    [user_id, transaction_id, split_amount, currency, category])
                    .then((response) => response.rows[0]);
            }));
        }
        await client.query('COMMIT')
        res.status(201).json({ transaction: transactionResponse.rows[0], splits: splitsResponse })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Error executing transaction, transaction rolled back', error)
        res.status(500).json({ message: 'Error executing transaction, transaction rolled back', error })
    } finally {
        client.release();
    }
})

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

//Update transaction
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
        paidBy,
        isSplit,
        photoURL,
        splits
    } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN')
        const transaction = await client.query(
            `UPDATE transactions 
            SET 
                title = $1, 
                description = $2, 
                date = $3, 
                total_amount = $4, 
                currency = $5, 
                date_modified = $6, 
                category = $7, 
                user_id = $8, 
                is_split = $9,
                photo_url = $10 
            WHERE user_id = $11 AND id = $12 RETURNING *`,
            [title, description, date, totalAmount, currency, dateModified, category, paidBy, isSplit, photoURL, user_id, transaction_id]
        );
        let updatedSplits = []
        if (splits.length > 0) {
            updatedSplits = await Promise.all(splits.map(async (split) => {
                const { split_amount, currency, category, splitId, userId } = split
                try {
                    const response = await client.query(
                        `UPDATE splits 
                        SET split_amount = $1, currency = $2, category = $3 
                        WHERE id = $4 AND user_id = $5 
                        RETURNING
                            id,
                            split_amount AS amount,
                            user_id, 
                            category
                            `,
                        [split_amount, currency, category, splitId, userId])
                    console.log("Split updated successfully")
                    return response.rows[0]
                } catch (error) {
                    console.error("Error updating split", error)
                    throw error
                }
            }));
        }
        await client.query('COMMIT')
        res.status(201).json({ transaction: transaction.rows[0], splits: updatedSplits });
    } catch (error) {
        await client.query('ROLLBACK')
        console.error("Error updating transaction", error)
        res.status(500).send(error)
    } finally {
        client.release();
    }
})

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

//Delete transaction
app.delete("/transaction/:user_id/:transaction_id", async (req, res) => {
    const client = await pool.connect();
    const { user_id, transaction_id } = req.params;
    try {
        const response = await client.query(
            "DELETE FROM transactions WHERE user_id = $1 AND id = $2 RETURNING *",
            [user_id, transaction_id])
        res.status(200).json(response.rows[0])
    } catch (error) {
        console.error("Error deleting transaction and/or splits", error)
        res.status(500).send(error);
    } finally {
        client.release();
    }
})

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