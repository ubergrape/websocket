
/**
 * Module dependencies.
 */

var Emitter = require('component-emitter');

module.exports = WebSocketWrapper;

/**
 * Create a WebSocket to optional `host`,
 * defaults to current page.
 *
 * @param {String} host
 * @return {Object} ws
 * @api public
 */

function WebSocketWrapper(url) {
	if (!(this instanceof WebSocketWrapper))
		return new WebSocketWrapper(url);

	Emitter.call(this);
	if (!url) throw new Error('WebSocketWrapper: url is required.')

	this.url = url;
	this._socket = this._connect();
}
WebSocketWrapper.prototype = Object.create(Emitter.prototype);

WebSocketWrapper.CONNECTING = 0;
WebSocketWrapper.OPEN = 1;
WebSocketWrapper.CLOSING = 2;
WebSocketWrapper.CLOSED = 3;

// wrap readyState
Object.defineProperty(WebSocketWrapper.prototype, 'readyState', {
	enumerable: true,
	get: function () {
		return this._socket ? this._socket.readyState : WebSocketWrapper.CLOSED;
	}
});

// wrap this for easier extensibility
WebSocketWrapper.prototype.send = function WebSocketWrapper_send(msg) {
	if (this.readyState === WebSocketWrapper.OPEN) {
		// Calling send() on a closed WebSocket object which reports an open
		// readyState causes a crash. This scenario can occur when returning to
		// a backgrounded page which received data and then closed when in the
		// backgrounded state.
		// https://gist.github.com/mloughran/2052006
		setTimeout(function () {
			this._socket.send(msg);
		}.bind(this))
	}
};

WebSocketWrapper.prototype.close = function WebSocketWrapper_close(code) {
	this._socket.close(code);
};

/**
 * Connect the websocket and hook up the events
 */
WebSocketWrapper.prototype._connect = function WebSocketWrapper__connect() {
	try {
		var socket = new WebSocket(this.url);
	}
	catch (err) {
		setTimeout(function() {
			this.emit('error', err);
		}.bind(this), 0);
	}

	socket.onmessage = function (e) {
		this.emit('message', e.data);
	}.bind(this);

	['open', 'close', 'error'].forEach(function (event) {
		socket['on' + event] = function (e) {
			this.emit(event, e);
		}.bind(this);
	}, this);

	return socket;
};
