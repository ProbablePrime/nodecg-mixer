'use strict';

var EventEmitter = require('events');
var util = require('util');

var WsabiClient = require('wsabi-client-bacon');
var Promise = require('bluebird');

function Live(nodecg) {
	var self = this;

	self.nodecg = nodecg;

	self.channels = {};
	self.openTime = 0;

	self.wsabi = new WsabiClient('https://beam.pro');
	self.wsabi.liveUrl = "/api/v1/live";


	self.wsabi.socket.on('open', function() {
		self.openTime = Date.now();
		self.log("Connected to Beam Servers");
	});
	self.wsabi.socket.on('reopen', function(){
		self.openTime = Date.now();
		self.nodecg.log.warn("Beam connection re-opened");
		Object.keys(self.channels).forEach(function(channelKey){
			self.pollFollowers(self.channels[channelKey]);
		});
	});
	self.wsabi.socket.on("close", function(){
		self.lastClose = Date.now();
		self.log('closed');
	});
	self.wsabi.on('error', function(err) {
		self.log(err);
	});

	EventEmitter.call(self);
}
util.inherits(Live, EventEmitter);

Live.prototype.log = function(msg) {
	var self = this;
	self.nodecg.log.info(msg);
	self.nodecg.sendMessage('log',msg);
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
	var self = this;
	if(!self.channels[channel.name]) {
		self.channels[channel.name] = channel;
	}
	self.wsabi.get("/api/v1/channels/"+channel.name).then(function(res) {
		channel.setData(res);
		self.log('Subscribing to '+channel.name + ' events');
		self.registerEvent('user', 'update',channel.userID, channel);
		self.registerEvent('channel', 'subscribed', channel.id,channel);
		self.registerEvent('channel', 'update', channel.id,channel);
		self.registerEvent('channel', 'status', channel.id,channel);
		self.registerEvent('channel', 'followed', channel.id,channel);
		self.log('Subscribed to '+ channel.name + ' events');
		self.pollFollowers(channel);
	},function(res){
		console.log(res);
	});
}
Live.prototype.registerEvent  = function(type, eventName,id,channel) {
	var self = this;
	var slugString = self.buildSlug(type, eventName,id);
	console.log(slugString);
	self.wsabi.live(slugString).then(function(res) {
		res.onValue(self.onUpdate.bind(self, slugString,channel));
	}, function(err){
		self.nodecg.log.error(err);
	});
};

Live.prototype.checkStatus = function() {
	var self = this;
	self.log('Checking status');
	self.wsabi.get('/api/v1/live').then(function(data){
		console.log(data);
	}, function(err) {
		console.log(err);
	});
}

Live.prototype.buildSlug = function(type,eventName,id) {
	return type +':'+id+':'+eventName;
};

Live.prototype.handleFollow = function(channel, username) {
	var ts = Date.now();
	if(this.nodecg.bundleConfig.debug) {
		this.nodecg.log.info('Debug is enabled emitting all events');
	}
	if (!channel.followStore.hasEvent(username) || this.nodecg.bundleConfig.debug) {
		channel.followStore.add(username,ts);
		this.emit('follow', channel.name, username);
	} else {
		///this.nodecg.log.info('Not emitting follow from '+ username +' because store already has it');
	}
}

Live.prototype.handleSub = function(channel, username) {
	var ts = Date.now();
	if(this.nodecg.bundleConfig.debug) {
		this.nodecg.log.info('Debug is enabled emitting all events');
	}
	if (!channel.subStore.hasEvent(username,ts) || this.nodecg.bundleConfig.debug) {
		channel.subStore.add(username,ts);
		this.emit('sub', channel.name, username, ts);
	} else {
		//this.nodecg.log.info('Not emitting sub from '+ username +' because store already has it');
	}
}

Live.prototype.onUpdate = function(slug,channel,data) {
	var slugInfo = this.extractSlugParts(slug);

	var eventType = slugInfo.eventName;
	var type = slugInfo.type;
	
	if (type === 'channel') {
		if (eventType === 'followed') {
			this.nodecg.log.info(slug);
			if (data.following !== true) {
				this.emit('unfollow', channel.name, data.user.username);
				return;
			}
			this.handleFollow(channel,data.user.username);
		}
		if(eventType === 'subscribed') {
			this.nodecg.log.info(slug);
			this.handleSub(channel, data.user.username);
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

Live.prototype.pollFollowers = function(channel) {
	var self = this;
	self.nodecg.log.info('polling followers');
	self.wsabi.get('/api/v1/channels/'+channel.id+'?fields=numFollowers').then(function(res) {
		var followers = res.numFollowers;
		var pages = [];
		if(followers < 100) {
			pages.push(0);
		} else {
			pages.push(Math.floor(followers/100) - 1);
			var remainder = followers % 100;
			if(remainder > 0) {
				pages.push(pages[0] + 1);
			}
		}
		return pages;
	}).then(function(pages) {
		console.log(pages);
		var promises = pages.map(function(pageNum){
			return self.wsabi.get('/api/v1/channels/'+channel.id+'/follow?limit=100&fields=id,username&page='+pageNum);
		});
		return Promise.all(promises);
	}).then(function(result) {
		var arr;
		if(result.length > 1) {
			arr = result[0].concat(result[1]);
		}
		arr = arr.reverse();
		arr = arr.slice(0,99);
		arr = arr.reverse();

		arr.forEach(function(follow) {
			self.handleFollow(channel, follow.username);
		});
	});
};

module.exports = Live;
