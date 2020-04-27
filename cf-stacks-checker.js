const creds = process.env.AWS_CREDS;
if (!creds) {
    throw new Error("AWS_CREDS file content missing via env");
}
const credfile = "/tmp/aws-credentials";
require("fs").writeFileSync(credfile, creds);

const PROFILES = creds.match(/\[.+]/g).map(p => p.substring(1, p.length - 1));
const REGIONS = (process.env.REGIONS ||
	"us-east-1 us-east-2 us-west-1 us-west-2 ca-central-1 eu-west-1 eu-west-2 eu-west-3 eu-central-1 eu-north-1 ap-northeast-1 ap-northeast-2 ap-southeast-1 ap-southeast-2 ap-south-1 sa-east-1")
	.split(" ");

const AWS = require("aws-sdk");


const toDate = date => date.toISOString().substring(0, 10);

const check = async (cf) => {
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
		return [s.StackName, toDate(s.CreationTime), s.LastUpdatedTime ? toDate(s.LastUpdatedTime) : "", s.StackStatus];
	})
	.sort((r1, r2) => r1[1] - r2[1]);

	max += 2;
	return data.map(r => [r[0] + " ".repeat(max - r[0].length), ...r.splice(1)].join(" ")).join("\n");
};


exports.handler = async (event) => {
	let tasks = [];
	let res = PROFILES.reduce((R, p) => {R[p] = []; return R}, {});

	// in parallel
	for (const region of REGIONS) {
		const cf = new AWS.CloudFormation({region});

		tasks.push((async () => {

			// in sequence (within one region)
			for (const profile of PROFILES) {
				cf.config.credentials = new AWS.SharedIniFileCredentials({profile, filename: credfile});
				let data = await check(cf);

				// skip if empty
				data.length > 0 && res[profile].push(`\
${region}

${data}`);
			}
		})());
	}

	let out = [];
	await Promise.all(tasks).then(() => {
		// roughly order regions from most to least data
		for (const profile of PROFILES) {
			out.push(`\
---
${profile}
---

${res[profile].sort((r1, r2) => r2.length - r1.length).join("\n\n")}`);
		}
	});
	return out.join("\n\n");
};