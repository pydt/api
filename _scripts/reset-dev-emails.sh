#!/bin/bash

for user in `aws dynamodb scan --table-name dev-civx-user --projection-expression steamId --output text | tail -n +2`; do
	user="$(echo -e "${user}" | tr -d '[:space:]')"
	if [ $user != "STEAMID" ]; then
		aws dynamodb update-item --table-name dev-civx-user --update-expression "REMOVE emailAddress" --key "{ \"steamId\": { \"S\": \"$user\" } }"
	fi
done
