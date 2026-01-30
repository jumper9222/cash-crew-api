import { prisma } from "../config/prisma";
import { handleError } from "../utility/errorHandlers";
import { Response, Request } from "express";

const fetchGroups = async (user_id: string) => {
	try {
		const groups = await prisma.groups.findMany({
			where: {
				group_members: {
					some: { user_id },
				},
			},
			include: {
				group_members: true,
			},
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
