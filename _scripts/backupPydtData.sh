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

aws s3 ls s3://prod-civx-saves --recursive | while read -r line;
  do
    createDate=`echo $line|awk {'print $1" "$2'}`
    createDate=`date -d"$createDate" +%s`
    newerThan=`date -d "-1 days" +%s`
    if [[ $createDate -gt $newerThan ]]
      then 
        filename=`echo $line|awk {'print $4'}`
        if [[ $filename != "" ]]
          then
            aws s3 cp s3://prod-civx-saves/$filename s3://pydt-backup/$DATE/$filename --storage-class STANDARD_IA --only-show-errors
        fi
    fi
  done;
