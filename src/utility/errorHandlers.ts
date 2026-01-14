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
	console.error(serverMessage, e, payload);
	return res.status(status).json({ serverMessage, payload });
};
