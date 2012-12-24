var server = require('http').createServer(onRequest);
var io = require('socket.io').listen(server, { log: false });
var url = require("url");
var fs = require('fs');
var mime = require('mime');


// HTTP Request

function onRequest(request, response) {
	
	var path = url.parse(request.url).pathname;
	
	console.log(path);

	route(path, response);

}


// HTTP Router

function route(path, response) {

	console.log(path);

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
	
		//console.log("Received user update of " + data.user.name + ".");
		
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



var rooms = {};

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

var messages = {};

messages.file = __dirname + '/messages.json';

messages.check = function () {

	fs.readFile(messages.file, function (err, data) {
	
		if (err) throw err;
		
		if (data == '') {
		
			fs.writeFile(messages.file, "{}", function (err) {
				if (err) throw err;
				console.log(messages.file + " was invalid, content was set to default.");
			});
		
		}
	
		else console.log(messages.file + "'s data is valid");
		
	});

}

messages.read = function (roomID, callback) {
	
	console.log("Reading messages of chat room " + roomID + " ...");
	
	fs.readFile(messages.file, function (err, db) {
	
		if (err) throw err;
		
		db = JSON.parse(db);
		
		var messages = false;
		if (db[roomID] != null) messages = db[roomID].messages;
		
		callback(messages);
		
	});
	
}

messages.save = function (message, roomID) {
	
	fs.readFile(messages.file, function (err, db) {
	
		if (err) throw err;
		
		db = JSON.parse(db);
		if (db[roomID] == null) {
			db[roomID] = {};
			db[roomID].messages = {};
		}
			  	
		db[roomID].messages[Object.keys(db[roomID].messages).length] = message;
			  	
		fs.writeFile(messages.file, JSON.stringify(db), function (err) {
			if (err) throw err;
			console.log("Saved message.");
		});
		
	});
	
}


// Start

messages.check();
var port = process.env.PORT || 9004; // process.env.PORT for Heoku, 9004 for luisgerhorst.de
server.listen(port);
console.log("Chat has started.");
