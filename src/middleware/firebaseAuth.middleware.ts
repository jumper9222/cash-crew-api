import admin from "../firebase";

export const firebaseAuthMiddleware = async (req, res, next) => {
	const authHeader = req.headers.authorization;
	const idToken = authHeader.split(" ")[1];

	console.log("Running firebase auth middleware");

	if (!authHeader?.startsWith("Bearer ") || !idToken) {
		return res.status(401).json({ message: "Missing token" });
	}

	try {
		const decoded = await admin.auth().verifyIdToken(idToken);

		req.user = {
			firebaseUid: decoded.uid,
		};

		next();
	} catch (err) {
		return res.status(401).json({ message: "Invalid token" });
	}
};
