#!/bin/bash
coffee -c lib/*.coffee
cat lib/utility.js > client.js
cat lib/run.js >> client.js
