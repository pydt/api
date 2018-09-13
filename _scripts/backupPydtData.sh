#!/bin/bash

DATE=`date +%Y%m%d%H%M`

/usr/local/bin/aws dynamodb create-backup --table-name prod-civx-game --backup-name prod-civx-game-$DATE > /dev/null
/usr/local/bin/aws dynamodb create-backup --table-name prod-civx-game-turn --backup-name prod-civx-game-turn-$DATE > /dev/null
/usr/local/bin/aws dynamodb create-backup --table-name prod-civx-scheduled-job --backup-name prod-civx-scheduled-job-$DATE > /dev/null
/usr/local/bin/aws dynamodb create-backup --table-name prod-civx-user --backup-name prod-civx-user-$DATE > /dev/null

/usr/local/bin/aws s3 ls s3://prod-civx-saves --recursive | while read -r line;
  do
    createDate=`echo $line|awk {'print $1" "$2'}`
    createDate=`date -d"$createDate" +%s`
    newerThan=`date -d "-1 days" +%s`
    if [[ $createDate -gt $newerThan ]]
      then 
        filename=`echo $line|awk {'print $4'}`
        if [[ $filename != "" ]]
          then
            /usr/local/bin/aws s3 cp s3://prod-civx-saves/$filename s3://pydt-backup/$DATE/$filename --storage-class STANDARD_IA --quiet
        fi
    fi
  done;
