/**
 * Created by jack on 2016/2/5.
 */
define(function (require, exports, module) {
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

