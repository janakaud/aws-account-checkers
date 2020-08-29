const {skips, toDate, runRegional} = require("./util");
const AWS = require("aws-sdk");

exports.handler = async (event) => {
	let checks = [
		[AWS.Kinesis, "Kinesis", async k => (await k.listStreams().promise()).StreamNames],
		[AWS.DynamoDB, "DynamoDB", async d => (await d.listTables().promise()).TableNames],

		[AWS.RDS, "DB-Instances", async r => (await r.describeDBInstances().promise())
			.DBInstances.map(i => `${i.DBInstanceIdentifier} ${toDate(i.InstanceCreateTime)}`)],
		[AWS.RDS, "DB-Snapshots", async r => (await r.describeDBSnapshots().promise())
			.DBSnapshots.map(s => `${s.DBSnapshotIdentifier} ${toDate(s.SnapshotCreateTime)}`)],
		[AWS.RDS, "DB-Clusters", async r => (await r.describeDBClusters().promise())
			.DBClusters.map(c => `${c.DBClusterIdentifier} ${toDate(c.ClusterCreateTime)}`)],
		[AWS.RDS, "DB-Cluster-Snapshots", async r => (await r.describeDBClusterSnapshots().promise())
			.DBClusterSnapshots.map(s => `${s.DBClusterSnapshotIdentifier} ${toDate(s.SnapshotCreateTime)}`)],

		[AWS.ElastiCache, "Cache-Clusters", async e => (await e.describeCacheClusters().promise())
			.CacheClusters.map(c => `${c.CacheClusterId} ${toDate(c.CacheClusterCreateTime)}`)],
		[AWS.ElastiCache, "Cache-Replication", async e => (await e.describeReplicationGroups().promise())
			.ReplicationGroups.map(g => `${g.ReplicationGroupId} ${g.MemberClusters} ${g.Description}`)],
		[AWS.ElastiCache, "Cache-Snapshots", async e => (await e.describeSnapshots().promise())
			.Snapshots.map(s => `${s.SnapshotName} ${toDate(s.CacheClusterCreateTime)}`)],

		[AWS.EC2, "EC2", async e => (await e.describeInstances().promise())
			.Reservations.map(r => r.Instances.map(i =>
				`${i.InstanceId} ${toDate(i.LaunchTime)} ${i.State.Name} ${i.InstanceType} ${JSON.stringify(i.Tags[0] || i.KeyName)} ${i.PublicIpAddress || "~"}`).join(" "))],
/*
		[AWS.EC2, "Images", async e => (await e.describeImages({Owners: ["self"]}).promise())
			.Images.map(i => `${i.ImageId} ${i.CreationDate} ${JSON.stringify(i.Tags[0] || [i.Name, i.Description])}`)],
*/
		[AWS.EC2, "Snapshots", async e => (await e.describeSnapshots({OwnerIds: ["self"]}).promise())
			.Snapshots.map(s => `${s.SnapshotId} ${toDate(s.StartTime)} ${JSON.stringify(s.Tags[0] || [s.Description])} ${s.VolumeSize}`)]
	];

	return (await Promise.all(checks.map(async ([svcClass, svcName, worker]) => {
		let data = await runRegional(svcClass, async (client, profile) => {
			if (skips[profile] && skips[profile].includes(svcName)) return null;
			try {
				return (await worker(client)).join("\n");
			} catch (e) {
				return e.toString();
			}
		});
		return !data ? null : `\
===
${svcName}
===

${data}`;
	}))).filter(out => !!out).join("\n\n\n");
};