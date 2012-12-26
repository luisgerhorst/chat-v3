var server = require('http').createServer(onRequest);
var url = require("url");
var fs = require('fs');

var io = require('socket.io').listen(server, { log: false });
var mime = require('mime');
var nano = require('nano')('http://localhost:5984');


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

messages.db = false;

messages.doing = false;

messages.check = function () {

	// clean up the database we created previously
	nano.db.destroy('chat-v2-messages', function() {
	  
	  	// create a new database
	  	nano.db.create('chat-v2-messages', function() {
	    
	    	// specify the database we are going to use
	    	messages.db = nano.use('chat-v2-messages');
	    
	    	messages.save("1. message is hello", "test");
	    	//messages.save("2. message", "test");
	    
	  	});
	  	
	});

}

messages.read = function (roomID, callback) {

	messages.doing = true;
	
	console.log("Reading messages of chat room " + roomID + " ...");
	
	messages.db.get(roomID, { revs_info: false }, function(err, body) {
	  	
	  	if (!err) console.log(body);
	  	else console.log(err);
	  	
	  	if (typeof callback !== "undefined") callback();
	  	
	  	messages.doing = false;
	  	
	});
	
}

messages.save = function (message, roomID) {

	messages.doing = true;

	messages.db.get(roomID, { revs_info: false }, function(err, body) {
	
		console.log(body);
	
		if (typeof body === "undefined") messagesRoomCount = 0;
		else messagesRoomCount = body.count;
		
		console.log(messagesRoomCount);
		
		messages.db.insert({ count: messagesRoomCount+1 }, roomID, function(err, body, header) {
			
			if (err) console.log(err);
			else console.log("insert body: " + JSON.stringify(body));
			
			var messageID = roomID + messagesRoomCount;
			messages.db.insert({ message: message }, messageID, function(err, body, header) {
				
				if (err) console.log(err);
				else {
					
					console.log("insert body: " + JSON.stringify(body));
					messages.read(messageID);
					
				}
				
				messages.doing = false;
				
			});
			
		});
		
	});
	
	/*messages.db.get(roomID, { revs_info: false }, function(err, body) {
	  	
	  	if (err) {
	  		
	  		messages.db.insert({ messagesNumber: 0 }, roomID, function(err, body, header) {
	  		    if (err) console.log(err);
	  		});
	  		
	  	}
	  	
	  	else {
	  		
	  		console.log(body);
	  		
	  		var messagesNumber = body.messagesNumber;
	  		
	  		messages.db.insert({ messagesNumber: message }, roomID, function(err, body, header) {
	  		
	  			if (err) {
	  		        console.log('[messages.db.insert] ', err.message);
	  		        return;
	  		    }
	  		    
	  		    messagesNumber++;
	  		    
	  		    messages.db.insert({ numberOfMessages: messagesNumber }, roomID, function(err, body, header) {
	  		    
	  		    	if (err) {
	  		            console.log('[messages.db.insert] ', err.message);
	  		            return;
	  		        }
	  		        
	  		        console.log('you have inserted it');
	  		        console.log(body);
	  		        
	  		        messages.read(roomID, function (messages) {
	  		        	console.log("read messages: " + messages);
	  		        });
	  		        
	  		    });
	  		    
	  		});
	  		
	  	}
	  	
	});*/
	
}


// Start

messages.check();
var port = 9004;
server.listen(port);
console.log("Chat has started on port " + port + ".");
