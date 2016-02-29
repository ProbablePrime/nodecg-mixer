'use strict';

var EventEmitter = require('events');
var util = require('util');
var Store = require('./Store');

function Channel(channelName, nodecg, live) {
	this.live = live;
	this.nodecg = nodecg;
	this.log('Spinning up ' + channelName);
	this.name = channelName;
	EventEmitter.call(this);
	this.store = new Store(channelName);
	live.addChannel(this);
	live.on('reconnected', this.checkFollows.bind(this));
}
util.inherits(Channel, EventEmitter);

Channel.prototype.checkFollows = function () {
	var self = this;
	self.live.scrapeFollowers(this).then(function (follows) {
		follows.forEach(function (follow) {
			self.handleFollow(follow.username);
		});
	});
};

Channel.prototype.log = function (msg) {
	this.nodecg.sendMessage('log', msg);
	this.nodecg.log.info(msg);
};

Channel.prototype.setData = function (data) {
	this.data = data;
	this.id = data.id;
	this.userID = data.user.id;
};

Channel.prototype.onUpdate = function (slug, data) {
	var self = this;
	var slugInfo = this.extractSlugParts(slug);

	var eventType = slugInfo.eventName;
	var type = slugInfo.type;

	if (type === 'channel') {
		if (eventType === 'followed') {
			this.nodecg.log.info(slug);
			if (data.following !== true) {
				this.emit('unfollow', data.user.username);
				return;
			}
			this.handleFollow(data.user.username);
		}
		if (eventType === 'subscribed' || eventType === 'resubscribed') {
			this.nodecg.log.info(slug);
			this.handleSub(data.user.username);
		}

		if (eventType === 'update') {
			data.channel = self.name;
			// this.emit('update',data);
		}
	}
	if (type === 'user') {
		// super cool events I haven't figured out yet
	}
};

Channel.prototype.handleFollow = function (username) {
	var ts = Date.now();
	var self = this;
	self.store.hasFollow(username, ts).then(function (result) {
		if (!result) {
			self.emit('follow', username, ts);
			self.store.addFollow(username, ts);
		}
	});
};

Channel.prototype.handleSub = function (username) {
	var ts = Date.now();
	var self = this;
	self.store.hasSubscription(username, ts).then(function (result) {
		if (!result) {
			self.emit('sub', username, ts);
			self.store.addSubscription(username, ts);
		}
	});
};

Channel.prototype.dismissSubscription = function (username) {
	var self = this;
	return self.store.dismissSubscription(username);
};

Channel.prototype.dismissFollow = function (username) {
	var self = this;
	return self.store.dismissFollow(username);
};

Channel.prototype.extractSlugParts = function (slug) {
	var slugParts = slug.split(':');
	return {
		type: slugParts[0],
		id: slugParts[1],
		eventName: slugParts[2]
	};
};

Channel.prototype.findUnDismissedFollows = function () {
	return this.store.findUnDismissedFollows();
};

Channel.prototype.findUnDismissedSubscriptions = function () {
	return this.store.findUnDismissedSubscriptions();
};

module.exports = Channel;
