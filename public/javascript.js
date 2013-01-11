$(document).ready(function () {


var userID = Math.round(Math.random() * Math.pow(2,32)); // Random number between 0 and 2^32
var socket = io.connect(window.location.hostname);

var rooms = {};


// Start App:

getCookie();

// Reapeating:

setInterval(function() {
	socket.emit('userSet', new UserData());
}, 5*1000);

setInterval(setTime, 10*1000);


// Interface Events:


// add chat
$("#add-room").keyup(function (event) {
	if (event && event.keyCode == 13 && encodeHTML($("#add-room").val())) addRoom();
});
	
// new message
$("#new-message").keyup(function newMessageKeyUp(event) {
	if (event && event.keyCode == 13 && encodeHTML($("#set-name").val()) && $('#rooms .room').hasClass('active')) newMessage();
});

// mouse leaves rooms
$('#rooms').mouseout(roomsMouseOut);

// name focus out
$('#set-name').focusout(setCookie);



// Interface Event functions:

function addRoom() {
	
	var roomID = encodeHTML($("#add-room").val());
	
	if (containsNoSpecialChars(roomID) && roomDoesNotAlreadyExist(roomID)) { // if string does not contain spaces/special characters
		
		rooms[roomID] = new Room (roomID);
		rooms[roomID].makeActive();
		socket.emit('socketJoinRoom', roomID);
		socket.emit('userSet', new UserData());
		$("#add-room").blur().val("");
		$('#getting-started').remove();
		
	}
	
	// functions:
	
	function containsNoSpecialChars(text) {
	
		var specialChars = "!@#$%^&*()+=[]\\\';,./{}|\":<>?~ ";
		
		for (var i = 0; i < text.length; i++) {
  			if (specialChars.indexOf(text.charAt(i)) != -1) {
	  			$("#add-room").blur();
	  			console.log("Invalid room name (contains scecial characters).");
	  			alert('Room name contains special characters or spaces, please use another name.');
	  			return false;
	  		}
	  	}
	  	
	  	return true;
	  	
	}
	
	function roomDoesNotAlreadyExist(text) {
	
		var exists = false;
		$('#rooms .room').each( function() {
			if ($(this).attr("data-roomID") == text) {
				$("#add-room").blur();
				console.log("Invalid room name (room already exists).");
				alert('Room has already been added.');
				exists = true;
			}
		});
		
		if (exists) return false;
		else return true;
	  	
	}
	
}

function newMessage(event) {
	socket.emit('userSet', new UserData());
	socket.emit('message', new MessageData());
	$('#set-name').attr('readonly', true);
	$("#new-message").val("");
}

function roomsMouseOut() {
	
	var roomID;
	
	// get active's roomID
	$('#rooms .room').each(function(index) {
		if ($(this).hasClass('active')) roomID = $(this).attr("data-roomID");
	});
	
	rooms[roomID].showUsers();
	
}


// System Event functions:

function setTime() {

	//console.log("Setting times.");
	
	$('#message-lists ol.room li time').each(function(index) { // for each, do
    
    	if ($(this).attr('data-time')) { // if this element has 'data-time' attribute
    
	    	var time = moment('"' + $(this).attr('data-time') + '"', "YYYY-MM-DDTHH:mm:ssZ"); // cretates moment() with the content of the data-time attribute
	    		time = time.from(moment().utc()); // coverts it to realtive timestamps
	    	
	    	$(this).html(' ' + time); // add's the relative timestamp to the element
      
	    }
	    
    });
	
}


// Cookie functions:

function setCookie () {
	document.cookie = 'chat-v2=' + encodeURIComponent(JSON.stringify(new Cookie())) + '; expires=' + new Date(moment() + 1000*60*60*24*360).toGMTString() + ';';
}

function getCookie() {

	console.log("Getting cookie.");

    var key =  'chat-v2';
 	var value = '';
 	
	if (document.cookie) {
       	var array = document.cookie.split((escape(key) + '=')); 
       	if(2 <= array.length) {
           	var array2 = array[1].split(';');
       		value  = unescape(array2[0]);
       	}
	}
	
	if (value == false) return;
	
	console.log("Cookie is true.");
	
	var data = JSON.parse(decodeURIComponent(value));
	
	console.log(JSON.stringify(data));
	
	$('#set-name').val(data.name);
	userID = data.userID;
	
	for (var roomID in data.rooms) {
		if (data.rooms[roomID] != null) {
			rooms[roomID] = new Room (roomID);
			if (data.rooms[roomID] == "active") rooms[roomID].makeActive();
			socket.emit('socketJoinRoom', roomID);
		}
	}
	
	socket.emit('userSet', new UserData());
	$('#getting-started').remove();
	
}


	
// Room:
	
function Room (roomID) {
	
	// actions
	$('#rooms').append('<li id="rooms-roomID-' + roomID + '" class="room" data-roomID="' + roomID + '"><span>' + roomID + '</span><div class="remove">remove</div></li>');
	$('#user-lists').append('<ul id="user-lists-roomID-' + roomID + '" class="room"></ul>');
	$('#message-lists').append('<ol id="message-lists-roomID-' + roomID + '" class="room"></ol>');
	setCookie();
	
	
	// Interface Events:
	
	// remove chat
	$('#rooms-roomID-'+roomID+' .remove').click(remove);
	
	// on element click set active
	$('#rooms-roomID-'+roomID).click(makeActive);
	
	// mouse over
	$('#rooms-roomID-'+roomID).mouseover(showUsers);
	
	
	// Interface Event functions:
	
	function makeActive() {
	
		console.log("Making " + roomID + " active.");
	
		$('#rooms .room').removeClass("active");
		$('#rooms-roomID-'+roomID).addClass("active");
		
		$('#user-lists .room').removeClass("active");
		$('#user-lists-roomID-'+roomID).addClass("active");
		
		$('#message-lists .room').removeClass("active");
		$('#message-lists-roomID-'+roomID).addClass("active");
		
		setCookie();
		
		$("*").scrollTop(9999999999);
		
	}
	
	function showUsers() {
		
		$('#user-lists .room').removeClass("active");
		$('#user-lists-roomID-'+roomID).addClass("active");
		
	}
	
	function remove() {
		
		var wasActive = $('#rooms-roomID-'+roomID).hasClass('active');
				
		$('#rooms-roomID-'+roomID).remove();
		$('#user-lists-roomID-'+roomID).remove();
		$('#message-lists-roomID-'+roomID).remove();
		
		if (wasActive) {
			$('#rooms .room').first().addClass("active");
			$('#user-lists .room').first().addClass("active");
			$('#message-lists .room').first().addClass("active");
		}
		
		setCookie();
		
		socket.emit('socketLeaveRoom', roomID);
		
	}
	
	
	// export:
	
	this.makeActive = function () { makeActive(); }
	this.showUsers = function () { showUsers(); }
	
}



// Data constructors:

function Cookie () {
	
	this.name = encodeHTML($("#set-name").val());
	this.userID = userID;
	this.rooms = {};
	
	var Cookie = this;
	
	$('#rooms .room').each(function(index) {
		Cookie.rooms[$(this).attr("data-roomID")] = "";
		if ($(this).hasClass('active')) Cookie.rooms[$(this).attr("data-roomID")] = "active";
	});
	
	console.log("Created new Cookie.");
	
}


function UserData () {
	
	this.user = {};
	this.user.name = encodeHTML($("#set-name").val());
	this.user.userID = userID;
	this.rooms = {};
	
	var UserData = this;
	
	$('#rooms .room').each(function(index) {
		UserData.rooms[$(this).attr("data-roomID")] = true;
	});
	
	//console.log("Created new UserData.");
	
}


function MessageData (message) {

	var MessageData = this;
	$('#rooms .room').each(function(index) {
		if ($(this).hasClass('active')) MessageData.roomID = $(this).attr("data-roomID");
	});

	this.message = {};
	this.message.name = encodeHTML($("#set-name").val());
	this.message.userID = userID;
	this.message.time = ISODate();
	this.message.message = encodeHTML($("#new-message").val());
	
	console.log("Created new MessageData.");
	
	// functions:
	
	function ISODate() {
    	var d = new Date();
    	function pad(n){return n < 10 ? '0' + n : n}
    	return d.getUTCFullYear() + "-" + pad(d.getUTCMonth()+1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "Z";
    }
	
}



// Socket events:

socket.on('users', function (data) {

	console.log("Received users ...");

	var roomID = data.roomID;
	var users = data.users;
    
    var html='';
    var	watching = 0;
	
	for (var thisUserID in users) {
		if (thisUserID != userID) {
			if (users[thisUserID].name != false) html += '<li data-userID="' + thisUserID + '">' + users[thisUserID].name + '</li>';
			else watching++;
		}
	}
	
	if (watching == 1) html += '<li>' + watching + ' person watching</li>';
	if (watching >= 2) html += '<li>' + watching + ' people watching</li>';
	if (html == '') html = '<li>no people online</li>';
	
	if (html != $('#users').html()) {
	
    	$('#user-lists-roomID-'+roomID).html(html);
    	console.log("Updated users of room " + roomID + ".");
		
	}
	
	else console.log("Users of " + roomID + " haven't changed.");
    
});


socket.on('message', function (data) {

	console.log("Received message of room " + data.roomID + ".");

	var roomID = data.roomID;
	var message = data.message;
    
	var entry = createMessageEntry(message.userID, message.message, message.name, message.time);
	
	$("#message-lists-roomID-"+roomID).append(entry);
	
	setTime();
	
	$("*").scrollTop(9999999999);
    
});


socket.on('messages', function (data) {

	console.log("Received messages of room " + data.roomID + ".");

	var roomID = data.roomID;
	var messages = data.messages;
	
	var html='';
	
	for (var number in messages) {
		html += createMessageEntry(messages[number].userID, messages[number].message, messages[number].name, messages[number].time);
	}
	
	$("#message-lists-roomID-"+roomID).html(html);
	
	setTime();
	
	$("*").scrollTop(9999999999);
    
});

// Socket functions:

function createMessageEntry (userID, message, name, time) {
	return '<li data-userID="' + userID + '"><h4><span class="name">' + name + '</span><time data-time="' + time + '"></time></h4><p class="message">' + linkURLs(message) + '</p></li>';
}


// string functions:
    
function linkURLs(text) {
	var url = '', www = '', mail = '';
	url = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim; // URLs starting with http://, https://, or ftp://
	www = /(^|[^\/])(www\.[\S]+(\b|$))/gim; // URLs starting with "www." (without // before it, or it'd re-link the ones done above).
	mail = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;  // Change email addresses to mailto:: links.
	return String(text).replace(url, '<a href="$1" target="_blank">$1</a>').replace(www, '$1<a href="http://$2" target="_blank">$2</a>').replace(mail, '<a href="mailto:$1">$1</a>');
}

function encodeHTML(text) {
	return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

	
});