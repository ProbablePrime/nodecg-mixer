'use strict';

var nodecg;
var Channel = require('./lib/Channel.js');
var channelCache = {};

var Beam = require('beam-client-node');

var LiveLoading = require('./lib/Live.js');

var live;

var client = new Beam();

module.exports = function (extensionApi) {
	nodecg = extensionApi;
	if(!nodecg.bundleConfig || !Object.keys(nodecg.bundleConfig).length) {
		throw new Error('No config found in cfg/nodecg-beam.json, aborting!');
	}

	if (!nodecg.bundleConfig.channels) {
		throw new Error('No channels present in the config file aborting');
	}

	function log(msg) {
		nodecg.log.info(msg);
		nodecg.sendMessage('log',msg);
	}

	var onFollow = function(channel,username) {
		var content = {
			name: username,
			channel: channel,
			ts: Date.now()
		};
		log('follow ' + username);
		nodecg.sendMessage('follow', content);
	};

	var onSub = function(channel,username,ts) {
		var content = {
			name: username,
			channel: channel,
			ts: ts
		};
		log('Sub ' + username);
		nodecg.sendMessage('subscription', content);

	};

	var onUpdate = function(channel,data) {
		this.emit('update',channel,data);
		this.nodecg.sendMessage('update', channel,data);
	}

	function createLive() {
		live = new LiveLoading(nodecg);
		live.on('follow',onFollow.bind(this));
		live.on('sub',onSub.bind(this));
		live.on('update',onUpdate.bind(this));
	}

	function addChannels() {
		var self = this;
		nodecg.bundleConfig.channels.forEach(function(channel) {
			if(channelCache[channel] === undefined) {
				channelCache[channel] = new Channel(channel,nodecg,live);
				live.addChannel(channelCache[channel]);
			}
		});
	}

	createLive();
	addChannels();

}
