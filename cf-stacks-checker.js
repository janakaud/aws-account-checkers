const {toDate, runRegional} = require("./util");
const AWS = require("aws-sdk");

const checkStacks = async (cf) => {
	let stacks;
	try {
		stacks = (await cf.describeStacks().promise()).Stacks;
	} catch (e) {
		return e.toString();
	}

	// pretty-print
	let max = 0;
	let data = stacks.map(s => {
		max = Math.max(max, s.StackName.length);
		return [
			s.StackName, toDate(s.CreationTime),
			s.LastUpdatedTime ? toDate(s.LastUpdatedTime) : "          ", s.StackStatus
		];
	})
	.sort((r1, r2) => r1[1] - r2[1]);

	max += 2;
	return data.map(r => [r[0] + " ".repeat(max - r[0].length), ...r.splice(1)].join("  ")).join("\n");
};


exports.handler = async (event) => {
	return runRegional(AWS.CloudFormation, checkStacks);
};