var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var through2 = require('through2');
//var browserSync = require('browser-sync').create();
//var reload = browserSync.reload;
var runSequence = require('run-sequence');


//watching script change to start default task
gulp.task('watch', function () {
    gulp.watch([
        'gulpfile.js', 'src/js/*.js',
        'src/sass/*.scss',
        'src/css/*.css',
        'src/html/**/*.html'
    ], function (event) {
        console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        if(/.*\.js$/.test(event.path)){
            runSequence('requirejs', 'html:build');
        }
        else if(/.*\.css$/.test(event.path)){
            runSequence('css:concat', 'html:build');
        }
        else if(/.*\.html$/.test(event.path)){
            runSequence('html:build');
        }
    });
});

//build version:
//script version
//style version
//manifest version
var startTime = 0;
var buildVersion = 0;
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //�·�
        "d+": this.getDate(), //��
        "h+": this.getHours(), //Сʱ
        "m+": this.getMinutes(), //��
        "s+": this.getSeconds(), //��
        "q+": Math.floor((this.getMonth() + 3) / 3), //����
        "S": this.getMilliseconds() //����
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
gulp.task('build_version', function () {
    var startDate = new Date();
    buildVersion = startTime = startDate.getTime();
    buildVersion = (new Date()).Format('yyyyMMddhhmmss');
    console.log('******\nbuild version : ' + buildVersion + '\n******');
});

//compile requirejs modules
gulp.task('requirejs', function (cb) {
    return $.requirejs({
            baseUrl: './src/js',
            include: ['almond.js', 'main.js'],
            insertRequire: ['main.js'],
            out: 'main.js',
            optimize: 'none',
            wrap: true
        })
        //https://github.com/RobinThrift/gulp-requirejs/issues/5
        .pipe(through2.obj(function (file, enc, next) {
            this.push(file);
            this.end();
            next();
        }))
        .pipe($.cached('build-cache', {
            optimizeMemory: true
        }))
        //remove amdclean for its slowness
        //.pipe($.amdclean.gulp({
        //    'prefixMode': 'standard'
        //}))
        .pipe(gulp.dest('./js/'));
});

//�ϲ�css�ļ�
gulp.task('css:concat', function() {                                //- ����һ����Ϊ concat �� task
    gulp.src(['./src/css/*.css'])    //- ��Ҫ�����css�ļ����ŵ�һ���ַ���������
        .pipe($.concat('main.css'))                            //- �ϲ�����ļ���
        //.pipe(minifyCss())                                      //- ѹ�������һ��
        //.pipe(rev())                                            //- �ļ�����MD5��׺
        .pipe(gulp.dest('./css'))                               //- ����ļ�����
        //.pipe(rev.manifest())                                   //- ����һ��rev-manifest.json
        //.pipe(gulp.dest('./rev'));                              //- �� rev-manifest.json ���浽 rev Ŀ¼��
});

//html build
gulp.task('html:build', function () {
    runSequence('build_version');
    return gulp.src(['./src/html/*.html'])
        .pipe($.fileInclude({
            basepath: './src/html/include/'
        }))
        .pipe($.cached('build-cache', {
            optimizeMemory: true
        }))
        .pipe($.replace(/_BUILD_VERSION_/ig,buildVersion))
        .pipe(gulp.dest('./'));
});

//compile file to dev:debug environment
gulp.task('compile', function(cb){
    runSequence('css:concat', 'requirejs', 'html:build');
});


//default task
gulp.task('default', function (cb) {
    runSequence('compile')
});






