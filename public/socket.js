$(document).ready(function () {

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

	time.set();

	$("*").scrollTop(9999999999);

});


socket.on('messages', function (data) {

	console.log("Received messages of room " + data.roomID + ".");

	var roomID = data.roomID;
	var messages = data.messages;

	var html='';

	for (var number in messages) {
		var message = messages[number];
		html += createMessageEntry(message.userID, message.message, message.name, message.time);
	}

	$("#message-lists-roomID-"+roomID).html(html);

	time.set();

	$("*").scrollTop(9999999999);

});

// Socket functions:

function createMessageEntry (userID, message, name, time) {
	return '<li data-userID="' + userID + '"><h4><span class="name">' + name + '</span><time data-time="' + time + '"></time></h4><p class="message">' + linkURLs(message) + '</p></li>';
}

});