(function () {
	'use strict';
	Polymer({
		is: 'panel-body',

		properties: {
			followers: {
				type: Array,
				value: []
			},
			subscriptions: {
				type: Array,
				value: []
			}
		},
		ready() {
			nodecg.sendMessage('getChannelData','ProbablePrime', (err, result) => {
				console.log(result);
				this.onUpdate(result,result);
			})

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
		addSub() {
		},
		addFollow() {

		},
		onUpdate() {

		},
		itemDismissed(item) {
			nodecg.sendMessage('dismiss', item);
			this.removeItem(item);
		},
		removeItem(item) {
			if (item.type === 'follow') {
				this.followers = this.followers.filter(follow => {
					return follow.username !== item.username;
				});
			}
			if (item.type === 'subscription') {
				this.subscriptions.filter(subscription => {
					return subscription.username !== item.username;
				});
			}
		}
	});
})();
