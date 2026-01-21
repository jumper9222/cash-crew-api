import { prisma } from "@/config/prisma";
import { handleError } from "@/utility/errorHandlers";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

const addTransaction = (
	tx: Prisma.TransactionClient,
	data: Prisma.transactionsCreateInput
) => {
	const response = tx.transactions.create({ data });
	return response;
};

type SplitsPayload = Omit<Prisma.splitsCreateManyInput, "transaction_id">[];

const addSplits = (
	tx: Prisma.TransactionClient,
	splits: SplitsPayload,
	transaction_id: string
) => {
	const data = splits.map((split) => ({ transaction_id, ...split }));
	const response = tx.splits.createManyAndReturn({ data });
	return response;
};

type CreateTransactionPayload = Prisma.transactionsCreateInput & {
	splits: SplitsPayload;
};

const handlePost = async (req: Request, res: Response) => {
	const { splits, ...transaction } = req.body as CreateTransactionPayload;

	try {
		const transactionResponse = await prisma.$transaction(async (tx) => {
			const transactionResponse = await addTransaction(tx, transaction);
			const splitsResponse = await addSplits(
				tx,
				splits,
				transactionResponse.id
			);
			return {
				...transactionResponse,
				splits: splitsResponse,
			};
		});
		console.log("Posted transaction using Prisma:", transactionResponse);
		return res.status(201).json(transactionResponse);
	} catch (e) {
		const error = {
			res,
			e,
			serverMessage: "Error posting transaction",
			payload: { user_id: req.params.user_id, body: req.body },
			status: 500,
		};
		handleError(error);
	}
};

export { handlePost as postTransaction };
