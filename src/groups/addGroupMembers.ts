import { handleError } from "@/utility/errorHandlers";
import { prisma } from "../config/prisma";
import { Member } from "./groupTypes";
import { Request, Response } from "express";

export type AddMemberPayload = Member & { group_id: string };

export const addGroupMembers = async (members: Member[], group_id: string) => {
	const data = members.map((member) => ({
		group_id,
		...member,
	}));

	try {
		const groupMembersResponse =
			await prisma.group_members.createManyAndReturn({
				data,
			});
		return groupMembersResponse;
	} catch (error) {
		console.error("Error adding group member to the database", error.message);
	}
};

const handlePost = async (req: Request, res: Response) => {
	const group_id = req.params.group_id;
	const user_id = req.user.firebaseUid;
	const group_members = req.body;
	try {
		const group = await prisma.groups.findFirst({
			where: { id: group_id, group_members: { some: { id: user_id } } },
		});

		if (!group) {
			throw new Error("Unauthorized");
		}

		const groupMembersResponse = await addGroupMembers(
			group_members,
			group_id,
		);

		return res.status(200).json(groupMembersResponse);
	} catch (e) {
		const error = {
			res,
			e,
			payload: { group_id, user_id },
			status: 400,
			serverMessage: "There was an error adding group members",
		};
		handleError(error);
	}
};

export { handlePost as addGroupMembersEndpoint };
