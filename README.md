# Features

- create chat rooms
- single page webapp
- node.js HTTP server

# Install

1. [Install](http://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) **Node.js**.

2. Install **npm** with the shell command `curl https://npmjs.org/install.sh | sh` - via [npm README](https://npmjs.org/doc/README.html#Fancy-Install-Unix)

3. [Install](http://wiki.apache.org/couchdb/Installation) **CouchDB**.

4. Download the chat and navigate on the command line to it's directory.

5. Run `npm install` to download all required node\_modules defined in package.json
   
6. Change the HTTP server's port to 80 by searching in server.js for `var port =` (should be at line 273) and changing `9004` to `80`.

7. Run server.js with node by typing `node server.js`, or if you want to run it as deamon use `nohup node server.js &`. That's it!

# Settings

Note: Line numbers may be different.

**HTTP and Socket.io port:** search for `var port =`, line 273

**CouchDB host:** search for `new MessagesDB(`, first parameter, default `http://localhost`, line 272

**CouchDB port:** search for `new MessagesDB(`'s second parameter, default `5984`, line 272

**CouchDB database for messages:** search for `new MessagesDB(`'s third parameter, default `chat-v2-messages`, line 272
