'use strict';

var EventEmitter = require('events');
var util = require('util');

var WsabiClient = require('wsabi-client-bacon');

function Live(nodecg) {
	var self = this;

	this.nodecg = nodecg;

	this.channels = {};

	this.wsabi = new WsabiClient('https://beam.pro');
	this.wsabi.liveUrl = "/api/v1/live";


	this.wsabi.socket.on('open', function(){
		self.log("Connected to Beam Servers");
	});
	this.wsabi.socket.on('reopen', function(){
		self.nodecg.log.warn("Beam connection re-opened");
	});
	this.wsabi.socket.on("close", function(){
		self.log('closed');
	});
	this.wsabi.on('error', function(err) {
		self.log(err);
	})

	// this.checkInterval = setInterval(self.checkStatus.bind(self), 1000 );
	// self.checkStatus();

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

	this.log('Subscribing to '+channel.name + ' events');
	this.registerEvent('user', 'update',channel.userID, channel);
	this.registerEvent('channel', 'subscribed', channel.id,channel);
	this.registerEvent('channel', 'update', channel.id,channel);
	this.registerEvent('channel', 'status', channel.id,channel);
	this.registerEvent('channel', 'followed', channel.id,channel);
	this.log('Subscribed to '+ channel.name + ' events');
}
Live.prototype.registerEvent  = function(type, eventName,id,channel) {
	var self = this;
	var slugString = this.buildSlug(type, eventName,id);
	this.wsabi.live(slugString).then(function(res) {
		res.onValue(self.onUpdate.bind(self, slugString,channel));
	}, function(err){
		this.nodecg.log.error(err);
	});
};

Live.prototype.checkStatus = function() {
	var self = this;
	this.log('Checking status');
	this.wsabi.get('/api/v1/live').then(function(data){
		console.log(data);
	}, function(err) {
		console.log(err);
	});
}

Live.prototype.buildSlug = function(type,eventName,id) {
	return type +':'+id+':'+eventName;
};

Live.prototype.onUpdate = function(slug,channel,data) {
	var slugInfo = this.extractSlugParts(slug);

	var eventType = slugInfo.eventName;
	var type = slugInfo.type;
	this.nodecg.log.info(slug);
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

}
util.inherits(Live, EventEmitter);

module.exports = Live;
