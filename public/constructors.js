
function Time() {
	
	this.set = function () {
	
		//console.log("Setting times.");
		
		$('#message-lists ol.room li time').each(function(index) { // for each, do
		
			var element = $(this);
	    
	    	if (element.attr('data-time')) { // if this element has 'data-time' attribute
	    
		    	var time = moment('"' + element.attr('data-time') + '"', "YYYY-MM-DDTHH:mm:ssZ"); // cretates moment() with the content of the data-time attribute
		    	time = time.from(moment().utc()); // coverts it to realtive timestamps
		    	
		    	element.html(' ' + time); // add's the relative timestamp to the element
	      
		    }
		    
	    });
		
	}
	
	// Actions
	
	this.set();
	setInterval(this.set, 10*1000);

}


function User() {

	var Data = function () {
		
		var User = function () {
			this.name = encodeHTML($("#set-name").val());
			this.userID = userID;
		}
		
		this.user = new User();
		this.rooms = {};
		
		var Data = this;
		$('#rooms .room').each(function(index) {
			Data.rooms[$(this).attr("data-roomID")] = true;
		});
		
		// console.log("Created new user.Data.");
		
	}

	// Methods
	
	this.send = function () {
		socket.emit('userSet', new Data());
	}

	// Actions
	
	this.send();
	setInterval(this.send, 5*1000);

}


function Cookie() {

	function Data() {
	
		this.name = encodeHTML($("#set-name").val());
		this.userID = userID;
		this.rooms = {};
		
		var Cookie = this;
		$('#rooms .room').each(function () {
			var element = $(this);
			var room = '';
			if (element.hasClass('active')) room = 'active';
			Cookie.rooms[element.attr("data-roomID")] = room;
		});
		
		console.log("Created new Cookie.");
	
	}
	
	// Methods

	this.set = function () {
	
		document.cookie = 'chat-v2=' + encodeURIComponent(JSON.stringify(new Data())) + '; expires=' + new Date(moment() + 1000*60*60*24*360).toGMTString() + ';';
		
	}
	
	this.get = function () {
	
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
				rooms[roomID] = new Room(roomID);
				if (data.rooms[roomID] == "active") rooms[roomID].activate();
				socket.emit('socketJoinRoom', roomID);
			}
		}
		
		user.send();
		$('#getting-started').remove();
	
	}
	
	// Actions
	
	$('#set-name').focusout(this.set);

}


function Room (roomID) {

	var remove = function () {
		
		var wasActive = $('#rooms-roomID-'+roomID).hasClass('active');
				
		$('#rooms-roomID-'+roomID).remove();
		$('#user-lists-roomID-'+roomID).remove();
		$('#message-lists-roomID-'+roomID).remove();
		
		if (wasActive) {
			$('#rooms .room').first().addClass("active");
			$('#user-lists .room').first().addClass("active");
			$('#message-lists .room').first().addClass("active");
		}
		
		cookie.set();
		
		socket.emit('socketLeaveRoom', roomID);
		
	}
	
	// Methods
	
	this.activate = function () {
	
		console.log("Making " + roomID + " active.");
	
		$('#rooms .room').removeClass("active");
		$('#rooms-roomID-'+roomID).addClass("active");
		
		$('#user-lists .room').removeClass("active");
		$('#user-lists-roomID-'+roomID).addClass("active");
		
		$('#message-lists .room').removeClass("active");
		$('#message-lists-roomID-'+roomID).addClass("active");
		
		cookie.set();
		
		$("*").scrollTop(9999999999);
		
	}
	
	this.showUsers = function () {
		
		console.log('this.showUsers() of "' + roomID + '" called.');
		$('#user-lists .room').removeClass("active");
		$('#user-lists-roomID-'+roomID).addClass("active");
		
	}
	
	// Actions
	
	$('#rooms').append('<li id="rooms-roomID-' + roomID + '" class="room" data-roomID="' + roomID + '"><span>' + roomID + '</span><div class="remove">remove</div></li>');
	$('#user-lists').append('<ul id="user-lists-roomID-' + roomID + '" class="room"></ul>');
	$('#message-lists').append('<ol id="message-lists-roomID-' + roomID + '" class="room"></ol>');
	
	$('#rooms-roomID-'+roomID+' .remove').click(remove); // remove chat
	$('#rooms-roomID-'+roomID).click(this.activate); // on element click set active
	$('#rooms-roomID-'+roomID).mouseover(this.showUsers); // mouse over
	
	cookie.set();
	
}
