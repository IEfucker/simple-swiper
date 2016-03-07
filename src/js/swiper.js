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

define(function (require, exports, module) {
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
