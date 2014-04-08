(function() {
var require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Pointer = require('./Pointer');
var Util = require('./Util');

// If the browser already supports pointer events, do not enable
if (window.navigator.pointerEnabled === true) {
    return;
}

// Initialize Pointer when the page is ready
var _onReady = function() {
    Util
        .off('DOMContentLoaded', _onReady, document)
        .off('load', _onReady, window);

    Pointer.enable();
};

if (document.readyState === 'complete') {
    // keep the script kickoff on an async thread
    setTimeout(Pointer.enable);
} else {
    Util
        .on('DOMContentLoaded', _onReady, document)
        .on('load', _onReady, window);
}
},{"./Pointer":3,"./Util":4}],2:[function(require,module,exports){
var Events = require('./event/Events');
var Adapter = require('adapter/event');
var Tracker = require('./event/Tracker');
var Util = require('./Util');

/**
 * Pointer events that should not bubble
 *
 * @type String[]
 * @static
 * @private
 */
var NO_BUBBLE_EVENTS = [Events.POINTER[0], Events.POINTER[6]];

/**
 * Default properties to apply to newly created events
 *
 * These values are only used if values do not exists in the
 * `properties` or `originalEvent` object called with `create` method
 *
 * @type Object
 * @static
 * @private
 */
var PROPS = {
    screenX: 0,
    screenY: 0,
    pageX: 0,
    pageY: 0,
    offsetX: 0,
    offsetY: 0,
    clientX: 0,
    clientY: 0,
    view: null,
    detail: null,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    button: 0,
    relatedTarget: null,
    width: 0,
    height: 0,
    pressure: 0
};

/**
 * Get current unix time
 *
 * @type Function
 * @return {Number}
 * @private
 */
var _now = Date.now || function() {
    return +new Date();
};

/**
 * Get proprties to set to event
 *
 * @type Function
 * @param {String} type Pointer event name
 * @param {MouseEvent|TouchEvent} originalEvent
 * @param {String} originalEvent.type
 * @param {TouchList} [originalEvent.touches]
 * @param {TouchList} [originalEvent.changedTouches]
 * @param {Number} [touchIndex=0]
 * @return {Object}
 * @private
 */
var _getProperties = function(type, originalEvent, touchIndex) {
    var source = originalEvent;
    var properties = {
        pointerId: 0,
        pointerType: 'mouse',
        timeStamp: originalEvent.timeStamp || _now() // make sure we have a timestamp
    };

    if (originalEvent.type.indexOf('touch') === 0) {
        source = originalEvent.changedTouches[touchIndex || 0];
        properties.pointerId = 1 + source.identifier;
        properties.pointerType = 'touch';
    }

    properties.isPrimary = properties.pointerId <= 1;

    var name;

    for (name in PROPS) {
        if (PROPS.hasOwnProperty(name)) {
            properties[name] = source[name] || PROPS[name];
        }
    }

    if (!properties.pageX && properties.clientX) {
        properties.pageX = properties.clientX + _getPageOffset('Left');
        properties.pageY = properties.clientY + _getPageOffset('Top');
    }

    // add x/y properties aliased to pageX/Y
    properties.x = properties.pageX;
    properties.y = properties.pageY;

    return properties;
};

/**
 * Get the current page offset
 *
 * @type Function
 * @param {String} prop
 * @returns {Number}
 * @private
 */
var _getPageOffset = function(prop) {
    var doc = document;
    var body = doc.body;

    var scroll = 'scroll' + prop;
    var client = 'client' + prop;

    return (doc[scroll] || body[scroll] || 0) - (doc[client] || body[client] || 0);
};

/**
 * Get event target
 *
 * @type Function
 * @param {Event} event
 * @param {Element} [target]
 * @returns {Element}
 * @private
 */
var _getTarget = function(event, target) {
    target = target || event.target || event.srcElement || document;

    // Target should not be a text node
    if (target.nodeType === 3) {
        target = target.parentNode;
    }

    return target;
};

/**
 * Create and trigger pointer events
 *
 * @class Controller
 * @static
 */
var Controller = {

    /**
     * Create a new pointer event
     *
     * @method create
     * @param {String} type Pointer event name
     * @param {MouseEvent|TouchEvent} originalEvent
     * @param {Number} [touchIndex=0]
     * @return {mixed} Event created from adapter
     */
    create: function(type, originalEvent, touchIndex) {
        var properties = _getProperties(type, originalEvent, touchIndex);

        return Adapter.create(
            type,
            originalEvent,
            properties,
            Util.indexOf(NO_BUBBLE_EVENTS, type) === -1
        );
    },

    /**
     * Trigger a pointer event from a native mouse/touch event
     *
     * @method trigger
     * @param {MouseEvent|TouchEvent} originalEvent
     * @param {String} originalEvent.type
     * @param {Element} originalEvent.target
     * @param {String} [overrideType] Use this event instead of `originalEvent.type` when mapping to a pointer event
     * @param {Element} [overrideTarget] target to dispatch event from
     * @param {Number} [touchIndex=0]
     */
    trigger: function(originalEvent, overrideType, overrideTarget, touchIndex) {
        var eventName = overrideType || originalEvent.type;

        if (!originalEvent || !Events.MAP.hasOwnProperty(eventName)) {
            return;
        }

        var type = Events.MAP[eventName];
        var event = Controller.create(type, originalEvent, touchIndex || 0);
        var target = _getTarget(originalEvent, overrideTarget);

        if (event) {
            Tracker.register(event, eventName);
            Adapter.trigger(event, target);
        }
    }

};

module.exports = Controller;
},{"./Util":4,"./event/Events":9,"./event/Tracker":10,"adapter/event":"mbL6jR"}],3:[function(require,module,exports){
var Util = require('./Util');
var MouseHandler = require('./handlers/Mouse');
var TouchHandler = require('./handlers/Touch');

/**
 * @type Boolean
 * @static
 * @private
 */
var _isEnabled = false;

/**
 * Bind mouse/touch events to convert to pointer events
 *
 * @class Pointer
 * @static
 */
var Pointer = {

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

        Util
            .on(TouchHandler.events, TouchHandler.onEvent)
            .on(MouseHandler.events, MouseHandler.onEvent);
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

        Util
            .off(TouchHandler.events, TouchHandler.onEvent)
            .off(MouseHandler.events, MouseHandler.onEvent);
    }

};

module.exports = Pointer;
},{"./Util":4,"./handlers/Mouse":11,"./handlers/Touch":12}],4:[function(require,module,exports){
/**
 * Cached array
 *
 * @type Array
 * @static
 * @private
 */
var CACHED_ARRAY = [];

/**
 * Utility functions
 *
 * @class Util
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
     * @param {Function} [target.addEventListener]
     * @param {Function} [target.attachEvent]
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
     * @param {Function} [target.removeEventListener]
     * @param {Function} [target.detachEvent]
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
     * Search array for a value.
     *
     * Legacy IE doesn't support Array.indexOf,
     * and doing a for loop is faster anyway.
     *
     * @method indexOf
     * @param {Array} array
     * @param {mixed} item
     * @return {Number}
     */
    indexOf: function(array, item) {
        var i = 0;
        var length = array.length;

        for (; i < length; i++) {
            if (array[i] === item) {
                return i;
            }
        }

        return -1;
    },

    /**
     * Determine if `child` is a descendant of `target`
     *
     * @method contains
     * @param {Element} target
     * @param {Function} [target.contains]
     * @param {Element} child
     * @return {Boolean}
     */
    contains: function(target, child) {
        if (target === child) {
            return true;
        }

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
    }

};

module.exports = Util;
},{}],"adapter/event":[function(require,module,exports){
module.exports=require('mbL6jR');
},{}],"mbL6jR":[function(require,module,exports){
/**
 * Override original method in `event` to also call same method in `originalEvent`
 *
 * @type Function
 * @param {String} method
 * @param {Event} event
 * @param {MouseEvent|TouchEvent} originalEvent
 * @private
 */
var _overrideMethod = function(method, event, originalEvent) {
    var originalMethod = event[method];
    event[method] = function() {
        originalEvent[method]();
        originalMethod.call(this);
    };
};

/**
 * Native pointer event creation and dispatching.
 *
 * Legacy IE (IE8 and below) are not supported by this
 * adapter - they do not support natively dispatching custom events.
 *
 * @class Adapter.Event.Native
 * @static
 */
var Native = {

    /**
     * Create a new Event object
     *
     * @method create
     * @param {String} type
     * @param {MouseEvent|TouchEvent} originalEvent
     * @param {Object} properties
     * @param {Boolean} [bubbles=true]
     * @return {Event}
     */
    create: function(type, originalEvent, properties, bubbles) {
        var event = document.createEvent('Event');
        event.initEvent(type, bubbles !== false, true);

        var prop;

        // Add event properties
        for (prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                event[prop] = properties[prop];
            }
        }

        _overrideMethod('preventDefault', event, originalEvent);
        _overrideMethod('stopPropagation', event, originalEvent);
        _overrideMethod('stopImmediatePropagation', event, originalEvent);

        return event;
    },

    /**
     * Trigger an event on `target`
     *
     * @method trigger
     * @param {Event} event
     * @param {HTMLElement} target
     */
    trigger: function(event, target) {
        target.dispatchEvent(event);
    }

};

module.exports = Native;
},{}],"adapter/toucharea":[function(require,module,exports){
module.exports=require('C84uZi');
},{}],"C84uZi":[function(require,module,exports){
/**
 * Attribute name
 *
 * @type String
 * @static
 * @final
 */
var ATTRIBUTE = 'touch-action';

/**
 * @class Adapter.TouchArea.Attribute
 * @static
 */
var TouchAreaAttribute = {

    /**
     * Determine if `target` or a parent node of `target` has
     * a `touch-action` attribute with a value of `none`.
     *
     * @method hasTouchAction
     * @param {Element} target
     * @param {Function} target.getAttribute
     * @returns {Boolean}
     */
    detect: function(target) {
        while (target.getAttribute && !target.getAttribute(ATTRIBUTE)) {
            target = target.parentNode;
        }

        return target.getAttribute && target.getAttribute(ATTRIBUTE) === 'none' || false;
    }

};

module.exports = TouchAreaAttribute;
},{}],9:[function(require,module,exports){
var Util = require('../Util');

/**
 * Pointer event namespace.
 * This is prepended to the pointer events
 *
 * @type String
 * @final
 */
var NAMESPACE_POINTER = 'pointer';

/**
 * Mouse event namespace.
 * This is prepended to the mouse events
 *
 * @type String
 * @final
 */
var NAMESPACE_MOUSE = 'mouse';

/**
 * Touch event namespace.
 * This is prepended to the touch events
 *
 * @type String
 * @final
 */
var NAMESPACE_TOUCH = 'touch';

/**
 * Pointer event names
 *
 * @static
 * @final
 */
var PointerEvents = [
    NAMESPACE_POINTER + 'enter',
    NAMESPACE_POINTER + 'over',
    NAMESPACE_POINTER + 'down',
    NAMESPACE_POINTER + 'move',
    NAMESPACE_POINTER + 'up',
    NAMESPACE_POINTER + 'out',
    NAMESPACE_POINTER + 'leave',
    NAMESPACE_POINTER + 'cancel'
];

/**
 * Mouse event names
 *
 * @static
 * @final
 */
var MouseEvents = [
    NAMESPACE_MOUSE + 'enter',
    NAMESPACE_MOUSE + 'over',
    NAMESPACE_MOUSE + 'down',
    NAMESPACE_MOUSE + 'move',
    NAMESPACE_MOUSE + 'up',
    NAMESPACE_MOUSE + 'out',
    NAMESPACE_MOUSE + 'leave',
    NAMESPACE_MOUSE + 'cancel'
];

/**
 * Touch event names
 *
 * @static
 * @final
 */
var TouchEvents = [
    NAMESPACE_TOUCH + 'enter',
    NAMESPACE_TOUCH + 'over',
    NAMESPACE_TOUCH + 'start',
    NAMESPACE_TOUCH + 'move',
    NAMESPACE_TOUCH + 'end',
    NAMESPACE_TOUCH + 'out',
    NAMESPACE_TOUCH + 'leave',
    NAMESPACE_TOUCH + 'cancel'
];

/**
 * Event map
 *
 * @type Object
 * @static
 */
var MAP = {};

/**
 * Event names
 *
 * @class Event.Events
 * @static
 * @final
 */
var Events = {

    /**
     * @property POINTER
     * @type String[]
     * @final
     */
    POINTER: PointerEvents,

    /**
     * @property MOUSE
     * @type String[]
     * @final
     */
    MOUSE: MouseEvents,

    /**
     * @property TOUCH
     * @type String[]
     * @final
     */
    TOUCH: TouchEvents,

    /**
     * Map touch or mouse event to pointer event name
     *
     * @property MAP
     * @type Object
     * @static
     */
    MAP: MAP

};

// Build out event map
var i = 0;
var length = PointerEvents.length;

for (; i < length; i++) {
    if (TouchEvents[i]) {
        MAP[TouchEvents[i]] = PointerEvents[i];
    }

    if (MouseEvents[i]) {
        MAP[MouseEvents[i]] = PointerEvents[i];
    }
}

module.exports = Events;
},{"../Util":4}],10:[function(require,module,exports){
/**
 * Mouse > touch map
 *
 * @type Object
 * @static
 */
var MAP = {
    mouseover: 'touchover',
    mousedown: 'touchstart',
    mousemove: 'touchend',
    mouseup: 'touchend',
    mouseout: 'touchstart'
};

/**
 * The last triggered touch events to compare mouse
 * events to to determine if they are emulated.
 *
 * @type Object
 * @static
 */
var LAST_EVENTS = {
    touchover: {},
    touchstart: {},
    touchend: {},
    touchout: {}
};

/**
 * Max time between touch and simulated mouse event (2 seconds)
 *
 * We only use this to expire a touch event - after 2 seconds,
 * no longer use this event when detecting simulated events.
 *
 * @type Number
 * @static
 */
var DELTA_TIME = 2000;

/**
 * @class Event.Tracker
 * @static
 */
var EventTracker = {

    /**
     * Register a touch event used to determine if mouse events are emulated
     *
     * @method register
     * @param {Event} event
     * @param {String} event.type
     * @param {String} overrideEventName
     * @chainable
     */
    register: function(event, overrideEventName) {
        var eventName = overrideEventName || event.type;

        if (LAST_EVENTS.hasOwnProperty(eventName)) {
            LAST_EVENTS[eventName][event.pointerId] = event;
        }

        return this;
    },

    /**
     * Determine if a mouse event has been emulated
     *
     * @method isEmulated
     * @param {MouseEvent} event
     * @param {String} event.type
     * @returns {Boolean}
     */
    isEmulated: function(event) {
        if (!MAP.hasOwnProperty(event.type)) {
            return false;
        }

        var eventName = MAP[event.type];
        var previousEvent = LAST_EVENTS[eventName];

        if (!previousEvent) {
            return false;
        }

        var pointerId;
        var pointer;

        for (pointerId in previousEvent) {
            if (!previousEvent.hasOwnProperty(pointerId) || !previousEvent[pointerId]) {
                continue;
            }

            pointer = previousEvent[pointerId];

            // If too much time has passed since the last touch
            // event, remove it so we no longer test against it.
            // Then continue to the next point - no use in comparing positions.
            if (Math.abs(event.timeStamp - pointer.timeStamp) > DELTA_TIME) {
                LAST_EVENTS[eventName][pointerId] = null;
                continue;
            }

            if (pointer.clientX === event.clientX && pointer.clientX === event.clientX) {
                return true;
            }
        }

        return false;
    }

};

module.exports = EventTracker;
},{}],11:[function(require,module,exports){
var Util = require('../Util');
var Events = require('../event/Events').MOUSE;
var Controller = require('../Controller');
var Tracker = require('../event/Tracker');

/**
 * Mouse event names
 *
 * @type String
 * @static
 * @private
 */
var EVENT_ENTER = Events[0];
var EVENT_OVER = Events[1];
var EVENT_DOWN = Events[2];
var EVENT_MOVE = Events[3];
var EVENT_UP = Events[4];
var EVENT_OUT = Events[5];
var EVENT_LEAVE = Events[6];

/**
 * Mouse enter/leave event map
 *
 * @type Object
 * @static
 * @private
 */
var ENTER_LEAVE_EVENT_MAP = {};

// mouseover: mouseenter
ENTER_LEAVE_EVENT_MAP[EVENT_OVER] = EVENT_ENTER;

// mouseout: mouseleave
ENTER_LEAVE_EVENT_MAP[EVENT_OUT] = EVENT_LEAVE;

/**
 * Determine if we have moused over a new target.
 * Browsers implementation of mouseenter/mouseleave is shaky, so we are manually detecting it.
 *
 * @param {MouseEvent} event
 * @param {String} event.type
 * @param {Element} event.target
 * @param {Element} event.relatedTarget
 * @private
 */
var _detectMouseEnterOrLeave = function(event) {
    var target = event.target || event.srcElement;
    var related = event.relatedTarget;
    var eventName = ENTER_LEAVE_EVENT_MAP[event.type];

    if (!related || !Util.contains(target, related)) {
        Controller.trigger(event, eventName);
    }
};

/**
 * @class Handler.Mouse
 * @static
 */
var MouseHandler = {

    /**
     * Events to watch
     *
     * @property events
     * @type String[]
     */
    events: [EVENT_OVER, EVENT_DOWN, EVENT_MOVE, EVENT_UP, EVENT_OUT],

    /**
     * If event is not simulated, convert to pointer
     *
     * @method onEvent
     * @param {MouseEvent} event
     * @param {String} event.type
     * @param {Element} event.target
     * @param {Element} event.relatedTarget
     * @callback
     */
    onEvent: function(event) {
        if (!Tracker.isEmulated(event)) {

            // trigger mouseenter event if applicable
            if (EVENT_OVER === event.type) {
                _detectMouseEnterOrLeave(event);
            }

            Controller.trigger(event);

            // trigger mouseleave event if applicable
            if (EVENT_OUT === event.type) {
                _detectMouseEnterOrLeave(event);
            }
        }
    }

};

module.exports = MouseHandler;
},{"../Controller":2,"../Util":4,"../event/Events":9,"../event/Tracker":10}],12:[function(require,module,exports){
var Util = require('../Util');
var Events = require('../event/Events').TOUCH;
var TouchAreaAdapter = require('adapter/toucharea');
var Controller = require('../Controller');

/**
 * Touch event names
 *
 * @type String
 * @static
 * @private
 */
var EVENT_ENTER = Events[0];
var EVENT_OVER = Events[1];
var EVENT_START = Events[2];
var EVENT_MOVE = Events[3];
var EVENT_END = Events[4];
var EVENT_OUT = Events[5];
var EVENT_LEAVE = Events[6];
var EVENT_CANCEL = Events[7];

/**
 * List of the previous point event targets.
 *
 * Used to determine if a touch event has changed targets
 * and will then fire enter/over and out/leave events.
 *
 * @type Object
 * @static
 * @private
 */
var PREVIOUS_TARGETS = {};

/**
 * Determine which method to call for each point
 *
 * @type Function
 * @param {String} type
 * @returns {Function}
 * @private
 */
var _getPointMethod = function(type) {
    switch(type) {
        case EVENT_START:
        case EVENT_END:
            return _onPointStartEnd;
        case EVENT_MOVE:
            return _onPointMove;
        default:
            return _onPointCancel;
    }
};

/**
 * Trigger cancel for each touch point
 *
 * @type Function
 * @param {Touch} point
 * @param {Number} point.identifier
 * @param {TouchEvent} event
 * @param {String} event.type
 * @param {Number} pointIndex
 * @private
 */
var _onPointCancel = function(point, event, pointIndex) {
    PREVIOUS_TARGETS[point.identifier] = null;
    Controller.trigger(event, event.type, event.target, pointIndex);
    Controller.trigger(event, EVENT_OUT, event.target, pointIndex);
    Controller.trigger(event, EVENT_LEAVE, event.target, pointIndex);
};

/**
 * Trigger move for each touch point
 *
 * @type Function
 * @param {Touch} point
 * @param {Number} point.identifier
 * @param {Event} event
 * @param {Number} pointIndex
 * @private
 */
var _onPointMove = function(point, event, pointIndex) {
    var newTarget = document.elementFromPoint(point.clientX, point.clientY);
    var currentTarget = PREVIOUS_TARGETS[point.identifier];

    PREVIOUS_TARGETS[point.identifier] = newTarget;

    if (newTarget !== currentTarget) {
        if (currentTarget) {
            Controller.trigger(event, EVENT_OUT, currentTarget, pointIndex);

            // If the new target is not a child of the previous target, fire a leave event
            if (!Util.contains(currentTarget, newTarget)) {
                Controller.trigger(event, EVENT_LEAVE, currentTarget, pointIndex);
            }
        }

        if (newTarget) {
            // If the current target is not a child of the new target, fire a enter event
            if (!Util.contains(newTarget, currentTarget)) {
                Controller.trigger(event, EVENT_ENTER, newTarget, pointIndex);
            }

            Controller.trigger(event, EVENT_OVER, newTarget, pointIndex);
        }
    }

    Controller.trigger(event, EVENT_MOVE, newTarget, pointIndex);

    // If the target (or a parent node) has the touch-action attribute
    // set to "none", prevent the browser default action.
    if (newTarget && TouchAreaAdapter.detect(newTarget)) {
        event.preventDefault();
    }
};

/**
 * Trigger start/end for each touch point
 *
 * @type Function
 * @param {Touch} point
 * @param {Number} point.identifier
 * @param {TouchEvent} event
 * @param {String} event.type
 * @param {Element} event.target
 * @param {Number} pointIndex
 * @private
 */
var _onPointStartEnd = function(point, event, pointIndex) {
    var target = event.target;
    var type = event.type;

    if (type === EVENT_START) {
        PREVIOUS_TARGETS[point.identifier] = target;
        Controller.trigger(event, EVENT_ENTER, target, pointIndex);
        Controller.trigger(event, EVENT_OVER, target, pointIndex);
    }

    var currentTarget = PREVIOUS_TARGETS[point.identifier] || target;
    Controller.trigger(event, type, currentTarget, pointIndex);

    if (type === EVENT_END) {
        PREVIOUS_TARGETS[point.identifier] = null;
        Controller.trigger(event, EVENT_OUT, currentTarget, pointIndex);
        Controller.trigger(event, EVENT_LEAVE, currentTarget, pointIndex);
    }
};

/**
 * @class Handler.Touch
 * @static
 */
var TouchHandler = {

    /**
     * Events to watch
     *
     * @property events
     * @type String[]
     */
    events: [EVENT_START, EVENT_MOVE, EVENT_END, EVENT_CANCEL],

    /**
     * Register event (for mouse simulation detection) and convert to pointer
     *
     * @method onEvent
     * @param {TouchEvent} event
     * @param {String} event.type
     * @param {Element} event.target
     * @callback
     */
    onEvent: function(event) {
        var i = 0;
        var touches = event.changedTouches;
        var length = touches.length;

        var method = _getPointMethod(event.type);

        for (; i < length; i++) {
            method(touches[i], event, i);
        }
    }

};

module.exports = TouchHandler;
},{"../Controller":2,"../Util":4,"../event/Events":9,"adapter/toucharea":"C84uZi"}]},{},[1])
}());;