/**
 * Created by jack on 2016/2/17.
 */
define(function (require, exports, module) {
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