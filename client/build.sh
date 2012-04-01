#!/bin/bash
coffee -c lib/*.coffee
cat lib/jquery-1.7.1.min.js > client.js
cat lib/jquery-ui-1.8.16.custom.min.js >> client.js
cat lib/underscore-min.js >> client.js
cat lib/dataDash.js >> client.js
cat lib/utility.js >> client.js
cp client.js test/testclient.js
cat lib/run.js >> client.js
