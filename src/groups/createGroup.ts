import { handleError } from "../utility/errorHandlers";
import { prisma } from "../config/prisma";
import { Group, GroupData, Member } from "./groupTypes";

type AddMemberPayload = Member & { group_id: string };

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

const addGroupMember = async (memberData: AddMemberPayload) => {
	try {
		const groupMember = await prisma.group_members.create({
			data: memberData,
		});
		return groupMember;
	} catch (error) {
		console.error("Error adding group member to the database", error.message);
	}
};

const handlePost = async (req, res) => {
	const { group_members, ...group }: GroupData = req.body;
	try {
		console.log(
			`Handling POST request for adding new group from user ${group.created_by}`
		);
		const groupResponse = await addGroup(group);

		const membersResponse = await Promise.all(
			group_members.map((member) =>
				addGroupMember({ ...member, group_id: groupResponse.id })
			)
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
