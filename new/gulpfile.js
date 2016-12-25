var gulp = require('gulp');
// var jade = require('gulp-jade');
var pug = require('gulp-pug');

//
// gulp.task('jade', function() {
//   gulp.src('./src/*.jade')
//   .pipe(jade ({
//     pretty: true
//   }))
//   .pipe(gulp.dest('./dist'))
// });
//
//
// gulp.task('watch', function () {
//   gulp.watch('./src/*.jade', ['jade'])
// });
//
// gulp.task('default', ['jade','watch']);

gulp.task('pug', function() {
  gulp.src('./src/*.pug')
  .pipe(pug ({
    pretty: true
  }))
  .pipe(gulp.dest('./dist'))
});


gulp.task('watch', function () {
  gulp.watch('./src/*.pug', ['pug'])
});

gulp.task('default', ['pug','watch']);
