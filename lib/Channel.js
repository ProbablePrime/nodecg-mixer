'use strict';

var EventEmitter = require('events');
var util = require('util');
var Store = require('./History');

function Channel(channelName,nodecg,live) {
	this.live = live;
	this.nodecg = nodecg;
	this.log('Spinning up '+channelName);
	this.name = channelName;
	EventEmitter.call(this);
	this.subStore = new Store(this.name,'sub');
	this.followStore = new Store(this.name,'follow');
}

Channel.prototype.connect = function() {
	this.live.addChannel(this);
};

Channel.prototype.log = function(msg) {
	this.nodecg.sendMessage('log',msg);
	this.nodecg.log.info(msg);
};


Channel.prototype.setData =  function(data) {
	this.data = data;
	this.id = data.id;
	this.userID = data.user.id;
};
util.inherits(Channel, EventEmitter);

module.exports = Channel;
