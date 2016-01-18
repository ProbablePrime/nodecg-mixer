'use strict';

var EventEmitter = require('events');
var util = require('util');

function Live(nodecg) {
	var self = this;

	var socketIOClient = require('socket.io-client');
	var sailsIOClient = require('sails.io.js');
	this.nodecg = nodecg;
	this.io = sailsIOClient(socketIOClient);
	this.io.sails.transports = ['websocket'];
	this.io.sails.autoConnect = true;

	this.channels = {};

	//Mute sailsio console.logs. we pickup all of the events below
	this.io.sails.environment = 'production';

	this.io.sails.url = 'https://realtime.beam.pro';

	var events = ['reconnect','connect','disconnect','close','open','error','message','connected','data','pong','handshake'];

	events.forEach(function(eventName) {
		self.io.socket.on(eventName, function(data) {
			if(eventName === 'connect') {
				self.emit('connect');
				self.log('Connected to Beam Realtime Events');
				return;
			}
			//Yanking network cables test this :D
			if(eventName === 'disconnect') {
				self.nodecg.sendMessage('alert', {message:'disconnected'});
				self.log('DISCONNECTED');
				self.nodecg.log.error('DISCONNECTED');
				//TODO: reconnect?
			}
			if(eventName === 'reconnect') {
				self.nodecg.sendMessage('alert', {message:'reconnected'});
				self.nodecg.log.error('RECONNECTED!!');
				//sockets connection state sometimes screws up and doesnt get set back to connected.
				//This prevents our events from being re-subbed
				//https://github.com/socketio/socket.io-client/issues/831
				self.io.socket._raw.connected = true;
				Object.keys(self.channels).forEach(function(channelName) {
					self.addChannel(self.channels[channelName]);
				});
			}

			if(!data) {
				self.nodecg.log.info(eventName);
			} else {
				self.log(eventName);
				self.log(data);
			}
		});
	});

	var self = this;

	this.checkInterval = setInterval(self.checkStatus.bind(self), 1000 * 60 * 5);
	self.checkStatus();

	EventEmitter.call(this);
}
Live.prototype.log = function(msg) {
	this.nodecg.log.info(msg);
	this.nodecg.sendMessage('log',msg);
};

Live.prototype.extractSlugParts = function(slug) {
	var slugParts  = slug.split(':');
	return {
		type: slugParts[0],
		id: slugParts[1],
		eventName: slugParts[2]
	};
};

Live.prototype.addChannel = function(channel) {
	if(!this.channels[channel.name]) {
		this.channels[channel.name] = channel;
	}

	this.log('Subscribing to '+channel.name + 'events');
	this.registerEvent('user', 'update',channel.userID, channel);
	this.registerEvent('channel', 'subscribed', channel.id,channel);
	this.registerEvent('channel', 'update', channel.id,channel);
	this.registerEvent('channel', 'status', channel.id,channel);
	this.registerEvent('channel', 'followed', channel.id,channel);
	this.log('Subscribed to '+ channel.name + ' events');
}
Live.prototype.registerEvent  = function(type, eventName,id,channel) {
	console.log('registering ' + eventName + ' for ' + channel.name);
	var self = this;
	var slugObject = this.buildSlug(type, eventName,id);

	this.io.socket.on(slugObject.slug[0], this.onUpdate.bind(this, slugObject.slug[0],channel));

	this.io.socket.put('/api/v1/live', slugObject, function (data) {
		console.log(arguments);
		console.log(data);
		if (data && data === 'Subscribed successfully.') {
			self.nodecg.log.info('Subscribed to '+eventName+ ' for '+ channel.name);
		} else {
			console.log(data);
		}
	});
};

Live.prototype.checkStatus = function() {
	var self = this;
	//This causes a 500 internal error on beam side atm
	//return;
	this.log('Checking status');
	this.io.socket.get('/api/v1/live',function (data) {
		console.log('status response:');
		console.log(data);
	});
}

Live.prototype.buildSlug = function(type,eventName,id) {
	return { slug: [type + ':' + id + ':' + eventName]};
};

Live.prototype.onUpdate = function(slug,channel,data) {
	var slugInfo = this.extractSlugParts(slug);

	var eventType = slugInfo.eventName;
	var type = slugInfo.type;

	if (type === 'channel') {
		if (eventType === 'followed') {
			if (data.following !== true) {
				this.emit('unfollow', channel.name, data.user.username);
				return;
			}
			this.emit('follow', channel.name, data.user.username);
		}
		if(eventType === 'subscribed') {
			this.emit('sub', channel.name, data.user.username, Date.now());
		}

		if (eventType === 'update') {
			data.channel = channel.name;
			//this.emit('update',data);
		}
	}
	if (type === 'user') {
		//super cool events I haven't figured out yet
	}
};
Live.prototype.dispose = function() {
	this.io.socket.disconnect();
}
util.inherits(Live, EventEmitter);

module.exports = Live;
