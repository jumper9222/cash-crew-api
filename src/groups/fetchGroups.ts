import { prisma } from "../config/prisma";
import { handleError } from "../utility/errorHandlers";
import { Response, Request } from "express";

const calculateGroupTotals = async (user_id: string, group_ids: string[]) => {
	//Total lent is total amount paid by current user (includes current user's share)
	const totalLentQ = prisma.transactions.groupBy({
		by: ["group_id"],
		where: { paid_by: user_id, group_id: { in: group_ids } },
		_sum: { total_amount: true },
	});

	//Total borrowed includes splits where transaction is paid by current user
	const totalBorrowedQ = prisma.splits.groupBy({
		by: ["group_id"],
		where: { transaction: { group_id: { in: group_ids } }, user_id },
		_sum: { split_amount: true },
	});

	const [totalLent, totalBorrowed] = await Promise.all([
		totalLentQ,
		totalBorrowedQ,
	]);

	const totalLentMap = new Map<string, number>();
	for (const row of totalLent) {
		const group_id = row.group_id;
		const currentTotal = totalLentMap.get(group_id) ?? 0;

		console.log("Lent row", JSON.stringify(row, null, 2), currentTotal);
		totalLentMap.set(
			group_id,
			currentTotal + row._sum.total_amount.toNumber(),
		);
	}

	const totalBorrowedMap = new Map<string, number>();
	for (const row of totalBorrowed) {
		const group_id = row.group_id;
		const currentTotal = totalBorrowedMap.get(group_id) ?? 0;
		console.log("Borrow row", JSON.stringify(row, null, 2), currentTotal);

		totalBorrowedMap.set(
			group_id,
			currentTotal + row._sum.split_amount.toNumber(),
		);
	}
	return { totalLent: totalLentMap, totalBorrowed: totalBorrowedMap };
};

const fetchGroups = async (user_id: string) => {
	try {
		const groupsResponse = await prisma.groups.findMany({
			where: {
				group_members: {
					some: { user_id },
				},
			},
			include: {
				group_members: true,
			},
		});

		const group_ids = groupsResponse.map((group) => group.id);
		const { totalLent, totalBorrowed } = await calculateGroupTotals(
			user_id,
			group_ids,
		);

		const groups = groupsResponse.map((group) => {
			return {
				...group,
				net_balance:
					(totalLent.get(group.id) ?? 0) -
					(totalBorrowed.get(group.id) ?? 0),
			};
		});

		return groups;
	} catch (e) {
		console.error(`Error fetching `);
		throw e;
	}
};

const handleGet = async (req: Request, res: Response) => {
	const userId = req.user.firebaseUid;
	try {
		const groups = await fetchGroups(userId);
		return res.status(200).json(groups);
	} catch (e) {
		const error = {
			res,
			status: 500,
			serverMessage: `There was an error fetching groups`,
			payload: userId,
			e,
		};
		handleError(error);
	}
};

export { handleGet as fetchGroups };
