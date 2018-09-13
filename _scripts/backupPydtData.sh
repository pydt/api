#!/bin/bash

DATE=`date +%Y%m%d%H%M`
#DYNAMODB_ARCHIVE=dynamodb_${DATE}.tar.gz
#WORKING_DIR=${HOME}/.pydtBackupTemp
#SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#rm -rf ${WORKING_DIR}

#mkdir -p ${WORKING_DIR}/${DATE}

#python ${SCRIPT_DIR}/dynamodump/dynamodump.py -m backup -s prod* -r us-east-1 --dumpPath ${WORKING_DIR}/${DATE}

#tar -zcf ${WORKING_DIR}/${DYNAMODB_ARCHIVE} ${WORKING_DIR}/${DATE}

#/usr/local/bin/aws s3 cp ${WORKING_DIR}/${DYNAMODB_ARCHIVE} s3://pydt-backup/${DATE}/${DYNAMODB_ARCHIVE} --storage-class STANDARD_IA --quiet

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

#rm -rf ${WORKING_DIR}
