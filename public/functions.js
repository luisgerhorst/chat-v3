
function setEventHandlers() {

	// room

	(function () {

		var addRoom = function () {

			var roomID = encodeHTML($("#add-room").val());

			if (containsNoSpecialChars(roomID) && roomDoesNotAlreadyExist(roomID)) { // if string does not contain spaces/special characters

				var room = new Room(roomID);
					room.activate();
				rooms[roomID] = room;
				cookie.set();
				socket.emit('socketJoinRoom', roomID);
				user.send();
				$("#add-room").blur().val("");
				$('#getting-started').remove();

			}

			// functions:

			function containsNoSpecialChars(text) {
				var specialChars = "!@#$%^&*()+=[]\\\';,./{}|\":<>?~ ";
				for (var i = 0; i < text.length; i++) {
					if (specialChars.indexOf(text.charAt(i)) != -1) {
						$("#add-room").blur();
						console.log("Invalid room name (contains special characters).");
						alert('Room name contains special characters or spaces, please use another name.');
						return false;
					}
				}
				return true;
			}

			function roomDoesNotAlreadyExist(roomID) {
				var exists = false;
				$('#rooms .room').each(function () {
					if ($(this).attr("data-roomID") == roomID) {
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

		var mouseOut = function () {

			var roomID;

			// get active's roomID
			$('#rooms .room').each(function(index) {
				var element = $(this);
				if (element.hasClass('active')) roomID = element.attr("data-roomID");
			});

			rooms[roomID].showUsers();

		}

		// Actions

		$("#add-room").keyup(function (event) {
			if (event && event.keyCode == 13 && encodeHTML($("#add-room").val())) addRoom();
		}); // add chat

		$('#rooms').mouseout(mouseOut); // mouse leaves room-list

	})();

	// message
	
	(function () {

		// Methods

		var Data = function (message) {

			var Data = this;
			$('#rooms .room').each(function(index) {
				var element = $(this);
				if (element.hasClass('active')) {
					Data.roomID = element.attr("data-roomID");
				}
			});

			this.message = {};
			this.message.name = encodeHTML($("#set-name").val());
			this.message.userID = userID;
			this.message.time = ISODate();
			this.message.message = linkURLs(encodeHTML($("#new-message").val()));

			console.log("Created new MessageData.");

			// functions:

			function ISODate() {
				var d = new Date();
				function pad(n){return n < 10 ? '0' + n : n}
				return d.getUTCFullYear() + "-" + pad(d.getUTCMonth()+1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "Z";
			}

		}

		var send = function (event) {
			user.send();
			socket.emit('message', new Data());
			$('#set-name').attr('readonly', true);
			$("#new-message").val('');
		}

		// Actions

		$("#new-message").keyup(function (event) {
			if (event && event.keyCode == 13 && encodeHTML($("#set-name").val()) && $('#rooms .room').hasClass('active')) send();
		}); // new message

	})();

}

function encodeHTML(text) {
	return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function linkURLs(text) {
	var url = '', www = '', mail = '';
	url = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim; // URLs starting with http://, https://, or ftp://
	www = /(^|[^\/])(www\.[\S]+(\b|$))/gim; // URLs starting with "www." (without // before it, or it'd re-link the ones done above).
	mail = /(\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,6})/gim;  // Change email addresses to mailto:: links.
	return String(text).replace(url, '<a href="$1" target="_blank">$1</a>').replace(www, '$1<a href="http://$2" target="_blank">$2</a>').replace(mail, '<a href="mailto:$1">$1</a>');
}