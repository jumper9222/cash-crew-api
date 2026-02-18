import { handleError } from "../utility/errorHandlers";
import { prisma } from "../config/prisma";
import { Group, GroupData, Member } from "./groupTypes";
import { Request, Response } from "express";
import { addGroupMembers } from "./addGroupMembers";

const addGroup = async (groupData: Group) => {
	try {
		const group = await prisma.groups.create({
			data: groupData,
		});
		return group;
	} catch (error) {
		console.error("Error adding new group to the database", error.message);
		throw error;
	}
};

const handlePost = async (req: Request, res: Response) => {
	const { group_members, ...group }: GroupData = req.body;
	try {
		console.log(
			`Handling POST request for adding new group from user ${group.created_by}`,
		);
		const groupResponse = await addGroup(group);

		const membersResponse = await addGroupMembers(
			group_members,
			groupResponse.id,
		);

		return res
			.status(201)
			.json({ group: groupResponse, members: membersResponse });
	} catch (e) {
		const error = {
			serverMessage: "Error adding new group into the DB.",
			message: e.message,
			payload: req.body,
			res,
			status: 500,
			e,
		};
		return handleError(error);
	}
};

export { handlePost as createGroup };
