'use strict';
const Channel = require('./lib/Channel.js');
const LiveLoading = require('./lib/Live.js');
const channelCache = {};

const toArray = require('object-values-to-array');
const { FOLLOW, HOST, SUBSCRIPTION } = require('./lib/util');

module.exports = function(extensionApi) {
	const nodecg = extensionApi;
	const live = new LiveLoading(nodecg);

	if (!nodecg.bundleConfig || !Object.keys(nodecg.bundleConfig).length) {
		throw new Error('No config found in cfg/nodecg-mixer.json, aborting!');
	}

	if (!nodecg.bundleConfig.channels) {
		throw new Error('No channels present in the config file aborting');
	}

	function log(msg) {
		nodecg.log.info(msg);
		nodecg.sendMessage('log', msg);
	}
	function onEvent(channel, type, username, ts) {
		log(`${type}: username`);
		nodecg.sendMessage(type, {
			username,
			type,
			channel,
			ts: ts ? ts : Date.now(),
		});
	}

	function onUpdate(channel, data) {
		nodecg.sendMessage('update', channel, data);
	}

	function addChannel(channelName) {
		if (channelCache[channelName] !== undefined) {
			return;
		}

		const channel = new Channel(channelName, nodecg, live);
		channel.on(FOLLOW, onEvent.bind(this, channelName, FOLLOW));
		channel.on(SUBSCRIPTION, onEvent.bind(this, channelName, SUBSCRIPTION));
		channel.on('update', onUpdate.bind(this, channelName, 'update'));
		channel.on(HOST, onEvent.bind(this, channelName, HOST));
		channelCache[channelName] = channel;
	}

	function addChannels() {
		nodecg.bundleConfig.channels.forEach(channelName =>
			addChannel(channelName),
		);
	}

	function eachChannel(func) {
		return toArray(channelCache).map(func);
	}

	function getUnDismissed(type, cb) {
		if (typeof cb !== 'function') {
			return;
		}
		var func = 'findUnDismissedFollows';
		if (type === SUBSCRIPTION) {
			func = 'findUnDismissedSubscriptions';
		}
		const promises = eachChannel(channel => channel[func]());
		Promise.all(promises)
			.then(result => {
				const combinedArray = result
					.reduce((previous, next) => previous.concat(next), [])
					.map(item => {
						return {
							username: item.username,
							type,
							ts: item[type].ts ? item[type].ts : 0,
							channel: 0,
						};
					});
				cb(null, combinedArray);
			})
			.catch(err => {
				this.nodecg.log.error(err);
				cb(err, []);
			});
	}

	nodecg.listenFor('getFollows', function(value, cb) {
		getUnDismissed(FOLLOW, cb);
	});
	nodecg.listenFor('getChannelData', function(value, cb) {
		cb(null, channelCache[value].data);
	});

	nodecg.listenFor('getSubscriptions', function(value, cb) {
		getUnDismissed(SUBSCRIPTION, cb);
	});

	nodecg.listenFor('dismiss', function(value) {
		eachChannel(channel => channel.dismissEvent(value));
	});

	addChannels();
};
