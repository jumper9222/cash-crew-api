import { handleError } from "../utility/errorHandlers";
import { prisma } from "../config/prisma";
import { Group } from "./groupTypes";

const updateGroup = async (groupData: Group) => {
	try {
		const group = await prisma.groups.update({
			where: { id: groupData.id },
			data: { ...groupData },
		});
		return group;
	} catch (error) {
		console.error("Error adding new group to the database", error.message);
		throw error;
	}
};

const handlePut = async (req, res) => {
	const group: Group = req.body;
	try {
		console.log(`Handling PUT request for updating group ${group.id}`);
		const groupResponse = await updateGroup(group);

		return res.status(201).json(groupResponse);
	} catch (e) {
		const error = {
			serverMessage: "Error updating group in the DB.",
			message: e.message,
			payload: req.body,
			res,
			status: 500,
			e,
		};
		return handleError(error);
	}
};

export { handlePut as updateGroup };
