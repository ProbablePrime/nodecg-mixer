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
	this.io.socket.on('connected', function() {
		self.log('connected');
	});
	//Mute sailsio console.logs.
	this.io.sails.environment = 'production';
	this.io.sails.url = 'https://realtime.beam.pro';
	this.io.socket.on('message',function() {
		self.log(arguments);
	});

	var self = this;
	this.io.socket.on('error', function(error){
		console.log(error);
		console.log(self.io.socket._raw);
	});

	EventEmitter.call(this);
}
Live.prototype.log = function(msg) {
	console.log(msg);
	this.nodecg.sendMessage('log',msg);
}

Live.prototype.extractSlugParts = function(slug) {
	var slugParts  = slug.split(':');
	return {
		type: slugParts[0],
		id: slugParts[1],
		eventName: slugParts[2]
	};
};
Live.prototype.addChannel = function(channel) {
	this.log('Subscribed to '+ channel.name + ' events');
	this.registerEvent('user', 'update',channel.userID, channel);
	this.registerEvent('channel', 'subscribed', channel.id,channel);
	this.registerEvent('channel', 'update', channel.id,channel);
	this.registerEvent('channel', 'status', channel.id,channel);
	this.registerEvent('channel', 'followed', channel.id,channel);
}
Live.prototype.registerEvent  = function(type, eventName,id,channel) {
	var self = this;
	var slugObject = this.buildSlug(type, eventName,id);

	this.io.socket.on(slugObject.slug[0], this.onUpdate.bind(this, slugObject.slug[0],channel));

	this.io.socket.put('/api/v1/live', slugObject, function (data) {
		if (data && data === 'Subscribed successfully.') {
		}
	});

};

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
