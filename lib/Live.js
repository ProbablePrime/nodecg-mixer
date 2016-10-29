'use strict';

const EventEmitter = require('events');
const util = require('util');
const Promise = require('bluebird');
const ws = require('ws');
const fetch = require('node-fetch');

const Carina = require('carina').Carina;
Carina.WebSocket = ws;

function wrappedFetch(url) {
	return fetch(url).then(res => res.json());
}

function fetchChannel(channelName) {
	return wrappedFetch(`https://beam.pro/api/v1/channels/${channelName}`)
}

function fetchNumFollowers(channelId) {
	return wrappedFetch(`https://beam.pro/api/v1/channels/${channelId}?fields=numFollowers`);
}
function fetchPage(channelId, pageNum) {
	return wrappedFetch(`https://beam.pro/api/v1/channels/${channelId}/follow?limit=100&fields=id,username&page=${pageNum}`)
}

module.exports = class Live extends EventEmitter{
	constructor(nodecg) {
		super();
		this.nodecg = nodecg;

		this.channels = {};
		this.openTime = 0;
		this.carina = new Carina({ isBot: true }).open();


		this.carina.socket.on('open', () => {
			this.openTime = Date.now();
			this.log('Connected to Beam Servers');
			this.emit('connected');
		});
		this.carina.socket.on('close', () => {
			this.lastClose = Date.now();
			this.nodecg.log.warn('Disconnected from beam, Attempting a reconnection');
			this.emit('disconnected');
		});
		this.carina.socket.on('error', err => self.log(err));
	}

	log(msg) {
		this.nodecg.log.info(msg);
		this.nodecg.sendMessage('log', msg);
	}

	addChannel(channel) {
		const self = this;
		if (!self.channels[channel.name]) {
			self.channels[channel.name] = channel;
		}
		console.log('fetching channel, '+ channel.name);
		fetchChannel(channel.name)
		.then(res => {
			//TODO, what even is this?
			channel.setData(res);
			console.log(res);
			self.log('Subscribing to ' + channel.name + ' events');
			self.registerEvent('user', 'update', channel.userID, channel);
			self.registerEvent('channel', 'subscribed', channel.id, channel);
			self.registerEvent('channel', 'resubscribed', channel.id, channel);
			self.registerEvent('channel', 'update', channel.id, channel);
			self.registerEvent('channel', 'status', channel.id, channel);
			self.registerEvent('channel', 'followed', channel.id, channel);
			self.registerEvent('channel', 'hosted', channel.id, channel);
			self.log('Subscribed to ' + channel.name + ' events');
			channel.checkFollows();
		})
		.catch(err => {
			console.log(err);
		})
	}

	registerEvent (type, eventName, id, channel) {
		const self = this;
		const slugString = self.buildSlug(type, eventName, id);
		console.log(`subscribing to ${slugString}`);
		this.carina.subscribe(slugString, data => {
			channel.onUpdate(slugString, data);
		})
	}
	buildSlug(type, eventName, id) {
		return `${type}:${id}:${eventName}`;
	}
	scrapeFollowers(channel) {
		//TODO Refactor
		const self = this;
		self.log('Polling for Followers due to new connection');
		return fetchNumFollowers(channel.id)
		.then(res => {
			const followers = res.numFollowers;
			let pages = Math.floor(followers / 100);
			const remainder = followers % 100;
			if (remainder > 0) {
				pages += 1;
			}
			return pages;
		}).then(pages => {
			console.log(pages);
			const length = pages;
			let pageNum = 0;
			const promises = [];
			for (pageNum = 0; pageNum < length; pageNum++) {
				promises.push(fetchPage(channel.id, pageNum));
			}
			return Promise.all(promises);
		}).then(result => {
			let combinedArray = [];
			if (result.length > 1) {
				combinedArray = result.reduce(function (previous, next) {
					return previous.concat(next);
				}, []);
			} else {
				combinedArray = result[0];
			}
			if (!combinedArray) {
				return [];
			}
			return combinedArray;
		});
	};
}
