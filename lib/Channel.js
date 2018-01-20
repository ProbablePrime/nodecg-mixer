const EventEmitter = require('events');
const Store = require('./store');
const _ = require('lodash');

class Channel extends EventEmitter{
	constructor(channelName, nodecg, live) {
		super();

		this.live = live;
		this.nodecg = nodecg;
		this.name = channelName;
		this.store = new Store(channelName);

		this.log(`Spinning up ${channelName}`);
		live.addChannel(this);
		live.on('connected', this.checkFollows.bind(this));
	}

	checkFollows() {
		console.log('checking followers');
		this.live.scrapeFollowers(this).then(follows => {
			follows.forEach(follow => {
				this.handleFollow(follow.username);
			});
		});
	}

	log(msg) {
		this.nodecg.sendMessage('log', msg);
		this.nodecg.log.info(msg);
	}

	setData(data) {
		this.data = data;
		this.id = data.id;
		this.userID = data.user.id;
		this.emit('update', data);
	}

	handleChannelEvents(slug, eventType, data) {
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

		if (eventType === 'hosted') {
			this.nodecg.log.info(slug);
			this.handleHost(data.hoster.token);
		}

		if (eventType === 'update') {
			this.data = _.merge(this.data, data);

			this.emit('update', data);
		}
	}

	onUpdate(slug, data) {
		const slugInfo = this.extractSlugParts(slug);

		const eventType = slugInfo.eventName;
		const type = slugInfo.type;
		if (type === 'channel') {
			handleChannelEvents(slug, eventType, data)
		}
		if (type === 'user') {
			// super cool events I haven't figured out yet
		}
	}

	handleHost(host) {
		this.emit('host', host, Date.now());
	}

	handleFollow(username) {
		const ts = Date.now();
		this.store.hasFollow(username, ts).then(result => {
			if (!result) {
				this.emit('follow', username, ts);
				this.store.addFollow(username, ts);
			}
		});
	}

	handleSub(username) {
		const ts = Date.now();
		this.store.hasSubscription(username, ts).then(result => {
			if (!result) {
				this.emit('sub', username, ts);
				this.store.addSubscription(username, ts);
			}
		});
	}

	dismissSubscription(username) {
		return this.store.dismissSubscription(username);
	}

	dismissFollow(username) {
		return this.store.dismissFollow(username);
	}

	extractSlugParts(slug) {
		const slugParts = slug.split(':');
		return {
			type: slugParts[0],
			id: slugParts[1],
			eventName: slugParts[2]
		};
	}

	findUnDismissedFollows() {
		return this.store.findUnDismissedFollows();
	}

	findUnDismissedSubscriptions() {
		return this.store.findUnDismissedSubscriptions();
	}
}

module.exports = Channel;
