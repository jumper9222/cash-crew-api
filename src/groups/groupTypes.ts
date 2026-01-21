export type Member = { user_id: string; role: string };

export type Group = {
	id?: string;
	name: string;
	// description: string;
	created_by: string;
	group_type: string;
};

export type GroupData = Group & { group_members: Member[] };
