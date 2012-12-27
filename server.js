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
			
			fs.stat(fsPath, function (err, stats) {
				
				if (err) throw err;
				if (stats.isDirectory()) fsPath += "/index.html";
				
				fs.readFile(fsPath, function (err, data) {

					if (err) throw err;

					response.writeHead(200, {"Content-Type": mime.lookup(fsPath) });
					response.end(data);

				});
				
			});
			
		}
			
		else {
		
			response.writeHead(200, {"Content-Type": "text/plain"});
			response.end("404, file doesn't exist.");
			
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

couchDB.host = 'http://localhost'; // Hostname of your CouchDB Server
couchDB.port = 5984; // httpd Port of your CouchDB Server

messages.DBName = 'chat-v2-messages'; // Name of the database where the messages should be saved

messages.setup = function () {

	couchDB.connection = new(cradle.Connection)(couchDB.host, couchDB.port, {
	    cache: true,
	    raw: false
	});
	
	messages.db = couchDB.connection.database(messages.DBName);
	
	//messages.db.destroy();
	
	messages.db.exists(function (err, exists) {
	    
	    if (err) {
	      	console.log('error', err);
	    }
	    
	    else if (exists) {
	      	console.log('Messages database exists.');
	    }
	    
	    else {
	      	console.log('Messages database does NOT exist ...');
	      	messages.db.create();
	      	console.log('Created database.');
	    }
	    
	});

}

messages.read = function (roomID, callback) {
	
	messages.db.get(roomID, function (err, doc) {
		
		if (typeof doc === "undefined") doc = { messages: {} };
		
		console.log("Read messages of chat room '" + roomID + "'.");
	    callback(doc.messages);
	    
	});
	
}

messages.save = function (message, roomID) {

	var startTime = new Date().getTime();
	
	messages.db.get(roomID, function (err, doc) {
		
		if (typeof doc === "undefined") doc = { messages: {} };
		doc.messages[Object.keys(doc.messages).length] = message;
	      
		messages.db.save(roomID, { messages: doc.messages }, function (err, res) {
		
			var delay = new Date().getTime() - startTime;
			console.log("Saved message '" + message.message + "' into '" + roomID + "' with a delay of " + delay + "ms.");
	      	
	   	});
	      
	});
	
}


// Start

messages.setup();
var port = 9004;
server.listen(port);
console.log("Chat has started on port " + port + ".");
