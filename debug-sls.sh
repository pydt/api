#!/bin/bash

basedir=`which node`

case `uname` in
    *CYGWIN*) basedir=`cygpath -w "$basedir"`;;
esac

basedir="$(dirname "$basedir")"

if [ -x "$basedir/node" ]; then
  "$basedir/node" --debug "$basedir/node_modules/serverless/bin/serverless" "$@"
  ret=$?
else
  node --debug  "$basedir/node_modules/serverless/bin/serverless" "$@"
  ret=$?
fi
exit $ret