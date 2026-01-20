import { Request, Response } from "express";
import { prisma } from "@/config/prisma";

const fetchTransactions = async (user_id: string, date_modified: string) => {
	const transactions = await prisma.transactions.findMany({
		where: {
			OR: [
				{ user_id },
				{ paid_by: user_id },
				{ splits: { some: { user_id } } },
			],
			date_modified: { gt: date_modified },
		},
		include: { splits: true },
		orderBy: { date: "desc" },
	});
	return transactions;
};

const handleGet = async (req: Request, res: Response) => {
	const { user_id } = req.params;
	const { latestDateModified } = req.query;

	try {
		const transactions = await fetchTransactions(
			user_id,
			latestDateModified as string
		);
		console.log("Fetched transactions using Prisma:", transactions);
		res.status(200).json(transactions);
	} catch (error) {
		console.error("Error fetching transactions", error);
		res.status(500).json({
			error: {
				message: "Error fetching transactions",
				details: error,
			},
		});
	}
};

export { handleGet as fetchTransactions };
