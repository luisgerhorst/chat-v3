var server = require('http').createServer(onRequest);
var url = require("url");
var fs = require('fs');

var io = require('socket.io').listen(server, { log: false });
var mime = require('mime');
var cradle = require('cradle');


// Global vars

var rooms = {};
var messages = {};
var couchDB = {};


// HTTP Request

function onRequest(request, response) {
	
	var path = url.parse(request.url).pathname;

	route(path, response);

}


// HTTP Router

function route(path, response) {

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
		
		messages.save(data.message, data.roomID);
		
	});
	
	socket.on('userSet', function (data) {
	
		for (var roomID in data.rooms) {
			if (rooms[roomID] != null) rooms[roomID].userSet(socket, data.user);
		}
 
	});
	
	socket.on('socketJoinRoom', function (roomID) {
	
		console.log("Socket joining " + roomID + " ...");
		
		if (rooms[roomID] == null) rooms[roomID] = new Room(roomID);
		
		rooms[roomID].socketJoin(socket);
		
	});
	
	socket.on('socketLeaveRoom', function (roomID) {
		
		socket.leave(roomID);
		
		console.log("Socket leaved " + roomID + ".");
		
	});
	
});



// Room

function Room(roomID) {

	var lastRemove = new Date().getTime();
	var users = {};
	
	this.socketJoin = function (socket) {
	
		// Join room
		socket.join(roomID);
		
		// Send users to socket
		var data = {};
			data.roomID = roomID;
			data.users = users;
		socket.emit('users', data);
		
		// Send archieved messages to socket
		messages.read(roomID, function (messages) {
		
			if (messages != false) {
			
				var items = Object.keys(messages).length;
				for (var number in messages) {
					if (parseInt(number) < items - 100) delete messages[number];
				}
					
				var data = {};
					data.roomID = roomID;
					data.messages = messages;
				socket.emit('messages', data);
				
				console.log("Messages for " + roomID + " found and sent to client.");
				
			}
			
			else console.log("No messages for " + roomID + " found.");
			
			console.log("User joined " + roomID + ".");
			
		});
		
	}
	
	this.userSet = function (socket, user) {

		// Detect if user is going to be changed
		var changed = false;
		if (users[user.userID] == null) changed = true;
		else if (users[user.userID].name != user.name) changed = true;

		// Add/Update the user
		user.unixTime = new Date().getTime();
		users[user.userID] = user;

		// Remove invalid users
		if (new Date().getTime() - lastRemove >= 5*1000) {

			for (var userID in users) {
				if (new Date().getTime() - users[userID].unixTime >= 10*1000) {
					delete users[userID];
					changed = true;
				}
			}
		
			lastRemove = new Date().getTime();
			
		}
	
		// Emit update if something has been changed
		if (changed) {
		
			var data = {};
				data.roomID = roomID;
				data.users = users;
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
	
	// Methods
	
	this.read = function (roomID, callback) {
		
		db.get(roomID, function (err, doc) {
			
			if (typeof doc === "undefined") doc = { messages: {} };
			
			console.log("Read messages of chat room '" + roomID + "'.");
		    callback(doc.messages);
		    
		});
		
	}
	
	this.save = function (message, roomID) {
	
		var startTime = new Date().getTime();
		
		db.get(roomID, function (err, doc) {
			
			if (typeof doc === "undefined") doc = { messages: {} };
			doc.messages[Object.keys(doc.messages).length] = message;
		      
			db.save(roomID, { messages: doc.messages }, function (err, res) {
			
				var delay = new Date().getTime() - startTime;
				console.log("Saved message '" + message.message + "' into '" + roomID + "' with a delay of " + delay + "ms.");
		      	
		   	});
		      
		});
		
	}
	
	// Actions
	
	db.exists(function (err, exists) {
	    
	    if (err) {
	      	console.log('error', err);
	    }
	    
	    else if (exists) {
	      	console.log('Messages database exists.');
	    }
	    
	    else {
	      	console.log('Messages database does NOT exist ...');
	      	db.create();
	      	console.log('Created database.');
	    }
	    
	});

}

// Start

var messages = new MessagesDB('http://localhost', 5984, 'chat-v2-messages');
var port = 9004;
server.listen(port);
console.log("Chat has started on port " + port + ".");
