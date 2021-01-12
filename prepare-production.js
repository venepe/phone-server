const fs = require('fs');
const glob = require('glob');

glob('./@(Docker*|docker*)', {}, function(er, files) {
  console.log(files);
  files.forEach(function(file) {
    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        return console.log(err);
      }
      const result = data.replace(/8002/g, '80');

      fs.writeFile(file, result, 'utf8', function (err) {
         if (err) return console.log(err);
      });
    });
  });
});
