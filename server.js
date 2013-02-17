var server = require('http').createServer(onRequest);
var url = require("url");
var fs = require('fs');

var io = require('socket.io').listen(server, { log: false });
var mime = require('mime');
var cradle = require('cradle');


// Global vars

var rooms = {}, messagesDB;


// HTTP Request

function onRequest(request, response) {
	
	var path = url.parse(request.url).pathname;

	var fsPath = __dirname + "/public/" + path;
	
	fs.exists(fsPath, function (exists) {

		if (exists) {

			fs.stat(fsPath, function (error, stats) {

				if (error) console.log('Error while fs.stat', error);
				if (stats.isDirectory()) fsPath += "/index.html";

				fs.readFile(fsPath, function (error, data) {

					if (error) {
						console.log('Error while fs.readFile', error);
						response.writeHead(200, { "Content-Type": 'text/plain' });
						response.end('No index.html found.');
					}

					else {
						response.writeHead(200, {"Content-Type": mime.lookup(fsPath) });
						response.end(data);
					}

				});

			});

		}

		else {

			response.writeHead(200, { "Content-Type": 'text/plain' });
			response.end('404 Not Found');

		}

	});

}


io.sockets.on('connection', function (socket) {
	
	socket.on('message', function (data) {
		
		console.log("Received message by " + data.message.name + ".");
		
		io.sockets.in(data.roomID).emit('message', data);
		
		messagesDB.save(data.message, data.roomID);
		
	});
	
	socket.on('user', function (data) {
	
		for (var roomID in data.rooms) {
			if (rooms[roomID] != null) rooms[roomID].user(socket, data.user);
		}
 
	});
	
	socket.on('joinRoom', function (roomID) {
	
		console.log("Socket joining " + roomID + " ...");
		
		if (rooms[roomID] == null) rooms[roomID] = new Room(roomID);
		
		rooms[roomID].join(socket);
		
	});
	
	socket.on('leaveRoom', function (roomID) {
		
		socket.leave(roomID);
		
		console.log("Socket leaved " + roomID + ".");
		
	});
	
});



// Room

function Room(roomID) {

	var lastUserRemove = new Date().getTime();
	var users = {};
	
	this.join = function (socket) {
	
		// Join room
		socket.join(roomID);
		
		// Send existing users to socket
		var data = {};
			data.roomID = roomID;
			data.users = users;
		socket.emit('users', data);
		
		// Send archieved messages to socket
		messagesDB.read(roomID, function (messages) {
		
			if (messages !== []) {
				
				console.log('Read messages from database.');
			
				var length = messages.length;
				for (var i = 0; i < length; i++) {
					if (i < length - 100) messages.splice(i, 1);
				}
					
				var data = {
					roomID: roomID,
					messages: messages
				};

				socket.emit('messages', data);
				
				console.log("Messages for " + roomID + " found and sent to client.");
				
			}
			
			else console.log("No messages for " + roomID + " found.");
			
			console.log("User joined " + roomID + ".");
			
		});
		
	}
	
	this.user = function (socket, user) {

		// Detect if user is going to be changed
		var changed = false;
		(function () {
			var oldUser = users[user.userID];
			if (oldUser == null) changed = true;
			else if (oldUser.name != user.name) changed = true;
		})();

		// Add/Update the user
		user.unixTime = new Date().getTime();
		users[user.userID] = user;

		// Remove invalid users
		if (new Date().getTime() - lastUserRemove >= 5*1000) {

			for (var userID in users) {
				if (new Date().getTime() - users[userID].unixTime >= 10*1000) {
					delete users[userID];
					changed = true;
				}
			}
		
			lastUserRemove = new Date().getTime();
			
		}
	
		// Emit update if something has been changed
		if (changed) {
		
			var data = {
				roomID: roomID,
				users: users,
			};
			io.sockets.in(roomID).emit('users', data);
			
			console.log("Sent changes in " + roomID + " to all members.");
			
		}
	
	}
	
}



// messages

function MessagesDB(host, port, name) {

	var db = new cradle.Connection(host, port, {
	    cache: true,
	    raw: false
	}).database(name);
	
	var convertObjectsToArrays = function () {
		
		console.log('Will now convert messages objects to arrays ...');
		
		db.save('_design/rooms', {
			
			noArray: {
				map: function (doc) {
					if (Object.prototype.toString.call(doc.messages) !== '[object Array]') emit(doc._id, doc);
				}
			}
			
		}, function (err, res) {
			
			if (err) console.log('Error while saving view noArray', err);
			
			db.view('rooms/noArray', function (err, res) {
				
				if (err) console.log('Error while loading view noArray', err);
				
				console.log('Received view noArray: ', res);
				
				var length = res.length;
				for (var i = 0; i < length; i++) {
					
					var row = res[i].value;
					console.log('Row: ', row);
					
					var array = [];
					var object = row.messages;
					for (var k in object) array.push(object[k]);
					
					console.log('Converted row.messages to array: ', array);
					
					db.save(row._id, { messages: array }, dbSaveOnRes);
					
				}
				
				function dbSaveOnRes(err, res) {
					if (err) console.log('Error while saving row "' + row._id + '".');
				}
				
				console.log('Succesfully converted all messages objects to arrays.');
				
			});
			
		});
		
	}
	
	// Methods
	
	this.read = function (roomID, callback) {
		
		db.get(roomID, function (error, doc) {
			
			if (error) console.log('Error while getting document ' + roomID + ' from database.', error);
			
			if (typeof doc === "undefined") doc = { messages: [] };
			
			console.log("Read messages of chat room '" + roomID + "'.");
		    callback(doc.messages);
		    
		});
		
	}
	
	this.save = function (message, roomID) {
		
		var startTime = new Date().getTime();
		
		db.get(roomID, function (error, doc) {
			
			if (error) console.log('Error while getting document ' + roomID + ' from database.', error);
			
			if (typeof doc === "undefined") doc = { messages: [] };
			doc.messages.push(message);
		      
			db.save(roomID, { messages: doc.messages }, function (err, res) {
			
				var delay = new Date().getTime() - startTime;
				console.log("Saved message '" + message.message + "' into '" + roomID + "' with a delay of " + delay + "ms.");

			});
		      
		});
		
	}
	
	db.exists(function (err, exists) {
	    
	    if (err) {
			console.log('error', err);
	    }
	    
	    else if (exists) {
			console.log('Messages database exists.');
			convertObjectsToArrays(); /* Because of earlier, the messages were saved as properties of the messages object of the documents, since 16.2.2013 messages is an array. This function converts the objects to arrays. */
	    }
	    
	    else {
			console.log('Messages database does NOT exist ...');
			db.create();
			console.log('Created database.');
	    }
	    
	});

}

// Start

messagesDB = new MessagesDB('http://localhost', 5984, 'chat-v2-messages');

(function () {
	var port = 9004;
	server.listen(port);
	console.log("Chat has started on port " + port + ".");
})();
