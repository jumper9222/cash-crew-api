import { prisma } from "../config/prisma";
import { Request, Response } from "express";

const fetchTransactions = async (user_id: string, date_modified?: string) => {
	// Build a stable "where" filter and ensure the date is a Date object
	const whereFilter: any = {
		OR: [
			{ user_id },
			{ paid_by: user_id },
			{ splits: { some: { user_id } } },
		],
	};

	if (date_modified) {
		const parsed = new Date(date_modified);
		if (!isNaN(parsed.getTime())) {
			// Use a Date object so the parameter type is stable across calls
			whereFilter.date_modified = { gt: parsed };
		} else {
			// If the provided date is invalid, skip the filter to avoid passing inconsistent types
			console.warn(
				"fetchTransactions: invalid date_modified provided",
				date_modified,
			);
		}
	}
	console.log("Fetching transactions with filter:", whereFilter);
	const transactions = await prisma.transactions.findMany({
		where: whereFilter,
		include: { splits: true },
		orderBy: { date: "desc" },
	});
	return transactions;
};

const handleGet = async (req: Request, res: Response) => {
	const user_id = req.user.firebaseUid;
	const { latestDateModified } = req.query;

	try {
		const transactions = await fetchTransactions(
			user_id,
			latestDateModified as string,
		);
		console.log("Fetched transactions using Prisma:", transactions.length);
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
