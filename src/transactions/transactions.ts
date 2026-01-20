import { pool as dbPool } from "../config/database";
import { Request, Response } from "express";

// const fetchTransactions = async (req: Request, res: Response) => {
// 	const client = await dbPool.connect();
// 	const { user_id } = req.params;
// 	const { latestDateModified } = req.query;

// 	try {
// 		const response = await client.query(
// 			`SELECT DISTINCT
//             t.id AS transaction_id,
//             t.title,
//             t.description,
//             t.date,
//             t.total_amount,
//             t.currency,
//             t.user_id,
//             t.paid_by,
//             t.category,
//             t.date_modified,
//             t.is_split,
//             t.photo_url,
//             s.id AS split_id,
//             s.user_id AS split_uid,
//             s.split_amount,
//             s.category AS split_category
//             FROM transactions t
//             LEFT JOIN splits s ON t.id = s.transaction_id
//             WHERE t.date_modified > $2::timestamp
//             AND t.id IN (
//                SELECT DISTINCT t2.id
//                FROM transactions t2
//                LEFT JOIN splits s2 ON t2.id = s2.transaction_id
//                WHERE (
//                   t2.user_id = $1 OR
//                   t2.paid_by = $1 OR
//                   s2.user_id = $1
//                )
//             )
//             ORDER BY t.date DESC`,
// 			[user_id, latestDateModified]
// 		);
// 		res.status(200).json(response.rows);
// 	} catch (error) {
// 		console.error("Error executing query", error.stack);
// 		res.status(500).json({ error: "Error fetching transactions" });
// 	} finally {
// 		client.release();
// 	}
// };

const postSplit = async (client, split, transaction_id) => {
	const { userId, amount, category } = split;
	const response = await client.query(
		`INSERT INTO splits (user_id, transaction_id, split_amount, category)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
		[userId, transaction_id, amount, category]
	);

	return response.rows[0];
};

const postTransaction = async (req: Request, res: Response) => {
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
		splits,
		paidBy,
	} = req.body;
	const client = await dbPool.connect();
	try {
		await client.query("BEGIN");
		const transactionResponse = await client.query(
			`INSERT INTO transactions (
            title, 
            description, 
            date, 
            total_amount, 
            currency, 
            user_id, 
            category, 
            is_split, 
            photo_url,
            paid_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *,
               id AS transaction_id,
               user_id as created_by`,
			[
				title,
				description,
				date,
				totalAmount,
				currency,
				user_id,
				category,
				isSplit,
				photoURL,
				paidBy,
			]
		);

		let splitsResponse: any[] = [];

		if (splits.length > 1) {
			const transaction_id = transactionResponse.rows[0].transaction_id;
			splitsResponse = await Promise.all(
				splits.map(async (split) => {
					return postSplit(client, split, transaction_id);
				})
			);
		}
		await client.query("COMMIT");
		res.status(201).json({
			transaction: transactionResponse.rows[0],
			splits: splitsResponse,
		});
	} catch (error) {
		await client.query("ROLLBACK");
		console.error(
			"Error executing transaction, transaction rolled back",
			error
		);
		res.status(500).json({
			message: "Error executing transaction, transaction rolled back",
			error,
		});
	} finally {
		client.release();
	}
};

const updateSplit = async (client, split, transaction_id) => {
	const { userId, amount, category, splitId } = split;
	const response = await client.query(
		`UPDATE splits
            SET 
               split_amount = $1,
               category = $2
            WHERE user_id = $3 AND id = $4
            RETURNING *`,
		[amount, category, userId, splitId]
	);
	return response.rows[0];
};

const deleteSplit = async (client, splitId) => {
	const response = await client.query(
		`DELETE FROM splits WHERE id = $1 RETURNING *`,
		[splitId]
	);
	return response.rows[0];
};

const updateTransaction = async (req: Request, res: Response) => {
	const { transaction_id } = req.params;
	const {
		title,
		description,
		date,
		totalAmount,
		currency,
		dateModified,
		category,
		createdBy,
		paidBy,
		isSplit,
		photoURL,
		splits,
		deletedSplits,
	} = req.body;
	const client = await dbPool.connect();
	try {
		await client.query("BEGIN");
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
               is_split = $8,
               photo_url = $9,
               paid_by = $10
            WHERE user_id = $11 AND id = $12 RETURNING *`,
			[
				title,
				description,
				date,
				totalAmount,
				currency,
				dateModified,
				category,
				isSplit,
				photoURL,
				paidBy,
				createdBy,
				transaction_id,
			]
		);

		let updatedSplits: any[] = [];
		if (splits && splits.length > 0) {
			updatedSplits = await Promise.all(
				splits.map(async (split) => {
					if (!split.splitId) {
						return postSplit(client, split, transaction_id);
					} else {
						return updateSplit(client, split, transaction_id);
					}
				})
			);
		}

		//Delete splits
		let deletedSplitsResponse: any[] = [];
		if (deletedSplits && deletedSplits.length > 0) {
			deletedSplitsResponse = await Promise.all(
				deletedSplits.map(async (splitId) => {
					return deleteSplit(client, splitId);
				})
			);
		}

		await client.query("COMMIT");
		res.status(201).json({
			transaction: transaction.rows[0],
			splits: updatedSplits,
			deletedSplits: deletedSplitsResponse,
		});
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("Error updating transaction", error);
		res.status(500).send(error);
	} finally {
		client.release();
	}
};

const deleteTransaction = async (req: Request, res: Response) => {
	const client = await dbPool.connect();

	// Extracting user_id and transaction_id from request parameters
	const { user_id, transaction_id } = req.params;
	const { isSplit } = req.query;
	try {
		console.log("Deleting transaction", transaction_id, isSplit, user_id);
		await client.query("BEGIN");
		let splitsResponse: any[] = [];
		if (isSplit) {
			splitsResponse = (
				await client.query(
					"DELETE FROM splits WHERE transaction_id = $1 RETURNING *",
					[transaction_id]
				)
			).rows;
		}

		const response = await client.query(
			"DELETE FROM transactions WHERE user_id = $1 AND id = $2 RETURNING *",
			[user_id, transaction_id]
		);

		await client.query("COMMIT");
		console.log(
			"Transaction deleted successfully",
			response.rows[0],
			splitsResponse
		);
		res.status(200).json({
			transaction: response.rows[0],
			splits: splitsResponse,
		});
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("Error deleting transaction and/or splits", error);
		res.status(500).send(error);
	} finally {
		client.release();
	}
};

export { postTransaction, updateTransaction, deleteTransaction };

// fetchTransactionsPrisma(
// 	{
// 		params: { user_id: "P4VnViXh52b1d9IGnlrBdCkl5b42" },
// 		query: { latestDateModified: "2025-09-09" },
// 	} as Request,
// 	{} as Response
// );
