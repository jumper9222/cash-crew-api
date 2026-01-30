import { handleError } from "@/utility/errorHandlers";
import { Request, Response } from "express";
import { prisma } from "../config/prisma";

const deleteFirebasePhoto = async () => {};
//move deleteFirebase storage photo function to backend

export const deleteTransaction = async (req: Request, res: Response) => {
	const user_id = req.user.firebaseUid;
	const { transaction_id } = req.params;

	try {
		const response = await prisma.transactions.delete({
			where: {
				id: transaction_id,
				OR: [
					{ user_id },
					{ paid_by: user_id },
					{ splits: { some: { user_id } } },
				],
			},
		});
		console.log("Transaction deleted: ", JSON.stringify(response));
		return res.status(202).json(response);
	} catch (e) {
		const error = {
			res,
			e,
			serverMessage: "There was an error deleting the transaction",
			status: 500,
			payload: { transaction_id, user_id },
		};
		return handleError(error);
	}
};
