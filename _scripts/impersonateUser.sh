#!/bin/bash

: ${1?"Please pass the user to impersonate's steamId as the parameter"}

# https://gist.github.com/pkuczynski/8665367
parse_yaml() {
   local s='[[:space:]]*' w='[a-zA-Z0-9_]*' fs=$(echo @|tr @ '\034')
   sed -ne "s|^\($s\)\($w\)$s:$s\"\(.*\)\"$s\$|\1$fs\2$fs\3|p" \
        -e "s|^\($s\)\($w\)$s:$s\(.*\)$s\$|\1$fs\2$fs\3|p"  ../config.yml |
   awk -F$fs '{
      if (length($3) > 0) {
         printf("%s=\"%s\"\n", $2, $3);
      }
   }'
}

eval $(parse_yaml)

export JWT_SECRET=$JWT_SECRET

eval $(node -e "const auth=require('../lib/auth');console.log('TOKEN=\"' + auth.sign('$1') + '\"');")

echo $TOKEN > /dev/clipboard
read -rsp $'token copied to clipboard, press any key to continue...\n' -n1 key

PROFILE=$(curl -s --header "Authorization: $TOKEN" https://z9cjeucs49.execute-api.us-east-1.amazonaws.com/prod/user/steamProfile)
echo "${PROFILE}" > /dev/clipboard
echo 'steamProfile copied to clipboard'