import { Request, Response } from "express";
import { prisma } from "../config/prisma";

const calculateTotalBorrowed = async (
	group_id: string,
	startDate: string,
	endDate?: string,
) => {
	const totalBorrowed = await prisma.splits.groupBy({
		by: ["user_id"],
		where: {
			transaction: {
				group_id,
				date: { gte: startDate, ...(endDate && { lte: endDate }) },
			},
		},
		_sum: {
			split_amount: true,
		},
	});

	const filteredTotals = totalBorrowed.reduce((totals, total) => {
		totals[total.user_id] = total._sum.split_amount;
		return totals;
	}, {});

	return filteredTotals;
};

const calculateTotalPaid = async (
	// group_id: string,
	startDate: string,
	endDate?: string,
) => {
	const totalPaid = await prisma.transactions.groupBy({
		by: ["paid_by", "group_id"],
		where: {
			group_id: { not: null },
			date: { gte: startDate, ...(endDate && { lte: endDate }) },
		},
		_sum: {
			total_amount: true,
		},
	});

	// const filteredTotals = totalPaid.reduce((totals, total) => {
	// 	totals[total.paid_by] = total._sum.total_amount;
	// 	return totals;
	// }, {});

	return totalPaid;
};

const handleGet = async (req: Request, res: Response) => {
	const user_id = req.user.firebaseUid;
};

const groupBalances = async () => {
	const a = await calculateTotalBorrowed(
		"919c30e3-4dae-40e0-ad66-fa4bb495f2e4",
		"2023-01-01",
		"2026-01-20",
	);
	const b = await calculateTotalPaid(
		// "919c30e3-4dae-40e0-ad66-fa4bb495f2e4",
		"2023-01-01",
		// "2026-01-20",
	);
	console.log(a, b);
};

groupBalances();
