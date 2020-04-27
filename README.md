# cf-stacks-checker

After deployment, configure AWS_CREDS env var with content of the desired AWS credentials INI file:

```
aws lambda update-function-configuration --function-name CFStacksChecker --environment '{"Variables":{"AWS_CREDS":"'"$CRED_FILE_DATA"'"}}'
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