import { prisma } from "../config/prisma";

const fetchTransactionTemplates = async (userId: string) => {
	try {
		const templates = await prisma.transaction_templates.findMany({
			where: {
				user_id: userId,
			},
		});

		return templates;
	} catch (error) {
		console.error("Error fetching transaction templates", error);
		throw error;
	}
};

const handleGet = async (req, res) => {
	const { user_id } = req.params;

	try {
		console.log(
			`Handling GET request for transaction templates for user_id: ${user_id}`
		);
		const templates = await fetchTransactionTemplates(user_id);

		if (templates.length === 0) {
			console.log(`No transaction templates found for user_id: ${user_id}`);
			const response = {
				error: {
					message: "No transaction templates found for the user.",
				},
			};

			return res.status(404).json(response);
		}

		console.log(`Fetched transaction templates:`, templates);
		return res.status(200).json(templates);
	} catch (error) {
		console.error(
			"Error handling GET request for transaction templates",
			error
		);
		return res
			.status(500)
			.json({ error: { message: "Internal server error" } });
	}
};

export { handleGet as fetchTransactionTemplates };
