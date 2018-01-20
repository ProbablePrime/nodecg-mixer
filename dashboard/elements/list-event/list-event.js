(function () {
	'use strict';
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	Polymer({
		is: 'list-event',

		properties: {
			type: {
				type: String,
				reflectToAttribute: true
			},
			item: {
				type: Object,
				observer: 'changed'
			}
		},
		changed(item) {
			console.log(this)
			Object.assign(this, item);
		},
		dismiss() {
			this.fire(`dismiss`, this);
		},
		resend() {
			nodecg.sendMessage(this.type, Object.assign({}, this, { replay: true }));
		}
	});
})();
