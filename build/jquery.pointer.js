(function() {
var require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Watch = require('./Watch');
var Util = require('./Util');

// Initialize Pointer when the page is ready
var _onReady = function() {
    Util
        .off('DOMContentLoaded', _onReady, document)
        .off('load', _onReady, window);
    Watch.enable();
};

if (document.readyState === 'complete') {
    setTimeout(Watch.enable);
} else {
    Util
        .on('DOMContentLoaded', _onReady, document)
        .on('load', _onReady, window);
}
},{"./Util":3,"./Watch":4}],2:[function(require,module,exports){
var Events = require('./event/Events');
var EventMap = require('./event/Map');
var Adapter = require('Adapter');
var Util = require('./Util');

/**
 * Pointer events that should not bubble
 * @type String[]
 * @static
 */
var NO_BUBBLE_EVENTS = [Events.ENTER, Events.LEAVE];

/**
 * Properties to copy from original event to new event
 *
 * @type String[]
 * @static
 */
var PROPS = 'screenX screenY pageX pageY offsetX offsetY'.split(' ');

/**
 * Create and trigger pointer events
 *
 * @class Pointer.PointerEvent
 * @static
 */
var PointerEvent = {

    /**
     * Create a new pointer event
     *
     * @method create
     * @param {String} type
     * @param {MouseEvent|TouchEvent} originalEvent
     * @return {*} Event created from adapter
     */
    create: function(type, originalEvent) {
        var properties = {
            noBubble: Util.indexOf(NO_BUBBLE_EVENTS, type) !== -1
        };

        var source = originalEvent;

        if (originalEvent.type.indexOf('touch') === 0) {
            properties.changedTouches = originalEvent.changedTouches;
            properties.touches = originalEvent.touches;
            source = properties.changedTouches[0];
        }

        var i = 0;
        var length = PROPS.length;

        for (; i < length; i++) {
            if (source.hasOwnProperty(PROPS[i])) {
                properties[PROPS[i]] = source[PROPS[i]];
            }
        }

        return Adapter.create(type, originalEvent, properties);
    },

    /**
     * Trigger a pointer event from a native mouse/touch event
     *
     * @method trigger
     * @param {MouseEvent|TouchEvent} originalEvent
     * @param {String} [overrideType] Use this event instead of `originalEvent.type` when mapping to a pointer event
     */
    trigger: function(originalEvent, overrideType) {
        if (!originalEvent || !EventMap.hasOwnProperty(originalEvent.type)) {
            return;
        }

        var eventName = overrideType || originalEvent.type;
        var types = EventMap[eventName];

        var i = 0;
        var length = types.length;
        var event;

        for (; i < length; i++) {
            event = PointerEvent.create(types[i], originalEvent);
            if (event) {
                Adapter.trigger(event, originalEvent.target);
            }
        }
    }

};

module.exports = PointerEvent;
},{"./Util":3,"./event/Events":9,"./event/Map":10,"Adapter":"ccQ5QW"}],3:[function(require,module,exports){
/**
 * Utility functions
 *
 * @class Pointer.Util
 * @static
 */
var Util = {

    /**
     * Add event listener to target
     *
     * @method on
     * @param {String|String[]} event
     * @param {Function} callback
     * @param {HTMLElement} [target=document.body]
     * @chainable
     */
    on: function(event, callback, target) {
        if (!target) {
            target = document.body;
        }

        var i = 0;
        var events = (event instanceof Array) ? event : event.split(' ');
        var length = events.length;

        for (; i < length; i++) {
            if (target.addEventListener) {
                target.addEventListener(events[i], callback, false);
            } else {
                target.attachEvent('on' + events[i], callback);
            }
        }

        return this;
    },

    /**
     * Remove event listener from target
     *
     * @method on
     * @param {String|String[]} event
     * @param {Function} callback
     * @param {HTMLElement} [target=document.body]
     * @chainable
     */
    off: function(event, callback, target) {
        if (!target) {
            target = document.body;
        }

        var i = 0;
        var events = (event instanceof Array) ? event : event.split(' ');
        var length = events.length;

        for (; i < length; i++) {
            if (target.removeEventListener) {
                target.removeEventListener(events[i], callback, false);
            } else {
                target.detachEvent('on' + events[i], callback);
            }
        }

        return this;
    },

    /**
     * Perform indexOf on array
     *
     * @method indexOf
     * @param {Array} array
     * @param {*} item
     * @return {Number}
     */
    indexOf: function(array, item) {
        if (Array.prototype.indexOf) {
            return array.indexOf(item);
        } else {
            var i = 0;
            var length = array.length;

            for (; i < length; i++) {
                if (array[i] === item) {
                    return i;
                }
            }

            return -1;
        }
    }

};

module.exports = Util;
},{}],4:[function(require,module,exports){
var MouseCapture = require('./capture/Mouse');
var TouchCapture = require('./capture/Touch');

/**
 * @type Boolean
 * @static
 */
var _isEnabled = false;

/**
 * Bind mouse/touch events to convert to pointer events
 *
 * @class Pointer.Watch
 * @static
 */
var Watch = {

    /**
     * Enable tracking of touch/mouse events
     *
     * @method enable
     */
    enable: function() {
        if (_isEnabled) {
            return;
        }

        _isEnabled = true;

        TouchCapture.enable();
        MouseCapture.enable();
    },

    /**
     * Disable tracking of touch/mouse events
     *
     * @method disable
     */
    disable: function() {
        if (!_isEnabled) {
            return;
        }

        _isEnabled = false;

        TouchCapture.disable();
        MouseCapture.disable();
    }

};

module.exports = Watch;
},{"./capture/Mouse":7,"./capture/Touch":8}],"ccQ5QW":[function(require,module,exports){
var $ = window.jQuery;

/**
 * @class Pointer.Adapter.jQueryAdapter
 * @static
 */
var jQueryAdapter = {

    /**
     * @method create
     * @param {String} type
     * @param {MouseEvent|TouchEvent} originalEvent
     * @param {Object} properties
     * @return {$.Event}
     */
    create: function(type, originalEvent, properties) {
        var event = $.Event(originalEvent, properties);
        event.type = type;

        return event;
    },

    /**
     * @method trigger
     * @param {$.Event} event
     * @param {Boolean} [event.noBubble=false]
     * @param {HTMLElement} target
     */
    trigger: function(event, target) {
        $.event.trigger(event, null, target, !!event.noBubble);
    }

};

module.exports = jQueryAdapter;
},{}],"Adapter":[function(require,module,exports){
module.exports=require('ccQ5QW');
},{}],7:[function(require,module,exports){
var Util = require('../Util');
var PointerEvent = require('../PointerEvent');
var EventTracker = require('../event/Tracker');

/**
 * Event to detect mouseenter events with
 * @type String
 * @static
 */
var ENTER_EVENT = 'mouseover';

/**
 * Event to detect mouseleave events with
 * @type String
 * @static
 */
var EXIT_EVENT = 'mouseout';

/**
 * Mouse enter/leave event map
 * @type Object
 * @static
 */
var ENTER_LEAVE_EVENT_MAP = {
    mouseover: 'mouseenter',
    mouseout: 'mouseleave'
};

/**
 * Cached array
 *
 * @type Array
 * @static
 */
var CACHED_ARRAY = [];

/**
 * Determine if `child` is a descendant of `target`
 *
 * @param {Element} target
 * @param {Element} child
 * @return {Boolean}
 * @private
 */
var _contains = function(target, child) {
    if (target.contains) {
        return target.contains(child);
    } else {
        CACHED_ARRAY.length = 0;
        var current = child;

        while(current = current.parentNode) {
            CACHED_ARRAY.push(current);
        }

        return Util.indexOf(CACHED_ARRAY, target) !== -1;
    }
};

/**
 * Determine if we have moused over a new target.
 * Browsers implementation of mouseenter/mouseleave is shaky, so we are manually detecting it.
 *
 * @param {MouseEvent} event
 * @private
 */
var _detectMouseEnterOrLeave = function(event) {
    var target = event.target;
    var related = event.relatedTarget;
    var eventName = ENTER_LEAVE_EVENT_MAP[event.type];

    if (!related || (related !== target && !_contains(target, related))) {
        PointerEvent.trigger(event, eventName);
    }
};

/**
 * @class Pointer.Capture.Mouse
 * @type Object
 * @static
 */
var MouseCapture = {

    /**
     * Events to watch
     *
     * @property events
     * @type String[]
     */
    events: ['mouseover', 'mousedown', 'mousemove', 'mouseup', 'mouseout'],

    /**
     * Enable event listeners
     *
     * @method enable
     */
    enable: function() {
        Util.on(this.events, this.onEvent);
    },

    /**
     * Disable event listeners
     *
     * @method disable
     */
    disable: function() {
        Util.off(this.events, this.onEvent);
    },

    /**
     * If event is not simulated, convert to pointer
     *
     * @method onEvent
     * @param {MouseEvent} event
     * @callback
     */
    onEvent: function(event) {
        if (!EventTracker.isEmulated(event)) {
            // trigger mouseenter event if applicable
            if (ENTER_EVENT === event.type) {
                _detectMouseEnterOrLeave(event);
            }

            PointerEvent.trigger(event);

            // trigger mouseleave event if applicable
            if (EXIT_EVENT === event.type) {
                _detectMouseEnterOrLeave(event);
            }
        }
    }

};

module.exports = MouseCapture;
},{"../PointerEvent":2,"../Util":3,"../event/Tracker":11}],8:[function(require,module,exports){
var Util = require('../Util');
var PointerEvent = require('../PointerEvent');
var EventTracker = require('../event/Tracker');

/**
 * @class Pointer.Capture.Touch
 * @type Object
 * @static
 */
var TouchCapture = {

    /**
     * Events to watch
     *
     * @property events
     * @type String[]
     */
    events: ['touchstart' ,'touchmove', 'touchend', 'touchcancel'],

    /**
     * Enable event listeners
     *
     * @method enable
     */
    enable: function() {
        Util.on(this.events, this.onEvent);
    },

    /**
     * Disable event listeners
     *
     * @method disable
     */
    disable: function() {
        Util.off(this.events, this.onEvent);
    },

    /**
     * Register event (for mouse simulation detection) and convert to pointer
     *
     * @method onEvent
     * @param {TouchEvent} event
     * @callback
     */
    onEvent: function(event) {
        EventTracker.register(event);
        PointerEvent.trigger(event);
    }

};

module.exports = TouchCapture;
},{"../PointerEvent":2,"../Util":3,"../event/Tracker":11}],9:[function(require,module,exports){
/**
 * Pointer event namespace.
 * This is prepended to the pointer events
 *
 * @type {string}
 * @final
 */
var NAMESPACE = 'pointer';

/**
 * Pointer event names
 *
 * @class Pointer.Events
 * @static
 * @final
 */
var Events = {

    /**
     * @property MOVE
     * @type string
     */
    MOVE: NAMESPACE + 'move',

    /**
     * @property ENTER
     * @type string
     */
    ENTER: NAMESPACE + 'enter',

    /**
     * @property OVER
     * @type string
     */
    OVER: NAMESPACE + 'over',

    /**
     * @property DOWN
     * @type string
     */
    DOWN: NAMESPACE + 'down',

    /**
     * @property UP
     * @type string
     */
    UP: NAMESPACE + 'up',

    /**
     * @property OUT
     * @type string
     */
    OUT: NAMESPACE + 'out',

    /**
     * @property LEAVE
     * @type string
     */
    LEAVE: NAMESPACE + 'leave'

};

module.exports = Events;
},{}],10:[function(require,module,exports){
var Events = require('./Events');

/**
 * Map of mouse/touch event to their respective pointer event(s)
 * When these events (keys) are captured, the defined pointer event(s) are fired.
 *
 * Values can be either a single event name, or an array of event names.
 *
 * @class Pointer.EventMap
 * @static
 */
var EventMap = {

    /**
     * @property touchstart
     * @type String[]
     */
    touchstart: [Events.ENTER, Events.OVER, Events.DOWN],

    /**
     * @property touchmove
     * @type String[]
     */
    touchmove: [Events.MOVE],

    /**
     * @property touchend
     * @type String[]
     */
    touchend: [Events.UP, Events.OUT, Events.LEAVE],

    /**
     * @property mouseenter
     * @type String[]
     */
    mouseenter: [Events.ENTER],

    /**
     * @property mouseover
     * @type String[]
     */
    mouseover: [Events.OVER],

    /**
     * @property mousedown
     * @type String[]
     */
    mousedown: [Events.DOWN],

    /**
     * @property mousemove
     * @type String[]
     */
    mousemove: [Events.MOVE],

    /**
     * @property mouseup
     * @type String[]
     */
    mouseup: [Events.UP],

    /**
     * @property mouseout
     * @type String[]
     */
    mouseout: [Events.OUT],

    /**
     * @property mouseleave
     * @type String[]
     */
    mouseleave: [Events.LEAVE]

};

module.exports = EventMap;
},{"./Events":9}],11:[function(require,module,exports){
/**
 * Mouse > touch map
 *
 * @type Object
 * @static
 */
var MAP = {
    mousedown: 'touchstart',
    mouseover: 'touchstart',
    mouseout: 'touchend',
    mouseup: 'touchend'
};

/**
 * The last triggered touch events to compare mouse
 * events to to determine if they are emulated.
 *
 * @type Object
 * @static
 */
var LAST_EVENTS = {
    touchstart: null,
    touchend: null
};

/**
 * Max time between touch and simulated mouse event
 *
 * @type Number
 * @static
 */
var DELTA_TIME = 300;

/**
 * Max x/y distance between touch and simulated mouse event
 *
 * @type Number
 * @static
 */
var DELTA_POSITION = 5;

/**
 * @class Pointer.EventTracker
 * @static
 */
var EventTracker = {

    /**
     * Register a touch event used to determine if mouse events are emulated
     *
     * @method register
     * @param {MouseEvent|TouchEvent} event
     * @chainable
     */
    register: function(event) {
        if (LAST_EVENTS.hasOwnProperty(event.type)) {
            LAST_EVENTS[event.type] = event;
        }

        return this;
    },

    /**
     * Determine if a mouse event has been emulated
     *
     * @method isEmulated
     * @param {MouseEvent|TouchEvent} event
     * @returns {Boolean}
     */
    isEmulated: function(event) {
        if (!MAP.hasOwnProperty(event.type)) {
            return false;
        }

        var eventName = MAP[event.type];
        var last = LAST_EVENTS[eventName];

        if (!last) {
            return false;
        }

        var touch = last.changedTouches[0];

        var dx = Math.abs(touch.clientX - event.clientX);
        var dy = Math.abs(touch.clientY - event.clientY);
        var dt = Math.abs(last.timeStamp - event.timeStamp);

        return (dx <= DELTA_POSITION && dy <= DELTA_POSITION && dt <= DELTA_TIME);
    }

};

module.exports = EventTracker;
},{}]},{},[1])
}());