import { pool as dbPool } from "../config/database";
import { Request, Response } from "express";

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
					[transaction_id],
				)
			).rows;
		}

		const response = await client.query(
			"DELETE FROM transactions WHERE user_id = $1 AND id = $2 RETURNING *",
			[user_id, transaction_id],
		);

		await client.query("COMMIT");
		console.log(
			"Transaction deleted successfully",
			response.rows[0],
			splitsResponse,
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
