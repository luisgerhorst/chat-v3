# Chat v2

## Install

1. Install **Node.js**, you find a great guidance for Mac, Windows, Ubuntu and a few more systems on http://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager

2. Install **npm** with the command "curl http://npmjs.org/install.sh | sh".

3. Install **CouchDB**, there are guidances for as good as every system on http://wiki.apache.org/couchdb/Installation

4. Download the chat and navigate on the command line to it's directory.

5. Run "npm install" to download all required node_modules defined in package.json

6. Run server.js with node by typing "node server.js", or if you want to run it as deamon use "nohup node server.js &". That's it!

## Settings

Note: Line numbers may be different.

**HTTTP and Socket.io port:** search for "var port =", line 273

**CouchDB host:** search for "couchDB.host = ", line 200

**CouchDB port:** search for "couchDB.port = ", line 201

**CouchDB database for messages:** search for "messages.DBName = ", line 203
