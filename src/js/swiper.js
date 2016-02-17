/**
 * Created by jack on 2016/1/25.
 */
/*
*param options
*swiperContain : swiper container, string, id "#xxx" or class ".xxx"
* swiperPage : swiper page, string, class
*
*/
define(function (require, exports, module) {
    var getSupportedPropertyName = require('getSupportedPropertyName');

    var lastTime,
        android = navigator.userAgent.match(/(Android);?[\s\/]+([\d.]+)?/);
    var transform = ["transform", "msTransform", "webkitTransform", "mozTransform", "oTransform"],
        transformProperty = getSupportedPropertyName(transform);

    function Swiper(options){
        var s = this;
        var defaultObj = {
            curPage: 0,
            swiperContain: '.swiper-contain',
            swiperWrapper: '.swiper-wrapper',
            swiperPage: '.swiper-page',
            swipeRange: 130,//px
            slideInClassName: 'swiper-slide-in',
            activeClassName: 'swiper-slide-active',
            transitionEndTime: 600,
            endingCall: null,//params: swiper,curPageIndex
            endCallback: null//params: swiper,curPageIndex
        };
        //console.log(defaultObj);
        if(Object.prototype.toString.apply(options).slice(8, -1) === "Object"){
            for(var k in options){
                defaultObj[k] = options[k];
            }
        }

        var swiperContain = defaultObj['swiperContain'],
            swiperWrapper = defaultObj['swiperWrapper'],
            swiperPage = defaultObj['swiperPage'],
            slideInClassName = defaultObj['slideInClassName'],
            activeClassName = defaultObj['activeClassName'],
            transitionEndTime = defaultObj['transitionEndTime'],
            curPage = defaultObj['curPage'],
            touchStartObj,
            touchCurObj,
            touchEndObj,
            moveY,
            startTranslateY,
            currentTranslateY,
            swipeRange = defaultObj['swipeRange'],
            pageCount,
            pageHeight = window && window.innerHeight;
        if(typeof swiperContain === 'string'){
            if(swiperContain[0] === '.'){
                swiperContain = document.querySelector(swiperContain);
            }else if(swiperContain[0] === "#"){
                swiperContain = document.getElementById(swiperContain.replace("#",''))
            }
        }
        if(!swiperContain){
            throw ("swiper contain must be defined with valid className or idName");
        }
        if(android){
            swiperContain.classList.add('swiper-container-android');
        }

        //api
        s.wrapper = swiperWrapper = swiperWrapper ? document.querySelector(swiperWrapper) : swiperContain.children[0];
        s.page = swiperPage = swiperPage ? document.querySelectorAll(swiperPage) : s.wrapper.children;
        s.count = pageCount = swiperPage.length;

        for(var i = 0; i < pageCount; i++){
            swiperPage[i].style.height = pageHeight + "px";
        }
        swiperPage[curPage].classList.add('swiper-slide-active');

        s.wrapper.addEventListener("touchstart", function (e) {
            var self = this;
            lastTime = null;
            //event.touches object would change when touchmove emitted, so get the value not the object
            touchStartObj = {
                startY: e.touches[0].clientY
            }
            s.wrapper.classList.remove('transition-normal');

            var transfrom_info = window.getComputedStyle(e.currentTarget, null).getPropertyValue("-webkit-transform").match(/matrix\((\d+,\s?){1,5}(\-?\d+)/);
            startTranslateY = transfrom_info && transfrom_info[2] || 0;

        }, false);

        s.wrapper.addEventListener('touchmove', function(e){
            var self = this;
            e.preventDefault();
            //e.stopPropagation();
            touchCurObj = e.touches[0];
            moveY = touchCurObj.clientY - touchStartObj.startY;
            currentTranslateY = +startTranslateY + +moveY;

            //moveY < 20 would trigger 'tap' event, swiper at start or end page, prevent swipe to exceed pageCount
            if(Math.abs(moveY) < 20 || (startTranslateY == 0 && moveY > pageHeight/3) || (startTranslateY == - pageHeight *(pageCount - 1)) && moveY < -pageHeight/3){
                return;
            }
            //this may has a flicker, for moveY < 20 is omitted
            setTransformY(s.wrapper, currentTranslateY);
        }, false);

        s.wrapper.addEventListener('touchend', function(){
            var self = this;
            s.wrapper.classList.add('transition-normal');
            if(moveY > swipeRange){
                if(curPage > 0)
                    curPage--;
            }else if(moveY < -swipeRange){
                if(curPage < (pageCount - 1))
                    curPage++;
            }
            setTransformY(s.wrapper, (-curPage * pageHeight));

            //slide in class for transition
            for(var i = 0; i < swiperPage.length; i++){
                swiperPage[i].classList.remove(slideInClassName);
            }
            swiperPage[curPage].classList.add(slideInClassName);

            defaultObj.endingCall && defaultObj.endingCall(s, curPage);

            setTimeout(function(){
                for(var i = 0; i < swiperPage.length; i++){
                    swiperPage[i].classList.remove('swiper-slide-active');
                }
                swiperPage[curPage].classList.add('swiper-slide-active');
                defaultObj.endCallback && defaultObj.endCallback(s, curPage);
            }, transitionEndTime);

        }, false);
    }

    function setTransformY(el, y){
        if(transformProperty){
            el.style[transformProperty] = 'translate3d(0px, ' + y + 'px, 0px)';
        }
    }
    
    return Swiper;

})
