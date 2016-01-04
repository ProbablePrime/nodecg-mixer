'use strict';
var socketIOClient = require('socket.io-client');
var sailsIOClient = require('sails.io.js');
var EventEmitter = require('events');
var util = require('util');


function Live(name,id,userID) {
	this.name = name;
	this.id = id;
	this.userID = userID;
	this.io = sailsIOClient(socketIOClient);
	this.io.sails.transports = ['websocket'];
	this.io.sails.autoConnect = true;

	//Mute sailsio console.logs.
	this.io.sails.environment = 'production';
	this.io.sails.url = 'https://realtime.beam.pro';
	this.io.socket.on('message',function() {
		console.log(arguments);
	});

	var self = this;
	this.io.socket.on('error', function(error){
		console.log(error);
		console.log(self.io.socket._raw);
	});

	this.io.socket.on('connected', function() {
		console.log('connected');
	});

	this.subscribeToEvents();
	EventEmitter.call(this);
}

Live.prototype.subscribeToEvents  = function() {
	this.registerEvent('user', 'update',this.userID);
	this.registerEvent('channel', 'subscribed', this.id);
	this.registerEvent('channel', 'update', this.id);
	this.registerEvent('channel', 'status', this.id);
	this.registerEvent('channel', 'followed', this.id);
};

Live.prototype.extractSlugParts = function(slug) {
	var slugParts  = slug.split(':');
	return {
		type: slugParts[0],
		id: slugParts[1],
		eventName: slugParts[2]
	};
};

Live.prototype.registerEvent  = function(type, eventName,id) {
	var self = this;
	var slugObject = this.buildSlug(type, eventName,id);

	this.io.socket.on(slugObject.slug[0], this.onUpdate.bind(this, slugObject.slug[0]));

	this.io.socket.put('/api/v1/live', slugObject, function (data) {
		if (data && data === 'Subscribed successfully.') {
			console.log(self.name  + ': Subscribed to ' + type + ' ' + eventName + ' events');
		}
	});

};

Live.prototype.buildSlug = function(type,eventName,id) {
	return { slug: [type + ':' + id + ':' + eventName]};
};

Live.prototype.onUpdate = function(slug,data) {
	var slugInfo = this.extractSlugParts(slug);

	var eventType = slugInfo.eventName;
	var type = slugInfo.type;

	console.log(slug);
	console.log(data);

	if (type === 'channel') {
		if (eventType === 'followed') {
			if (data.following !== true) {
				this.emit('unfollow', this.name, data.user.username);
				return;
			}
			this.emit('follow', this.name, data.user.username);
		}
		if(eventType === 'subscribed') {
			this.emit('sub', this.name, data.user.username, Date.now());
		}

		if (eventType === 'update') {
			data.channel = this.name;
			this.emit('update',data);
		}
	}
	if (type === 'user') {
		//super cool events I haven't figured out yet
	}
};
util.inherits(Live, EventEmitter);

module.exports = Live;
