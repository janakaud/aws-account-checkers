After deployment, configure `AWS_CREDS` env var with content of the desired AWS credentials INI file:

```
CRED_FILE_DATA=$(cat /path/to/credfile)
for f in BilledResourcesChecker CFStacksChecker s3BucketsChecker; do
	aws lambda update-function-configuration --function-name $f --environment '{"Variables":{"AWS_CREDS":"'"$CRED_FILE_DATA"'"}}'
done
```

For `BilledResourcesChecker` if you need to skip some services (e.g. EC2/RDS) for some profiles, specify them via THE `SKIP_SVCS` JSON env var:

```
{"profile":["service","list","to","skip"],...}
// based on service names in `checks` array on `billed-resources-checker`; "DB-Clusters" etc

{"prod":["Cache-Clusters","DB-Instances","EC2"],"test":["EC2"]}
```

```
aws lambda update-function-configuration --function-name BilledResourcesChecker --environment \
'{"Variables":{"AWS_CREDS":"'"$CRED_FILE_DATA"'","SKIP_SVCS":"{\"prod\":[\"EC2\"]}"}}'
```


Invoke:

```
function invoke ()
{
	aws lambda invoke --function-name $1 --payload "${2:-{}}" --log-type Tail /tmp/lambda.out --query LogResult --output text ${@:3:$#} | base64 -d;
}
invoke CFStacksChecker
cat /tmp/lambda.out | json_pp -t dumper -json_opt allow_nonref
```