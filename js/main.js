(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond.js", function(){});

/**
 * Created by jack on 2016/2/5.
 */
define('getSupportedPropertyName',['require','exports','module'],function (require, exports, module) {
    function getSupportedPropertyName(properties) {
        for (var i = 0; i < properties.length; i++) {
            if (typeof document.body.style[properties[i]] != "undefined") {
                return properties[i];
            }
        }
        return null;
    }
    return getSupportedPropertyName;
})

;
/**
 * Created by jack on 2016/1/25.
 * Swiper
 *
 * @param {Object} [options]
 * @param {String} [o.swiperContain] id or class of swiperContain selector
 * @param {String} [o.swiperWrapper] class of swiperWrapper selector
 * @param {String} [o.swiperPage] class of swiperPage selector
 * @param {Number} [o.curPage] init active page index
 * @param {Number} [o.swipeRange] length of move boundary to fire swipe, whose unit would be in px
 * @param {String} [o.stateSlideIn] className of slide-in state
 * @param {String} [o.stateActive] className of slide-active state
 * @param {Number} [o.transitionDuration] duration of auto-transition after touchend
 * @param {Function} [o.touchEnd] callback when touchend occurs
 * @param {Function} [o.transitonEnd] callback after transition end
 *
 * @returns {constructor} [Swiper]
 */

define('swiper',['require','exports','module','getSupportedPropertyName'],function (require, exports, module) {
    var getSupportedPropertyName = require('getSupportedPropertyName');

    var isTouchDevice = !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch),
        android = navigator.userAgent.match(/(Android);?[\s\/]+([\d.]+)?/),
        transform = ["transform", "msTransform", "webkitTransform", "mozTransform", "oTransform"],
        transformProperty = getSupportedPropertyName(transform);

    var desktopEvents = ['mousedown', 'mousemove', 'mouseup'];
    if (window.navigator.pointerEnabled) desktopEvents = ['pointerdown', 'pointermove', 'pointerup'];
    else if (window.navigator.msPointerEnabled) desktopEvents = ['MSPointerDown', 'MSPointerMove', 'MSPointerUp'];

    var touchEvents = {
        start: isTouchDevice ? 'touchstart' : desktopEvents[0],
        move: isTouchDevice ? 'touchmove' : desktopEvents[1],
        end: isTouchDevice ? 'touchend' : desktopEvents[2]
    };

    function Swiper(options) {
        var s = this;
        //default options
        var o = {
            curPage: 0,
            swiperContain: '.swiper-contain',
            swiperWrapper: '.swiper-wrapper',
            swiperPage: '.swiper-page',
            swipeRange: 130,//px
            stateSlideIn: 'swiper-slide-in',
            stateActive: 'swiper-slide-active',
            transitionDuration: 600,
            touchEnd: null,//params: swiper,curPageIndex
            transitonEnd: null//params: swiper,curPageIndex
        };
        if (Object.prototype.toString.apply(options).slice(8, -1) === "Object") {
            for (var k in options) {
                o[k] = options[k];
            }
        } else {
            throw new TypeError('option should be an object');
        }

        var swiperContain = o['swiperContain'],
            swiperWrapper = o['swiperWrapper'],
            swiperPage = o['swiperPage'],
            stateSlideIn = o['stateSlideIn'],
            stateActive = o['stateActive'],
            transitionDuration = o['transitionDuration'],
            curPage = o['curPage'],
            touchStartObj,
            touchCurObj = {},
            touchEndObj,
            moveY,
            startTranslateY,
            currentTranslateY,
            swipeRange = o['swipeRange'],
            pageCount,
            pageHeight,
            touchStarted = false;
        
        pageHeight = document.body.clientHeight;
        
        if (typeof swiperContain === 'string') {
            if (swiperContain[0] === '.') {
                swiperContain = document.querySelector(swiperContain);
            } else if (swiperContain[0] === "#") {
                swiperContain = document.getElementById(swiperContain.replace("#", ''))
            }
        }
        if (!swiperContain) {
            throw ("swiper contain must be defined with valid className or idName");
        }
        if (android) {
            swiperContain.classList.add('swiper-container-android');
        }

        //export prop
        s.swiperContain = swiperContain;
        s.wrapper = swiperWrapper = swiperWrapper ? document.querySelector(swiperWrapper) : swiperContain.children[0];
        s.page = swiperPage = swiperPage ? document.querySelectorAll(swiperPage) : s.wrapper.children;
        s.count = pageCount = swiperPage.length;
        s.transitionDuration = transitionDuration;
        s.pageHeight = pageHeight;
        s.stateSlideIn = stateSlideIn;
        s.touchEnd = o.touchEnd;
        s.transitonEnd = o.transitonEnd;
        s.curPage = curPage;
        s.isMoved = false;

        for (var i = 0; i < pageCount; i++) {
            swiperPage[i].style.height = pageHeight + "px";
        }
        swiperPage[curPage].classList.add('swiper-slide-active');
        s.wrapper.classList.add('transition-normal');

        s.wrapper.addEventListener(touchEvents.start, function (e) {
            var self = this;
            touchStarted = true;
            s.isMoved = false;
            //event.touches object would change when touchmove emitted, so get the value, not the object
            touchStartObj = {
                startY: (e.type === 'touchstart') ? e.touches[0].clientY : e.pageY
            }
            s.wrapper.classList.remove('transition-normal');
            var transfrom_info = window.getComputedStyle(e.currentTarget, null).getPropertyValue("-webkit-transform").match(/matrix\((\d+,\s?){1,5}(\-?\d+)/);
            startTranslateY = transfrom_info && transfrom_info[2] || 0;
        }, false);

        s.wrapper.addEventListener(touchEvents.move, function (e) {
            var self = this;
            e.preventDefault();
            if (!touchStarted) return;
            //e.stopPropagation();
            touchCurObj.y = (e.type === 'touchmove') ? e.touches[0].clientY : e.pageY;
            moveY = touchCurObj.y - touchStartObj.startY;
            currentTranslateY = +startTranslateY + +moveY;
            //moveY < 20 would trigger 'tap' event, swiper at start or end page, prevent swipe to exceed pageCount
            if (Math.abs(moveY) < 20 || (startTranslateY == 0 && moveY > pageHeight / 3) || (startTranslateY == -pageHeight * (pageCount - 1)) && moveY < -pageHeight / 3) {
                return;
            }
            s.isMoved = true;
            setTransformY(s.wrapper, currentTranslateY);
        }, false);

        s.wrapper.addEventListener(touchEvents.end, function (e) {

            var self = this;
            touchStarted = false;
            s.wrapper.classList.add('transition-normal');
            if (moveY && Math.abs(moveY) > swipeRange) {
                s.updateSwiper(-moveY);
            } else {
                s.updateSwiper(0);
            }
        }, false);


    }

    function setTransformY(el, y) {
        if (transformProperty) {
            el.style[transformProperty] = 'translate3d(0px, ' + y + 'px, 0px)';
        }
    }

    /*
     * update swipr state
     * @param {number} [direction] > 0 nextPage, < 0 prePage, === 0 currentPage doesnot change and reset state by auto transition
     * @returns {Swiper}
     */
    Swiper.prototype.updateSwiper = function (direction) {
        var self = this;
        if (direction > 0) {//nextPage
            this.curPage < this.count - 1 && this.curPage++;
        } else if (direction < 0) {//prePage
            this.curPage > 0 && this.curPage--;
        }
        setTransformY(self.wrapper, (-self.curPage * self.pageHeight));

        //slide in class for transition
        for (var i = 0; i < self.page.length; i++) {
            self.page[i].classList.remove(self.stateSlideIn);
        }
        self.page[self.curPage].classList.add(self.stateSlideIn);

        self.touchEnd && self.touchEnd(self, self.curPage);

        setTimeout(function () {
            for (var i = 0; i < self.page.length; i++) {
                self.page[i].classList.remove('swiper-slide-active');
            }
            self.page[self.curPage].classList.add('swiper-slide-active');
            self.transitonEnd && self.transitonEnd(s, self.curPage);
        }, self.transitionDuration);

        return self;
    }

    return Swiper;
})
;
/**
 * Created by jack on 2016/1/26.
 */

/*
* create and trigger tap event
*
**/
define('tap.js',['require','exports','module'],function (require, exports, module) {
    function createTap(){
        var deltaX = 0,
            deltaY = 0,
            startPoint = {},
            tapType = 'tap',
            cancelled = false;
        document.body.addEventListener('touchstart', function (e) {
            startPoint['x'] = e.touches[0].clientX;
            startPoint['y'] = e.touches[0].clientY;
        }, false);

        document.body.addEventListener('touchmove', function (e) {
            deltaX = e.touches[0].clientX - startPoint['x'];
            deltaY = e.touches[0].clientY - startPoint['y'];
            //console.log('touchmove',deltaX, deltaY);
        }, false);

        document.body.addEventListener('touchend', function (e) {
            deltaX = Math.abs(deltaX);
            deltaY = Math.abs(deltaY);
            var el = e.target;
            if(deltaX < 20 && deltaY < 20){
                //var tapEvent = new Event(tapType);
                var tapEvent = new Event(tapType, {
                        bubbles: true,
                        cancelable: true
                });
                cancelled  = !el.dispatchEvent(tapEvent);
                if(cancelled){
                    e.preventDefault();
                    return false;
                }
            }
            deltaX = deltaY = 0;
        }, false);

        //prevent link redirection in 'click' event
        document.body.addEventListener('click', function(e){
            if(cancelled){
                e.preventDefault();
                return false;
            }
        }, false);
    }


    return new createTap();

})
;
/**
 * Created by jack on 2016/2/17.
 */
define('main.js',['require','exports','module','swiper','tap.js'],function (require, exports, module) {
    var Swiper = require('swiper'),
        tap = require('tap.js');


    var ua = navigator.userAgent,
        tapEvent = (RegExp("Mobile").test(ua) && typeof tap === 'object') ? 'tap' : 'click',
        body = document.body;


    /*for mobile optimize*/
    if (RegExp("Mobile").test(ua)) {
        body.classList.add("mobile");
    }

    var swiper = new Swiper({
        swiperContain:'.swiper-container',//className or id string
        swiperWrapper:'.swiper-wrapper',//className string
        swiperPage: '.swiper-slide',//className string
        slideInClassName: 'swiper-slide-in',
        activeClassName: 'swiper-slide-active',
        transitionEndTime: 600//ms
    });

    body.classList.add('ready');
});
require(["main.js"]);
}());