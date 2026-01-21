import { prisma } from "@/config/prisma";
import { handleError } from "@/utility/errorHandlers";
import { Prisma, splits, transactions } from "@prisma/client";
import { Request, Response } from "express";

const updateTransaction = async (
	tx: Prisma.TransactionClient,
	transaction: transactions
) => {
	const response = await tx.transactions.update({
		where: { id: transaction.id },
		data: transaction,
	});
	return response;
};

const upsertSplits = async (
	tx: Prisma.TransactionClient,
	splits: splits[],
	transaction_id: string
) => {
	const response = await Promise.all(
		splits.map((split) =>
			tx.splits.upsert({
				where: {
					transaction_id_user_id: {
						transaction_id,
						user_id: split.user_id,
					},
				},
				update: split,
				create: { ...split, transaction_id },
			})
		)
	);
	return response;
};

const deleteSplits = async (
	tx: Prisma.TransactionClient,
	splitIds: string[]
) => {
	const response = await tx.splits.deleteMany({
		where: { id: { in: splitIds } },
	});
	return response;
};

const handlePut = async (req: Request, res: Response) => {
	const { splits, deleted_splits, ...transaction } = req.body;
	const date_modified = new Date();
	transaction.date_modified = date_modified;

	try {
		const response = await prisma.$transaction(async (tx) => {
			const updatedTransaction = await updateTransaction(tx, transaction);
			const updatedSplits = splits
				? await upsertSplits(tx, splits, transaction.id)
				: [];
			deleted_splits && (await deleteSplits(tx, deleted_splits));
			return { ...updatedTransaction, splits: updatedSplits };
		});

		return res.status(200).json(response);
	} catch (e) {
		const error = {
			res,
			e,
			serverMessage: "Error updating transaction",
			payload: { transaction_id: req.params.transaction_id, body: req.body },
			status: 500,
		};
		handleError(error);
	}
};

export { handlePut as updateTransaction };
