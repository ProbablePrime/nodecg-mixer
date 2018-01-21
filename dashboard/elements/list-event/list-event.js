(function() {
	'use strict';
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	Polymer({
		is: 'list-event',

		properties: {
			item: {
				type: Object,
				observer: 'changed'
			}
		},
		changed(item) {
			Object.assign(this, item);
		},
		dismiss() {
			this.fire(`dismiss`, this);
		},
		resend() {
			console.log('resend');
			nodecg.sendMessage(
				this.item.type,
				Object.assign({}, this.item, { replay: true })
			);
		}
	});
})();
