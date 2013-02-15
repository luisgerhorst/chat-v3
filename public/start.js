$(document).ready(function () {
	
	socket = io.connect(window.location.hostname);
	userID = Math.round(Math.random() * Math.pow(2,32)); // Random number between 0 and 2^32

	rooms = {};
	
	time = new Time();
	user = new User();
	
	cookie = new Cookie();
	cookie.get();
	
	setEventHandlers();
	
	console.log("System Info:\nUser ID " + userID + "\nSocket host " + window.location.hostname);

});