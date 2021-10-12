const dist = "dist" // папка в релиз не для работы
const srcProject = "src" // рабочая папка

const fs = require('fs');// file system


const {dest, src} = require('gulp'),  // gulp
gulp = require('gulp'),
browsersync = require('browser-sync').create(),
fileinclude = require('gulp-file-include'),
del = require('del'),
sass = require('gulp-sass')(require('sass')),
autoprefixer = require('gulp-autoprefixer'),
groupMedia = require('gulp-group-css-media-queries'),
cleanCss = require('gulp-clean-css'),
rename = require("gulp-rename"),
uglify = require('gulp-uglify-es').default,
imagemin = require('gulp-imagemin'),
webp = require('gulp-webp'),
webpHTML = require('gulp-webp-html'),
webpCss = require('gulp-webp-css'),
svgSprite = require('gulp-svg-sprite'),
ttf2woff = require('gulp-ttf2woff'),
ttf2woff2 = require('gulp-ttf2woff2'),
fonter = require('gulp-fonter'),
concat = require('gulp-concat'),
babel = require('gulp-babel');


//объект с выводами путей папок
let path = {  // папка на релиз
  build:{
    html: dist + '/',
    css: dist + '/css/',
    js: dist + '/js/',
    img: dist + '/img/',
    fonts: dist + '/fonts/',
  },//?рабочая папка (исходная проекта)
  src:{  
    html: [srcProject + '/*.html' , "!" + srcProject + '/_*.html'], //читает все хтмл и "!" - исключает все хтмл с _префиксом
    scss: srcProject + '/scss/style.scss', 
    js: srcProject + '/js/script.js',
    img: srcProject + '/img/**/*.{jpg,png,svg,gif,ico,webp}',
    fonts: srcProject + '/fonts/*.ttf',
  },
  watch:{//?тут gulp, будет вотчить все прописанные пути
    html: srcProject + '/**/*.html',
    scss: srcProject + '/scss/style.scss', 
    js: srcProject + '/js/script.js', // 
    img: srcProject + '/img/**/*.{jpg,png,svg,gif,ico,webp}',
//шрифты постоянно вотчить не нужно
  },
  clean: '/' + dist + '/', //удаление папки после запука галпа(хз зачем)
}


//? функция для обновления странички
const browserSyncSettings = (params) => {
  browsersync.init({
    // настрйока сервера
    server:{
      //базовая папка
      baseDir: './' + dist + '/',
    },
    //порт через который открывается сайт
    port:3000,
    notify: false// выключает сообщения про обновы
  })
}

const htmlFunction = () => {
  //возращает
  return src(path.src.html) 
  .pipe(fileinclude())
  // .pipe(webpHTML())
  .pipe(dest(path.build.html))
  .pipe(browsersync.stream())
}



const cssFunction = () => {
  return src(path.src.scss)
  .pipe(
    sass({
      outputStyle:'expanded'// конвертирует с scss в css
    })
   )
   .pipe(
    autoprefixer({
      overrideBrowserslist:  ['last 2 versions'],
      cascade: true
    })
   )
   .pipe(
      groupMedia()// все медиа с разных мест собирает в одно
   )
  //  .pipe(webpCss())
   .pipe(dest(path.build.css))
   .pipe(browsersync.stream())
   .pipe(cleanCss())
   .pipe(rename({
      extname: '.min.css' //грубо говоря создает новый такй о же css, только сжатый
    }))
   .pipe(dest(path.build.css))// выгружает еще один готовый css но сжатый
   .pipe(browsersync.stream())
}

const jsFunction = () => {
  return src(path.src.js)
  .pipe(fileinclude())
  .pipe(dest(path.build.js))
  .pipe(
    uglify()
  )
  .pipe(rename({
    extname: '.min.js' //грубо говоря создает новый такй о же css, только сжатый
  }))
 .pipe(dest(path.build.js))
 .pipe(browsersync.stream())
}


// для картинок

const imgMinFunction = () => {
  return src(path.src.img)
  // .pipe(
  //   webp({
  //     quality: 70
  //   })
  // )// после обработки - 
  .pipe(dest(path.build.img)) // - идет копирование
  .pipe(src(path.src.img)) // снова возрaт к оригиналам, потому что imagemin не работает с webp 
  .pipe(
    imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      interlaced: true,
      optimizationLevel: 3, // 0 to 7
    })
  )
  .pipe(dest(path.build.img))
  .pipe(browsersync.stream())
}

const fontsFunction = () => {
  src(path.src.fonts)
  .pipe(ttf2woff())
  .pipe(dest(path.build.fonts))
  return src(path.src.fonts)
  .pipe(ttf2woff2())
  .pipe(dest(path.build.fonts))
  .pipe(browsersync.stream())
}

gulp.task('fonter', ()=>{
  return src([srcProject + '/fonts/*.otf'])
  .pipe(fonter({
    formats: ['ttf']
  }))
  .pipe(dest(srcProject + '/fonts/'));
})


//подключение шрифтов 
const fontsStyleFunction = () =>{
  let file_content = fs.readFileSync(srcProject + '/scss/_fonts.scss');
  if (file_content == '') {
      fs.writeFile(srcProject + '/scss/_fonts.scss', '', cb);
      return fs.readdir(path.build.fonts, function(err, items) {
          if (items) {
              let c_fontname;
              for (var i = 0; i < items.length; i++) {
                  let fontname = items[i].split('.');
                  fontname = fontname[0];
                  if (c_fontname != fontname) {
                      fs.appendFile(srcProject + '/scss/_fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
                  }
                  c_fontname = fontname;
              }
          }
      })
  }
}

//func callback
const cb = () =>{
}


const watchFiles = (params) => {
    gulp.watch([path.watch.html], htmlFunction); 
    gulp.watch([path.watch.scss], cssFunction); 
    gulp.watch([path.watch.js], jsFunction); 
    gulp.watch([path.watch.img], imgMinFunction);
}

const cleanFiles = () => {
  return del('dist');
}

//в серию записываются функции ,которые уже будут выполняться
let build = gulp.series(cleanFiles, gulp.parallel(htmlFunction, cssFunction, jsFunction, imgMinFunction, fontsFunction), fontsStyleFunction);
// переменная watch будет запускать browserSyncSettings
let watch = gulp.parallel(build, watchFiles, browserSyncSettings);
//? В галп добавляю свои функции, чтобы он их понимал, и  для этого используется exports


exports.htmlFunction = htmlFunction;
exports.jsFunction = jsFunction;
exports.cssFunction = cssFunction;
exports.imgMinFunction = imgMinFunction;
exports.fontsFunction = fontsFunction;
exports.fontsStyleFunction = fontsStyleFunction;
exports.build = build;
exports.watch = watch;//- let watch = gulp.parallel(browserSyncSettings);
exports.default = watch;// переменная по умолчанию которая запускает build, browserSyncSettings


//экспорт переменных (наверное для ноды) чтобы было системе понятно, что они делают
