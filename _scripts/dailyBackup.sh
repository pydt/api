#!/bin/bash

DATE=`date +%Y%m%d%H%M`
DYNAMODB_ARCHIVE=dynamodb_${DATE}.tar.gz
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

rm -rf dailyBackupTemp

mkdir -p dailyBackupTemp/${DATE}

python ${DIR}/dynamodump/dynamodump.py -m backup -s prod* -r us-east-1 --dumpPath dailyBackupTemp/${DATE}

tar -zcf dailyBackupTemp/${DYNAMODB_ARCHIVE} dailyBackupTemp/${DATE}

aws s3 cp dailyBackupTemp/${DYNAMODB_ARCHIVE} s3://pydt-backup/${DATE}/${DYNAMODB_ARCHIVE} --storage-class STANDARD_IA --quiet

aws s3 sync s3://prod-civx-saves s3://pydt-backup/${DATE} --storage-class STANDARD_IA --quiet

rm -rf dailyBackupTemp