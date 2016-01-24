'use strict';
var Client = require('beam-client-node');
var LiveLoading = require('./Live.js');
var history = require('./History.js')

var EventEmitter = require('events');
var util = require('util');

function Channel(channelName,nodecg,live) {
	this.live = live;
	this.nodecg = nodecg;
	this.log('Spinning up '+channelName);
	this.name = channelName;
	EventEmitter.call(this);
	this.client = new Client();

	this.client.request('get', '/channels/' + this.name).bind(this)
		.then(this.onChannelData.bind(this));
}

Channel.prototype.connect = function() {
	this.live.addChannel(this);
};

Channel.prototype.onChannelData = function(response) {
	var data = response.body;
	this.channelData = data;
	this.id = data.id;
	this.userID = data.user.id;
	this.connect();
};

Channel.prototype.log = function(msg) {
	this.nodecg.sendMessage('log',msg);
	this.nodecg.log.info(msg);
}

Channel.prototype.reconnect = function() {
	this.log('Reconnecting ' + this.name);
	this.connect();
}

util.inherits(Channel, EventEmitter);

module.exports = Channel;
