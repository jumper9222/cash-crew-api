export const handleError = ({
	res,
	e,
	serverMessage,
	payload,
	status = 500,
}) => {
	const error = {
		serverMessage,
		message: e.message,
		payload,
	};
	console.error(serverMessage, e, JSON.stringify(payload, null, 2));
	return res.status(status).json({ serverMessage, payload });
};
