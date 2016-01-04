'use strict';
var Client = require('beam-client-node');
var LiveLoading = require('./Live.js');
var history = require('./History.js')

var EventEmitter = require('events');
var util = require('util');

function Channel(channelName,nodecg) {
	this.nodecg = nodecg;
	console.log('Spinning up '+channelName);
	this.name = channelName;
	EventEmitter.call(this);
	this.client = new Client();

	return this.client.request('get', '/channels/' + this.name).bind(this)
		.then(this.onChannelData.bind(this));

}

Channel.prototype.connect = function() {
	console.log('connecting to live');
	this.live = new LiveLoading(this.name,this.id,this.userID);
	this.live.on('follow',this.onFollow.bind(this));
	this.live.on('sub',this.onSub.bind(this));
	this.live.on('update',this.onUpdate.bind(this));
};

Channel.prototype.onChannelData = function(response) {
	console.log('got channel data');
	var data = response.body;
	this.channelData = data;
	this.id = data.id;
	this.userID = data.user.id;
	this.connect();
};

Channel.prototype.onFollow = function(channel,username) {
	if(!history.eventExists(username,channel,'follow')) {

		var content = {
			name: username,
			channel: channel,
			ts: Date.now()
		};
		this.nodecg.sendMessage('follow', content);
		this.emit('follow', content);
		history.add(username, channel, 'follow');
	}
};

Channel.prototype.onSub = function(channel,username,ts) {
	console.log('got sub in channel');
	if(!history.eventExists(username,channel,'sub',ts)) {
		var content = {
			name: username,
			channel: channel,
			ts: ts
		};

		this.nodecg.sendMessage('subscription', content);
		this.emit('subscription', content);
		history.add(username, channel, 'sub', ts);
	}
};

Channel.prototype.onUpdate = function(channel,data) {
	this.emit('update',channel,data);
	this.nodecg.sendMessage('update', channel,data);
}
util.inherits(Channel, EventEmitter);

module.exports = Channel;
