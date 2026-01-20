import { pool as dbPool } from "../config/database";
import { Request, Response } from "express";

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
