(function() {
	'use strict';
	Polymer({
		is: 'panel-body',
		properties: {
			followers: {
				type: Array,
				value: [],
			},
			subscriptions: {
				type: Array,
				value: [],
			},
		},
		ready() {
			nodecg.sendMessage(
				'getChannelData',
				'ProbablePrime',
				(err, result) => {
					this.onUpdate(result, result);
				},
			);

			nodecg.sendMessage('getFollows', '', (err, f) => {
				if (f) {
					this.set('followers', f);
				}
			});
			nodecg.sendMessage('getSubscriptions', '', (err, subs) => {
				if (subs) {
					this.set('subscriptions', subs);
				}
			});
			nodecg.listenFor('subscription', this.addSub);
			nodecg.listenFor('follow', this.addFollow);
			nodecg.listenFor('update', this.onUpdate);
		},
		addSub(item) {
			if (item.type !== 'subscription' || item.replay) {
				return;
			}
			this.push('subscriptions', item);
		},
		addFollow(item) {
			if (item.type !== 'follow' || item.replay) {
				return;
			}
			this.push('follows', item);
		},
		onUpdate() {},
		itemDismissed(e) {
			const item = e.detail.item;
			nodecg.sendMessage('dismiss', item);
			this.removeItem(item);
		},
		removeItem(item) {
			if (item.type === 'follow') {
				this.arrayDelete('followers', item);
			}
			if (item.type === 'subscription') {
				this.arrayDelete('subscriptions', item);
			}
		},
	});
})();
