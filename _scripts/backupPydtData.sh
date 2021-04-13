#!/bin/bash

DATE=`date +%Y%m%d%H%M`
TRUNCATE_DATE=`date -d "6 months ago" +%s`

aws dynamodb create-backup --table-name prod-civx-game --backup-name prod-civx-game-$DATE > /dev/null
aws dynamodb create-backup --table-name prod-civx-game-turn --backup-name prod-civx-game-turn-$DATE > /dev/null
aws dynamodb create-backup --table-name prod-civx-scheduled-job --backup-name prod-civx-scheduled-job-$DATE > /dev/null
aws dynamodb create-backup --table-name prod-civx-user --backup-name prod-civx-user-$DATE > /dev/null
aws dynamodb create-backup --table-name prod-civx-private-user-data --backup-name prod-civx-private-user-data-$DATE > /dev/null
aws dynamodb create-backup --table-name prod-civx-websocket-connection --backup-name prod-civx-websocket-connection-$DATE > /dev/null

aws dynamodb list-backups --table-name prod-civx-game | jq '.BackupSummaries[] | select(.BackupCreationDateTime < '$TRUNCATE_DATE').BackupArn' | xargs -L1 -I'{}' aws dynamodb delete-backup --backup-arn '{}' > /dev/null
aws dynamodb list-backups --table-name prod-civx-game-turn | jq '.BackupSummaries[] | select(.BackupCreationDateTime < '$TRUNCATE_DATE').BackupArn' | xargs -L1 -I'{}' aws dynamodb delete-backup --backup-arn '{}' > /dev/null
aws dynamodb list-backups --table-name prod-civx-scheduled-job | jq '.BackupSummaries[] | select(.BackupCreationDateTime < '$TRUNCATE_DATE').BackupArn' | xargs -L1 -I'{}' aws dynamodb delete-backup --backup-arn '{}' > /dev/null
aws dynamodb list-backups --table-name prod-civx-user | jq '.BackupSummaries[] | select(.BackupCreationDateTime < '$TRUNCATE_DATE').BackupArn' | xargs -L1 -I'{}' aws dynamodb delete-backup --backup-arn '{}' > /dev/null
aws dynamodb list-backups --table-name prod-civx-private-user-data | jq '.BackupSummaries[] | select(.BackupCreationDateTime < '$TRUNCATE_DATE').BackupArn' | xargs -L1 -I'{}' aws dynamodb delete-backup --backup-arn '{}' > /dev/null
aws dynamodb list-backups --table-name prod-civx-websocket-connection | jq '.BackupSummaries[] | select(.BackupCreationDateTime < '$TRUNCATE_DATE').BackupArn' | xargs -L1 -I'{}' aws dynamodb delete-backup --backup-arn '{}' > /dev/null

newerThan=`date -d "-1 days" -I`

aws s3api list-objects-v2 --bucket prod-civx-saves --query 'Contents[?LastModified>=`'"$newerThan"'`].Key' | jq -r '.[]' | while read -r filename;
  do
    aws s3 cp s3://prod-civx-saves/$filename s3://pydt-backup/$DATE/$filename --storage-class STANDARD_IA --only-show-errors
  done;
